"use client";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { money, shortDate } from "@/components/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Account {
  id: string;
  code: string;
  name: string;
  isCashOrBank: boolean;
}
interface Supplier {
  id: string;
  name: string;
}
interface Asset {
  id: string;
  assetCode: string;
  name: string;
  category: string | null;
  location?: string | null;
  purchaseDate: string;
  purchaseValue: string;
  accumulatedDepreciation: string;
  usefulLifeMonths: number;
  status: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function AssetsClient({
  companyId,
  currency,
  initialAssets,
  accounts,
  suppliers,
}: {
  companyId: string;
  currency: string;
  initialAssets: Asset[];
  accounts: Account[];
  suppliers: Supplier[];
}) {
  const [assets, setAssets] = useState(initialAssets);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [editForm, setEditForm] = useState({ name: "", category: "", location: "" });
  const [editLoading, setEditLoading] = useState(false);

  function openEdit(asset: Asset) {
    setEditing(asset);
    setEditForm({ name: asset.name, category: asset.category ?? "", location: asset.location ?? "" });
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setEditLoading(true);
    try {
      const { asset } = await api.patch<{ asset: Asset }>(`/api/companies/${companyId}/assets/${editing.id}`, editForm);
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, ...asset } : a)));
      toast.success("Asset updated.");
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update asset.");
    } finally {
      setEditLoading(false);
    }
  }
  const cashAccounts = accounts.filter((a) => a.isCashOrBank);
  const fixedAssetAccount = accounts.find((a) => a.code === "1500");
  const accumDeprAccount = accounts.find((a) => a.code === "1590");
  const deprExpenseAccount = accounts.find((a) => a.code === "6990");

  const [form, setForm] = useState({
    name: "",
    category: "",
    purchaseDate: todayStr(),
    purchaseValue: "",
    usefulLifeMonths: "60",
    residualValue: "0",
    supplierId: "",
    paymentAccountId: cashAccounts[0]?.id ?? "",
    isCredit: false,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { asset } = await api.post<{ asset: Asset }>(`/api/companies/${companyId}/assets`, {
        name: form.name,
        category: form.category || undefined,
        purchaseDate: form.purchaseDate,
        purchaseValue: Number(form.purchaseValue),
        usefulLifeMonths: Number(form.usefulLifeMonths),
        residualValue: Number(form.residualValue || 0),
        supplierId: form.supplierId || undefined,
        assetAccountId: fixedAssetAccount?.id,
        accumulatedDeprAccountId: accumDeprAccount?.id,
        depreciationExpenseAccountId: deprExpenseAccount?.id,
        paymentAccountId: form.isCredit ? undefined : form.paymentAccountId,
        isCredit: form.isCredit,
        payableAccountId: form.isCredit ? accounts.find((a) => a.code === "2000")?.id : undefined,
      });
      setAssets((prev) => [...prev, asset]);
      toast.success("Asset registered.");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to register asset.");
    } finally {
      setLoading(false);
    }
  }

  async function depreciate(assetId: string) {
    try {
      await api.post(`/api/companies/${companyId}/assets/${assetId}/depreciate`, { date: todayStr() });
      toast.success("Depreciation recorded.");
      location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record depreciation.");
    }
  }

  async function dispose(asset: Asset) {
    const proceeds = prompt(`Sale proceeds for "${asset.name}" (0 for write-off):`, "0");
    if (proceeds === null) return;
    try {
      await api.post(`/api/companies/${companyId}/assets/${asset.id}/dispose`, {
        date: todayStr(),
        proceeds: Number(proceeds),
        receiptAccountId: Number(proceeds) > 0 ? cashAccounts[0]?.id : undefined,
        gainAccountId: accounts.find((a) => a.code === "4900")?.id,
        lossAccountId: accounts.find((a) => a.code === "6999")?.id,
      });
      toast.success("Asset disposed.");
      location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispose asset.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Assets</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-1 h-4 w-4" /> Register asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register a new asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Asset name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Purchase date</Label>
                <Input type="date" required value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Purchase value</Label>
                <Input type="number" step="0.01" required value={form.purchaseValue} onChange={(e) => setForm({ ...form, purchaseValue: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Residual value</Label>
                <Input type="number" step="0.01" value={form.residualValue} onChange={(e) => setForm({ ...form, residualValue: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Useful life (months)</Label>
                <Input type="number" required value={form.usefulLifeMonths} onChange={(e) => setForm({ ...form, usefulLifeMonths: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Supplier</Label>
                <Select value={form.supplierId || "NONE"} onValueChange={(v) => setForm({ ...form, supplierId: v === "NONE" ? "" : v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">— None —</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isCredit} onChange={(e) => setForm({ ...form, isCredit: e.target.checked })} />
                Purchased on credit (accounts payable)
              </div>
              {!form.isCredit && (
                <div className="col-span-2 flex flex-col gap-1.5">
                  <Label>Payment account</Label>
                  <Select value={form.paymentAccountId} onValueChange={(v) => setForm({ ...form, paymentAccountId: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Register asset"}
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
                <TableHead>Purchase Date</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Accum. Depr.</TableHead>
                <TableHead className="text-right">Net Book Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((a) => {
                const nbv = parseFloat(a.purchaseValue) - parseFloat(a.accumulatedDepreciation);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono">{a.assetCode}</TableCell>
                    <TableCell>{a.name}</TableCell>
                    <TableCell>{shortDate(a.purchaseDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(a.purchaseValue, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(a.accumulatedDepreciation, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(nbv, currency)}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "ACTIVE" ? "success" : "outline"}>{a.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(a)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {a.status === "ACTIVE" && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => depreciate(a.id)}>
                              Depreciate
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => dispose(a)}>
                              Dispose
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {assets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-[var(--muted-foreground)]">
                    No assets registered yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit asset</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Asset name</Label>
              <Input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Input value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Location</Label>
              <Input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
            </div>
            <p className="col-span-2 text-xs text-[var(--muted-foreground)]">
              Cost, useful life, and depreciation figures can&apos;t be edited here since they already fed a posted journal entry —
              use Depreciate or Dispose to change financial figures.
            </p>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}>
                {editLoading ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
