"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Download,
  Calendar,
  Eye,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { reviewFinancePayment, getPaymentProofSignedUrl } from "./actions";
import { triggerPaymentReminders } from "../notifications/actions";

export type FinanceContractSummary = {
  contractId: string;
  driverId: string;
  driverProfileId: string;
  driverName: string;
  bikeRegistration: string;
  totalWeeks: number;
  paidWeeks: number;
  totalValue: number;
  verifiedAmount: number;
  outstandingAmount: number;
  status: string;
};

export type FinancePaymentPeriod = {
  id: string;
  contractId: string;
  driverProfileId: string;
  driverName: string;
  bikeRegistration: string;
  periodNumber: number;
  dueDate: string;
  amountDue: number;
  status: string;
  proofPath: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
};

export function FinanceView({
  contracts,
  periods,
  totalExpected,
  totalVerified,
  totalPending,
  totalOverdue,
}: {
  contracts: FinanceContractSummary[];
  periods: FinancePaymentPeriod[];
  totalExpected: number;
  totalVerified: number;
  totalPending: number;
  totalOverdue: number;
}) {
  const [activeTab, setActiveTab] = useState<"all" | "awaiting" | "overdue" | "verified" | "contracts">("awaiting");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reminderBanner, setReminderBanner] = useState<string | null>(null);

  const filteredPeriods = periods.filter((p) => {
    const matchesSearch =
      p.driverName.toLowerCase().includes(search.toLowerCase()) ||
      p.bikeRegistration.toLowerCase().includes(search.toLowerCase()) ||
      String(p.periodNumber).includes(search);

    if (!matchesSearch) return false;

    if (activeTab === "awaiting") return p.status === "awaiting_verification";
    if (activeTab === "overdue") return p.status === "overdue";
    if (activeTab === "verified") return p.status === "verified";
    return true;
  });

  const handleApprove = (periodId: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.append("periodId", periodId);
      fd.append("action", "approve");
      await reviewFinancePayment(fd);
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalId) return;

    startTransition(async () => {
      const fd = new FormData();
      fd.append("periodId", rejectModalId);
      fd.append("action", "reject");
      fd.append("reason", rejectReason);
      await reviewFinancePayment(fd);
      setRejectModalId(null);
      setRejectReason("");
    });
  };

  const handleViewProof = async (proofPath: string) => {
    const url = await getPaymentProofSignedUrl(proofPath);
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("Unable to generate signed view link for this payment proof.");
    }
  };

  const handleTriggerReminders = () => {
    startTransition(async () => {
      const res = await triggerPaymentReminders();
      setReminderBanner(res.message);
    });
  };

  const handleExportCsv = () => {
    const headers = [
      "Period ID",
      "Driver",
      "Bike Registration",
      "Week Number",
      "Due Date",
      "Amount Due (ZAR)",
      "Status",
      "Verified At",
      "Rejection Reason",
    ];

    const rows = periods.map((p) => [
      p.id,
      `"${p.driverName}"`,
      p.bikeRegistration,
      p.periodNumber,
      p.dueDate,
      p.amountDue,
      p.status,
      p.verifiedAt || "",
      `"${p.rejectionReason || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `vmc-financial-reconciliation-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const collectionRate = totalExpected > 0 ? Math.round((totalVerified / totalExpected) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Financial KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Verified Revenue
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            R {totalVerified.toLocaleString()}
          </p>
          <div className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{collectionRate}% collection efficiency</span>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Awaiting Verification
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-700">
            R {totalPending.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {periods.filter((p) => p.status === "awaiting_verification").length} proofs submitted
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Overdue Receivables
            </span>
            <div className="rounded-lg bg-red-50 p-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-700">
            R {totalOverdue.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {periods.filter((p) => p.status === "overdue").length} periods past due date
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Contract Portfolio
            </span>
            <div className="rounded-lg bg-neutral-100 p-2 text-neutral-700">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">
            R {totalExpected.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {contracts.length} active rent-to-own schedules
          </p>
        </div>
      </div>

      {/* Reminder execution banner */}
      {reminderBanner && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <span>{reminderBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setReminderBanner(null)}
            className="text-xs font-semibold uppercase hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Actions Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("awaiting")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "awaiting"
                ? "bg-neutral-900 text-white"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Awaiting Verification ({periods.filter((p) => p.status === "awaiting_verification").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "overdue"
                ? "bg-neutral-900 text-white"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Overdue ({periods.filter((p) => p.status === "overdue").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("verified")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "verified"
                ? "bg-neutral-900 text-white"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Verified ({periods.filter((p) => p.status === "verified").length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "all"
                ? "bg-neutral-900 text-white"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            All Periods ({periods.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("contracts")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "contracts"
                ? "bg-neutral-900 text-white"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Contract Schedules ({contracts.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search driver, bike, week..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />

          <button
            type="button"
            disabled={isPending}
            onClick={handleTriggerReminders}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
            title="Scan upcoming and overdue periods to notify drivers"
          >
            <Calendar className="h-3.5 w-3.5" />
            Dispatch Reminders
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Content: Either Periods Table or Contracts Table */}
      {activeTab === "contracts" ? (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-sm font-semibold text-neutral-900">
              Rent-to-Own Contract Portfolios
            </h3>
            <p className="text-xs text-neutral-500">
              Weekly payment schedule progress and equity payoff per motorcycle driver.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Motorcycle</th>
                  <th className="px-4 py-3">Payment Progress</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Collected</th>
                  <th className="px-4 py-3">Outstanding</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {contracts.map((c) => {
                  const progressPct = c.totalWeeks > 0 ? Math.round((c.paidWeeks / c.totalWeeks) * 100) : 0;
                  return (
                    <tr key={c.contractId} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        <Link
                          href={`/management/drivers/${c.driverProfileId}`}
                          className="hover:underline text-blue-600"
                        >
                          {c.driverName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono">{c.bikeRegistration}</td>
                      <td className="px-4 py-3">
                        <div className="w-48">
                          <div className="flex items-center justify-between mb-1 text-[11px]">
                            <span>
                              {c.paidWeeks} / {c.totalWeeks} wks
                            </span>
                            <span className="font-semibold">{progressPct}%</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full transition-all"
                              style={{ width: `${Math.min(100, progressPct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">R {c.totalValue.toLocaleString()}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">
                        R {c.verifiedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        R {c.outstandingAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/management/drivers/${c.driverProfileId}`}
                          className="font-medium text-neutral-700 hover:text-neutral-900 hover:underline"
                        >
                          Workspace →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-600">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase">
                <tr>
                  <th className="px-4 py-3">Driver & Motorcycle</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Amount Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Proof Submission</th>
                  <th className="px-4 py-3 text-right">Verification Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredPeriods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                      No payment periods match the selected criteria.
                    </td>
                  </tr>
                ) : (
                  filteredPeriods.map((p) => (
                    <tr key={p.id} className="hover:bg-neutral-50/50">
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        <Link
                          href={`/management/drivers/${p.driverProfileId}`}
                          className="hover:underline text-blue-600 font-semibold block"
                        >
                          {p.driverName}
                        </Link>
                        <span className="font-mono text-neutral-500 text-[11px]">
                          {p.bikeRegistration}
                        </span>
                      </td>

                      <td className="px-4 py-3">Week {p.periodNumber}</td>

                      <td className="px-4 py-3">
                        <span
                          className={
                            p.status === "overdue"
                              ? "font-semibold text-red-600"
                              : "text-neutral-700"
                          }
                        >
                          {p.dueDate}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-semibold text-neutral-900">
                        R {p.amountDue.toLocaleString()}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            p.status === "verified"
                              ? "bg-emerald-100 text-emerald-800"
                              : p.status === "awaiting_verification"
                              ? "bg-blue-100 text-blue-800 animate-pulse"
                              : p.status === "overdue"
                              ? "bg-red-100 text-red-800"
                              : p.status === "rejected"
                              ? "bg-neutral-200 text-neutral-700"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {p.status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {p.proofPath ? (
                          <button
                            type="button"
                            onClick={() => handleViewProof(p.proofPath!)}
                            className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                          >
                            <Eye className="h-3 w-3" />
                            View Proof
                          </button>
                        ) : (
                          <span className="text-neutral-400 italic">No proof</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {p.status === "awaiting_verification" ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleApprove(p.id)}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                            >
                              <Check className="h-3 w-3" />
                              Approve
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => setRejectModalId(p.id)}
                              className="inline-flex items-center gap-1 rounded border border-neutral-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        ) : p.status === "verified" ? (
                          <span className="text-xs text-neutral-400">
                            Verified {p.verifiedAt ? new Date(p.verifiedAt).toLocaleDateString() : ""}
                          </span>
                        ) : p.status === "rejected" ? (
                          <span className="text-xs text-red-600 max-w-[150px] truncate block" title={p.rejectionReason || ""}>
                            {p.rejectionReason || "Proof rejected"}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">
              Reject Payment Proof
            </h3>
            <p className="mt-1 text-xs text-neutral-500">
              Please specify the reason for rejection so the driver can correct it.
            </p>

            <form onSubmit={handleRejectSubmit} className="mt-4 space-y-3">
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Transaction reference illegible, payment amount does not match..."
                className="w-full rounded-lg border border-neutral-200 p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalId(null)}
                  className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
