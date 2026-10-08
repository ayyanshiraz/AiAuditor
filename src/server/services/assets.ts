import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { assets } from "@/server/db/schema";
import { toCents, fromCents } from "@/lib/money";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createJournalEntry, type JournalLineInput } from "./accounting-engine";
import { nextNumber } from "./numbering";

export interface CreateAssetInput {
  companyId: string;
  name: string;
  category?: string;
  purchaseDate: Date;
  purchaseValue: number;
  usefulLifeMonths: number;
  residualValue?: number;
  location?: string;
  supplierId?: string;
  assetAccountId: string;
  accumulatedDeprAccountId: string;
  depreciationExpenseAccountId: string;
  paymentAccountId: string; // cash/bank or payable for the purchase entry
  isCredit?: boolean;
  payableAccountId?: string;
  createdBy: string;
  autoPost?: boolean;
}

/** Registers a new asset and books the acquisition journal entry. */
export async function createAsset(input: CreateAssetInput) {
  return db.transaction(async (tx) => {
    const assetCode = await nextNumber(tx, input.companyId, "AST");

    const [asset] = await tx
      .insert(assets)
      .values({
        companyId: input.companyId,
        assetCode,
        name: input.name,
        category: input.category,
        purchaseDate: input.purchaseDate,
        purchaseValue: fromCents(toCents(input.purchaseValue)),
        usefulLifeMonths: input.usefulLifeMonths,
        residualValue: fromCents(toCents(input.residualValue ?? 0)),
        location: input.location,
        supplierId: input.supplierId,
        assetAccountId: input.assetAccountId,
        accumulatedDeprAccountId: input.accumulatedDeprAccountId,
        depreciationExpenseAccountId: input.depreciationExpenseAccountId,
        status: "ACTIVE",
      })
      .returning();

    const creditAccountId = input.isCredit ? input.payableAccountId! : input.paymentAccountId;
    if (!creditAccountId) throw new ValidationError("A payment or payable account is required.");

    await createJournalEntry(
      {
        companyId: input.companyId,
        entryDate: input.purchaseDate,
        transactionType: "ASSET_PURCHASE",
        description: `Purchase of asset: ${input.name}`,
        reference: assetCode,
        lines: [
          { accountId: input.assetAccountId, debit: input.purchaseValue, assetId: asset.id },
          { accountId: creditAccountId, credit: input.purchaseValue, assetId: asset.id },
        ],
        createdBy: input.createdBy,
        sourceType: "Asset",
        sourceId: asset.id,
        numberPrefix: "AST",
        autoPost: input.autoPost ?? true,
      },
      tx
    );

    return asset;
  });
}

/** Straight-line monthly depreciation amount for an asset. */
export function monthlyDepreciation(asset: {
  purchaseValue: string;
  residualValue: string;
  usefulLifeMonths: number;
}): number {
  const depreciableBase = toCents(asset.purchaseValue) - toCents(asset.residualValue);
  if (asset.usefulLifeMonths <= 0) return 0;
  return Math.round(depreciableBase / asset.usefulLifeMonths) / 100;
}

export interface RecordDepreciationInput {
  companyId: string;
  assetId: string;
  date: Date;
  amount?: number; // defaults to one month of straight-line depreciation
  createdBy: string;
  autoPost?: boolean;
}

export async function recordDepreciation(input: RecordDepreciationInput) {
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, input.assetId), eq(assets.companyId, input.companyId)));
  if (!asset) throw new NotFoundError("Asset");
  if (asset.status !== "ACTIVE") {
    throw new ValidationError("Cannot depreciate an asset that is not active.");
  }

  const remainingDepreciable =
    toCents(asset.purchaseValue) - toCents(asset.residualValue) - toCents(asset.accumulatedDepreciation);
  let amountCents = input.amount ? toCents(input.amount) : toCents(monthlyDepreciation(asset));
  if (amountCents > remainingDepreciable) amountCents = remainingDepreciable;
  if (amountCents <= 0) {
    throw new ValidationError("Asset is already fully depreciated.");
  }

  return db.transaction(async (tx) => {
    const entry = await createJournalEntry(
      {
        companyId: input.companyId,
        entryDate: input.date,
        transactionType: "DEPRECIATION",
        description: `Depreciation — ${asset.name}`,
        lines: [
          { accountId: asset.depreciationExpenseAccountId, debit: fromCents(amountCents), assetId: asset.id },
          { accountId: asset.accumulatedDeprAccountId, credit: fromCents(amountCents), assetId: asset.id },
        ],
        createdBy: input.createdBy,
        sourceType: "Asset",
        sourceId: asset.id,
        numberPrefix: "DEP",
        autoPost: input.autoPost ?? true,
      },
      tx
    );

    await tx
      .update(assets)
      .set({
        accumulatedDepreciation: fromCents(toCents(asset.accumulatedDepreciation) + amountCents),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, asset.id));

    return entry;
  });
}

