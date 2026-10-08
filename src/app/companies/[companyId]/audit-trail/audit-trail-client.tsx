"use client";
import { Fragment, useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { X } from "lucide-react";

interface LogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  previousValue: unknown;
  newValue: unknown;
  createdAt: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface FilterOptions {
  users: { id: string; name: string | null; email: string | null }[];
  actions: string[];
  entityTypes: string[];
}

interface AuditResponse {
  logs: LogRow[];
  filters: FilterOptions;
}

const ALL = "ALL";

function actionVariant(action: string): "success" | "danger" | "warning" | "outline" {
  if (action.includes("DELETED") || action.includes("VOIDED") || action.includes("REVERSED")) return "danger";
  if (action.includes("DEACTIVATED") || action.includes("CLOSED") || action.includes("LOCKED")) return "warning";
  if (action.includes("CREATED") || action.includes("POSTED")) return "success";
  return "outline";
}

export function AuditTrailClient({ companyId, initial }: { companyId: string; initial: AuditResponse }) {
  const [logs, setLogs] = useState(initial.logs);
  const [filterOptions] = useState(initial.filters);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(ALL);
  const [entityType, setEntityType] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId !== ALL) params.set("userId", userId);
      if (entityType !== ALL) params.set("entityType", entityType);
      if (action !== ALL) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (q) params.set("q", q);
      const res = await api.get<AuditResponse>(`/api/companies/${companyId}/audit-logs?${params.toString()}`);
      setLogs(res.logs);
    } finally {
      setLoading(false);
    }
  }, [companyId, userId, entityType, action, from, to, q]);

  useEffect(() => {
    const timeout = setTimeout(fetchLogs, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, entityType, action, from, to, q]);

  function clearFilters() {
    setUserId(ALL);
    setEntityType(ALL);
    setAction(ALL);
    setFrom("");
    setTo("");
    setQ("");
  }

  const hasFilters = userId !== ALL || entityType !== ALL || action !== ALL || from || to || q;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Audit Trail</h1>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">User</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All users</SelectItem>
                {filterOptions.users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Entity</Label>
            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All entities</SelectItem>
                {filterOptions.entityTypes.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Action</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All actions</SelectItem>
                {filterOptions.actions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">From</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">To</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Search</Label>
            <Input placeholder="action, entity, id…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <Fragment key={l.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{l.userName || l.userEmail || "System"}</TableCell>
                    <TableCell>
                      <Badge variant={actionVariant(l.action)}>{l.action.replaceAll("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {l.entityType} {l.entityId ? `· ${l.entityId.slice(0, 8)}…` : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      {Boolean(l.previousValue || l.newValue) && (
                        <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                          {expanded === l.id ? "Hide" : "View"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expanded === l.id && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-[var(--surface-muted)]">
                        <div className="grid grid-cols-1 gap-3 p-2 text-xs sm:grid-cols-2">
                          {l.previousValue != null && (
                            <div>
                              <p className="mb-1 font-medium text-[var(--muted-foreground)]">Before</p>
                              <pre className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2">
                                {JSON.stringify(l.previousValue, null, 2)}
                              </pre>
                            </div>
                          )}
                          {l.newValue != null && (
                            <div>
                              <p className="mb-1 font-medium text-[var(--muted-foreground)]">After</p>
                              <pre className="overflow-x-auto rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-2">
                                {JSON.stringify(l.newValue, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
              {logs.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[var(--muted-foreground)]">
                    No activity matches these filters.
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
