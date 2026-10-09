import Link from "next/link";
import { getCompany } from "@/server/services/companies";
import { getTrialBalance } from "@/server/services/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { money } from "@/components/format";
import { ReportToolbar } from "@/components/accounting/report-toolbar";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default async function TrialBalancePage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ asOf?: string }>;
}) {
  const { companyId } = await params;
  const { asOf } = await searchParams;
  const company = await getCompany(companyId);
  const asOfDate = asOf ? new Date(asOf) : new Date();
  const report = await getTrialBalance(companyId, asOfDate);

  return (
    <div className="flex flex-col gap-4">
      <ReportToolbar dateFields={[{ name: "asOf", label: "As of", value: asOf }]} />

      <Card id="report-content">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{company.name} — Trial Balance</CardTitle>
            <p className="text-xs text-[var(--muted-foreground)]">
              As of {asOfDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "2-digit" })} · {company.baseCurrency} · Generated{" "}
              {new Date().toLocaleString()}
            </p>
          </div>
          {report.isBalanced ? (
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Balanced
            </Badge>
          ) : (
            <Badge variant="danger">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" /> Out of balance
            </Badge>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((r) => (
                <TableRow key={r.accountId}>
                  <TableCell className="font-mono">{r.code}</TableCell>
                  <TableCell>
                    <Link href={`/companies/${companyId}/accounts/${r.accountId}`} className="hover:underline">
                      {r.name}
                    </Link>
                  </TableCell>
                  <TableCell>{r.type}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {parseFloat(r.debitBalance) ? money(r.debitBalance, company.baseCurrency) : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {parseFloat(r.creditBalance) ? money(r.creditBalance, company.baseCurrency) : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end gap-8 border-t border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 font-semibold">
            <span>Total Debit: {money(report.totalDebit, company.baseCurrency)}</span>
            <span>Total Credit: {money(report.totalCredit, company.baseCurrency)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
