import { getSupplierLedger, getSupplierBalance } from "@/server/services/parties";
import { getCompany } from "@/server/services/companies";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { money, shortDate, humanizeType } from "@/components/format";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ companyId: string; supplierId: string }>;
}) {
  const { companyId, supplierId } = await params;
  const [company, ledger, balance] = await Promise.all([
    getCompany(companyId),
    getSupplierLedger(companyId, supplierId),
    getSupplierBalance(companyId, supplierId),
  ]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Supplier statement</CardTitle>
        <div className="text-sm font-semibold">Outstanding: {money(balance, company.baseCurrency)}</div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Entry #</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.map((l, i) => (
              <TableRow key={i}>
                <TableCell>{shortDate(l.date)}</TableCell>
                <TableCell>
                  <a href={`/companies/${companyId}/journal/${l.journalEntryId}`} className="hover:underline">
                    {l.entryNumber}
                  </a>
                </TableCell>
                <TableCell>{l.description}</TableCell>
                <TableCell>{humanizeType(l.transactionType)}</TableCell>
                <TableCell className="text-right tabular-nums">{parseFloat(l.debit) ? money(l.debit, company.baseCurrency) : ""}</TableCell>
                <TableCell className="text-right tabular-nums">{parseFloat(l.credit) ? money(l.credit, company.baseCurrency) : ""}</TableCell>
              </TableRow>
            ))}
            {ledger.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-[var(--muted-foreground)]">
                  No transactions yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
