"use client";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money, shortDate, humanizeType } from "@/components/format";
import { api } from "@/lib/api-client";

interface Account {
  id: string;
  code: string;
  name: string;
}

interface LedgerLine {
  date: string;
  journalEntryId: string;
  entryNumber: string;
  reference: string | null;
  description: string | null;
  transactionType: string;
  debit: string;
  credit: string;
  runningBalance: string;
}

interface LedgerResponse {
  account: { code: string; name: string };
  openingBalance: string;
  closingBalance: string;
  lines: LedgerLine[];
}

export function LedgerView({ companyId, currency, initialAccountId }: { companyId: string; currency: string; initialAccountId?: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState(initialAccountId ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ledger, setLedger] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<{ accounts: Account[] }>(`/api/companies/${companyId}/accounts?activeOnly=true`).then((res) => {
      setAccounts(res.accounts);
      if (!accountId && res.accounts.length > 0) setAccountId(initialAccountId ?? res.accounts[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    api
      .get<LedgerResponse>(`/api/companies/${companyId}/accounts/${accountId}/ledger?${params.toString()}`)
      .then(setLedger)
      .finally(() => setLoading(false));
  }, [companyId, accountId, from, to]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Account</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select an account" />
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
        <div className="flex flex-col gap-1.5">
          <Label>From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Running Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ledger && (
                <TableRow className="bg-[var(--surface-muted)] font-medium">
                  <TableCell colSpan={5}>Opening balance</TableCell>
                  <TableCell className="text-right tabular-nums">{money(ledger.openingBalance, currency)}</TableCell>
                </TableRow>
              )}
              {ledger?.lines.map((l, idx) => (
                <TableRow key={idx}>
                  <TableCell>{shortDate(l.date)}</TableCell>
                  <TableCell>
                    <a href={`/companies/${companyId}/journal/${l.journalEntryId}`} className="hover:underline">
                      {l.entryNumber}
                    </a>
                  </TableCell>
                  <TableCell className="max-w-[280px] truncate" title={l.description ?? ""}>
                    {l.description || humanizeType(l.transactionType)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{parseFloat(l.debit) ? money(l.debit, currency) : ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{parseFloat(l.credit) ? money(l.credit, currency) : ""}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(l.runningBalance, currency)}</TableCell>
                </TableRow>
              ))}
              {ledger && ledger.lines.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    No posted activity in this range.
                  </TableCell>
                </TableRow>
              )}
              {ledger && (
                <TableRow className="bg-[var(--surface-muted)] font-semibold">
                  <TableCell colSpan={5}>Closing balance</TableCell>
                  <TableCell className="text-right tabular-nums">{money(ledger.closingBalance, currency)}</TableCell>
                </TableRow>
              )}
              {!ledger && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                    Select an account to view its ledger.
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
