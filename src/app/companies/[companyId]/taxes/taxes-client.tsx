"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name: string;
}
interface TaxRate {
  id: string;
  name: string;
  rate: string;
  taxType: string;
  isActive: boolean;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function TaxesClient({ companyId, initialTaxRates, accounts }: { companyId: string; initialTaxRates: TaxRate[]; accounts: Account[] }) {
  const [taxRates, setTaxRates] = useState(initialTaxRates);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TaxRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", rate: "", taxType: "Sales Tax", taxAccountId: accounts.find((a) => a.code === "2200")?.id ?? "" });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", rate: "", taxType: "Sales Tax", taxAccountId: accounts.find((a) => a.code === "2200")?.id ?? "" });
    setOpen(true);
  }

  function openEdit(t: TaxRate) {
    setEditing(t);
    setForm({ name: t.name, rate: t.rate, taxType: t.taxType, taxAccountId: "" });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const { taxRate } = await api.patch<{ taxRate: TaxRate }>(`/api/companies/${companyId}/taxes/${editing.id}`, {
          name: form.name,
          rate: Number(form.rate),
        });
        setTaxRates((prev) => prev.map((t) => (t.id === taxRate.id ? taxRate : t)));
        toast.success("Tax rate updated.");
      } else {
        const { taxRate } = await api.post<{ taxRate: TaxRate }>(`/api/companies/${companyId}/taxes`, {
          ...form,
          rate: Number(form.rate),
          effectiveDate: todayStr(),
        });
        setTaxRates((prev) => [...prev, taxRate]);
        toast.success("Tax rate created.");
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save tax rate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(t: TaxRate) {
    if (!confirm(`Delete tax rate "${t.name}"? If it's been used on transactions, it'll be deactivated instead of removed.`)) return;
    try {
      const result = await api.delete<{ deleted: boolean; deactivated: boolean }>(`/api/companies/${companyId}/taxes/${t.id}`);
      if (result.deleted) {
        setTaxRates((prev) => prev.filter((r) => r.id !== t.id));
        toast.success("Tax rate deleted.");
      } else {
        setTaxRates((prev) => prev.map((r) => (r.id === t.id ? { ...r, isActive: false } : r)));
        toast.success("Tax rate has been used on transactions — deactivated instead of deleted.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete tax rate.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Taxes</h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New tax rate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit tax rate" : "New tax rate"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" required value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </div>
              {!editing && (
                <div className="flex flex-col gap-1.5">
                  <Label>Tax type</Label>
                  <Select value={form.taxType} onValueChange={(v) => setForm({ ...form, taxType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Sales Tax", "VAT", "Withholding Tax", "Income Tax", "Other Tax"].map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {!editing && (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Tax account</Label>
                  <Select value={form.taxAccountId} onValueChange={(v) => setForm({ ...form, taxAccountId: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {editing && (
                <p className="col-span-2 text-xs text-[var(--muted-foreground)]">
                  Tax type and account can&apos;t be changed once a rate exists, to keep past transactions consistent.
                </p>
              )}
              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save"}
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
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taxRates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.taxType}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.rate}%</TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? "success" : "outline"}>{t.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {taxRates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                    No tax rates configured yet.
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
