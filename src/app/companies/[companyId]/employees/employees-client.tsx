"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { money } from "@/components/format";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Employee {
  id: string;
  employeeCode: string;
  name: string;
  department: string | null;
  position: string | null;
  salary: string | null;
  isActive: boolean;
}

const emptyForm = { name: "", department: "", position: "", salary: "" };

export function EmployeesClient({
  companyId,
  currency,
  initialEmployees,
}: {
  companyId: string;
  currency: string;
  initialEmployees: Employee[];
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditing(emp);
    setForm({
      name: emp.name,
      department: emp.department ?? "",
      position: emp.position ?? "",
      salary: emp.salary ?? "",
    });
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        const { employee } = await api.patch<{ employee: Employee }>(`/api/companies/${companyId}/employees/${editing.id}`, {
          ...form,
          salary: form.salary ? Number(form.salary) : undefined,
        });
        setEmployees((prev) => prev.map((e2) => (e2.id === employee.id ? employee : e2)));
        toast.success("Employee updated.");
      } else {
        const { employee } = await api.post<{ employee: Employee }>(`/api/companies/${companyId}/employees`, {
          ...form,
          salary: form.salary ? Number(form.salary) : undefined,
        });
        setEmployees((prev) => [...prev, employee]);
        toast.success("Employee added.");
      }
      setOpen(false);
      setForm(emptyForm);
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save employee.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Delete "${emp.name}"? If they have payroll history, they'll be deactivated instead of removed.`)) return;
    try {
      const result = await api.delete<{ deleted: boolean; deactivated: boolean; employee?: Employee }>(
        `/api/companies/${companyId}/employees/${emp.id}`
      );
      if (result.deleted) {
        setEmployees((prev) => prev.filter((e2) => e2.id !== emp.id));
        toast.success("Employee deleted.");
      } else {
        setEmployees((prev) => prev.map((e2) => (e2.id === emp.id ? { ...e2, isActive: false } : e2)));
        toast.success("Employee has payroll history — deactivated instead of deleted.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete employee.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Employees</h1>
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setEditing(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> New employee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit employee" : "New employee"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Department</Label>
                <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Position</Label>
                <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Salary</Label>
                <Input type="number" step="0.01" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} />
              </div>
              <DialogFooter className="col-span-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="text-right">Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono">{e.employeeCode}</TableCell>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{e.department || "—"}</TableCell>
                  <TableCell>{e.position || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.salary ? money(e.salary, currency) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={e.isActive ? "success" : "outline"}>{e.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(e)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-[var(--muted-foreground)]">
                    No employees yet.
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
