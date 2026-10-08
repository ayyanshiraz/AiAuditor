"use client";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

interface TrendPoint {
  label: string;
  revenue: string;
  expenses: string;
  netProfit: string;
}

export function TrendChart({ data, currency }: { data: TrendPoint[]; currency: string }) {
  const chartData = data.map((d) => ({
    label: d.label,
    Revenue: parseFloat(d.revenue),
    Expenses: parseFloat(d.expenses),
    "Net profit": parseFloat(d.netProfit),
  }));

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
        <YAxis tickFormatter={fmt} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          formatter={(value, name) => [
            new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(value ?? 0)),
            String(name),
          ]}
          contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Revenue" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={18} />
        <Bar dataKey="Expenses" fill="var(--danger)" radius={[4, 4, 0, 0]} barSize={18} />
        <Line type="monotone" dataKey="Net profit" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
