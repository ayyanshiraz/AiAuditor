"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { shortDate } from "@/components/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

export function PeriodsClient({ companyId, initialPeriods }: { companyId: string; initialPeriods: Period[] }) {
  const [periods, setPeriods] = useState(initialPeriods);
  const [fyStart, setFyStart] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  async function generateYear() {
    setLoading(true);
    try {
      const { periods: newPeriods } = await api.post<{ periods: Period[] }>(`/api/companies/${companyId}/periods`, {
        startDate: fyStart,
        generateMonthly: true,
      });
      setPeriods((prev) => [...prev, ...newPeriods].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      toast.success("Monthly periods generated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate periods.");
    } finally {
      setLoading(false);
    }
  }

  async function transition(periodId: string, action: "close" | "reopen" | "lock") {
    try {
      const { period } = await api.post<{ period: Period }>(`/api/companies/${companyId}/periods/${periodId}/${action}`);
      setPeriods((prev) => prev.map((p) => (p.id === periodId ? period : p)));
      toast.success(`Period ${action === "close" ? "closed" : action === "reopen" ? "reopened" : "locked"}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-lg font-semibold">Accounting Periods</h1>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Financial year start</label>
            <Input type="date" value={fyStart} onChange={(e) => setFyStart(e.target.value)} />
          </div>
          <Button onClick={generateYear} disabled={loading}>
            {loading ? "Generating…" : "Generate 12 monthly periods"}
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periods.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{shortDate(p.startDate)}</TableCell>
                  <TableCell>{shortDate(p.endDate)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "OPEN" ? "success" : p.status === "CLOSED" ? "warning" : "danger"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === "OPEN" && (
                        <Button variant="ghost" size="sm" onClick={() => transition(p.id, "close")}>
                          Close
                        </Button>
                      )}
                      {p.status === "CLOSED" && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => transition(p.id, "reopen")}>
                            Reopen
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => transition(p.id, "lock")}>
                            Lock
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {periods.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                    No periods yet. Generate a financial year to get started.
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
