import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth/auth";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { listCompaniesForUser } from "@/server/services/companies";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");

  const isSuperAdmin = Boolean((session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin);
  const [companies, [user]] = await Promise.all([
    listCompaniesForUser(userId),
    db.select({ isAdmin: users.isAdmin }).from(users).where(eq(users.id, userId)),
  ]);
  const canCreateCompany = isSuperAdmin || Boolean(user?.isAdmin);

  return (
    <CompaniesClient
      companies={companies}
      userName={session?.user?.name ?? session?.user?.email ?? ""}
      canCreateCompany={canCreateCompany}
    />
  );
}
