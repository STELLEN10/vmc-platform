"use client";

import { X, Printer } from "lucide-react";
import type { InvoiceOrQuotation } from "@/lib/finance/invoices";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: InvoiceOrQuotation | null;
}

export function InvoicePrintModal({ isOpen, onClose, doc }: InvoicePrintModalProps) {
  if (!isOpen || !doc) return null;

  const isQuo = doc.type === "quotation";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Controls Bar */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-900 text-white text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider uppercase text-amber-400">
              Valhalla Motorcycles Document Viewer
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-mono text-slate-300">{doc.docNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800 bg-white" id="printable-invoice">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center text-white font-extrabold text-sm tracking-wider">
                  VMC
                </span>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  VALHALLA MOTORCYCLES
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Fleet Operations & Maintenance Hub<br />
                Pretoria & Midrand · South Africa<br />
                support@valhallamotorcycles.com
              </p>
            </div>

            <div className="text-right sm:text-right">
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider mb-1.5 ${
                  isQuo
                    ? "bg-amber-100 text-amber-800"
                    : doc.status === "paid"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-indigo-100 text-indigo-800"
                }`}
              >
                {isQuo ? "OFFICIAL QUOTATION" : "TAX INVOICE"}
              </span>
              <h1 className="text-xl font-mono font-bold text-slate-900 m-0">
                {doc.docNumber}
              </h1>
              <p className="text-[11px] text-slate-500 mt-1">
                Status: <strong className="text-slate-800 uppercase">{doc.status}</strong>
              </p>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs">
            <div>
              <p className="card-label text-[10px] text-slate-400 font-bold uppercase mb-1">
                BILLED TO / DRIVER:
              </p>
              <p className="text-sm font-bold text-slate-900 m-0">{doc.driverName}</p>
              {doc.driverPhone && <p className="text-slate-600 m-0">{doc.driverPhone}</p>}
              {doc.driverEmail && <p className="text-slate-600 m-0">{doc.driverEmail}</p>}
              <p className="text-slate-600 m-0 mt-1">
                Motorcycle: <strong className="font-semibold text-slate-800">{doc.bikeRegistration || "Assigned Unit"}</strong>
              </p>
            </div>

            <div className="text-right space-y-1">
              <div>
                <span className="text-slate-500 mr-2">Date Issued:</span>
                <strong className="text-slate-800">{doc.issueDate}</strong>
              </div>
              <div>
                <span className="text-slate-500 mr-2">
                  {isQuo ? "Valid Until:" : "Payment Due:"}
                </span>
                <strong className="text-slate-800">{doc.dueDate}</strong>
              </div>
              {doc.paidAt && (
                <div className="text-emerald-700 font-bold">
                  Paid Date: {new Date(doc.paidAt).toLocaleDateString("en-ZA")}
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Part # / SKU</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Rate</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {doc.items.map((item) => (
                  <tr key={item.id}>
                    <td className="p-3 font-medium text-slate-900">{item.description}</td>
                    <td className="p-3 text-center text-slate-500 font-mono text-[11px]">
                      {item.partNumber || item.sku || "—"}
                    </td>
                    <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="p-3 text-right text-slate-700">R {item.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      R {item.totalPrice.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800">R {doc.subtotal.toFixed(2)}</span>
              </div>
              {doc.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT (15%):</span>
                  <span className="font-semibold text-slate-800">R {doc.taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-slate-900">
                <span>Total Amount {isQuo ? "Quoted" : "Due"}:</span>
                <span className="text-emerald-700">R {doc.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Instructions & Terms */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div>
              <p className="font-bold text-slate-800 m-0 mb-1">Payment Instructions & Banking:</p>
              <p className="text-slate-600 font-mono text-[11px] m-0">
                {doc.paymentInstructions ||
                  "Valhalla Motorcycles Pty Ltd | FNB Corporate | Acc: 62819283749 | Branch: 250655"}
              </p>
            </div>
            {doc.notes && (
              <div className="pt-2 border-t border-slate-200">
                <p className="font-bold text-slate-800 m-0">Notes:</p>
                <p className="text-slate-600 m-0 mt-0.5">{doc.notes}</p>
              </div>
            )}
          </div>

          {/* Document Footer */}
          <div className="text-center pt-4 border-t border-slate-100 text-[10px] text-slate-400">
            Thank you for riding with Valhalla Motorcycles. Authorized official document.
          </div>
        </div>
      </div>
    </div>
  );
}
