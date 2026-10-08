"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Printer, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface DateField {
  name: string;
  label: string;
  value?: string;
}

export function ReportToolbar({ dateFields }: { dateFields: DateField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(name, value);
    else params.delete(name);
    router.push(`${pathname}?${params.toString()}`);
  }

  function exportCsv() {
    const table = document.querySelector("#report-content table");
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.querySelectorAll("th,td"))
        .map((cell) => `"${(cell.textContent ?? "").replace(/"/g, '""').trim()}"`)
        .join(",")
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
      <div className="flex flex-wrap items-end gap-3">
        {dateFields.map((f) => (
          <div key={f.name} className="flex flex-col gap-1.5">
            <Label>{f.label}</Label>
            <Input type="date" defaultValue={f.value} onChange={(e) => updateParam(f.name, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="mr-1 h-4 w-4" /> Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" /> Print
        </Button>
      </div>
    </div>
  );
}
