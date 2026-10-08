import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/server/auth/auth";
import { Crown } from "lucide-react";
import { SuperAdminSignOut } from "./superadmin-signout";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/login");
  const isSuperAdmin = Boolean((session?.user as { isSuperAdmin?: boolean } | undefined)?.isSuperAdmin);
  if (!isSuperAdmin) redirect("/companies");

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header
        className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:px-6"
        style={{ boxShadow: "var(--shadow-card)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-sm font-bold text-amber-950"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <Crown className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[15px] font-semibold tracking-tight leading-none">Platform Admin</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Creator control plane</p>
          </div>
          <nav className="ml-6 hidden items-center gap-1 sm:flex">
            <Link href="/superadmin" className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-muted)]">
              Overview
            </Link>
            <Link href="/superadmin/companies" className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-muted)]">
              Companies
            </Link>
            <Link href="/superadmin/users" className="rounded-md px-3 py-1.5 text-sm font-medium hover:bg-[var(--surface-muted)]">
              Users
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/companies" className="text-sm text-[var(--muted-foreground)] hover:underline">
            Back to app
          </Link>
          <SuperAdminSignOut />
        </div>
      </header>
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
