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
import { money } from "@/components/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface PartyRow {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address?: string | null;
  taxNumber: string | null;
  balance: string;
  isActive: boolean;
}

const emptyForm = { name: "", company: "", email: "", phone: "", address: "", taxNumber: "", openingBalance: "0", notes: "" };

export function PartiesClient({
  companyId,
  currency,
  kind,
  title,
  balanceLabel,
  initialRows,
}: {
  companyId: string;
  currency: string;
  kind: "customers" | "suppliers";
  title: string;
  balanceLabel: string;
  initialRows: PartyRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartyRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const singular = title.slice(0, -1);
  const key = kind === "customers" ? "customer" : "supplier";

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(row: PartyRow) {
    setEditing(row);
    setForm({
      name: row.name,
      company: row.company ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      address: row.address ?? "",
      taxNumber: row.taxNumber ?? "",
      openingBalance: "0",
      notes: "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const res = await api.patch<Record<string, PartyRow>>(`/api/companies/${companyId}/${kind}/${editing.id}`, {
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          address: form.address,
          taxNumber: form.taxNumber,
          notes: form.notes,
        });
        setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...res[key] } : r)));
        toast.success(`${singular} updated.`);
      } else {
        const res = await api.post<Record<string, PartyRow>>(`/api/companies/${companyId}/${kind}`, {
          ...form,
          openingBalance: Number(form.openingBalance || 0),
        });
        setRows((prev) => [...prev, { ...res[key], balance: form.openingBalance || "0" }]);
        toast.success(`${singular} added.`);
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(row: PartyRow) {
    if (!confirm(`Delete "${row.name}"? If they have transaction history, they'll be deactivated instead of removed.`)) return;
    try {
      const result = await api.delete<{ deleted: boolean; deactivated: boolean }>(`/api/companies/${companyId}/${kind}/${row.id}`);
      if (result.deleted) {
        setRows((prev) => prev.filter((r) => r.id !== row.id));
        toast.success(`${singular} deleted.`);
      } else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isActive: false } : r)));
        toast.success(`${singular} has transaction history — deactivated instead of deleted.`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{title}</h1>
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
              <Plus className="mr-1 h-4 w-4" /> New {singular.toLowerCase()}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Tax number</Label>
                <Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              {!editing && (
                <div className="flex flex-col gap-1.5">
                  <Label>Opening balance</Label>
                  <Input type="number" step="0.01" value={form.openingBalance} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} />
                </div>
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
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">{balanceLabel}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <a href={`/companies/${companyId}/${kind}/${r.id}`} className="hover:underline">
                      {r.name}
                    </a>
                  </TableCell>
                  <TableCell>{r.company || "—"}</TableCell>
                  <TableCell>{r.email || "—"}</TableCell>
                  <TableCell>{r.phone || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(r.balance, currency)}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "success" : "outline"}>{r.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(r)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No {title.toLowerCase()} yet.
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
