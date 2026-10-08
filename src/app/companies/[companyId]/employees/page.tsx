import { listEmployees } from "@/server/services/parties";
import { getCompany } from "@/server/services/companies";
import { EmployeesClient } from "./employees-client";

export default async function EmployeesPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = await params;
  const [company, employees] = await Promise.all([getCompany(companyId), listEmployees(companyId)]);
  return <EmployeesClient companyId={companyId} currency={company.baseCurrency} initialEmployees={employees} />;
}
