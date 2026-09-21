import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AnalyticsView, type OperationsAnalyticsData } from "./analytics-view";

export default async function ManagementAnalyticsPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  // 1. Bikes Fleet
  const { data: rawBikes } = await supabase.from("bikes").select("status");
  const bikes = rawBikes ?? [];
  const totalBikes = bikes.length;
  const assignedBikes = bikes.filter((b) => b.status === "assigned").length;
  const maintenanceBikes = bikes.filter(
    (b) => b.status === "maintenance" || b.status === "repair"
  ).length;
  const availableBikes = bikes.filter((b) => b.status === "available").length;
  const utilizationRate =
    totalBikes > 0 ? Math.round((assignedBikes / totalBikes) * 100) : 0;

  // 2. Financial Collections
  const { data: rawPeriods } = await supabase
    .from("payment_periods")
    .select("amount_due, status");
  const periods = rawPeriods ?? [];
  let totalVerifiedRevenue = 0;
  let totalExpectedRevenue = 0;
  let totalOverdueRevenue = 0;

  periods.forEach((p) => {
    const amt = Number(p.amount_due) || 0;
    totalExpectedRevenue += amt;
    if (p.status === "verified") totalVerifiedRevenue += amt;
    if (p.status === "overdue") totalOverdueRevenue += amt;
  });

  const collectionEfficiencyPct =
    totalExpectedRevenue > 0
      ? Math.round((totalVerifiedRevenue / totalExpectedRevenue) * 100)
      : 0;

  // 3. Contracts
  const { data: rawContracts } = await supabase.from("contracts").select("status");
  const contracts = rawContracts ?? [];
  const activeContractsCount = contracts.filter((c) => c.status === "active").length;
  const completedContractsCount = contracts.filter((c) => c.status === "completed").length;

  // 4. Maintenance
  const { data: rawMaint } = await supabase
    .from("maintenance_requests")
    .select("status, severity");
  const maint = rawMaint ?? [];
  const totalRequests = maint.length;
  const openRequests = maint.filter(
    (m) =>
      m.status === "submitted" ||
      m.status === "under_review" ||
      m.status === "in_progress" ||
      m.status === "awaiting_parts"
  ).length;
  const scheduledRequests = maint.filter((m) => m.status === "scheduled").length;
  const resolvedRequests = maint.filter((m) => m.status === "resolved").length;
  const criticalCount = maint.filter((m) => m.severity === "critical" || m.severity === "high").length;

  // 5. Emergency
  const { data: rawEmerg } = await supabase
    .from("emergency_reports")
    .select("status, emergency_type");
  const emergencies = rawEmerg ?? [];
  const totalIncidents = emergencies.length;
  const activeIncidents = emergencies.filter(
    (e) => e.status === "open" || e.status === "acknowledged" || e.status === "responding"
  ).length;
  const resolvedIncidents = emergencies.filter((e) => e.status === "resolved").length;

  const byType: Record<string, number> = {};
  emergencies.forEach((e) => {
    const t = e.emergency_type || "other";
    byType[t] = (byType[t] || 0) + 1;
  });

  // 6. Inventory
  const { data: rawParts } = await supabase
    .from("parts")
    .select("stock_quantity, minimum_stock_level, unit_price");
  const parts = rawParts ?? [];
  const totalParts = parts.length;
  let lowStockCount = 0;
  let totalInventoryValue = 0;

  parts.forEach((p) => {
    const qty = Number(p.stock_quantity) || 0;
    const min = Number(p.minimum_stock_level) || 0;
    const price = Number(p.unit_price) || 0;
    if (qty <= min) lowStockCount++;
    totalInventoryValue += qty * price;
  });

  const analyticsData: OperationsAnalyticsData = {
    fleet: {
      totalBikes,
      assignedBikes,
      maintenanceBikes,
      availableBikes,
      utilizationRate,
    },
    finance: {
      totalVerifiedRevenue,
      totalExpectedRevenue,
      totalOverdueRevenue,
      collectionEfficiencyPct,
      activeContractsCount,
      completedContractsCount,
    },
    maintenance: {
      totalRequests,
      openRequests,
      scheduledRequests,
      resolvedRequests,
      criticalCount,
      avgResolutionTimeHours: 24,
    },
    emergency: {
      totalIncidents,
      activeIncidents,
      resolvedIncidents,
      byType,
    },
    inventory: {
      totalParts,
      lowStockCount,
      totalInventoryValue,
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Operations Analytics & Intelligence
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Executive performance dashboard tracking fleet utilization, collections efficiency, workshop health, and parts inventory valuation.
        </p>
      </div>

      <AnalyticsView data={analyticsData} />
    </div>
  );
}
