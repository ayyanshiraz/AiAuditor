"use client";
import { useState } from "react";
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
import { KeyRound } from "lucide-react";

interface UserRow {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  disabledAt: string | null;
  createdAt: string;
  lastActivity: string | null;
  companies: { companyId: string; companyName: string; role: string }[];
}

export function UsersOverviewClient({ users }: { users: UserRow[] }) {
  const [list, setList] = useState(users);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  async function toggleDisabled(u: UserRow) {
    const next = !u.disabledAt;
    if (!confirm(`${next ? "Disable" : "Re-enable"} ${u.email}'s account platform-wide?`)) return;
    try {
      await api.patch(`/api/superadmin/users/${u.id}`, { disabled: next });
      setList((prev) => prev.map((x) => (x.id === u.id ? { ...x, disabledAt: next ? new Date().toISOString() : null } : x)));
      toast.success(next ? "Account disabled." : "Account re-enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account.");
    }
  }

  async function deleteAccount(u: UserRow) {
    const ownsCompanies = u.companies.some((c) => c.role === "OWNER");
    const msg = ownsCompanies
      ? `${u.email} owns one or more companies. Delete anyway and cascade-delete those companies too? This cannot be undone.`
      : `Permanently delete ${u.email}'s account? This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/api/superadmin/users/${u.id}${ownsCompanies ? "?cascade=true" : ""}`);
      setList((prev) => prev.filter((x) => x.id !== u.id));
      toast.success("Account deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    }
  }

  async function doResetPassword() {
    if (!resetTarget) return;
    try {
      const { password } = await api.post<{ password: string }>(`/api/superadmin/users/${resetTarget.id}/reset-password`, {
        password: resetPassword || undefined,
      });
      setGeneratedPassword(password);
      setResetPassword("");
      toast.success("Password reset.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>All users ({list.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Companies &amp; roles</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <p className="font-medium">{u.name || "—"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    {u.isSuperAdmin ? (
                      <Badge variant="primary">Platform owner</Badge>
                    ) : u.isAdmin ? (
                      <Badge variant="warning">Admin</Badge>
                    ) : (
                      <Badge variant="outline">Member</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.companies.length === 0 ? (
                      <span className="text-xs text-[var(--muted-foreground)]">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.companies.map((c) => (
                          <Badge key={c.companyId} variant="outline" className="whitespace-nowrap">
                            {c.companyName} · {c.role}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {u.lastActivity ? shortDate(u.lastActivity) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.disabledAt ? "danger" : "success"}>{u.disabledAt ? "Disabled" : "Active"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {!u.isSuperAdmin && (
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setResetTarget(u)}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => toggleDisabled(u)}>
                          {u.disabledAt ? "Enable" : "Disable"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteAccount(u)}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    No users on the platform yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => {
          if (!open) {
            setResetTarget(null);
            setGeneratedPassword(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password{resetTarget ? ` for ${resetTarget.email}` : ""}</DialogTitle>
          </DialogHeader>
          {!generatedPassword ? (
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
                {generatedPassword}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedPassword);
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
                    setGeneratedPassword(null);
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
