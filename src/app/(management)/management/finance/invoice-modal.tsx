"use client";

import { useState, useTransition } from "react";
import { X, Plus, Trash2, Loader2, Receipt, FileQuestion } from "lucide-react";
import { createInvoiceOrQuotation, type CreateInvoicePayload } from "./actions";
import type { FinanceDriverOption, FinancePartOption } from "./finance-view";
import type { InvoiceType } from "@/lib/finance/invoices";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: FinanceDriverOption[];
  parts: FinancePartOption[];
  onSuccess?: () => void;
}

interface TempLineItem {
  id: string;
  partId?: string;
  description: string;
  partNumber?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
}

function getDefaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  drivers,
  parts,
  onSuccess,
}: CreateInvoiceModalProps) {
  const [docType, setDocType] = useState<InvoiceType>("invoice");
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.profileId || "");
  const [dueDate, setDueDate] = useState<string>(getDefaultDueDate);
  const [notes, setNotes] = useState("");
  const [includeVat, setIncludeVat] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [lineItems, setLineItems] = useState<TempLineItem[]>([
    {
      id: "item-init",
      description: "",
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  if (!isOpen) return null;

  const selectedDriver = drivers.find((d) => d.profileId === selectedDriverId) || drivers[0];

  const handlePartSelect = (index: number, partId: string) => {
    if (!partId) return;
    const part = parts.find((p) => p.id === partId);
    if (!part) return;

    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              partId: part.id,
              description: `${part.name}${part.partNumber ? ` (${part.partNumber})` : ""}`,
              partNumber: part.partNumber || undefined,
              sku: part.sku || undefined,
              unitPrice: part.unitPrice,
            }
          : item
      )
    );
  };

  const handleItemChange = (index: number, field: keyof TempLineItem, val: unknown) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleAddItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        description: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = lineItems.reduce((acc, it) => acc + (it.quantity || 1) * (it.unitPrice || 0), 0);
  const taxAmount = includeVat ? subtotal * 0.15 : 0;
  const grandTotal = subtotal + taxAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriver) {
      setErrorMessage("Please select a recipient driver.");
      return;
    }
    const validItems = lineItems.filter((it) => it.description.trim() && it.quantity > 0);
    if (validItems.length === 0) {
      setErrorMessage("Please add at least one line item with description and price.");
      return;
    }

    setErrorMessage(null);

    const payload: CreateInvoicePayload = {
      type: docType,
      driverId: selectedDriver.driverId,
      driverProfileId: selectedDriver.profileId,
      driverName: selectedDriver.name,
      driverEmail: selectedDriver.email,
      driverPhone: selectedDriver.phone,
      bikeRegistration: selectedDriver.bikeRegistration,
      dueDate,
      taxRate: includeVat ? 0.15 : 0,
      notes: notes.trim() || undefined,
      items: validItems.map((it) => ({
        partId: it.partId || null,
        description: it.description.trim(),
        partNumber: it.partNumber || null,
        sku: it.sku || null,
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
      })),
    };

    startTransition(async () => {
      try {
        const res = await createInvoiceOrQuotation(payload);
        if (res.error) {
          setErrorMessage(res.error);
        } else {
          onSuccess?.();
          onClose();
        }
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to create document.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-xl text-white ${
                docType === "invoice" ? "bg-indigo-600" : "bg-amber-600"
              }`}
            >
              {docType === "invoice" ? (
                <Receipt className="w-5 h-5" />
              ) : (
                <FileQuestion className="w-5 h-5" />
              )}
            </span>
            <div>
              <h2 className="text-base font-bold text-navy m-0">
                Create {docType === "invoice" ? "Driver Invoice" : "Parts Quotation"}
              </h2>
              <p className="text-xs text-muted m-0 mt-0.5">
                Generate an official billing document or price quotation for specific parts and services.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Doc Type Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Document Type</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDocType("invoice")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  docType === "invoice"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-900 ring-2 ring-indigo-500/20 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Receipt className="w-4 h-4 text-indigo-600" />
                Invoice (Immediate Payment Request)
              </button>
              <button
                type="button"
                onClick={() => setDocType("quotation")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  docType === "quotation"
                    ? "border-amber-600 bg-amber-50/50 text-amber-900 ring-2 ring-amber-500/20 shadow-2xs"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <FileQuestion className="w-4 h-4 text-amber-600" />
                Quotation (Price Estimate for Approval)
              </button>
            </div>
          </div>

          {/* Driver & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Recipient Driver
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {drivers.map((d) => (
                  <option key={d.profileId} value={d.profileId}>
                    {d.name} — Bike: {d.bikeRegistration} ({d.phone || d.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {docType === "invoice" ? "Payment Due Date" : "Quotation Expiry Date"}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">
                Parts & Service Line Items
              </label>
              <span className="text-[11px] text-muted">
                Pick from inventory parts or enter custom description
              </span>
            </div>

            <div className="space-y-2.5">
              {lineItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  {/* Inventory Quick Picker */}
                  <div className="sm:w-1/3">
                    <select
                      value={item.partId || ""}
                      onChange={(e) => handlePartSelect(idx, e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Pick from Parts Catalog --</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (R{p.unitPrice}) [Stock: {p.stockQuantity}]
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description Input */}
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Item name / description..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      required
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-20">
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value)))
                      }
                      className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white text-center"
                    />
                  </div>

                  {/* Unit Price */}
                  <div className="w-24">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                        R
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, "unitPrice", Math.max(0, Number(e.target.value)))
                        }
                        className="w-full text-xs pl-6 pr-2 py-2 rounded-lg border border-slate-300 bg-white text-right font-medium"
                      />
                    </div>
                  </div>

                  {/* Line Total */}
                  <div className="w-24 text-right font-bold text-xs text-navy pr-1 select-none">
                    R {((item.quantity || 1) * (item.unitPrice || 0)).toFixed(2)}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    disabled={lineItems.length <= 1}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Line Item
            </button>
          </div>

          {/* Notes & Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Terms / Operational Notes
              </label>
              <textarea
                rows={3}
                placeholder="Optional notes: reason for parts replacement, delivery conditions, or warranty details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Banking attached: <strong className="text-slate-700">Capitec (VS Procurement) · Acc 10976145 · Branch 25854</strong> · info@vsprocurement.co.za
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">R {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeVat}
                    onChange={(e) => setIncludeVat(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Add 15% VAT:</span>
                </label>
                <span className="font-semibold text-slate-800">R {taxAmount.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-navy">
                <span>Total Amount Due:</span>
                <span className="text-emerald-700">R {grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-5 py-2 rounded-lg font-bold text-xs text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2 ${
                docType === "invoice"
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {docType === "invoice" ? "Issue Invoice & Notify Driver" : "Send Quotation to Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
