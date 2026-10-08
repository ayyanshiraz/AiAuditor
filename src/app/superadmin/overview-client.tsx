"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { shortDate } from "@/components/format";
import { Building2, Users, Shield, Plus, KeyRound } from "lucide-react";

interface AdminCompany {
  id: string;
  name: string;
  members: { userId: string; name: string | null; email: string; role: string }[];
}

interface Admin {
  id: string;
  name: string | null;
  email: string;
  maxCompanies: number | null;
  maxTeamMembers: number | null;
  disabledAt: string | null;
  createdAt: string;
  companiesOwned: number;
  companies: AdminCompany[];
  teamMembers: number;
  lastActivity: string | null;
}

interface ActivityRow {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
  companyName: string | null;
}

export function OverviewClient({
  overview,
  admins,
}: {
  overview: { admins: number; companies: number; users: number; recentActivity: ActivityRow[] };
  admins: Admin[];
}) {
  const [adminList, setAdminList] = useState(admins);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", maxCompanies: "", maxTeamMembers: "" });
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetGenerated, setResetGenerated] = useState<string | null>(null);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { user, generatedPassword } = await api.post<{ user: { id: string; name: string | null; email: string }; generatedPassword: string }>(
        "/api/superadmin/admins",
        {
          name: form.name,
          email: form.email,
          password: form.password || undefined,
          maxCompanies: form.maxCompanies === "" ? null : Number(form.maxCompanies),
          maxTeamMembers: form.maxTeamMembers === "" ? null : Number(form.maxTeamMembers),
        }
      );
      setAdminList((prev) => [
        {
          id: user.id,
          name: user.name,
          email: user.email,
          maxCompanies: form.maxCompanies === "" ? null : Number(form.maxCompanies),
          maxTeamMembers: form.maxTeamMembers === "" ? null : Number(form.maxTeamMembers),
          disabledAt: null,
          createdAt: new Date().toISOString(),
          companiesOwned: 0,
          companies: [],
          teamMembers: 0,
          lastActivity: null,
        },
        ...prev,
      ]);
      setCreateOpen(false);
      setForm({ name: "", email: "", password: "", maxCompanies: "", maxTeamMembers: "" });
      setCredentials({ email: user.email, password: generatedPassword });
      toast.success("Admin account created.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create admin.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDisabled(admin: Admin) {
    const disable = !admin.disabledAt;
    if (!confirm(`${disable ? "Disable" : "Re-enable"} ${admin.email}? ${disable ? "They will be signed out immediately and can't log back in until re-enabled." : ""}`)) return;
    try {
      await api.patch(`/api/superadmin/users/${admin.id}`, { disabled: disable });
      setAdminList((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, disabledAt: disable ? new Date().toISOString() : null } : a))
      );
      toast.success(disable ? "Admin disabled." : "Admin re-enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update admin.");
    }
  }

  async function deleteAdmin(admin: Admin) {
    const msg =
      admin.companiesOwned > 0
        ? `Delete ${admin.email} AND permanently delete all ${admin.companiesOwned} compan${admin.companiesOwned === 1 ? "y" : "ies"} they own, including every transaction? This cannot be undone.`
        : `Permanently delete ${admin.email}? This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/api/superadmin/admins/${admin.id}${admin.companiesOwned > 0 ? "?cascade=true" : ""}`);
      setAdminList((prev) => prev.filter((a) => a.id !== admin.id));
      toast.success("Admin deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete admin.");
    }
  }

  async function doResetPassword() {
    if (!resetTarget) return;
    try {
      const { password } = await api.post<{ password: string }>(`/api/superadmin/users/${resetTarget.id}/reset-password`, {
        password: resetPassword || undefined,
      });
      setResetGenerated(password);
      setResetPassword("");
      toast.success("Password reset.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile icon={Shield} label="Admins" value={overview.admins} />
        <StatTile icon={Building2} label="Companies" value={overview.companies} href="/superadmin/companies" />
        <StatTile icon={Users} label="Users" value={overview.users} href="/superadmin/users" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Admins</CardTitle>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New admin
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Admin</TableHead>
                <TableHead>Companies &amp; users</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminList.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/superadmin/admins/${a.id}`} className="font-medium hover:underline">
                      {a.name || a.email}
                    </Link>
                    <p className="text-xs text-[var(--muted-foreground)]">{a.email}</p>
                  </TableCell>
                  <TableCell>
                    {a.companies.length === 0 ? (
                      <span className="text-xs text-[var(--muted-foreground)]">No companies yet</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {a.companies.map((c) => (
                          <Link key={c.id} href={`/superadmin/companies/${c.id}`} className="text-xs hover:underline">
                            <span className="font-medium">{c.name}</span>{" "}
                            <span className="text-[var(--muted-foreground)]">
                              — {c.members.length} user{c.members.length === 1 ? "" : "s"}
                              {c.members.length > 0 ? `: ${c.members.map((m) => m.name || m.email).join(", ")}` : ""}
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {a.maxCompanies ?? "∞"} companies · {a.maxTeamMembers ?? "∞"} members/company
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {a.lastActivity ? shortDate(a.lastActivity) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.disabledAt ? "danger" : "success"}>{a.disabledAt ? "Disabled" : "Active"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setResetTarget(a)}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleDisabled(a)}>
                        {a.disabledAt ? "Enable" : "Disable"}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteAdmin(a)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {adminList.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    No admin accounts yet. Create the first one above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity across the platform</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Company</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.recentActivity.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(r.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-sm">{r.userName || r.userEmail || "System"}</TableCell>
                  <TableCell className="text-sm">{r.action.replaceAll("_", " ")}</TableCell>
                  <TableCell className="text-sm text-[var(--muted-foreground)]">{r.companyName || "—"}</TableCell>
                </TableRow>
              ))}
              {overview.recentActivity.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-[var(--muted-foreground)]">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create admin account</DialogTitle>
          </DialogHeader>
          <form onSubmit={createAdmin} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Name</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Password (optional — leave blank to auto-generate)</Label>
              <Input
                type="text"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Leave blank to generate one"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Max companies</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={form.maxCompanies}
                  onChange={(e) => setForm({ ...form, maxCompanies: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Max team members</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="Unlimited"
                  value={form.maxTeamMembers}
                  onChange={(e) => setForm({ ...form, maxTeamMembers: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create admin"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!credentials} onOpenChange={(open) => !open && setCredentials(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Admin account created</DialogTitle>
          </DialogHeader>
          {credentials && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-[var(--muted-foreground)]">
                Share these credentials with <strong>{credentials.email}</strong> directly. This password won&apos;t
                be shown again.
              </p>
              <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-sm">
                {credentials.password}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(credentials.password);
                    toast.success("Copied.");
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCredentials(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setResetGenerated(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password{resetTarget ? ` for ${resetTarget.email}` : ""}</DialogTitle>
          </DialogHeader>
          {!resetGenerated ? (
            <div className="flex flex-col gap-3">
              <Input
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Leave blank to auto-generate"
                minLength={8}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetTarget(null)}>
                  Cancel
                </Button>
                <Button onClick={doResetPassword}>Reset password</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-[var(--muted-foreground)]">This won&apos;t be shown again — copy it now.</p>
              <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-sm">
                {resetGenerated}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(resetGenerated);
                    toast.success("Copied.");
                  }}
                >
                  Copy
                </Button>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setResetTarget(null);
                    setResetGenerated(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
}) {
  const body = (
    <CardContent className="flex items-center gap-3 p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      </div>
    </CardContent>
  );
  if (href) {
    return (
      <Link href={href}>
        <Card className="transition-shadow hover:shadow-md">{body}</Card>
      </Link>
    );
  }
  return <Card>{body}</Card>;
}
