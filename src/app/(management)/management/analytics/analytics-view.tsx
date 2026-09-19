"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type BikeRecord = {
  id: string;
  model: string;
  brand: string;
  status: string;
  created_at: string;
};

type PaymentRecord = {
  id: string;
  amount: number;
  status: string;
  due_date: string;
  paid_at: string | null;
  payment_type: string;
};

type MaintenanceRecord = {
  id: string;
  category: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

type EmergencyRecord = {
  id: string;
  emergency_type: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

type DriverRecord = {
  id: string;
  status: string;
  onboarding_status: string;
  created_at: string;
};

export function AnalyticsView({
  bikes,
  payments,
  maintenance,
  emergencies,
  drivers,
}: {
  bikes: BikeRecord[];
  payments: PaymentRecord[];
  maintenance: MaintenanceRecord[];
  emergencies: EmergencyRecord[];
  drivers: DriverRecord[];
}) {
  const [activeTab, setActiveTab] = useState<"fleet" | "financial" | "maintenance" | "exports">("fleet");

  // Fleet KPIs
  const totalBikes = bikes.length;
  const assignedBikes = bikes.filter((b) => b.status === "assigned").length;
  const maintenanceBikes = bikes.filter((b) => b.status === "maintenance").length;
  const availableBikes = bikes.filter((b) => b.status === "available" || b.status === "ready").length;
  const impoundedBikes = bikes.filter((b) => b.status === "impounded").length;
  const utilizationRate = totalBikes > 0 ? Math.round((assignedBikes / totalBikes) * 100) : 0;

  // Financial KPIs
  const totalDue = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalCollected = payments
    .filter((p) => p.status === "paid")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalOverdue = payments
    .filter((p) => p.status === "overdue" || p.status === "failed")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending" || p.status === "pending_verification")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const collectionRate = totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0;

  // Maintenance KPIs
  const openMaintenanceCount = maintenance.filter((m) => m.status !== "completed" && m.status !== "resolved").length;
  const resolvedMaintenanceCount = maintenance.filter((m) => m.status === "completed" || m.status === "resolved").length;
  const criticalEmergencyCount = emergencies.filter((e) => e.severity === "critical" || e.severity === "high").length;

  function exportCSV(type: "fleet" | "payments" | "maintenance") {
    let filename = "";
    let headers: string[] = [];
    let rows: string[][] = [];

    if (type === "fleet") {
      filename = `vmc-fleet-report-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ["Bike ID", "Brand", "Model", "Status", "Registered Date"];
      rows = bikes.map((b) => [b.id, b.brand, b.model, b.status, b.created_at]);
    } else if (type === "payments") {
      filename = `vmc-financial-payments-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ["Payment ID", "Type", "Amount (ZAR)", "Status", "Due Date", "Paid Date"];
      rows = payments.map((p) => [
        p.id,
        p.payment_type,
        String(p.amount),
        p.status,
        p.due_date,
        p.paid_at || "N/A",
      ]);
    } else if (type === "maintenance") {
      filename = `vmc-maintenance-audit-${new Date().toISOString().slice(0, 10)}.csv`;
      headers = ["Record ID", "Category", "Severity", "Status", "Logged Date", "Resolved Date"];
      rows = maintenance.map((m) => [
        m.id,
        m.category,
        m.severity,
        m.status,
        m.created_at,
        m.resolved_at || "In Progress",
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell || ""}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* Top Level Metric Grid */}
      <section className="metric-grid" aria-label="Key Operational Statistics">
        <article className="metric-card panel">
          <p className="card-label">Fleet Utilization</p>
          <strong>{utilizationRate}%</strong>
          <span>{assignedBikes} of {totalBikes} bikes assigned</span>
        </article>
        <article className="metric-card panel">
          <p className="card-label">Total Revenue Collected</p>
          <strong>R {totalCollected.toLocaleString()}</strong>
          <span>{collectionRate}% collection rate</span>
        </article>
        <article className="metric-card panel">
          <p className="card-label">Outstanding Arrears</p>
          <strong>R {totalOverdue.toLocaleString()}</strong>
          <span>Overdue or failed payments</span>
        </article>
        <article className="metric-card panel">
          <p className="card-label">Active Maintenance</p>
          <strong>{openMaintenanceCount}</strong>
          <span>{criticalEmergencyCount} high priority emergencies</span>
        </article>
      </section>

      {/* Tabs */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("fleet")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "fleet"
              ? "border-amber-600 text-amber-600 dark:text-amber-400"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Fleet Operations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("financial")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "financial"
              ? "border-amber-600 text-amber-600 dark:text-amber-400"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Financial Collections
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("maintenance")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "maintenance"
              ? "border-amber-600 text-amber-600 dark:text-amber-400"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Maintenance & Safety
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("exports")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTab === "exports"
              ? "border-amber-600 text-amber-600 dark:text-amber-400"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          Data Exports (CSV)
        </button>
      </div>

      {/* Tab 1: Fleet */}
      {activeTab === "fleet" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="panel space-y-4">
            <h3 className="font-bold text-ink">Fleet Status Distribution</h3>
            <p className="text-xs text-muted">Current operational state across the Valhalla Motorcycles fleet.</p>
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Assigned to Drivers ({assignedBikes})</span>
                  <span>{totalBikes ? Math.round((assignedBikes / totalBikes) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-paper h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${totalBikes ? (assignedBikes / totalBikes) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>In Workshop / Maintenance ({maintenanceBikes})</span>
                  <span>{totalBikes ? Math.round((maintenanceBikes / totalBikes) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-paper h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${totalBikes ? (maintenanceBikes / totalBikes) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Available / Ready ({availableBikes})</span>
                  <span>{totalBikes ? Math.round((availableBikes / totalBikes) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-paper h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${totalBikes ? (availableBikes / totalBikes) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Impounded / Disputed ({impoundedBikes})</span>
                  <span>{totalBikes ? Math.round((impoundedBikes / totalBikes) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-paper h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-red-500 h-full rounded-full"
                    style={{ width: `${totalBikes ? (impoundedBikes / totalBikes) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="panel space-y-4">
            <h3 className="font-bold text-ink">Driver Onboarding Funnel</h3>
            <p className="text-xs text-muted">Active pipeline of drivers across recruitment and contract execution.</p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                <span className="font-medium">Total Registered Drivers</span>
                <span className="font-bold">{drivers.length}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                <span className="font-medium">Approved & Onboarded</span>
                <span className="font-bold text-emerald-600">
                  {drivers.filter((d) => d.onboarding_status === "approved").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                <span className="font-medium">Pending Review / Document Verification</span>
                <span className="font-bold text-amber-600">
                  {drivers.filter((d) => d.onboarding_status === "submitted").length}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                <span className="font-medium">Draft Applications</span>
                <span className="font-bold text-muted">
                  {drivers.filter((d) => d.onboarding_status === "draft").length}
                </span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 2: Financial */}
      {activeTab === "financial" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="panel space-y-4">
            <h3 className="font-bold text-ink">Collection Breakdown</h3>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs">
                <div>
                  <div className="font-bold text-emerald-900 dark:text-emerald-200">Paid & Verified</div>
                  <div className="text-muted">Settled to bank accounts</div>
                </div>
                <strong className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                  R {totalCollected.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs">
                <div>
                  <div className="font-bold text-amber-900 dark:text-amber-200">Pending Verification</div>
                  <div className="text-muted">Proof uploaded, awaiting review</div>
                </div>
                <strong className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  R {totalPending.toLocaleString()}
                </strong>
              </div>
              <div className="flex justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs">
                <div>
                  <div className="font-bold text-red-900 dark:text-red-200">Overdue Arrears</div>
                  <div className="text-muted">Past payment deadline</div>
                </div>
                <strong className="text-sm font-bold text-red-700 dark:text-red-300">
                  R {totalOverdue.toLocaleString()}
                </strong>
              </div>
            </div>
          </section>

          <section className="panel space-y-4">
            <h3 className="font-bold text-ink">Payment Type Performance</h3>
            <p className="text-xs text-muted">Revenue categorized by weekly schedule vs deposit vs upfront settlement.</p>
            <div className="space-y-3 pt-2">
              {["weekly_rental", "deposit", "insurance", "fine"].map((type) => {
                const subPayments = payments.filter((p) => p.payment_type === type);
                const subTotal = subPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
                return (
                  <div key={type} className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                    <span className="font-medium capitalize">{type.replace("_", " ")}</span>
                    <div className="text-right">
                      <span className="font-bold">R {subTotal.toLocaleString()}</span>
                      <span className="text-muted ml-2">({subPayments.length} txs)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* Tab 3: Maintenance & Safety */}
      {activeTab === "maintenance" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className="panel space-y-4">
            <h3 className="font-bold text-ink">Emergency Incident Log Breakdown</h3>
            <p className="text-xs text-muted">Emergency reports by incident classification.</p>
            <div className="space-y-3 pt-2">
              {["accident", "breakdown", "puncture", "medical", "theft_attempt"].map((type) => {
                const count = emergencies.filter((e) => e.emergency_type === type).length;
                return (
                  <div key={type} className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                    <span className="font-medium capitalize">{type.replace("_", " ")}</span>
                    <StatusBadge tone={count > 0 ? "red" : "slate"}>{`${count} logged`}</StatusBadge>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel space-y-4">
            <h3 className="font-bold text-ink">Workshop Resolution Throughput</h3>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                <span className="font-medium">Open Maintenance Requests</span>
                <span className="font-bold text-amber-600">{openMaintenanceCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                <span className="font-medium">Resolved Maintenance Requests</span>
                <span className="font-bold text-emerald-600">{resolvedMaintenanceCount}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-paper rounded-lg text-xs">
                <span className="font-medium">Total Service Actions Completed</span>
                <span className="font-bold">{maintenance.length}</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Tab 4: CSV Exports */}
      {activeTab === "exports" && (
        <section className="panel space-y-4">
          <h3 className="font-bold text-ink">Operations CSV Data Exports</h3>
          <p className="text-xs text-muted">
            Generate clean, RFC 4180-compliant CSV reports directly from current database state for accounting, insurance, and fleet auditors.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 border border-line rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-ink">Motorcycle Fleet Register</h4>
                <p className="text-[11px] text-muted mt-1">Full inventory of VINs, models, brands, and current assignment status.</p>
              </div>
              <button
                type="button"
                onClick={() => exportCSV("fleet")}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Download Fleet CSV
              </button>
            </div>

            <div className="p-4 border border-line rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-ink">Financial Payments Ledger</h4>
                <p className="text-[11px] text-muted mt-1">Detailed list of dues, amounts, payment states, and verification timestamps.</p>
              </div>
              <button
                type="button"
                onClick={() => exportCSV("payments")}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Download Payments CSV
              </button>
            </div>

            <div className="p-4 border border-line rounded-xl space-y-3 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-ink">Maintenance & Incident Audit</h4>
                <p className="text-[11px] text-muted mt-1">Complete workshop history, issue categories, severity levels, and resolutions.</p>
              </div>
              <button
                type="button"
                onClick={() => exportCSV("maintenance")}
                className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Download Maintenance CSV
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
