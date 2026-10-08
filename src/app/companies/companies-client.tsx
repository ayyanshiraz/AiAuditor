"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Building2, LogOut, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface CompanyRow {
  id: string;
  name: string;
  legalName: string | null;
  country: string | null;
  baseCurrency: string;
  role: string;
}

const emptyForm = {
  name: "",
  legalName: "",
  businessType: "",
  registrationNumber: "",
  taxNumber: "",
  address: "",
  country: "",
  city: "",
  phone: "",
  email: "",
  website: "",
  baseCurrency: "PKR",
  fiscalYearStartMonth: 1,
  accountingMethod: "ACCRUAL",
};

export function CompaniesClient({
  companies,
  userName,
  canCreateCompany,
}: {
  companies: CompanyRow[];
  userName: string;
  canCreateCompany: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { company } = await api.post<{ company: { id: string } }>("/api/companies", form);
      toast.success("Company created.");
      setOpen(false);
      setForm(emptyForm);
      router.push(`/companies/${company.id}/dashboard`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--primary)] text-sm text-[var(--primary-foreground)]">L</div>
          Ledgerly
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
          <span>{userName}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/login" })}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Your companies</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              {canCreateCompany
                ? "Select a company portfolio to continue, or create a new one."
                : "Select a company portfolio to continue. Only admin accounts can create new companies."}
            </p>
          </div>
          {canCreateCompany && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1 h-4 w-4" /> New company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Create a company portfolio</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
                <Field label="Company name" required className="col-span-2">
                  <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </Field>
                <Field label="Legal name">
                  <Input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
                </Field>
                <Field label="Business type">
                  <Input
                    placeholder="Manufacturing, Trading, Services…"
                    value={form.businessType}
                    onChange={(e) => setForm({ ...form, businessType: e.target.value })}
                  />
                </Field>
                <Field label="Registration number">
                  <Input value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} />
                </Field>
                <Field label="Tax number">
                  <Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
                </Field>
                <Field label="Country">
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </Field>
                <Field label="City">
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </Field>
                <Field label="Address" className="col-span-2">
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </Field>
                <Field label="Base currency">
                  <Input value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value.toUpperCase() })} />
                </Field>
                <Field label="Accounting method">
                  <Select value={form.accountingMethod} onValueChange={(v) => setForm({ ...form, accountingMethod: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACCRUAL">Accrual</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Financial year start month">
                  <Select
                    value={String(form.fiscalYearStartMonth)}
                    onValueChange={(v) => setForm({ ...form, fiscalYearStartMonth: Number(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {new Date(2000, m - 1, 1).toLocaleString("en-US", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <DialogFooter className="col-span-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating…" : "Create company"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {companies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <Building2 className="h-10 w-10 text-[var(--muted-foreground)]" />
              <div>
                <p className="font-medium">No companies yet</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {canCreateCompany
                    ? "Create your first company to start recording transactions."
                    : "You haven't been added to a company yet. Ask your company's admin to add you."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => (
              <Card
                key={c.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => router.push(`/companies/${c.id}/dashboard`)}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>{c.name}</CardTitle>
                    <p className="text-xs text-[var(--muted-foreground)]">{c.legalName || c.country || "—"}</p>
                  </div>
                  <Badge variant="outline">{c.role}</Badge>
                </CardHeader>
                <CardContent className="text-sm text-[var(--muted-foreground)]">Currency: {c.baseCurrency}</CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <Label>
        {label} {required && <span className="text-[var(--danger)]">*</span>}
      </Label>
      {children}
    </div>
  );
}
