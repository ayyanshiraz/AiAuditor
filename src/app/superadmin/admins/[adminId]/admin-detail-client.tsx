"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, ExternalLink, KeyRound } from "lucide-react";

interface Admin {
  id: string;
  name: string | null;
  email: string;
  maxCompanies: number | null;
  maxTeamMembers: number | null;
  disabledAt: string | null;
  createdAt: string;
}

interface CompanyRow {
  id: string;
  name: string;
  baseCurrency: string;
  archivedAt: string | null;
  createdAt: string;
  memberCount: number;
  lastActivity: string | null;
}

export function AdminDetailClient({ admin, companies }: { admin: Admin; companies: CompanyRow[] }) {
  const router = useRouter();
  const [limits, setLimits] = useState({
    maxCompanies: admin.maxCompanies === null ? "" : String(admin.maxCompanies),
    maxTeamMembers: admin.maxTeamMembers === null ? "" : String(admin.maxTeamMembers),
  });
  const [saving, setSaving] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(!!admin.disabledAt);

  async function saveLimits() {
    setSaving(true);
    try {
      await api.patch(`/api/superadmin/admins/${admin.id}`, {
        maxCompanies: limits.maxCompanies === "" ? null : Number(limits.maxCompanies),
        maxTeamMembers: limits.maxTeamMembers === "" ? null : Number(limits.maxTeamMembers),
      });
      toast.success("Limits updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update limits.");
    } finally {
      setSaving(false);
    }
  }

  async function doResetPassword() {
    try {
      const { password } = await api.post<{ password: string }>(`/api/superadmin/users/${admin.id}/reset-password`, {
        password: resetPassword || undefined,
      });
      setGeneratedPassword(password);
      setResetPassword("");
      toast.success("Password reset.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password.");
    }
  }

  async function toggleDisabled() {
    const next = !disabled;
    if (!confirm(`${next ? "Disable" : "Re-enable"} ${admin.email}?`)) return;
    try {
      await api.patch(`/api/superadmin/users/${admin.id}`, { disabled: next });
      setDisabled(next);
      toast.success(next ? "Admin disabled." : "Admin re-enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update admin.");
    }
  }

  async function deleteAdmin() {
    const hasCompanies = companies.length > 0;
    const msg = hasCompanies
      ? `Delete ${admin.email} AND permanently delete all ${companies.length} compan${companies.length === 1 ? "y" : "ies"} they own, including every transaction? This cannot be undone.`
      : `Permanently delete ${admin.email}? This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      await api.delete(`/api/superadmin/admins/${admin.id}${hasCompanies ? "?cascade=true" : ""}`);
      toast.success("Admin deleted.");
      router.push("/superadmin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete admin.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/superadmin" className="flex w-fit items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> All admins
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{admin.name || admin.email}</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              {admin.email} · joined {shortDate(admin.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={disabled ? "danger" : "success"}>{disabled ? "Disabled" : "Active"}</Badge>
            <Button size="sm" variant="outline" onClick={() => setResetDialogOpen(true)}>
              <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Reset password
            </Button>
            <Button size="sm" variant="outline" onClick={toggleDisabled}>
              {disabled ? "Enable" : "Disable"}
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteAdmin}>
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Max companies</Label>
            <Input
              type="number"
              min={0}
              placeholder="Unlimited"
              value={limits.maxCompanies}
              onChange={(e) => setLimits({ ...limits, maxCompanies: e.target.value })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Max team members</Label>
            <Input
              type="number"
              min={0}
              placeholder="Unlimited"
              value={limits.maxTeamMembers}
              onChange={(e) => setLimits({ ...limits, maxTeamMembers: e.target.value })}
            />
          </div>
          <div className="col-span-2 flex items-end sm:col-span-2">
            <Button size="sm" onClick={saveLimits} disabled={saving}>
              {saving ? "Saving…" : "Save limits"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Companies owned ({companies.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link href={`/superadmin/companies/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    {c.archivedAt && (
                      <Badge variant="outline" className="ml-2">
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{c.memberCount}</TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {c.lastActivity ? shortDate(c.lastActivity) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">{shortDate(c.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/companies/${c.id}/dashboard`}
                      className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
                    >
                      Open books <ExternalLink className="h-3 w-3" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                    This admin doesn&apos;t own any companies yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open);
          if (!open) setGeneratedPassword(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {admin.email}</DialogTitle>
          </DialogHeader>
          {!generatedPassword ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>New password (optional — leave blank to auto-generate)</Label>
                <Input
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Leave blank to generate one"
                  minLength={8}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={doResetPassword}>Reset password</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-[var(--muted-foreground)]">
                This won&apos;t be shown again — copy it now and share it with {admin.email} directly.
              </p>
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
                <Button onClick={() => setResetDialogOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