export interface DisposeAssetInput {
  companyId: string;
  assetId: string;
  date: Date;
  proceeds: number; // sale proceeds (0 for a pure disposal/write-off)
  receiptAccountId?: string; // cash/bank account receiving proceeds, required if proceeds > 0
  gainAccountId?: string; // defaults to Other Revenue
  lossAccountId?: string; // defaults to Other Expenses
  createdBy: string;
  autoPost?: boolean;
}

/**
 * Disposes/sells an asset: removes cost and accumulated depreciation,
 * records proceeds received, and recognizes gain or loss on disposal.
 *   Net Book Value = Cost - Accumulated Depreciation
 *   Gain/(Loss) = Proceeds - Net Book Value
 */
export async function disposeAsset(input: DisposeAssetInput) {
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, input.assetId), eq(assets.companyId, input.companyId)));
  if (!asset) throw new NotFoundError("Asset");
  if (asset.status !== "ACTIVE") {
    throw new ValidationError("Asset has already been disposed.");
  }

  const costCents = toCents(asset.purchaseValue);
  const accumDeprCents = toCents(asset.accumulatedDepreciation);
  const nbvCents = costCents - accumDeprCents;
  const proceedsCents = toCents(input.proceeds);
  const gainLossCents = proceedsCents - nbvCents; // positive = gain, negative = loss

  if (proceedsCents > 0 && !input.receiptAccountId) {
    throw new ValidationError("A receipt account is required when disposal proceeds are greater than zero.");
  }

  const lines: JournalLineInput[] = [];

  if (accumDeprCents > 0) {
    // Remove accumulated depreciation (debit reduces contra-asset credit balance)
    lines.push({ accountId: asset.accumulatedDeprAccountId, debit: fromCents(accumDeprCents), assetId: asset.id });
  }

  if (proceedsCents > 0) {
    lines.push({ accountId: input.receiptAccountId!, debit: fromCents(proceedsCents), assetId: asset.id });
  }

  // Remove the asset at cost (credit)
  lines.push({ accountId: asset.assetAccountId, credit: fromCents(costCents), assetId: asset.id });

  let totalDebit = accumDeprCents + proceedsCents;
  let totalCredit = costCents;

  if (gainLossCents > 0) {
    const gainAccount = input.gainAccountId ?? asset.depreciationExpenseAccountId; // fallback handled by caller normally
    lines.push({ accountId: input.gainAccountId ?? gainAccount, credit: fromCents(gainLossCents), assetId: asset.id });
    totalCredit += gainLossCents;
  } else if (gainLossCents < 0) {
    const lossAccount = input.lossAccountId ?? asset.depreciationExpenseAccountId;
    lines.push({ accountId: input.lossAccountId ?? lossAccount, debit: fromCents(-gainLossCents), assetId: asset.id });
    totalDebit += -gainLossCents;
  }

  return db.transaction(async (tx) => {
    const entry = await createJournalEntry(
      {
        companyId: input.companyId,
        entryDate: input.date,
        transactionType: "ASSET_DISPOSAL",
        description: `Disposal of asset: ${asset.name} (${gainLossCents >= 0 ? "gain" : "loss"} ${fromCents(Math.abs(gainLossCents))})`,
        lines,
        createdBy: input.createdBy,
        sourceType: "Asset",
        sourceId: asset.id,
        numberPrefix: "DISP",
        autoPost: input.autoPost ?? true,
      },
      tx
    );

    await tx
      .update(assets)
      .set({
        status: proceedsCents > 0 ? "SOLD" : "DISPOSED",
        disposalDate: input.date,
        disposalProceeds: fromCents(proceedsCents),
        updatedAt: new Date(),
      })
      .where(eq(assets.id, asset.id));

    return { entry, netBookValue: fromCents(nbvCents), gainLoss: fromCents(gainLossCents) };
  });
}

export async function listAssets(companyId: string) {
  return db.select().from(assets).where(eq(assets.companyId, companyId)).orderBy(assets.assetCode);
}

export async function getAsset(companyId: string, assetId: string) {
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.companyId, companyId)));
  if (!asset) throw new NotFoundError("Asset");
  return asset;
}

/**
 * Edits an asset's descriptive fields (name, category, location) only.
 * Cost, useful life, and depreciation figures are never editable here —
 * they already fed a posted journal entry, so changing them silently would
 * desync the books. Use depreciation/disposal to change financial figures.
 */
export async function updateAsset(
  companyId: string,
  assetId: string,
  data: Partial<{ name: string; category: string; location: string }>
) {
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.companyId, companyId)));
  if (!asset) throw new NotFoundError("Asset");

  const [updated] = await db
    .update(assets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(assets.id, assetId))
    .returning();
  return updated;
}
