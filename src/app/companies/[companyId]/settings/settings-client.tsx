"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface CompanyForm {
  name: string;
  legalName: string;
  businessType: string;
  registrationNumber: string;
  taxNumber: string;
  address: string;
  country: string;
  city: string;
  phone: string;
  email: string;
  website: string;
  baseCurrency: string;
  accountingMethod: string;
}

interface Member {
  id: string;
  userId: string;
  role: string;
  name: string | null;
  email: string;
}

const ROLES = ["OWNER", "ADMINISTRATOR", "ACCOUNTANT", "VIEWER"];

export function SettingsClient({ companyId, company, members }: { companyId: string; company: CompanyForm; members: Member[] }) {
  const [form, setForm] = useState(company);
  const [memberList, setMemberList] = useState(members);
  const [saving, setSaving] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "VIEWER", password: "" });
  const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/companies/${companyId}`, form);
      toast.success("Company settings saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { member, generatedPassword } = await api.post<{
        member: { id: string; userId: string; role: string };
        generatedPassword?: string;
      }>(`/api/companies/${companyId}/members`, invite);
      setMemberList((prev) => [...prev.filter((m) => m.userId !== member.userId), { ...member, name: null, email: invite.email }]);
      toast.success("Member added.");
      setInviteOpen(false);
      if (generatedPassword) {
        setNewCredentials({ email: invite.email, password: generatedPassword });
      }
      setInvite({ email: "", role: "VIEWER", password: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add member.");
    }
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Company profile</TabsTrigger>
        <TabsTrigger value="users">Users &amp; permissions</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <Card>
          <CardHeader>
            <CardTitle>Company profile</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid grid-cols-2 gap-3">
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
                ] as [keyof CompanyForm, string][]
              ).map(([key, label]) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <Label>{label}</Label>
                  <Input value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Base currency</Label>
                <Input value={form.baseCurrency} onChange={(e) => setForm({ ...form, baseCurrency: e.target.value.toUpperCase() })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Accounting method</Label>
                <Select value={form.accountingMethod} onValueChange={(v) => setForm({ ...form, accountingMethod: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCRUAL">Accrual</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="users">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Users &amp; permissions</CardTitle>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm">Add member</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add a member</DialogTitle>
                </DialogHeader>
                <form onSubmit={sendInvite} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input type="email" required value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Password (for a brand-new account — ignored if this email already has one)</Label>
                    <Input
                      type="text"
                      required
                      minLength={8}
                      value={invite.password}
                      onChange={(e) => setInvite({ ...invite, password: e.target.value })}
                      placeholder="At least 8 characters — set it yourself, share it with them"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Role</Label>
                    <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Add</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberList.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.name || "—"}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.role}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <Dialog open={!!newCredentials} onOpenChange={(open) => !open && setNewCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New account created</DialogTitle>
          </DialogHeader>
          {newCredentials && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-[var(--muted-foreground)]">
                There was no existing account for <strong>{newCredentials.email}</strong>, so one was created.
                Share this one-time password with them directly — it won&apos;t be shown again, and they should
                change it after signing in.
              </p>
              <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-sm">
                {newCredentials.password}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(newCredentials.password);
                    toast.success("Copied.");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setNewCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
