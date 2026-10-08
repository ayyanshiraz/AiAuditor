import { withErrorHandling, requireCompanyUserId } from "@/server/api/helpers";
import { getAttachment, deleteAttachment } from "@/server/services/attachments";
import { getFileUrl } from "@/server/services/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; attachmentId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, attachmentId } = await params;
    await requireCompanyUserId(companyId);
    const attachment = await getAttachment(companyId, attachmentId);
    const url = await getFileUrl(attachment.storageKey, attachment.storageProvider);
    return { attachment, url };
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ companyId: string; attachmentId: string }> }
) {
  return withErrorHandling(async () => {
    const { companyId, attachmentId } = await params;
    await requireCompanyUserId(companyId, ["OWNER", "ADMINISTRATOR", "ACCOUNTANT"]);
    await deleteAttachment(companyId, attachmentId);
    return { ok: true };
  });
}
