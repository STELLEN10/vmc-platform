import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  FinanceView,
  type FinanceContractSummary,
  type FinancePaymentPeriod,
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
    profiles: { id: string; full_name: string } | null;
  } | null;
  bikes: { id: string; registration: string } | null;
};

export default async function ManagementFinancePage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  // 1. Fetch contracts with driver & bike
  const { data: rawContracts } = await supabase
    .from("contracts")
    .select(`
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
          full_name
        )
      ),
      bikes (
        id,
        registration
      )
    `);

  // 2. Fetch all payment periods
  const { data: rawPeriods } = await supabase
    .from("payment_periods")
    .select("*")
    .order("due_date", { ascending: false });

  // 3. Fetch payment proofs
  const { data: rawProofs } = await supabase
    .from("payment_proofs")
    .select("payment_period_id, storage_path");

  const proofMap = new Map((rawProofs ?? []).map((p) => [p.payment_period_id, p.storage_path]));

  const typedContracts = (rawContracts || []) as unknown as RawFinanceContract[];

  // Build contract map for quick lookup
  const contractMap = new Map<string, RawFinanceContract>();
  typedContracts.forEach((c) => {
    contractMap.set(c.id, c);
  });

  // Calculate totals
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Financial Operations & Reconciliation
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Live rent-to-own collection auditing, proof review queue, and contract equity status.
        </p>
      </div>

      <FinanceView
        contracts={contracts}
        periods={periods}
        totalExpected={totalExpected}
        totalVerified={totalVerified}
        totalPending={totalPending}
        totalOverdue={totalOverdue}
      />
    </div>
  );
}
