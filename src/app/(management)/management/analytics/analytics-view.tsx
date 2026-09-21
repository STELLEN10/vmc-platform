"use client";

import Link from "next/link";
import {
  DollarSign,
  Wrench,
  Bike,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";

export type OperationsAnalyticsData = {
  fleet: {
    totalBikes: number;
    assignedBikes: number;
    maintenanceBikes: number;
    availableBikes: number;
    utilizationRate: number;
  };
  finance: {
    totalVerifiedRevenue: number;
    totalExpectedRevenue: number;
    totalOverdueRevenue: number;
    collectionEfficiencyPct: number;
    activeContractsCount: number;
    completedContractsCount: number;
  };
  maintenance: {
    totalRequests: number;
    openRequests: number;
    scheduledRequests: number;
    resolvedRequests: number;
    criticalCount: number;
    avgResolutionTimeHours: number;
  };
  emergency: {
    totalIncidents: number;
    activeIncidents: number;
    resolvedIncidents: number;
    byType: Record<string, number>;
  };
  inventory: {
    totalParts: number;
    lowStockCount: number;
    totalInventoryValue: number;
  };
};

export function AnalyticsView({ data }: { data: OperationsAnalyticsData }) {
  return (
    <div className="space-y-6">
      {/* Top High-Level Operations Scorecard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Fleet Utilization
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Bike className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">
            {data.fleet.utilizationRate}%
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
            <span>{data.fleet.assignedBikes} on rent</span>
            <span>{data.fleet.totalBikes} total fleet</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full"
              style={{ width: `${data.fleet.utilizationRate}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Collection Efficiency
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-700">
            {data.finance.collectionEfficiencyPct}%
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
            <span>R {data.finance.totalVerifiedRevenue.toLocaleString()} collected</span>
            <span>R {data.finance.totalOverdueRevenue.toLocaleString()} overdue</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full"
              style={{ width: `${data.finance.collectionEfficiencyPct}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Maintenance Health
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <Wrench className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-neutral-900">
            {data.maintenance.openRequests}
            <span className="text-sm font-normal text-neutral-500 ml-1">open tickets</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
            <span>{data.maintenance.criticalCount} high/critical</span>
            <span>{data.maintenance.resolvedRequests} resolved</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{
                width: `${
                  data.maintenance.totalRequests > 0
                    ? Math.round((data.maintenance.resolvedRequests / data.maintenance.totalRequests) * 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Emergency Standby
            </span>
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-3xl font-bold text-red-700">
            {data.emergency.activeIncidents}
            <span className="text-sm font-normal text-neutral-500 ml-1">unresolved</span>
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500">
            <span>{data.emergency.resolvedIncidents} closed</span>
            <span>{data.emergency.totalIncidents} total logged</span>
          </div>
          <div className="mt-2 h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full bg-red-600 rounded-full"
              style={{
                width: `${
                  data.emergency.totalIncidents > 0
                    ? Math.round((data.emergency.resolvedIncidents / data.emergency.totalIncidents) * 100)
                    : 100
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Bento Grid Deep-Dive Sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fleet Distribution */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-900">
              Fleet Operational Distribution
            </h3>
            <Link
              href="/management/bikes"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              Manage Fleet <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-100">
              <p className="text-xs font-semibold text-emerald-800">Assigned / Active</p>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                {data.fleet.assignedBikes}
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 border border-amber-100">
              <p className="text-xs font-semibold text-amber-800">In Workshop</p>
              <p className="text-xl font-bold text-amber-900 mt-1">
                {data.fleet.maintenanceBikes}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
              <p className="text-xs font-semibold text-blue-800">Available</p>
              <p className="text-xl font-bold text-blue-900 mt-1">
                {data.fleet.availableBikes}
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600">Active Fleet on Road</span>
              <span className="font-semibold text-neutral-900">
                {data.fleet.assignedBikes} bikes ({data.fleet.utilizationRate}%)
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${(data.fleet.assignedBikes / (data.fleet.totalBikes || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-amber-500 h-full"
                style={{
                  width: `${(data.fleet.maintenanceBikes / (data.fleet.totalBikes || 1)) * 100}%`,
                }}
              />
              <div
                className="bg-blue-500 h-full"
                style={{
                  width: `${(data.fleet.availableBikes / (data.fleet.totalBikes || 1)) * 100}%`,
                }}
              />
            </div>
            <div className="flex items-center gap-4 text-[11px] text-neutral-500 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Maintenance
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Idle / Ready
              </span>
            </div>
          </div>
        </div>

        {/* Financial Flow */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-900">
              Rent-to-Own Portfolio Health
            </h3>
            <Link
              href="/management/finance"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              Finance Ledger <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-neutral-50 p-3">
              <div>
                <p className="text-xs text-neutral-500">Active RTO Contracts</p>
                <p className="text-lg font-bold text-neutral-900 mt-0.5">
                  {data.finance.activeContractsCount} Contracts
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-neutral-500">Portfolio Value</p>
                <p className="text-lg font-bold text-neutral-900 mt-0.5">
                  R {data.finance.totalExpectedRevenue.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-neutral-100 p-3">
                <span className="text-neutral-500">Verified Collections</span>
                <p className="text-base font-bold text-emerald-700 mt-1">
                  R {data.finance.totalVerifiedRevenue.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-100 p-3">
                <span className="text-neutral-500">Unsettled / Overdue</span>
                <p className="text-base font-bold text-red-700 mt-1">
                  R {data.finance.totalOverdueRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Incidents by Category */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-900">
              Emergency Incidents Breakdown
            </h3>
            <Link
              href="/management/emergency"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              Emergency Command <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 space-y-2">
            {Object.entries(data.emergency.byType).map(([type, count]) => {
              const pct =
                data.emergency.totalIncidents > 0
                  ? Math.round((count / data.emergency.totalIncidents) * 100)
                  : 0;
              return (
                <div key={type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="capitalize font-medium text-neutral-700">
                      {type.replace("_", " ")}
                    </span>
                    <span className="text-neutral-500">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full bg-red-600 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(data.emergency.byType).length === 0 && (
              <p className="py-6 text-center text-xs text-neutral-400">
                No emergency incidents logged.
              </p>
            )}
          </div>
        </div>

        {/* Inventory Parts Valuation */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-900">
              Parts Inventory Reserves
            </h3>
            <Link
              href="/management/inventory"
              className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              Inventory Registry <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Total Stock Value</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">
                R {data.inventory.totalInventoryValue.toLocaleString()}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                {data.inventory.totalParts} unique catalog items
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-4 border border-amber-100">
              <p className="text-xs text-amber-800">Low Stock Warnings</p>
              <p className="text-2xl font-bold text-amber-900 mt-1">
                {data.inventory.lowStockCount} Items
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Below reorder threshold
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
