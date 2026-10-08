"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { CATEGORIES, TEMPLATES, type Template } from "./templates";
import { cn } from "@/lib/utils";
import { BookText } from "lucide-react";

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  isCashOrBank: boolean;
}
interface Party {
  id: string;
  name: string;
}
interface TaxRate {
  id: string;
  name: string;
  rate: string;
  taxAccountId: string;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

export function EntriesClient({
  companyId,
  currency,
  accounts,
  customers,
  suppliers,
  employees,
  taxRates,
}: {
  companyId: string;
  currency: string;
  accounts: Account[];
  customers: Party[];
  suppliers: Party[];
  employees: (Party & { salary: string | null })[];
  taxRates: TaxRate[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Template>(TEMPLATES[0]);
  const [loading, setLoading] = useState(false);

  const cashAccounts = useMemo(() => accounts.filter((a) => a.isCashOrBank), [accounts]);
  const byCode = (code?: string) => accounts.find((a) => a.code === code);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Transaction type</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-3">
          {CATEGORIES.map((cat) => (
            <div key={cat}>
              <p className="mb-1 px-1 text-xs font-semibold uppercase text-[var(--muted-foreground)]">{cat}</p>
              <div className="flex flex-col gap-0.5">
                {TEMPLATES.filter((t) => t.category === cat).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={cn(
                      "rounded-md px-2 py-1.5 text-left text-sm hover:bg-[var(--surface-muted)]",
                      selected.id === t.id && "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <Link href={`/companies/${companyId}/journal`} className="mt-2 flex items-center gap-2 rounded-md border border-dashed border-[var(--border-strong)] px-2 py-2 text-sm text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)]">
            <BookText className="h-4 w-4" /> Advanced manual journal entry
          </Link>
        </CardContent>
      </Card>

      <EntryForm
        key={selected.id}
        companyId={companyId}
        currency={currency}
        template={selected}
        accounts={accounts}
        cashAccounts={cashAccounts}
        customers={customers}
        suppliers={suppliers}
        employees={employees}
        taxRates={taxRates}
        byCode={byCode}
        loading={loading}
        setLoading={setLoading}
        onSuccess={(id, draft) => {
          toast.success(draft ? "Saved as draft — review it before posting." : "Transaction recorded.");
          router.push(`/companies/${companyId}/journal/${id}`);
        }}
      />
    </div>
  );
}

function EntryForm({
  companyId,
  currency,
  template,
  accounts,
  cashAccounts,
  customers,
  suppliers,
  employees,
  taxRates,
  byCode,
  loading,
  setLoading,
  onSuccess,
}: {
  companyId: string;
  currency: string;
  template: Template;
  accounts: Account[];
  cashAccounts: Account[];
  customers: Party[];
  suppliers: Party[];
  employees: (Party & { salary: string | null })[];
  taxRates: TaxRate[];
  byCode: (code?: string) => Account | undefined;
  loading: boolean;
  setLoading: (v: boolean) => void;
  onSuccess: (id: string, draft: boolean) => void;
}) {
  const [date, setDate] = useState(todayStr());
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(() =>
    template.kind === "salary" ? employees[0]?.salary ?? "" : ""
  );
  const [paymentAccountId, setPaymentAccountId] = useState(cashAccounts[0]?.id ?? "");
  const [isCredit, setIsCredit] = useState(false);
  const [customerId, setCustomerId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>(employees[0]?.id ?? "");
  const [taxRateId, setTaxRateId] = useState<string>("");
  const [accountId, setAccountId] = useState<string>(byCode(template.defaultAccountCode)?.id ?? "");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [pfEmployee, setPfEmployee] = useState("0");
  const [pfEmployer, setPfEmployer] = useState("0");
  const [gratuity, setGratuity] = useState("0");
  const [taxWithheld, setTaxWithheld] = useState("0");
  const [otherDeductions, setOtherDeductions] = useState("0");
  const [principal, setPrincipal] = useState("");
  const [interest, setInterest] = useState("0");
  const [saveAsDraft, setSaveAsDraft] = useState(false);

  const selectedTax = taxRates.find((t) => t.id === taxRateId);
  const taxAmount = selectedTax ? (parseFloat(amount || "0") * parseFloat(selectedTax.rate)) / (100 + parseFloat(selectedTax.rate)) : 0;

  const netSalary = Math.max(
    0,
    (parseFloat(amount) || 0) - (parseFloat(pfEmployee) || 0) - (parseFloat(taxWithheld) || 0) - (parseFloat(otherDeductions) || 0)
  );

  function selectEmployee(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    if (template.kind === "salary" && emp?.salary) {
      setAmount(emp.salary);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const base = { date, description, reference: reference || undefined, autoPost: !saveAsDraft };
      let payload: Record<string, unknown> | null = null;

      switch (template.kind) {
        case "sale":
          payload = {
            kind: "sale",
            ...base,
            amount: Number(amount),
            isCredit,
            paymentAccountId: isCredit ? undefined : paymentAccountId,
            customerId: customerId || undefined,
            transactionType: template.transactionType,
            taxRateId: taxRateId || undefined,
            taxAccountId: selectedTax?.taxAccountId,
            taxAmount: selectedTax ? taxAmount : undefined,
          };
          break;
        case "customerPayment":
          payload = { kind: "customerPayment", ...base, amount: Number(amount), paymentAccountId, customerId };
          break;
        case "expense":
          payload = {
            kind: "expense",
            ...base,
            amount: Number(amount),
            expenseAccountId: accountId,
            paymentAccountId,
            isCredit,
            payableAccountId: isCredit ? byCode("2000")?.id : undefined,
            supplierId: supplierId || undefined,
            employeeId: employeeId || undefined,
            transactionType: template.transactionType,
          };
          break;
        case "salary":
          payload = {
            kind: "salary",
            ...base,
            employeeId,
            grossSalary: Number(amount),
            providentFundEmployee: Number(pfEmployee || 0),
            providentFundEmployer: Number(pfEmployer || 0),
            gratuityAccrual: Number(gratuity || 0),
            taxWithheld: Number(taxWithheld || 0),
            otherDeductions: Number(otherDeductions || 0),
            paymentAccountId,
          };
          break;
        case "purchase":
          payload = {
            kind: "purchase",
            ...base,
            amount: Number(amount),
            purchaseAccountId: accountId,
            isCredit,
            paymentAccountId: isCredit ? undefined : paymentAccountId,
            payableAccountId: isCredit ? byCode("2000")?.id : undefined,
            supplierId: supplierId || undefined,
            transactionType: template.transactionType,
          };
          break;
        case "supplierPayment":
          payload = { kind: "supplierPayment", ...base, amount: Number(amount), paymentAccountId, supplierId };
          break;
        case "loanReceived":
          payload = { kind: "loanReceived", ...base, amount: Number(amount), cashAccountId: paymentAccountId };
          break;
        case "loanPayment":
          payload = {
            kind: "loanPayment",
            ...base,
            principalAmount: Number(principal),
            interestAmount: Number(interest || 0),
            cashAccountId: paymentAccountId,
          };
          break;
        case "ownerInvestment":
          payload = { kind: "ownerInvestment", ...base, amount: Number(amount), cashAccountId: paymentAccountId };
          break;
        case "ownerDrawings":
          payload = { kind: "ownerDrawings", ...base, amount: Number(amount), cashAccountId: paymentAccountId };
          break;
        case "transfer":
          payload = {
            kind: "transfer",
            ...base,
            amount: Number(amount),
            fromAccountId: paymentAccountId,
            toAccountId,
            transactionType: template.transactionType,
          };
          break;
        case "taxPayment":
          payload = { kind: "taxPayment", ...base, amount: Number(amount), paymentAccountId };
          break;
        case "customEntry":
          payload = {
            kind: "customEntry",
            ...base,
            accountId,
            paymentAccountId,
            amount: Number(amount),
            isDebitToAccount: !isCredit,
            customerId: customerId || undefined,
            supplierId: supplierId || undefined,
          };
          break;
      }

      if (!payload) throw new Error("Unsupported template.");
      const { entry } = await api.post<{ entry: { id: string } }>(`/api/companies/${companyId}/transactions`, payload);
      onSuccess(entry.id, saveAsDraft);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record transaction.");
    } finally {
      setLoading(false);
    }
  }

  const needsAmount = template.kind !== "salary" && template.kind !== "loanPayment";
  const needsAccountPicker = ["expense", "purchase", "customEntry"].includes(template.kind);
  const needsPaymentAccount = !["customerPayment"].includes(template.kind) || true;
  const canBeCredit = ["sale", "expense", "purchase", "customEntry"].includes(template.kind);
  const needsCustomer = ["sale", "customerPayment", "customEntry"].includes(template.kind) && (template.kind !== "customEntry" || !isCredit);
  const needsSupplier = ["expense", "purchase", "supplierPayment", "customEntry"].includes(template.kind);
  const needsEmployee = ["salary"].includes(template.kind) || (template.kind === "expense" && false);
  const needsTax = ["sale", "expense", "purchase"].includes(template.kind);
  const needsToAccount = template.kind === "transfer";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{template.label}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Reference (optional)">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} />
          </Field>

          {needsAccountPicker && (
            <Field label={template.kind === "purchase" ? "Purchase / Inventory account" : "Expense account"} className="col-span-2">
              <AccountSelect accounts={accounts} value={accountId} onChange={setAccountId} />
            </Field>
          )}

          {needsEmployee && (
            <Field label="Employee" className="col-span-2">
              <Select value={employeeId} onValueChange={selectEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {template.kind === "salary" ? (
            <>
              <Field label="Gross salary">
                <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
              <Field label="Employee Provident Fund">
                <Input type="number" step="0.01" value={pfEmployee} onChange={(e) => setPfEmployee(e.target.value)} />
              </Field>
              <Field label="Employer Provident Fund contribution">
                <Input type="number" step="0.01" value={pfEmployer} onChange={(e) => setPfEmployer(e.target.value)} />
              </Field>
              <Field label="Gratuity accrual">
                <Input type="number" step="0.01" value={gratuity} onChange={(e) => setGratuity(e.target.value)} />
              </Field>
              <Field label="Tax withheld">
                <Input type="number" step="0.01" value={taxWithheld} onChange={(e) => setTaxWithheld(e.target.value)} />
              </Field>
              <Field label="Other deductions">
                <Input type="number" step="0.01" value={otherDeductions} onChange={(e) => setOtherDeductions(e.target.value)} />
              </Field>
              <Field label="Net salary to pay" className="col-span-2">
                <Input type="number" step="0.01" readOnly value={netSalary.toFixed(2)} className="bg-[var(--surface-muted)] font-medium" />
              </Field>
            </>
          ) : template.kind === "loanPayment" ? (
            <>
              <Field label="Principal amount">
                <Input type="number" step="0.01" required value={principal} onChange={(e) => setPrincipal(e.target.value)} />
              </Field>
              <Field label="Interest amount">
                <Input type="number" step="0.01" value={interest} onChange={(e) => setInterest(e.target.value)} />
              </Field>
            </>
          ) : (
            needsAmount && (
              <Field label="Amount" className={needsTax ? "" : "col-span-2"}>
                <Input type="number" step="0.01" required value={amount} onChange={(e) => setAmount(e.target.value)} />
              </Field>
            )
          )}

          {needsTax && (
            <Field label="Tax (optional)">
              <Select value={taxRateId || "NONE"} onValueChange={(v) => setTaxRateId(v === "NONE" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No tax" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No tax</SelectItem>
                  {taxRates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.rate}%)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTax && <p className="mt-1 text-xs text-[var(--muted-foreground)]">Included tax: {taxAmount.toFixed(2)} {currency}</p>}
            </Field>
          )}

          {canBeCredit && (
            <div className="col-span-2 flex items-center gap-2 text-sm">
              <input type="checkbox" id="isCredit" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} />
              <label htmlFor="isCredit">
                {template.kind === "sale"
                  ? "Credit sale (bill customer, don't collect cash now)"
                  : template.kind === "customEntry"
                  ? "This is income (credit the account) instead of an expense (debit)"
                  : "On credit (pay supplier later)"}
              </label>
            </div>
          )}

          {needsCustomer && (
            <Field label="Customer" className="col-span-2">
              <Select value={customerId || "NONE"} onValueChange={(v) => setCustomerId(v === "NONE" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {needsSupplier && (
            <Field label="Supplier" className="col-span-2">
              <Select value={supplierId || "NONE"} onValueChange={(v) => setSupplierId(v === "NONE" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— None —</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {needsPaymentAccount && !(canBeCredit && isCredit && template.kind !== "salary") && (
            <Field label={needsToAccount ? "From account" : "Payment account"} className="col-span-2">
              <AccountSelect accounts={accounts} value={paymentAccountId} onChange={setPaymentAccountId} cashOnly />
            </Field>
          )}

          {needsToAccount && (
            <Field label="To account" className="col-span-2">
              <AccountSelect accounts={accounts} value={toAccountId} onChange={setToAccountId} cashOnly />
            </Field>
          )}

          <Field label="Description" className="col-span-2">
            <Input required value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="col-span-2 flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
            <input
              type="checkbox"
              id="saveAsDraft"
              className="mt-0.5"
              checked={saveAsDraft}
              onChange={(e) => setSaveAsDraft(e.target.checked)}
            />
            <label htmlFor="saveAsDraft" className="flex flex-col">
              <span className="font-medium">Save as draft instead of posting immediately</span>
              <span className="text-xs text-[var(--muted-foreground)]">
                A draft doesn&apos;t affect your books yet — you can edit or delete it from the Journal before posting it.
              </span>
            </label>
          </div>

          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Recording…" : saveAsDraft ? "Save draft" : "Record transaction"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function AccountSelect({
  accounts,
  value,
  onChange,
  cashOnly,
}: {
  accounts: Account[];
  value: string;
  onChange: (v: string) => void;
  cashOnly?: boolean;
}) {
  const list = cashOnly ? accounts.filter((a) => a.isCashOrBank) : accounts;
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select account" />
      </SelectTrigger>
      <SelectContent>
        {list.map((a) => (
          <SelectItem key={a.id} value={a.id}>
            {a.code} — {a.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
