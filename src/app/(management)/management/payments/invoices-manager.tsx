"use client";

import { useState } from "react";
import { CreateInvoiceModal } from "./create-invoice-form";
import { InvoiceReceiptModal } from "./invoice-receipt-view";
import { type InvoiceRecord } from "./invoice-actions";

type DriverOption = {
  id: string;
  profileId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  bike: string | null;
};

export function InvoicesManager({
  initialInvoices,
  drivers,
}: {
  initialInvoices: InvoiceRecord[];
  drivers: DriverOption[];
}) {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initialInvoices);
  const [activeModal, setActiveModal] = useState<"none" | "create" | "view">("none");
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [filterType, setFilterType] = useState<"all" | "invoice" | "quotation">("all");
  const [search, setSearch] = useState("");
  const [createDefaults, setCreateDefaults] = useState({
    invoiceNumber: "VMC-INV-100001",
    issueDate: "2026-09-28",
    dueDate: "2026-10-05",
  });

  function handleOpenCreate() {
    const now = Date.now();
    setCreateDefaults({
      invoiceNumber: `VMC-INV-${now.toString().slice(-6)}`,
      issueDate: new Date(now).toISOString().split("T")[0],
      dueDate: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    });
    setActiveModal("create");
  }

  function handleInvoiceCreated(newInv: InvoiceRecord) {
    setInvoices((prev) => [newInv, ...prev]);
    setSelectedInvoice(newInv);
    setActiveModal("view");
  }

  function handleStatusChange(newStatus: "draft" | "issued" | "paid" | "cancelled") {
    if (!selectedInvoice) return;
    setInvoices((prev) =>
      prev.map((inv) => (inv.id === selectedInvoice.id ? { ...inv, status: newStatus } : inv))
    );
    setSelectedInvoice((prev) => (prev ? { ...prev, status: newStatus } : null));
  }

  const filtered = invoices.filter((inv) => {
    if (filterType !== "all" && inv.document_type !== filterType) return false;
    if (
      search &&
      !inv.invoice_number.toLowerCase().includes(search.toLowerCase()) &&
      !inv.recipient_name.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-paper border border-line">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by invoice # or driver name..."
            className="text-xs p-2 border border-line rounded-lg bg-surface text-foreground w-64"
          />
          <div className="flex rounded-lg border border-line overflow-hidden text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 font-medium transition-colors ${
                filterType === "all" ? "bg-navy text-white" : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              All ({invoices.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType("invoice")}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-line ${
                filterType === "invoice" ? "bg-navy text-white" : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              Invoices
            </button>
            <button
              type="button"
              onClick={() => setFilterType("quotation")}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-line ${
                filterType === "quotation" ? "bg-navy text-white" : "bg-surface text-muted hover:text-foreground"
              }`}
            >
              Quotations
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="button button--primary text-xs py-2 px-4 shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
        >
          <span>+</span> Create Invoice or Quotation
        </button>
      </div>

      {/* Invoices List Table */}
      <div className="panel overflow-hidden p-0 border border-line">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">
            <span className="text-3xl block mb-2" aria-hidden="true">🧾</span>
            <p className="font-semibold text-foreground m-0">No invoices or quotations yet</p>
            <p className="m-0 mt-1">Create official billing documents and print PDF receipts with the VMC logo.</p>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="button button--secondary text-xs mt-3 inline-block"
            >
              + Create First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-line bg-navy/5 text-muted font-bold">
                  <th className="py-2.5 px-3.5">Document #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Driver / Recipient</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt & Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-line/60 hover:bg-paper/60 transition-colors">
                    <td className="py-3 px-3.5 font-mono font-bold text-foreground">
                      {inv.invoice_number}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.document_type === "quotation"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                      }`}>
                        {inv.document_type}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-foreground">{inv.recipient_name}</div>
                      {inv.bike_reference && (
                        <div className="text-[11px] text-muted">{inv.bike_reference}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-muted">{inv.issue_date}</td>
                    <td className="py-3 px-3 font-mono font-bold text-foreground">
                      R{Number(inv.total_amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inv.status === "paid"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setActiveModal("view");
                        }}
                        className="py-1 px-3 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded font-semibold text-xs cursor-pointer transition-colors shadow-sm inline-flex items-center gap-1.5"
                      >
                        <span>📄</span> View & Print PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {activeModal === "create" && (
        <CreateInvoiceModal
          drivers={drivers}
          defaultInvoiceNumber={createDefaults.invoiceNumber}
          defaultIssueDate={createDefaults.issueDate}
          defaultDueDate={createDefaults.dueDate}
          onClose={() => setActiveModal("none")}
          onCreated={handleInvoiceCreated}
        />
      )}

      {/* Receipt Modal with VMC Logo */}
      {activeModal === "view" && selectedInvoice && (
        <InvoiceReceiptModal
          invoice={selectedInvoice}
          onClose={() => {
            setActiveModal("none");
            setSelectedInvoice(null);
          }}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
