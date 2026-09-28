import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { getInvoicesAndQuotations } from "@/lib/finance/invoices";
import {
  FinanceView,
  type FinanceContractSummary,
  type FinancePaymentPeriod,
  type FinanceDriverOption,
  type FinancePartOption,
} from "./finance-view";

type RawFinanceContract = {
  id: string;
  driver_id: string;
  bike_id: string;
  status: string;
  total_weeks: number;
  weekly_amount: number;
  drivers: {
    id: string;
    profile_id: string;
    profiles: { id: string; full_name: string; email?: string; phone?: string } | null;
  } | null;
  bikes: { id: string; registration: string } | null;
};

export default async function ManagementFinancePage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  // 1. Fetch contracts, payment periods, proofs, invoices, parts, and drivers in parallel
  const [
    { data: rawContracts },
    { data: rawPeriods },
    { data: rawProofs },
    invoicesAndQuotations,
    { data: rawParts },
    { data: rawDrivers },
  ] = await Promise.all([
    supabase.from("contracts").select(`
      id,
      driver_id,
      bike_id,
      status,
      total_weeks,
      weekly_amount,
      drivers (
        id,
        profile_id,
        profiles (
          id,
          full_name,
          email,
          phone
        )
      ),
      bikes (
        id,
        registration
      )
    `),
    supabase.from("payment_periods").select("*").order("due_date", { ascending: false }),
    supabase.from("payment_proofs").select("payment_period_id, storage_path"),
    getInvoicesAndQuotations(),
    supabase.from("parts").select("id, name, part_number, sku, unit_price, stock_quantity, category").order("name"),
    supabase.from("drivers").select(`
      id,
      profile_id,
      status,
      bike_id,
      profiles (
        id,
        full_name,
        email,
        phone
      ),
      bikes (
        id,
        registration
      )
    `).order("created_at", { ascending: false }),
  ]);

  const proofMap = new Map((rawProofs ?? []).map((p) => [p.payment_period_id, p.storage_path]));
  const typedContracts = (rawContracts || []) as unknown as RawFinanceContract[];

  // Build contract map for quick lookup
  const contractMap = new Map<string, RawFinanceContract>();
  typedContracts.forEach((c) => {
    contractMap.set(c.id, c);
  });

  // Calculate totals for payment periods
  const totalExpected = (rawPeriods ?? []).reduce(
    (sum, p) => sum + (Number(p.amount_due) || 0),
    0
  );
  const totalVerified = (rawPeriods ?? [])
    .filter((p) => p.status === "verified")
    .reduce((sum, p) => sum + (Number(p.amount_due) || 0), 0);
  const totalPending = (rawPeriods ?? [])
    .filter((p) => p.status === "awaiting_verification")
    .reduce((sum, p) => sum + (Number(p.amount_due) || 0), 0);
  const totalOverdue = (rawPeriods ?? [])
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + (Number(p.amount_due) || 0), 0);

  const periods: FinancePaymentPeriod[] = (rawPeriods ?? []).map((p) => {
    const c = contractMap.get(p.contract_id);
    const driverName = c?.drivers?.profiles?.full_name || "Unknown Driver";
    const driverProfileId = c?.drivers?.profile_id || "";
    const bikeRegistration = c?.bikes?.registration || "Unknown";
    const amt = Number(p.amount_due) || 0;

    return {
      id: p.id,
      contractId: p.contract_id,
      driverProfileId,
      driverName,
      bikeRegistration,
      periodNumber: p.period_number,
      dueDate: p.due_date,
      amountDue: amt,
      status: p.status,
      proofPath: proofMap.get(p.id) || null,
      reviewedAt: p.reviewed_at,
      verifiedAt: p.verified_at,
      rejectionReason: p.rejection_reason,
    };
  });

  // Build contract summaries
  const contracts: FinanceContractSummary[] = typedContracts.map((c) => {
    const driverName = c.drivers?.profiles?.full_name || "Unknown Driver";
    const driverProfileId = c.drivers?.profile_id || "";
    const bikeRegistration = c.bikes?.registration || "Unassigned";
    const totalWeeks = c.total_weeks || 52;
    const weeklyAmount = Number(c.weekly_amount) || 0;
    const totalValue = totalWeeks * weeklyAmount;

    const contractPeriods = (rawPeriods ?? []).filter((p) => p.contract_id === c.id);
    const paidWeeks = contractPeriods.filter((p) => p.status === "verified").length;
    const verifiedAmount = paidWeeks * weeklyAmount;
    const outstandingAmount = Math.max(0, totalValue - verifiedAmount);

    return {
      contractId: c.id,
      driverId: c.driver_id,
      driverProfileId,
      driverName,
      bikeRegistration,
      totalWeeks,
      paidWeeks,
      totalValue,
      verifiedAmount,
      outstandingAmount,
      status: c.status,
    };
  });

  // Map driver options for quote/invoice builder
  type RawDriverItem = {
    id: string;
    profile_id: string;
    profiles: { id: string; full_name: string; email?: string; phone?: string } | null;
    bikes: { id: string; registration: string } | null;
  };

  const driverOptions: FinanceDriverOption[] = ((rawDrivers ?? []) as unknown as RawDriverItem[]).map((d) => ({
    driverId: d.id,
    profileId: d.profile_id,
    name: d.profiles?.full_name || "Driver",
    email: d.profiles?.email || "",
    phone: d.profiles?.phone || "",
    bikeRegistration: d.bikes?.registration || "Unassigned",
  }));

  // Map parts options for parts lookup in quote/invoice builder
  const partOptions: FinancePartOption[] = (rawParts ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    partNumber: p.part_number,
    sku: p.sku,
    unitPrice: p.unit_price ? Number(p.unit_price) : 0,
    stockQuantity: p.stock_quantity ?? 0,
    category: p.category,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Financial Operations & Billing
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Live rent-to-own collection auditing, parts invoices & quotations, proof review queue, and contract equity.
        </p>
      </div>

      <FinanceView
        contracts={contracts}
        periods={periods}
        invoices={invoicesAndQuotations}
        driverOptions={driverOptions}
        partOptions={partOptions}
        totalExpected={totalExpected}
        totalVerified={totalVerified}
        totalPending={totalPending}
        totalOverdue={totalOverdue}
      />
    </div>
  );
}
