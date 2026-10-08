import { getAdminDetail } from "@/server/services/platform-admin";
import { AdminDetailClient } from "./admin-detail-client";

export default async function AdminDetailPage({ params }: { params: Promise<{ adminId: string }> }) {
  const { adminId } = await params;
  const detail = await getAdminDetail(adminId);

  return (
    <AdminDetailClient
      admin={{
        ...detail.admin,
        createdAt: detail.admin.createdAt.toISOString(),
        disabledAt: detail.admin.disabledAt ? detail.admin.disabledAt.toISOString() : null,
      }}
      companies={detail.companies.map((c) => ({
        ...c,
        createdAt: c.createdAt.toISOString(),
        archivedAt: c.archivedAt ? c.archivedAt.toISOString() : null,
        lastActivity: c.lastActivity ? new Date(c.lastActivity).toISOString() : null,
      }))}
    />
  );
}
