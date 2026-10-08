"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { shortDate } from "@/components/format";
import { ExternalLink, Plus, Pencil, Trash2 } from "lucide-react";

interface CompanyRow {
  id: string;
  name: string;
  legalName: string | null;
  businessType: string | null;
  registrationNumber: string | null;
  taxNumber: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  baseCurrency: string;
  maxTeamMembers: number | null;
  memberCount: number;
  ownerId: string | null;
  ownerName: string | null;
  ownerEmail: string | null;
  lastActivity: string | null;
  createdAt: string;
  archivedAt: string | null;
}

const emptyNewCompany = {
  name: "",
  legalName: "",
  phone: "",
  email: "",
  country: "",
  city: "",
  baseCurrency: "PKR",
};

export function CompaniesOverviewClient({ companies }: { companies: CompanyRow[] }) {
  const [list, setList] = useState(companies);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCompany, setNewCompany] = useState(emptyNewCompany);
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<CompanyRow | null>(null);
  const [editForm, setEditForm] = useState<Partial<CompanyRow> & { maxTeamMembersStr?: string }>({});
  const [saving, setSaving] = useState(false);

  async function createCompanyForSelf(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const { company } = await api.post<{ company: CompanyRow }>("/api/companies", newCompany);
      setList((prev) => [
        {
          ...company,
          businessType: null,
          registrationNumber: null,
          taxNumber: null,
          address: null,
          website: null,
          maxTeamMembers: null,
          memberCount: 1,
          ownerId: null,
          ownerName: "You (Platform owner)",
          ownerEmail: null,
          lastActivity: null,
          archivedAt: null,
        },
        ...prev,
      ]);
      toast.success("Company created for your own account.");
      setCreateOpen(false);
      setNewCompany(emptyNewCompany);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create company.");
    } finally {
      setCreating(false);
    }
  }

  function openEdit(c: CompanyRow) {
    setEditTarget(c);
    setEditForm({
      name: c.name,
      legalName: c.legalName ?? "",
      businessType: c.businessType ?? "",
      registrationNumber: c.registrationNumber ?? "",
      taxNumber: c.taxNumber ?? "",
      address: c.address ?? "",
      country: c.country ?? "",
      city: c.city ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      website: c.website ?? "",
      baseCurrency: c.baseCurrency,
      maxTeamMembersStr: c.maxTeamMembers === null ? "" : String(c.maxTeamMembers),
    });
  }

  async function saveEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const { maxTeamMembersStr, ...rest } = editForm;
      const payload = {
        ...rest,
        maxTeamMembers: maxTeamMembersStr === "" || maxTeamMembersStr === undefined ? null : Number(maxTeamMembersStr),
      };
      const { company } = await api.patch<{ company: CompanyRow }>(`/api/superadmin/companies/${editTarget.id}`, payload);
      setList((prev) => prev.map((c) => (c.id === editTarget.id ? { ...c, ...company } : c)));
      toast.success("Company updated.");
      setEditTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update company.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCompany(c: CompanyRow) {
    if (!confirm(`Permanently delete ${c.name}, including every transaction and user membership? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/superadmin/companies/${c.id}`);
      setList((prev) => prev.filter((x) => x.id !== c.id));
      toast.success("Company deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>All companies ({list.length})</CardTitle>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New company (for me)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a company under your own platform-owner account</DialogTitle>
              </DialogHeader>
              <form onSubmit={createCompanyForSelf} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Company name</Label>
                  <Input required value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Legal name</Label>
                    <Input value={newCompany.legalName} onChange={(e) => setNewCompany({ ...newCompany, legalName: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Base currency</Label>
                    <Input
                      value={newCompany.baseCurrency}
                      onChange={(e) => setNewCompany({ ...newCompany, baseCurrency: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Phone</Label>
                    <Input value={newCompany.phone} onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={newCompany.email} onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Country</Label>
                    <Input value={newCompany.country} onChange={(e) => setNewCompany({ ...newCompany, country: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>City</Label>
                    <Input value={newCompany.city} onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating}>
                    {creating ? "Creating…" : "Create company"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/superadmin/companies/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <p className="text-xs text-[var(--muted-foreground)]">{c.legalName || c.country || "—"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{c.ownerName || "—"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{c.ownerEmail}</p>
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    <p>{c.phone || "—"}</p>
                    <p>{c.email || "—"}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.memberCount} {c.maxTeamMembers !== null ? `/ ${c.maxTeamMembers}` : ""}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {c.lastActivity ? shortDate(c.lastActivity) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.archivedAt ? "outline" : "success"}>{c.archivedAt ? "Archived" : "Active"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Link
                        href={`/companies/${c.id}/dashboard`}
                        className="inline-flex items-center gap-1 px-1 text-sm text-[var(--primary)] hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteCompany(c)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No companies on the platform yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit {editTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["name", "Company name"],
                ["legalName", "Legal name"],
                ["businessType", "Business type"],
                ["registrationNumber", "Registration number"],
                ["taxNumber", "Tax number"],
                ["country", "Country"],
                ["city", "City"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["website", "Website"],
                ["baseCurrency", "Base currency"],
              ] as [keyof CompanyRow, string][]
            ).map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1.5">
                <Label>{label}</Label>
                <Input
                  value={(editForm[key] as string) ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <Label>Max team members (this company)</Label>
              <Input
                type="number"
                min={0}
                placeholder="Unlimited"
                value={editForm.maxTeamMembersStr ?? ""}
                onChange={(e) => setEditForm({ ...editForm, maxTeamMembersStr: e.target.value })}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Address</Label>
              <Input value={(editForm.address as string) ?? ""} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
