import { and, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { attachments } from "@/server/db/schema";
import { saveFile, deleteFile } from "./storage";
import { NotFoundError, ValidationError } from "@/lib/errors";

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

export async function uploadAttachment(input: {
  companyId: string;
  journalEntryId?: string;
  file: File;
  uploadedBy: string;
}) {
  if (input.file.size > MAX_FILE_SIZE_BYTES) {
    throw new ValidationError("Attachment exceeds the 15MB size limit.");
  }
  if (input.file.type && !ALLOWED_TYPES.has(input.file.type)) {
    throw new ValidationError(
      "Unsupported file type. Allowed: PDF, PNG, JPEG, WEBP, CSV, and Excel spreadsheets."
    );
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const stored = await saveFile(input.companyId, input.file.name, buffer);

  const [row] = await db
    .insert(attachments)
    .values({
      companyId: input.companyId,
      journalEntryId: input.journalEntryId,
      fileName: input.file.name,
      fileType: input.file.type || null,
      fileSize: input.file.size,
      storageKey: stored.storageKey,
      storageProvider: stored.storageProvider,
      uploadedBy: input.uploadedBy,
    })
    .returning();

  return row;
}

export async function listAttachments(companyId: string, journalEntryId?: string) {
  const conditions = [eq(attachments.companyId, companyId)];
  if (journalEntryId) conditions.push(eq(attachments.journalEntryId, journalEntryId));
  return db
    .select()
    .from(attachments)
    .where(and(...conditions))
    .orderBy(attachments.createdAt);
}

export async function getAttachment(companyId: string, attachmentId: string) {
  const [row] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, attachmentId), eq(attachments.companyId, companyId)));
  if (!row) throw new NotFoundError("Attachment");
  return row;
}

export async function deleteAttachment(companyId: string, attachmentId: string) {
  const row = await getAttachment(companyId, attachmentId);
  await deleteFile(row.storageKey, row.storageProvider);
  await db.delete(attachments).where(eq(attachments.id, attachmentId));
  return row;
}
