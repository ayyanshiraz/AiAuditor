"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FilePlus2,
  BookOpen,
  ListTree,
  Scale,
  TrendingUp,
  Landmark,
  Wallet,
  Boxes,
  Users,
  Truck,
  UserSquare2,
  Receipt,
  FileBarChart2,
  CalendarClock,
  ShieldCheck,
  Settings,
  Menu,
  X,
  ChevronsUpDown,
  LogOut,
  Building2,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { TopbarSearch } from "@/components/layout/topbar-search";
import { NotificationsBell } from "@/components/layout/notifications-bell";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Overview",
    items: [{ href: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Transactions",
    items: [
      { href: "entries", label: "General Entries", icon: FilePlus2 },
      { href: "journal", label: "Journal", icon: BookOpen },
      { href: "ledger", label: "General Ledger", icon: BookOpen },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "reports/trial-balance", label: "Trial Balance", icon: Scale },
      { href: "reports/income-statement", label: "Income Statement", icon: TrendingUp },
      { href: "reports/balance-sheet", label: "Balance Sheet", icon: Landmark },
      { href: "reports/cash-flow", label: "Cash Flow", icon: Wallet },
    ],
  },
  {
    label: "Records",
    items: [
      { href: "accounts", label: "Chart of Accounts", icon: ListTree },
      { href: "assets", label: "Assets", icon: Boxes },
      { href: "customers", label: "Customers", icon: Users },
      { href: "suppliers", label: "Suppliers", icon: Truck },
      { href: "employees", label: "Employees", icon: UserSquare2 },
      { href: "taxes", label: "Taxes", icon: Receipt },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "periods", label: "Accounting Periods", icon: CalendarClock },
      { href: "audit-trail", label: "Audit Trail", icon: ShieldCheck },
      { href: "settings", label: "Settings", icon: Settings },
    ],
  },
];

const NAV: NavItem[] = NAV_SECTIONS.flatMap((s) => s.items);

export function AppShell({
  company,
  role,
  companies,
  userName,
  children,
  isSuperAdmin,
  viewingAsSuperAdmin,
}: {
  company: { id: string; name: string; baseCurrency: string };
  role: string;
  companies: { id: string; name: string }[];
  userName: string;
  children: React.ReactNode;
  isSuperAdmin?: boolean;
  viewingAsSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = NAV.filter((item) => pathname.includes(`/${item.href}`)).sort(
    (a, b) => b.href.length - a.href.length
  )[0];

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] lg:flex">
        <SidebarContent company={company} companies={companies} pathname={pathname} isSuperAdmin={isSuperAdmin} />
      </aside>

      {/* Sidebar (mobile drawer) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-[var(--surface)] shadow-lg">
            <div className="flex justify-end p-2">
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-2 hover:bg-[var(--surface-muted)]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              company={company}
              companies={companies}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              isSuperAdmin={isSuperAdmin}
            />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {viewingAsSuperAdmin && (
          <div className="flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
            <Crown className="h-3.5 w-3.5" /> You&apos;re viewing this company as the platform owner — you are not a
            member of it.
            <Link href="/superadmin" className="underline">
              Back to the platform portal
            </Link>
          </div>
        )}
        <header
          className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 hover:bg-[var(--surface-muted)] lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden text-base font-semibold tracking-tight sm:inline">{activeItem?.label ?? "Ledgerly"}</span>
          </div>
          <div className="flex flex-1 items-center justify-end gap-3">
            <TopbarSearch companyId={company.id} />
            <NotificationsBell />
            <Badge variant="outline">{role}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-[var(--surface-muted)]">
                {userName}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push("/companies")}>
                  <Building2 className="mr-2 h-4 w-4" /> Switch company
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem onClick={() => router.push("/superadmin")}>
                    <Crown className="mr-2 h-4 w-4" /> Platform admin portal
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  company,
  companies,
  pathname,
  onNavigate,
  isSuperAdmin,
}: {
  company: { id: string; name: string; baseCurrency: string };
  companies: { id: string; name: string }[];
  pathname: string;
  onNavigate?: () => void;
  isSuperAdmin?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-4 py-4">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          L
        </div>
        <span className="text-[15px] font-semibold tracking-tight">Ledgerly</span>
      </div>

      <div className="border-b border-[var(--border)] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md border border-[var(--border-strong)] px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]">
            <div className="min-w-0">
              <p className="truncate font-medium">{company.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Active company · {company.baseCurrency}</p>
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>Switch company</DropdownMenuLabel>
            {companies.map((c) => (
              <DropdownMenuItem key={c.id} asChild>
                <Link href={`/companies/${c.id}/dashboard`}>{c.name}</Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/companies">All companies</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const href = `/companies/${company.id}/${item.href}`;
                const active = pathname.startsWith(href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                        : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", !active && "text-[var(--muted-foreground)]")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        {isSuperAdmin && (
          <div>
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
              Platform
            </p>
            <Link
              href="/superadmin"
              onClick={onNavigate}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
            >
              <Crown className="h-4 w-4 shrink-0 text-amber-500" /> Platform admin portal
            </Link>
          </div>
        )}
      </nav>
    </>
  );
}
