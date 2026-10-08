"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { shortDate, humanizeType } from "@/components/format";

interface EntryRow {
  id: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  reference: string | null;
  transactionType: string;
  status: string;
  createdByName: string | null;
  createdByEmail: string | null;
}

const STATUSES = ["DRAFT", "POSTED", "REVERSED", "VOIDED"];

export function JournalClient({ companyId }: { companyId: string; currency: string }) {
  const [rows, setRows] = useState<EntryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ from: "", to: "", status: "ALL", search: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.status !== "ALL") params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);

    api
      .get<{ rows: EntryRow[]; total: number }>(`/api/companies/${companyId}/journal-entries?${params.toString()}`)
      .then((res) => {
        setRows(res.rows);
        setTotal(res.total);
      })
      .finally(() => setLoading(false));
  }, [companyId, page, filters]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>From</Label>
          <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>To</Label>
          <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Search</Label>
          <Input
            placeholder="Description, entry #, reference…"
            className="w-64"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setFilters({ from: "", to: "", status: "ALL", search: "" });
            setPage(1);
          }}
        >
          Reset filters
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/companies/${companyId}/journal/${r.id}`} className="font-mono hover:underline">
                      {r.entryNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{shortDate(r.entryDate)}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{r.description}</TableCell>
                  <TableCell>{r.reference}</TableCell>
                  <TableCell>{humanizeType(r.transactionType)}</TableCell>
                  <TableCell>{r.createdByName || r.createdByEmail}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === "POSTED" ? "success" : r.status === "DRAFT" ? "warning" : r.status === "VOIDED" ? "danger" : "outline"
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No journal entries match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-[var(--muted-foreground)]">
        <span>
          Page {page} of {totalPages} · {total} entries
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
