import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { uploadAttachment, listAttachments } from "@/server/services/attachments";
import { ValidationError } from "@/lib/errors";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    await requireCompanyUserId(companyId);
    const url = new URL(req.url);
    const journalEntryId = url.searchParams.get("journalEntryId") ?? undefined;
    const items = await listAttachments(companyId, journalEntryId);
    return { items };
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId } = await params;
    const { userId } = await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);

    const formData = await req.formData();
    const file = formData.get("file");
    const journalEntryId = formData.get("journalEntryId");
    if (!(file instanceof File)) {
      throw new ValidationError("A file is required.");
    }

    const attachment = await uploadAttachment({
      companyId,
      journalEntryId: typeof journalEntryId === "string" && journalEntryId ? journalEntryId : undefined,
      file,
      uploadedBy: userId,
    });
    return { attachment };
  });
}
