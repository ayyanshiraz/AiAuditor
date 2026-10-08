"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { money, shortDate, humanizeType } from "@/components/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { AttachmentsPanel } from "@/components/accounting/attachments-panel";
import { Trash2, Plus } from "lucide-react";

interface Line {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: string;
  credit: string;
  description: string | null;
}

interface Entry {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference: string | null;
  transactionType: string;
  status: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
}

interface EditLine {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
}

export function EntryDetailClient({
  companyId,
  currency,
  entry,
  lines,
  accounts,
}: {
  companyId: string;
  currency: string;
  entry: Entry;
  lines: Line[];
  accounts: Account[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState(entry.entryDate.slice(0, 10));
  const [editDescription, setEditDescription] = useState(entry.description);
  const [editReference, setEditReference] = useState(entry.reference ?? "");
  const [editLines, setEditLines] = useState<EditLine[]>(() =>
    lines.map((l) => ({
      accountId: l.accountId,
      debit: parseFloat(l.debit) ? l.debit : "",
      credit: parseFloat(l.credit) ? l.credit : "",
      description: l.description ?? "",
    }))
  );

  const totalDebit = lines.reduce((s, l) => s + parseFloat(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + parseFloat(l.credit), 0);

  const editDebitTotal = editLines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const editCreditTotal = editLines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const editBalanced = Math.abs(editDebitTotal - editCreditTotal) < 0.005 && editDebitTotal > 0;

  async function post() {
    setBusy(true);
    try {
      await api.post(`/api/companies/${companyId}/journal-entries/${entry.id}/post`);
      toast.success("Entry posted.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post entry.");
    } finally {
      setBusy(false);
    }
  }

  async function reverse() {
    if (!confirm("Reverse this posted entry? This creates an equal-and-opposite correcting entry.")) return;
    setBusy(true);
    try {
      await api.post(`/api/companies/${companyId}/journal-entries/${entry.id}/reverse`, {});
      toast.success("Entry reversed.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reverse entry.");
    } finally {
      setBusy(false);
    }
  }

  async function voidEntry() {
    if (!confirm("Void this draft entry? It will be marked VOIDED and kept in the audit trail.")) return;
    setBusy(true);
    try {
      await api.post(`/api/companies/${companyId}/journal-entries/${entry.id}/void`);
      toast.success("Entry voided.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void entry.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEntry() {
    if (!confirm("Permanently delete this draft entry? This cannot be undone.")) return;
    setBusy(true);
    try {
      await api.delete(`/api/companies/${companyId}/journal-entries/${entry.id}`);
      toast.success("Entry deleted.");
      router.push(`/companies/${companyId}/journal`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete entry.");
      setBusy(false);
    }
  }

  function updateLine(idx: number, patch: Partial<EditLine>) {
    setEditLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setEditLines((prev) => [...prev, { accountId: accounts[0]?.id ?? "", debit: "", credit: "", description: "" }]);
  }

  function removeLine(idx: number) {
    setEditLines((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function cancelEdit() {
    setEditDate(entry.entryDate.slice(0, 10));
    setEditDescription(entry.description);
    setEditReference(entry.reference ?? "");
    setEditLines(
      lines.map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) ? l.debit : "",
        credit: parseFloat(l.credit) ? l.credit : "",
        description: l.description ?? "",
      }))
    );
    setEditing(false);
  }

  async function saveEdit() {
    if (!editBalanced) {
      toast.error("Debits and credits must balance before saving.");
      return;
    }
    setBusy(true);
    try {
      await api.patch(`/api/companies/${companyId}/journal-entries/${entry.id}`, {
        entryDate: editDate,
        description: editDescription,
        reference: editReference || undefined,
        lines: editLines.map((l) => ({
          accountId: l.accountId,
          debit: Number(l.debit || 0),
          credit: Number(l.credit || 0),
          description: l.description || undefined,
        })),
      });
      toast.success("Entry updated.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update entry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">{entry.entryNumber}</CardTitle>
            <p className="text-sm text-[var(--muted-foreground)]">
              {shortDate(entry.entryDate)} · {humanizeType(entry.transactionType)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                entry.status === "POSTED" ? "success" : entry.status === "DRAFT" ? "warning" : entry.status === "VOIDED" ? "danger" : "outline"
              }
            >
              {entry.status}
            </Badge>
            {entry.status === "DRAFT" && !editing && (
              <>
                <Button size="sm" onClick={post} disabled={busy}>
                  Post
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" onClick={voidEntry} disabled={busy}>
                  Void
                </Button>
                <Button size="sm" variant="destructive" onClick={deleteEntry} disabled={busy}>
                  Delete
                </Button>
              </>
            )}
            {entry.status === "POSTED" && (
              <Button size="sm" variant="destructive" onClick={reverse} disabled={busy}>
                Reverse
              </Button>
            )}
          </div>
        </CardHeader>
        {!editing && (
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-[var(--muted-foreground)]">Description</p>
              <p>{entry.description}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)]">Reference</p>
              <p>{entry.reference || "—"}</p>
            </div>
          </CardContent>
        )}
        {editing && (
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Date</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Reference</Label>
              <Input value={editReference} onChange={(e) => setEditReference(e.target.value)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-1">
              <Label className="text-xs">Description</Label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Journal lines</CardTitle>
          {editing && (
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add line
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {!editing ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.accountCode} — {l.accountName}
                    </TableCell>
                    <TableCell className="text-[var(--muted-foreground)]">{l.description}</TableCell>
                    <TableCell className="text-right tabular-nums">{parseFloat(l.debit) ? money(l.debit, currency) : ""}</TableCell>
                    <TableCell className="text-right tabular-nums">{parseFloat(l.credit) ? money(l.credit, currency) : ""}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-[var(--surface-muted)] font-semibold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right tabular-nums">{money(totalDebit, currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(totalCredit, currency)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-36 text-right">Debit</TableHead>
                    <TableHead className="w-36 text-right">Credit</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editLines.map((l, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Select value={l.accountId} onValueChange={(v) => updateLine(idx, { accountId: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.code} — {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={l.description} onChange={(e) => updateLine(idx, { description: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={l.debit}
                          onChange={(e) => updateLine(idx, { debit: e.target.value, credit: e.target.value ? "" : l.credit })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={l.credit}
                          onChange={(e) => updateLine(idx, { credit: e.target.value, debit: e.target.value ? "" : l.debit })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => removeLine(idx)} disabled={editLines.length <= 2}>
                          <Trash2 className="h-3.5 w-3.5 text-[var(--danger)]" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-[var(--surface-muted)] font-semibold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right tabular-nums">{money(editDebitTotal, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(editCreditTotal, currency)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
              {!editBalanced && (
                <p className="text-sm text-[var(--danger)]">Debits and credits must balance before saving.</p>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelEdit} disabled={busy}>
                  Cancel
                </Button>
                <Button onClick={saveEdit} disabled={busy || !editBalanced}>
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AttachmentsPanel companyId={companyId} journalEntryId={entry.id} canEdit={entry.status !== "VOIDED"} />
    </div>
  );
}
