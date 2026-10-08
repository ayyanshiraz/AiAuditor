"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string | null;
  normalBalance: string;
  isActive: boolean;
  isCashOrBank: boolean;
  isSystem?: boolean;
  description?: string | null;
}

const TYPES = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "COGS", "EXPENSE"];
const emptyForm = { code: "", name: "", type: "ASSET", normalBalance: "DEBIT", isCashOrBank: false, description: "" };

export function AccountsClient({ companyId, initialAccounts }: { companyId: string; initialAccounts: Account[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    return accounts.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (search && !`${a.code} ${a.name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [accounts, search, typeFilter]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(account: Account) {
    setEditing(account);
    setForm({
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: account.normalBalance,
      isCashOrBank: account.isCashOrBank,
      description: account.description ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const { account } = await api.patch<{ account: Account }>(`/api/companies/${companyId}/accounts/${editing.id}`, {
          name: form.name,
          description: form.description,
          isCashOrBank: form.isCashOrBank,
        });
        setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, ...account } : a)));
        toast.success("Account updated.");
      } else {
        const { account } = await api.post<{ account: Account }>(`/api/companies/${companyId}/accounts`, form);
        setAccounts((prev) => [...prev, account].sort((a, b) => a.code.localeCompare(b.code)));
        toast.success("Account created.");
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save account.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(account: Account) {
    try {
      const { account: updated } = await api.patch<{ account: Account }>(
        `/api/companies/${companyId}/accounts/${account.id}`,
        { isActive: !account.isActive }
      );
      setAccounts((prev) => prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account.");
    }
  }

  async function handleDelete(account: Account) {
    if (!confirm(`Delete account "${account.code} — ${account.name}"? If it has posted activity, it'll be deactivated instead of removed.`)) return;
    try {
      const result = await api.delete<{ deleted: boolean; deactivated: boolean }>(`/api/companies/${companyId}/accounts/${account.id}`);
      if (result.deleted) {
        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
        toast.success("Account deleted.");
      } else {
        setAccounts((prev) => prev.map((a) => (a.id === account.id ? { ...a, isActive: false } : a)));
        toast.success("Account has posted activity — deactivated instead of deleted.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
            <Input placeholder="Search accounts…" className="w-56 pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditing(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Code</Label>
                <Input required disabled={!!editing} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })} disabled={!!editing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Normal balance</Label>
                <Select value={form.normalBalance} onValueChange={(v) => setForm({ ...form, normalBalance: v })} disabled={!!editing}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBIT">Debit</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing && (
                <p className="col-span-2 text-xs text-[var(--muted-foreground)]">
                  Code, type, and normal balance can&apos;t be changed once an account exists, to keep past journal entries consistent.
                </p>
              )}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <label className="col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isCashOrBank}
                  onChange={(e) => setForm({ ...form, isCashOrBank: e.target.checked })}
                />
                Treat as cash/bank account (used for cash-flow classification)
              </label>
              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : editing ? "Save changes" : "Create account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Normal Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono">{a.code}</TableCell>
                  <TableCell>
                    <button className="hover:underline" onClick={() => router.push(`/companies/${companyId}/accounts/${a.id}`)}>
                      {a.name}
                    </button>
                    {a.isCashOrBank && (
                      <Badge variant="outline" className="ml-2">
                        Cash/Bank
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{a.type}</TableCell>
                  <TableCell>{a.normalBalance}</TableCell>
                  <TableCell>
                    <Badge variant={a.isActive ? "success" : "outline"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(a)}>
                        {a.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      {!a.isSystem && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(a)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    No accounts match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
