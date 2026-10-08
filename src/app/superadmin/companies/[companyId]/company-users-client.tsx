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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { shortDate } from "@/components/format";
import { ArrowLeft, ExternalLink, KeyRound } from "lucide-react";

interface Member {
  membershipId: string;
  userId: string;
  name: string | null;
  email: string;
  role: string;
  disabledAt: string | null;
  joinedAt: string;
  lastActivity: string | null;
}

interface CompanyDetail {
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
  archivedAt: string | null;
  createdAt: string;
}

const ROLES = ["OWNER", "ADMINISTRATOR", "ACCOUNTANT", "VIEWER"];

export function CompanyUsersClient({
  company,
  owner,
  members,
}: {
  company: CompanyDetail;
  owner: { id: string; name: string | null; email: string } | null;
  members: Member[];
}) {
  const router = useRouter();
  const [list, setList] = useState(members);
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: company.name,
    legalName: company.legalName ?? "",
    businessType: company.businessType ?? "",
    registrationNumber: company.registrationNumber ?? "",
    taxNumber: company.taxNumber ?? "",
    address: company.address ?? "",
    country: company.country ?? "",
    city: company.city ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    website: company.website ?? "",
    baseCurrency: company.baseCurrency,
  });
  const [maxTeamMembersStr, setMaxTeamMembersStr] = useState(company.maxTeamMembers === null ? "" : String(company.maxTeamMembers));
  const [savingProfile, setSavingProfile] = useState(false);
  const [archived, setArchived] = useState(!!company.archivedAt);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await api.patch(`/api/superadmin/companies/${company.id}`, {
        ...profile,
        maxTeamMembers: maxTeamMembersStr === "" ? null : Number(maxTeamMembersStr),
      });
      toast.success("Company details saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save company details.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function toggleArchived() {
    const next = !archived;
    try {
      await api.patch(`/api/superadmin/companies/${company.id}`, { archived: next });
      setArchived(next);
      toast.success(next ? "Company archived." : "Company reactivated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update company.");
    }
  }

  async function deleteCompany() {
    if (!confirm(`Permanently delete ${company.name}, including every transaction, account, and member link? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/superadmin/companies/${company.id}`);
      toast.success("Company deleted.");
      router.push("/superadmin/companies");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete company.");
    }
  }

  async function changeRole(member: Member, role: string) {
    try {
      await api.post(`/api/companies/${company.id}/members`, { email: member.email, role });
      setList((prev) => prev.map((m) => (m.userId === member.userId ? { ...m, role } : m)));
      toast.success("Role updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role.");
    }
  }

  async function removeFromCompany(member: Member) {
    if (!confirm(`Remove ${member.email} from ${company.name}? Their account itself isn't deleted.`)) return;
    try {
      await api.delete(`/api/superadmin/companies/${company.id}/users/${member.userId}`);
      setList((prev) => prev.filter((m) => m.userId !== member.userId));
      toast.success("Removed from company.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove.");
    }
  }

  async function toggleDisabled(member: Member) {
    const next = !member.disabledAt;
    if (!confirm(`${next ? "Disable" : "Re-enable"} ${member.email}'s account platform-wide?`)) return;
    try {
      await api.patch(`/api/superadmin/users/${member.userId}`, { disabled: next });
      setList((prev) => prev.map((m) => (m.userId === member.userId ? { ...m, disabledAt: next ? new Date().toISOString() : null } : m)));
      toast.success(next ? "Account disabled." : "Account re-enabled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update account.");
    }
  }

  async function deleteAccount(member: Member) {
    if (!confirm(`Permanently delete ${member.email}'s account? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/superadmin/users/${member.userId}`);
      setList((prev) => prev.filter((m) => m.userId !== member.userId));
      toast.success("Account deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete account.");
    }
  }

  async function doResetPassword() {
    if (!resetTarget) return;
    try {
      const { password } = await api.post<{ password: string }>(`/api/superadmin/users/${resetTarget.userId}/reset-password`, {
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
      <Link href="/superadmin/companies" className="flex w-fit items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" /> All companies
      </Link>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{company.name}</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              Owner: {owner ? `${owner.name || owner.email} (${owner.email})` : "—"} · created {shortDate(company.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={archived ? "outline" : "success"}>{archived ? "Archived" : "Active"}</Badge>
            <Link
              href={`/companies/${company.id}/dashboard`}
              className="inline-flex items-center gap-1 text-sm text-[var(--primary)] hover:underline"
            >
              Open books <ExternalLink className="h-3.5 w-3.5" />
            </Link>
            <Button size="sm" variant="outline" onClick={toggleArchived}>
              {archived ? "Reactivate" : "Archive"}
            </Button>
            <Button size="sm" variant="destructive" onClick={deleteCompany}>
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            ] as [keyof typeof profile, string][]
          ).map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1.5">
              <Label className="text-xs">{label}</Label>
              <Input value={profile[key]} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} />
            </div>
          ))}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Address</Label>
            <Input value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Max team members (this company)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Unlimited"
              value={maxTeamMembersStr}
              onChange={(e) => setMaxTeamMembersStr(e.target.value)}
            />
          </div>
          <div className="col-span-2 flex items-end sm:col-span-3">
            <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save company details"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Users in this company ({list.length}{company.maxTeamMembers !== null ? ` / ${company.maxTeamMembers + 1} incl. owner` : ""})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((m) => (
                <TableRow key={m.membershipId}>
                  <TableCell>
                    <p className="font-medium">{m.name || "—"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{m.email}</p>
                  </TableCell>
                  <TableCell>
                    <Select value={m.role} onValueChange={(v) => changeRole(m, v)}>
                      <SelectTrigger className="w-40">
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
                  </TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">{shortDate(m.joinedAt)}</TableCell>
                  <TableCell className="text-xs text-[var(--muted-foreground)]">
                    {m.lastActivity ? shortDate(m.lastActivity) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={m.disabledAt ? "danger" : "success"}>{m.disabledAt ? "Disabled" : "Active"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setResetTarget(m)}>
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleDisabled(m)}>
                        {m.disabledAt ? "Enable" : "Disable"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => removeFromCompany(m)}>
                        Remove
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteAccount(m)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    No users in this company.
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
