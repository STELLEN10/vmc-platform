"use client";

import { useState } from "react";
import { createInvoiceAction, type InvoiceItem, type InvoiceRecord } from "./invoice-actions";

type DriverOption = {
  id: string;
  profileId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  bike: string | null;
};

export function CreateInvoiceModal({
  drivers,
  onClose,
  onCreated,
  defaultInvoiceNumber = "VMC-INV-100001",
  defaultIssueDate = "2026-09-28",
  defaultDueDate = "2026-10-05",
}: {
  drivers: DriverOption[];
  onClose: () => void;
  onCreated: (invoice: InvoiceRecord) => void;
  defaultInvoiceNumber?: string;
  defaultIssueDate?: string;
  defaultDueDate?: string;
}) {
  const [docType, setDocType] = useState<"invoice" | "quotation">("invoice");
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber);

  // Driver search and selection (reception of driver)
  const [driverSearch, setDriverSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverOption | null>(null);

  // Reception details
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [bikeReference, setBikeReference] = useState("");

  const [issueDate, setIssueDate] = useState(defaultIssueDate);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [vatRate, setVatRate] = useState<number>(15);
  const [notes, setNotes] = useState(
    "Standard Valhalla Motorcycles terms: Payments must be transferred via EFT using your Invoice Reference number. Proof must be submitted via the VMC rider app."
  );

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "Weekly Motorcycle Rental - Hero Eco 150", quantity: 1, unitPrice: 500, total: 500 },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSelectDriver(d: DriverOption) {
    setSelectedDriver(d);
    setRecipientName(d.name);
    setRecipientEmail(d.email || "");
    setRecipientPhone(d.phone || "");
    setRecipientAddress(d.address || "Johannesburg, Gauteng, South Africa");
    setBikeReference(d.bike || "Hero Eco 150 (VMC Fleet)");
  }

  function handleDocTypeChange(type: "invoice" | "quotation") {
    setDocType(type);
    setInvoiceNumber(`VMC-${type === "quotation" ? "QT" : "INV"}-${Date.now().toString().slice(-6)}`);
  }

  function addItem(desc = "Fleet Operational Fee", qty = 1, price = 250) {
    setItems((prev) => [...prev, { description: desc, quantity: qty, unitPrice: price, total: qty * price }]);
  }

  function updateItem(index: number, field: keyof InvoiceItem, value: string | number) {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      if (field === "description") {
        target.description = String(value);
      } else if (field === "quantity") {
        target.quantity = Math.max(1, Number(value) || 1);
        target.total = target.quantity * target.unitPrice;
      } else if (field === "unitPrice") {
        target.unitPrice = Math.max(0, Number(value) || 0);
        target.total = target.quantity * target.unitPrice;
      }
      copy[index] = target;
      return copy;
    });
  }

  function removeItem(index: number) {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatAmount = vatRate > 0 ? (subtotal * vatRate) / 100 : 0;
  const totalAmount = subtotal + vatAmount;

  const filteredDrivers = drivers.filter(
    (d) =>
      d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
      (d.email && d.email.toLowerCase().includes(driverSearch.toLowerCase())) ||
      (d.phone && d.phone.includes(driverSearch)) ||
      (d.bike && d.bike.toLowerCase().includes(driverSearch.toLowerCase()))
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!recipientName.trim()) {
      setErrorMsg("Please select or enter the driver recipient name.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.set("documentType", docType);
    formData.set("invoiceNumber", invoiceNumber);
    formData.set("driverId", selectedDriver?.id || "");
    formData.set("profileId", selectedDriver?.profileId || "");
    formData.set("recipientName", recipientName);
    formData.set("recipientEmail", recipientEmail);
    formData.set("recipientPhone", recipientPhone);
    formData.set("recipientAddress", recipientAddress);
    formData.set("bikeReference", bikeReference);
    formData.set("issueDate", issueDate);
    formData.set("dueDate", dueDate);
    formData.set("items", JSON.stringify(items));
    formData.set("vatRate", String(vatRate));
    formData.set("notes", notes);

    try {
      const res = await createInvoiceAction(formData);
      if (res?.invoice) {
        onCreated(res.invoice);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-navy/5">
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🧾</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground m-0">
                Create {docType === "quotation" ? "Official Quotation" : "Tax Invoice"}
              </h2>
              <p className="text-xs text-muted m-0 mt-0.5">
                Valhalla Motorcycles Fleet Billing Desk · Complete with official logo & printable PDF receipt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground text-xl font-bold p-1 rounded-lg hover:bg-black/5"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        {/* Modal Body with FULL Scrollability */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Document Type & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                Document Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDocTypeChange("invoice")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                    docType === "invoice"
                      ? "bg-navy text-white border-navy shadow"
                      : "bg-surface text-foreground border-line hover:bg-paper"
                  }`}
                >
                  📄 Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => handleDocTypeChange("quotation")}
                  className={`py-2 px-3 text-xs font-bold rounded-lg border text-center transition-all ${
                    docType === "quotation"
                      ? "bg-navy text-white border-navy shadow"
                      : "bg-surface text-foreground border-line hover:bg-paper"
                  }`}
                >
                  📋 Quotation
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                Document Reference #
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-xs font-mono font-bold p-2 border border-line rounded-lg bg-surface text-foreground"
                required
              />
            </div>
          </div>

          {/* DRIVER / RECEPTION SELECTION (Explicitly Scrollable Container with Search) */}
          <div className="border border-line rounded-xl p-4 bg-navy/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-navy uppercase tracking-wider block">
                  1. DRIVER RECEPTION & RECIPIENT SELECTOR
                </label>
                <p className="text-[11px] text-muted m-0">
                  Scroll through registered drivers or search to populate billing reception details.
                </p>
              </div>
              {selectedDriver && (
                <span className="text-[11px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-300">
                  ✓ Driver Selected
                </span>
              )}
            </div>

            {/* Driver Search Input */}
            <input
              type="text"
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
              placeholder="Search driver by name, phone, email, or bike..."
              className="w-full text-xs p-2.5 border border-line rounded-lg bg-paper text-foreground"
            />

            {/* Scrollable Driver List - Smooth overflow scroll */}
            <div className="max-h-48 overflow-y-auto overscroll-contain pr-1 space-y-1.5 border border-line/60 rounded-lg p-2 bg-paper">
              {filteredDrivers.length === 0 ? (
                <p className="text-xs text-muted text-center py-4">No matching drivers found.</p>
              ) : (
                filteredDrivers.map((driver) => {
                  const isSelected = selectedDriver?.id === driver.id;
                  return (
                    <div
                      key={driver.id}
                      onClick={() => handleSelectDriver(driver)}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-sky-50 border-sky-400 dark:bg-sky-950/40"
                          : "bg-surface hover:bg-paper border-line/50"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-foreground">{driver.name}</div>
                        <div className="text-[11px] text-muted flex gap-2 mt-0.5">
                          {driver.phone && <span>📞 {driver.phone}</span>}
                          {driver.bike && <span className="font-medium text-navy">🏍️ {driver.bike}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded ${
                          isSelected ? "bg-sky-600 text-white" : "bg-navy/10 text-navy hover:bg-navy/20"
                        }`}
                      >
                        {isSelected ? "Selected" : "Select"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Reception Fields (Auto-filled & Fully Editable / Scrollable) */}
            <div className="pt-2 border-t border-line/60">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-2">
                Reception Details (Billed To)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-muted block mb-0.5">Driver Full Name *</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                    className="w-full p-2 border border-line rounded-lg bg-paper text-foreground"
                    placeholder="e.g. Sipho Ndlovu"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Driver Phone</label>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full p-2 border border-line rounded-lg bg-paper text-foreground"
                    placeholder="e.g. +27 82 123 4567"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Driver Email</label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    className="w-full p-2 border border-line rounded-lg bg-paper text-foreground"
                    placeholder="driver@example.com"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Assigned Motorcycle</label>
                  <input
                    type="text"
                    value={bikeReference}
                    onChange={(e) => setBikeReference(e.target.value)}
                    className="w-full p-2 border border-line rounded-lg bg-paper text-foreground"
                    placeholder="Hero Eco 150 (Reg: GP 488-VMC)"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-muted block mb-0.5">Billing / Residential Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="w-full p-2 border border-line rounded-lg bg-paper text-foreground"
                    placeholder="e.g. 42 Main Street, Braamfontein, Johannesburg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-muted uppercase tracking-wider block mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full p-2 border border-line rounded-lg bg-surface text-foreground"
                required
              />
            </div>
            <div>
              <label className="font-bold text-muted uppercase tracking-wider block mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full p-2 border border-line rounded-lg bg-surface text-foreground"
              />
            </div>
          </div>

          {/* LINE ITEMS */}
          <div className="border border-line rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">
                2. LINE ITEMS & SERVICES (ZAR)
              </label>
              <button
                type="button"
                onClick={() => addItem()}
                className="text-action text-xs font-bold hover:underline"
              >
                + Add Custom Item
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pb-2 border-b border-line">
              <span className="text-[11px] text-muted py-1 font-semibold">Quick add:</span>
              <button
                type="button"
                onClick={() => addItem("Weekly Hero Eco 150 Motorcycle Rental", 1, 500)}
                className="text-[11px] bg-paper hover:bg-navy/5 border border-line rounded px-2 py-0.5 text-foreground"
              >
                + Weekly Rent (R500)
              </button>
              <button
                type="button"
                onClick={() => addItem("Scheduled 3,000km Engine Oil & Filter Service", 1, 250)}
                className="text-[11px] bg-paper hover:bg-navy/5 border border-line rounded px-2 py-0.5 text-foreground"
              >
                + Oil Service (R250)
              </button>
              <button
                type="button"
                onClick={() => addItem("Brake Pad Replacement & Inspection", 1, 380)}
                className="text-[11px] bg-paper hover:bg-navy/5 border border-line rounded px-2 py-0.5 text-foreground"
              >
                + Brake Service (R380)
              </button>
              <button
                type="button"
                onClick={() => addItem("Fleet Delivery Top Box & Bracket", 1, 450)}
                className="text-[11px] bg-paper hover:bg-navy/5 border border-line rounded px-2 py-0.5 text-foreground"
              >
                + Top Box (R450)
              </button>
            </div>

            {/* Items Table */}
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <div className="col-span-6 sm:col-span-7">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Item description"
                      className="w-full p-2 border border-line rounded-lg bg-surface text-foreground"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      placeholder="Qty"
                      className="w-full p-2 border border-line rounded-lg bg-surface text-foreground text-center"
                      required
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <div className="relative">
                      <span className="absolute left-2 top-2 text-muted">R</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                        placeholder="Price"
                        className="w-full p-2 pl-6 border border-line rounded-lg bg-surface text-foreground"
                        required
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold p-1"
                      title="Remove line item"
                      disabled={items.length <= 1}
                    >
                      &times;
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Summary */}
            <div className="pt-3 border-t border-line space-y-1.5 text-xs text-right">
              <div className="flex justify-end gap-6 text-muted">
                <span>Subtotal:</span>
                <span className="font-mono font-semibold text-foreground">R{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-end items-center gap-4 text-muted">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={vatRate > 0}
                    onChange={(e) => setVatRate(e.target.checked ? 15 : 0)}
                  />
                  <span>Apply 15% VAT:</span>
                </label>
                <span className="font-mono font-semibold text-foreground">R{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-6 text-sm font-bold text-navy pt-1 border-t border-line/60">
                <span>Total Due:</span>
                <span className="font-mono text-emerald-700 text-base">R{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes & Bank Details */}
          <div>
            <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
              Payment Terms & Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full p-2 text-xs border border-line rounded-lg bg-surface text-foreground"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="button button--secondary text-xs py-2 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="button button--primary text-xs py-2 px-6 shadow-md"
            >
              {loading ? "Generating..." : `Create & Preview ${docType === "quotation" ? "Quotation" : "Invoice"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
