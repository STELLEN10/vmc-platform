"use client";

import { useState, useTransition } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileText,
  Eye,
  Check,
  X,
  Loader2,
  Receipt,
  Plus,
  ArrowRight,
  Printer,
  Trash2,
  MessageCircle,
  Mail,
} from "lucide-react";
import {
  reviewFinancePayment,
  getPaymentProofSignedUrl,
  convertQuotationToInvoice,
  updateInvoiceStatus,
  deleteInvoiceOrQuotation,
} from "./actions";
import { triggerPaymentReminders } from "../notifications/actions";
import { CreateInvoiceModal } from "./invoice-modal";
import { InvoicePrintModal } from "./invoice-print-modal";
import type { InvoiceOrQuotation, InvoiceStatus } from "@/lib/finance/invoices";
import { getWhatsAppShareUrl, getEmailShareUrl } from "@/lib/finance/share";

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

export type FinanceDriverOption = {
  driverId: string;
  profileId: string;
  name: string;
  email?: string;
  phone?: string;
  bikeRegistration?: string;
};

export type FinancePartOption = {
  id: string;
  name: string;
  partNumber: string | null;
  sku: string | null;
  unitPrice: number;
  stockQuantity: number;
  category: string;
};

export function FinanceView({
  contracts,
  periods,
  invoices = [],
  driverOptions = [],
  partOptions = [],
  totalExpected,
  totalVerified,
  totalPending,
  totalOverdue,
}: {
  contracts: FinanceContractSummary[];
  periods: FinancePaymentPeriod[];
  invoices?: InvoiceOrQuotation[];
  driverOptions?: FinanceDriverOption[];
  partOptions?: FinancePartOption[];
  totalExpected: number;
  totalVerified: number;
  totalPending: number;
  totalOverdue: number;
}) {
  const [activeTab, setActiveTab] = useState<
    "all" | "awaiting" | "invoices" | "overdue" | "verified" | "contracts"
  >("invoices");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reminderBanner, setReminderBanner] = useState<string | null>(null);

  // Invoices state
  const [invoiceList, setInvoiceList] = useState<InvoiceOrQuotation[]>(invoices);
  const [invoiceFilter, setInvoiceFilter] = useState<
    "all" | "invoices" | "quotations" | "issued" | "paid" | "sent" | "accepted"
  >("all");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<InvoiceOrQuotation | null>(null);

  // Synchronize initial invoices if changed on server
  if (invoices !== invoiceList && invoices.length !== invoiceList.length) {
    setInvoiceList(invoices);
  }

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

  const filteredInvoices = invoiceList.filter((inv) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      inv.docNumber.toLowerCase().includes(q) ||
      inv.driverName.toLowerCase().includes(q) ||
      (inv.bikeRegistration && inv.bikeRegistration.toLowerCase().includes(q)) ||
      inv.items.some((it) => it.description.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (invoiceFilter === "invoices") return inv.type === "invoice";
    if (invoiceFilter === "quotations") return inv.type === "quotation";
    if (invoiceFilter === "issued") return inv.status === "issued";
    if (invoiceFilter === "paid") return inv.status === "paid";
    if (invoiceFilter === "sent") return inv.status === "sent";
    if (invoiceFilter === "accepted") return inv.status === "accepted";
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

  const handleConvertQuote = (quoteId: string) => {
    startTransition(async () => {
      const res = await convertQuotationToInvoice(quoteId);
      if (res.success && res.invoice) {
        setInvoiceList((prev) => [
          res.invoice,
          ...prev.map((d) => (d.id === quoteId ? { ...d, status: "converted" as InvoiceStatus } : d)),
        ]);
      }
    });
  };

  const handleMarkPaid = (invId: string) => {
    startTransition(async () => {
      const res = await updateInvoiceStatus(invId, "paid");
      if (res.success) {
        setInvoiceList((prev) =>
          prev.map((d) => (d.id === invId ? { ...d, status: "paid" as InvoiceStatus } : d))
        );
      }
    });
  };

  const handleDeleteDoc = (docId: string) => {
    if (!confirm("Are you sure you want to remove this document?")) return;
    startTransition(async () => {
      await deleteInvoiceOrQuotation(docId);
      setInvoiceList((prev) => prev.filter((d) => d.id !== docId));
    });
  };

  return (
    <div className="space-y-6">
      {/* Metrics Header */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Invoiced / Rent
            </span>
            <TrendingUp className="h-4 w-4 text-neutral-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-neutral-900">
            R {totalExpected.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Scheduled collections ledger</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Cleared & Verified
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600">
            R {totalVerified.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Confirmed bank receipts</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pending Proof Review
            </span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600">
            R {totalPending.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Awaiting management verification</p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Overdue Collections
            </span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-red-600">
            R {totalOverdue.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1 text-xs text-neutral-500">Past weekly due date</p>
        </div>
      </div>

      {reminderBanner && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{reminderBanner}</span>
          <button
            onClick={() => setReminderBanner(null)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-neutral-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("invoices")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "invoices"
                ? "bg-indigo-600 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            Invoices & Quotations
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "invoices" ? "bg-indigo-700 text-white" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {invoiceList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("awaiting")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "awaiting"
                ? "bg-amber-600 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Proof Review Queue
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "awaiting" ? "bg-amber-700 text-white" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {periods.filter((p) => p.status === "awaiting_verification").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overdue")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "overdue"
                ? "bg-red-600 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Overdue Rent
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                activeTab === "overdue" ? "bg-red-700 text-white" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {periods.filter((p) => p.status === "overdue").length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("verified")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "verified"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Verified Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contracts")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
              activeTab === "contracts"
                ? "bg-neutral-900 text-white shadow-2xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Contract Equity ({contracts.length})
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {activeTab === "invoices" && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 transition cursor-pointer shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              Create Invoice or Quotation
            </button>
          )}

          {activeTab === "overdue" && (
            <button
              type="button"
              onClick={handleTriggerReminders}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Broadcast Overdue Reminders
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: INVOICES & QUOTATIONS */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="Search by doc #, driver name or part..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs p-2 pl-3 rounded-lg border border-neutral-200 bg-neutral-50/50 focus:outline-none focus:border-indigo-500"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-700"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg text-xs font-semibold text-neutral-600">
              <button
                type="button"
                onClick={() => setInvoiceFilter("all")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  invoiceFilter === "all" ? "bg-white text-neutral-900 shadow-2xs font-bold" : "hover:text-neutral-900"
                }`}
              >
                All ({invoiceList.length})
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFilter("invoices")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  invoiceFilter === "invoices" ? "bg-white text-indigo-700 shadow-2xs font-bold" : "hover:text-indigo-700"
                }`}
              >
                Invoices
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFilter("quotations")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  invoiceFilter === "quotations" ? "bg-white text-amber-700 shadow-2xs font-bold" : "hover:text-amber-700"
                }`}
              >
                Quotations
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFilter("issued")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  invoiceFilter === "issued" ? "bg-white text-blue-700 shadow-2xs font-bold" : "hover:text-blue-700"
                }`}
              >
                Unpaid Issued
              </button>
              <button
                type="button"
                onClick={() => setInvoiceFilter("paid")}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  invoiceFilter === "paid" ? "bg-white text-emerald-700 shadow-2xs font-bold" : "hover:text-emerald-700"
                }`}
              >
                Paid
              </button>
            </div>
          </div>

          {/* Invoices & Quotations Table */}
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 font-bold">
                    <th className="px-4 py-3">Doc # & Type</th>
                    <th className="px-4 py-3">Recipient Driver</th>
                    <th className="px-4 py-3">Parts / Items Breakdown</th>
                    <th className="px-4 py-3">Issue & Due Date</th>
                    <th className="px-4 py-3 text-right">Amount (ZAR)</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                        <Receipt className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <p className="font-semibold text-neutral-700 m-0">No invoices or quotations found</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Click &quot;Create Invoice or Quotation&quot; above to bill a driver for specific parts.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => {
                      const isQuo = inv.type === "quotation";
                      return (
                        <tr key={inv.id} className="hover:bg-neutral-50/50 transition-colors">
                          {/* Doc Number & Type */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isQuo
                                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                                    : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                }`}
                              >
                                {isQuo ? "Quote" : "Invoice"}
                              </span>
                              <strong className="font-mono text-neutral-900">{inv.docNumber}</strong>
                            </div>
                          </td>

                          {/* Driver */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-neutral-900">{inv.driverName}</div>
                            <div className="text-[11px] text-neutral-500">
                              Bike: {inv.bikeRegistration || "Assigned Unit"}
                            </div>
                          </td>

                          {/* Items Breakdown */}
                          <td className="px-4 py-3 max-w-[260px]">
                            <div className="space-y-0.5">
                              {inv.items.map((it) => (
                                <div
                                  key={it.id}
                                  className="text-[11px] text-neutral-700 truncate"
                                  title={`${it.description} (x${it.quantity})`}
                                >
                                  • {it.description}{" "}
                                  <span className="text-neutral-400 font-mono">
                                    x{it.quantity} @ R{it.unitPrice}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>

                          {/* Dates */}
                          <td className="px-4 py-3 text-neutral-600">
                            <div>Issued: {inv.issueDate}</div>
                            <div className="text-[11px] text-neutral-400">Due: {inv.dueDate}</div>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-sm text-neutral-900">
                              R {inv.totalAmount.toFixed(2)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                inv.status === "paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : inv.status === "issued"
                                  ? "bg-blue-100 text-blue-800"
                                  : inv.status === "accepted"
                                  ? "bg-teal-100 text-teal-800"
                                  : inv.status === "converted"
                                  ? "bg-purple-100 text-purple-800"
                                  : inv.status === "sent"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-neutral-100 text-neutral-700"
                              }`}
                            >
                              {inv.status.replace("_", " ")}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <a
                                href={getWhatsAppShareUrl({
                                  type: inv.type,
                                  docNumber: inv.docNumber,
                                  recipientName: inv.driverName,
                                  recipientPhone: inv.driverPhone,
                                  issueDate: inv.issueDate,
                                  dueDate: inv.dueDate,
                                  items: inv.items,
                                  subtotal: inv.subtotal,
                                  totalAmount: inv.totalAmount,
                                  notes: inv.notes,
                                }, inv.driverPhone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded text-emerald-700 hover:bg-emerald-50 transition-colors"
                                title="Share to WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                              <a
                                href={getEmailShareUrl({
                                  type: inv.type,
                                  docNumber: inv.docNumber,
                                  recipientName: inv.driverName,
                                  recipientEmail: inv.driverEmail,
                                  issueDate: inv.issueDate,
                                  dueDate: inv.dueDate,
                                  items: inv.items,
                                  subtotal: inv.subtotal,
                                  totalAmount: inv.totalAmount,
                                  notes: inv.notes,
                                }, inv.driverEmail)}
                                className="p-1 rounded text-sky-700 hover:bg-sky-50 transition-colors"
                                title="Share via Email"
                              >
                                <Mail className="w-3.5 h-3.5" />
                              </a>
                              <button
                                type="button"
                                onClick={() => setViewingDoc(inv)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition cursor-pointer"
                                title="View & Print Document"
                              >
                                <Printer className="w-3 h-3" />
                                View
                              </button>

                              {isQuo && (inv.status === "sent" || inv.status === "accepted") && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertQuote(inv.id)}
                                  disabled={isPending}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                                  title="Convert Quote into Official Invoice"
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  To Invoice
                                </button>
                              )}

                              {!isQuo && inv.status === "issued" && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaid(inv.id)}
                                  disabled={isPending}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                                  title="Mark invoice as paid"
                                >
                                  <Check className="w-3 h-3" />
                                  Mark Paid
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteDoc(inv.id)}
                                disabled={isPending}
                                className="p-1 text-neutral-400 hover:text-rose-600 transition"
                                title="Delete document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AWAITING REVIEW / OVERDUE / VERIFIED PERIODS */}
      {activeTab !== "invoices" && activeTab !== "contracts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <input
                type="text"
                placeholder="Search driver, bike registration or week..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-neutral-200 bg-white p-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 font-bold">
                    <th className="px-4 py-3">Driver & Motorcycle</th>
                    <th className="px-4 py-3">Week #</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Amount Due</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Proof of Payment</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                        No payment periods found matching this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPeriods.map((p) => (
                      <tr key={p.id} className="hover:bg-neutral-50/50 transition">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-neutral-900">{p.driverName}</div>
                          <div className="text-[11px] text-neutral-500">{p.bikeRegistration}</div>
                        </td>
                        <td className="px-4 py-3 font-mono font-medium">Week {p.periodNumber}</td>
                        <td className="px-4 py-3 text-neutral-600">{p.dueDate}</td>
                        <td className="px-4 py-3 font-semibold text-neutral-900">
                          R {p.amountDue.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              p.status === "verified"
                                ? "bg-emerald-100 text-emerald-800"
                                : p.status === "awaiting_verification"
                                ? "bg-amber-100 text-amber-800"
                                : p.status === "overdue"
                                ? "bg-red-100 text-red-800"
                                : "bg-neutral-100 text-neutral-700"
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
        </div>
      )}

      {/* TAB 3: CONTRACT EQUITY */}
      {activeTab === "contracts" && (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/75 text-neutral-600 font-bold">
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Motorcycle</th>
                  <th className="px-4 py-3">Contract Progress</th>
                  <th className="px-4 py-3">Total Value</th>
                  <th className="px-4 py-3">Paid to Date</th>
                  <th className="px-4 py-3">Outstanding Balance</th>
                  <th className="px-4 py-3 text-right">Equity %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {contracts.map((c) => {
                  const pct = c.totalValue > 0 ? Math.round((c.verifiedAmount / c.totalValue) * 100) : 0;
                  return (
                    <tr key={c.contractId} className="hover:bg-neutral-50/50 transition">
                      <td className="px-4 py-3 font-semibold text-neutral-900">{c.driverName}</td>
                      <td className="px-4 py-3 font-mono">{c.bikeRegistration}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {c.paidWeeks} / {c.totalWeeks} wks
                          </span>
                          <div className="h-1.5 w-16 rounded-full bg-neutral-200 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">R {c.totalValue.toFixed(2)}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">
                        R {c.verifiedAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        R {c.outstandingAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-neutral-900">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Payment Proof Modal */}
      {rejectModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-neutral-900">Reject Payment Proof</h3>
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

      {/* Create Invoice / Quotation Modal */}
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        drivers={driverOptions}
        parts={partOptions}
      />

      {/* Invoice Document Viewer / Print Modal */}
      <InvoicePrintModal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        doc={viewingDoc}
      />
    </div>
  );
}
