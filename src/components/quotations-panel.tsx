"use client";

import { useState } from "react";
import Image from "next/image";
import {
  type Quotation,
  type QuotationItem,
  INITIAL_QUOTATIONS,
  DEFAULT_BANKING_DETAILS,
  generateCleanWhatsAppMessage,
  generateCleanPlainTextMessage,
  getWhatsAppUrl,
} from "@/lib/quotations";

const STORAGE_KEY = "vmc_official_quotations";

export function QuotationsPanel({
  initialQuoteId,
  availableDrivers = [],
  availableBikes = [],
}: {
  initialQuoteId?: string;
  availableDrivers?: { id: string; name: string; phone?: string }[];
  availableBikes?: { id: string; reg: string; model?: string }[];
}) {
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    if (typeof window === "undefined") return INITIAL_QUOTATIONS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_QUOTATIONS;
  });

  const [selectedQuoteId, setSelectedQuoteId] = useState<string>(
    initialQuoteId || INITIAL_QUOTATIONS[0]?.id || ""
  );
  const [copiedType, setCopiedType] = useState<"whatsapp" | "sms" | "account" | "ref" | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");

  // Form states for new quotation
  const [newClientName, setNewClientName] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newMotorcycleReg, setNewMotorcycleReg] = useState("");
  const [newMotorcycleModel, setNewMotorcycleModel] = useState("HERO Eco 150");
  const [newDateIssued, setNewDateIssued] = useState("2026-09-28");
  const [newDueDate, setNewDueDate] = useState("2026-10-05");
  const [newItems, setNewItems] = useState<QuotationItem[]>([
    { id: "1", description: "Tyre Front", quantity: 1, unitPrice: 436.58, total: 436.58 },
  ]);
  const [newNotes, setNewNotes] = useState("Payment confirms warehouse release and depot fitment slot.");

  function saveQuotes(updated: Quotation[]) {
    setQuotations(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  const selectedQuote = quotations.find((q) => q.id === selectedQuoteId) || quotations[0];

  const filteredQuotes = quotations.filter((q) => {
    const s = search.toLowerCase();
    return (
      q.id.toLowerCase().includes(s) ||
      q.clientName.toLowerCase().includes(s) ||
      q.motorcycleReg.toLowerCase().includes(s) ||
      q.contactNumber.toLowerCase().includes(s)
    );
  });

  async function handleCopy(text: string, type: "whatsapp" | "sms" | "account" | "ref") {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 3000);
    }
  }

  function handleCreateQuotation(e: React.FormEvent) {
    e.preventDefault();
    if (!newClientName || !newMotorcycleReg || newItems.length === 0) return;

    const total = newItems.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const newId = `QUO-${new Date().getFullYear()}-${String(quotations.length + 1).padStart(3, "0")}`;

    const newQuotation: Quotation = {
      id: newId,
      clientName: newClientName,
      contactNumber: newContact || "+27 00 000 0000",
      motorcycleReg: newMotorcycleReg,
      motorcycleModel: newMotorcycleModel,
      dateIssued: newDateIssued,
      dueDate: newDueDate,
      corridor: "Pretoria to Midrand",
      status: "pending",
      items: newItems,
      totalAmount: total,
      bankingDetails: {
        ...DEFAULT_BANKING_DETAILS,
        reference: newId,
      },
      enquiriesPhone: "+27 76 668 1879",
      enquiriesEmail: "info@vsprocurement.co.za",
      notes: newNotes,
      createdAt: new Date().toISOString(),
    };

    const updated = [newQuotation, ...quotations];
    saveQuotes(updated);
    setSelectedQuoteId(newId);
    setIsCreating(false);

    // Reset items
    setNewItems([{ id: "1", description: "", quantity: 1, unitPrice: 0, total: 0 }]);
  }

  function handleAddItem() {
    setNewItems([
      ...newItems,
      {
        id: String(Date.now()),
        description: "",
        quantity: 1,
        unitPrice: 0,
        total: 0,
      },
    ]);
  }

  function handleItemChange(idx: number, field: keyof QuotationItem, val: string | number) {
    const updated = [...newItems];
    const item = { ...updated[idx], [field]: val };
    if (field === "quantity" || field === "unitPrice") {
      item.total = Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }
    updated[idx] = item;
    setNewItems(updated);
  }

  function handleRemoveItem(idx: number) {
    if (newItems.length <= 1) return;
    setNewItems(newItems.filter((_, i) => i !== idx));
  }

  function updateStatus(status: Quotation["status"]) {
    if (!selectedQuote) return;
    const updated = quotations.map((q) => (q.id === selectedQuote.id ? { ...q, status } : q));
    saveQuotes(updated);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-navy text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <Image
              src="/vmc-logo.png"
              alt="Valhalla Motorcycles"
              width={48}
              height={40}
              className="h-9 w-auto object-contain"
              priority
            />
          </div>
          <div>
            <div className="text-xs tracking-wider uppercase font-semibold text-blue-200">
              VS PROCUREMENT & VALHALLA MOTORCYCLES
            </div>
            <h2 className="text-lg font-bold text-white m-0">Official Quotation Generator & Dispatch</h2>
            <p className="text-xs text-blue-200/80 m-0">
              Pretoria to Midrand Corridor · Capitec EFT Banking · Instant Clean WhatsApp Output
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow cursor-pointer flex items-center gap-1.5"
          >
            <span>{isCreating ? "✕ Close Form" : "+ New Quotation"}</span>
          </button>
        </div>
      </div>

      {/* New Quotation Form Modal / Collapse */}
      {isCreating && (
        <form onSubmit={handleCreateQuotation} className="panel space-y-4 border-2 border-amber-500/30">
          <div className="border-b border-line pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink">Create New Official Quotation</h3>
              <p className="text-xs text-muted">Generate professional quotation with Capitec banking details and WhatsApp dispatch.</p>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold">
              Pretoria to Midrand
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-xs font-semibold text-ink">
              Client / Driver Name *
              <input
                required
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="e.g. Lameck"
                className="w-full mt-1 p-2 text-xs border border-line rounded bg-paper"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Driver Contact Number *
              <input
                required
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="e.g. +27785206862"
                className="w-full mt-1 p-2 text-xs border border-line rounded bg-paper"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Motorcycle Registration *
              <input
                required
                value={newMotorcycleReg}
                onChange={(e) => setNewMotorcycleReg(e.target.value)}
                placeholder="e.g. rsuC31ZJGP"
                className="w-full mt-1 p-2 text-xs border border-line rounded bg-paper uppercase font-mono"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Motorcycle Model
              <input
                value={newMotorcycleModel}
                onChange={(e) => setNewMotorcycleModel(e.target.value)}
                placeholder="HERO Eco 150"
                className="w-full mt-1 p-2 text-xs border border-line rounded bg-paper"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Date Issued
              <input
                type="date"
                value={newDateIssued}
                onChange={(e) => setNewDateIssued(e.target.value)}
                className="w-full mt-1 p-2 text-xs border border-line rounded bg-paper"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Due Date
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                className="w-full mt-1 p-2 text-xs border border-line rounded bg-paper"
              />
            </label>
          </div>

          {/* Quick autofill from existing drivers & bikes if available */}
          {(availableDrivers.length > 0 || availableBikes.length > 0) && (
            <div className="flex flex-wrap gap-2 text-xs text-muted items-center bg-surface p-2 rounded">
              <span className="font-semibold">Quick pick:</span>
              {availableDrivers.slice(0, 3).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setNewClientName(d.name);
                    if (d.phone) setNewContact(d.phone);
                  }}
                  className="px-2 py-0.5 bg-paper border border-line rounded hover:bg-paper/80"
                >
                  Driver: {d.name}
                </button>
              ))}
              {availableBikes.slice(0, 3).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setNewMotorcycleReg(b.reg);
                    if (b.model) setNewMotorcycleModel(b.model);
                  }}
                  className="px-2 py-0.5 bg-paper border border-line rounded hover:bg-paper/80 font-mono"
                >
                  Bike: {b.reg}
                </button>
              ))}
            </div>
          )}

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="card-label m-0">SCHEDULE OF CHARGES / ITEMS</span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs text-action font-bold hover:underline cursor-pointer"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-2">
              {newItems.map((item, idx) => (
                <div key={item.id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-muted text-center">{idx + 1}.</span>
                  <input
                    placeholder="Description (e.g. Tyre Front, Service Labour)"
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                    required
                    className="flex-3 p-1.5 border border-line rounded bg-paper text-ink"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                    className="w-16 p-1.5 border border-line rounded bg-paper text-ink text-center"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-muted">R</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      placeholder="Unit Price"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                      className="w-24 p-1.5 border border-line rounded bg-paper text-ink font-mono"
                    />
                  </div>
                  <span className="w-24 font-mono font-bold text-ink text-right">
                    R {item.total.toFixed(2)}
                  </span>
                  {newItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="text-red-500 hover:text-red-700 px-1 font-bold text-sm cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-line text-sm">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-muted">Total Quoted:</span>
                <span className="text-lg font-bold font-mono text-ink">
                  R {newItems.reduce((acc, c) => acc + (c.total || 0), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <label className="text-xs font-semibold text-ink block">
            Quotation Notes / Terms
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Payment confirms warehouse release."
              className="w-full mt-1 p-2 text-xs border border-line rounded bg-paper"
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="button button--light !py-1.5 !px-3 !text-xs"
            >
              Cancel
            </button>
            <button type="submit" className="button button--primary !py-1.5 !px-4 !text-xs">
              Save & Generate Quotation
            </button>
          </div>
        </form>
      )}

      {/* Main Grid: Quotations List + Live Document / Clean Message Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Quotations Index */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="card-label m-0">QUOTATIONS REGISTER</span>
            <span className="text-xs text-muted">{filteredQuotes.length} quotes</span>
          </div>

          <input
            type="text"
            placeholder="Search by quote #, client, bike..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-paper border border-line rounded-lg text-ink focus:outline-hidden"
          />

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredQuotes.map((q) => {
              const isSelected = q.id === selectedQuote?.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuoteId(q.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? "bg-paper border-blue-500 shadow-sm ring-1 ring-blue-500/20"
                      : "bg-surface hover:bg-paper border-line"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-ink">{q.id}</span>
                      <div className="font-semibold text-ink mt-0.5">{q.clientName}</div>
                      <div className="text-[11px] text-muted">
                        🏍️ {q.motorcycleReg} · {q.contactNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-ink">
                        R {q.totalAmount.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          q.status === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : q.status === "overdue"
                            ? "bg-red-100 text-red-800"
                            : "bg-amber-100 text-amber-900"
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-line/50 flex items-center justify-between text-[11px] text-muted">
                    <span>Issued: {q.dateIssued}</span>
                    <span>Due: {q.dueDate}</span>
                  </div>
                </div>
              );
            })}

            {filteredQuotes.length === 0 && (
              <div className="p-6 text-center text-xs text-muted bg-paper rounded border border-line">
                No quotations found matching &ldquo;{search}&rdquo;.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Official Document & Instant Clean Message Preview */}
        {selectedQuote ? (
          <div className="lg:col-span-8 space-y-4">
            {/* Action Bar */}
            <div className="panel p-3 flex flex-wrap items-center justify-between gap-3 bg-surface">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted">Status:</span>
                <select
                  value={selectedQuote.status}
                  onChange={(e) => updateStatus(e.target.value as Quotation["status"])}
                  className="px-2 py-1 text-xs border border-line rounded bg-paper text-ink font-semibold"
                >
                  <option value="pending">Pending Payment</option>
                  <option value="paid">Payment Verified (Paid)</option>
                  <option value="overdue">Overdue</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(generateCleanWhatsAppMessage(selectedQuote), "whatsapp")
                  }
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>💬 Copy Clean WhatsApp Message</span>
                  {copiedType === "whatsapp" && <span className="text-[11px]">✓ Copied!</span>}
                </button>

                <a
                  href={getWhatsAppUrl(
                    selectedQuote.contactNumber,
                    generateCleanWhatsAppMessage(selectedQuote)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <span>↗ Send to WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-paper hover:bg-paper/80 border border-line text-ink transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <span>🖨️ Print / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(generateCleanPlainTextMessage(selectedQuote), "sms")
                  }
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-paper hover:bg-paper/80 border border-line text-muted transition-colors cursor-pointer"
                  title="Copy plain text for SMS"
                >
                  <span>Plain SMS</span>
                  {copiedType === "sms" && <span className="ml-1 text-emerald-600 font-bold">✓</span>}
                </button>
              </div>
            </div>

            {/* Official Letterhead Document View */}
            <div className="panel p-6 bg-white text-slate-900 border border-slate-200 shadow-md space-y-6 printable-quotation">
              {/* Letterhead Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
                <div className="flex items-center gap-4">
                  <Image
                    src="/vmc-logo.png"
                    alt="Valhalla Motorcycles Logo"
                    width={80}
                    height={64}
                    priority
                    className="h-16 w-auto object-contain"
                  />
                  <div>
                    <h1 className="text-lg font-black tracking-tight uppercase text-slate-950 m-0 leading-none">
                      VS PROCUREMENT / VALHALLA MOTORCYCLES
                    </h1>
                    <div className="text-xs font-bold text-red-600 tracking-wider uppercase mt-1">
                      Fleet Operations & Parts Depot
                    </div>
                    <div className="text-xs text-slate-600 font-medium">
                      Pretoria to Midrand Corridor · Gauteng, South Africa
                    </div>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="inline-block px-3 py-1 rounded bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider">
                    OFFICIAL QUOTATION
                  </div>
                  <div className="font-mono font-black text-xl text-slate-950 mt-1">
                    {selectedQuote.id}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    <div><strong>Issued:</strong> {selectedQuote.dateIssued}</div>
                    <div><strong>Due:</strong> {selectedQuote.dueDate}</div>
                  </div>
                </div>
              </div>

              {/* Client & Motorcycle Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    CLIENT / RIDER DETAILS
                  </span>
                  <div className="text-sm font-bold text-slate-900">{selectedQuote.clientName}</div>
                  <div className="text-slate-700 mt-0.5">
                    <strong>Contact:</strong> {selectedQuote.contactNumber}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Operating Corridor: {selectedQuote.corridor}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    MOTORCYCLE ASSIGNMENT
                  </span>
                  <div className="text-sm font-mono font-bold text-slate-900">
                    {selectedQuote.motorcycleReg}
                  </div>
                  <div className="text-slate-700 mt-0.5">
                    <strong>Model:</strong> {selectedQuote.motorcycleModel || "HERO Eco 150"}
                  </div>
                  <div className="text-slate-500 text-[11px] mt-0.5">
                    Status: <span className="font-semibold text-slate-800 uppercase">{selectedQuote.status}</span>
                  </div>
                </div>
              </div>

              {/* Schedule of Charges / Items Table */}
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
                  SCHEDULE OF CHARGES / ITEMS
                </span>
                <table className="w-full text-xs border border-slate-200 rounded overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 text-left w-10">#</th>
                      <th className="p-2.5 text-left">Description</th>
                      <th className="p-2.5 text-center w-16">Qty</th>
                      <th className="p-2.5 text-right w-28">Unit Price</th>
                      <th className="p-2.5 text-right w-28">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedQuote.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-slate-900">{item.description}</td>
                        <td className="p-2.5 text-center font-mono">{item.quantity}</td>
                        <td className="p-2.5 text-right font-mono text-slate-700">
                          R {item.unitPrice.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-950">
                          R {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                    <tr>
                      <td colSpan={4} className="p-3 text-right uppercase text-xs text-slate-800">
                        TOTAL QUOTED:
                      </td>
                      <td className="p-3 text-right font-mono text-base text-red-700">
                        R {selectedQuote.totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Official EFT Banking Details Box */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 text-xs text-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-blue-200 mb-3">
                  <div className="flex items-center gap-2 font-bold text-blue-950 uppercase tracking-wide">
                    <span>💳 OFFICIAL BANKING DETAILS (EFT PAYMENT)</span>
                  </div>
                  <span className="text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                    Strict Payment Reference Required
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Bank Name</span>
                    <strong className="text-slate-900">{selectedQuote.bankingDetails.bankName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Account Holder</span>
                    <strong className="text-slate-900">{selectedQuote.bankingDetails.accountHolder}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Account Type</span>
                    <strong className="text-slate-900">{selectedQuote.bankingDetails.accountType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Account Number</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <strong className="font-mono text-sm text-slate-950">
                        {selectedQuote.bankingDetails.accountNumber}
                      </strong>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(selectedQuote.bankingDetails.accountNumber, "account")
                        }
                        className="text-[10px] px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded font-semibold cursor-pointer"
                      >
                        {copiedType === "account" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Branch Code</span>
                    <strong className="font-mono text-slate-900">
                      {selectedQuote.bankingDetails.branchCode}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">EFT Reference</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <strong className="font-mono text-sm text-red-700">
                        {selectedQuote.bankingDetails.reference}
                      </strong>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(selectedQuote.bankingDetails.reference, "ref")
                        }
                        className="text-[10px] px-1.5 py-0.5 bg-red-100 hover:bg-red-200 text-red-800 rounded font-semibold cursor-pointer"
                      >
                        {copiedType === "ref" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-blue-200/70 text-[11px] text-slate-600">
                  Please use reference <strong>{selectedQuote.bankingDetails.reference}</strong> when making EFT payments to ensure instantaneous allocation.
                </div>
              </div>

              {/* Official Enquiries & Contacts */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  <strong>Enquiries / WhatsApp:</strong> {selectedQuote.enquiriesPhone}
                </div>
                <div>
                  <strong>Email:</strong> {selectedQuote.enquiriesEmail}
                </div>
                <div className="text-[11px] text-slate-400">
                  Valhalla Motorcycles (Pty) Ltd · Pretoria to Midrand
                </div>
              </div>
            </div>

            {/* Clean WhatsApp Message Preview Box */}
            <div className="panel space-y-3 bg-slate-900 text-slate-100 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold text-xs">💬 Clean WhatsApp Message Output</span>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                    Fixed encoding · No corrupted characters ()
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(generateCleanWhatsAppMessage(selectedQuote), "whatsapp")
                  }
                  className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
                >
                  {copiedType === "whatsapp" ? "✓ Copied to Clipboard!" : "Copy WhatsApp Text"}
                </button>
              </div>

              <div className="p-3 bg-slate-950/80 rounded border border-slate-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap leading-relaxed select-all">
                {generateCleanWhatsAppMessage(selectedQuote)}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Formatted with WhatsApp bolding, clean section dividers, and Capitec EFT details.</span>
                <a
                  href={getWhatsAppUrl(
                    selectedQuote.contactNumber,
                    generateCleanWhatsAppMessage(selectedQuote)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline font-bold"
                >
                  Launch in WhatsApp →
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
