"use client";

import { useState } from "react";
import { X, Printer, MessageCircle, Mail, Copy, Check } from "lucide-react";
import type { InvoiceOrQuotation } from "@/lib/finance/invoices";
import {
  getWhatsAppShareUrl,
  getEmailShareUrl,
  buildWhatsAppMessage,
  OFFICIAL_BANK_DETAILS,
} from "@/lib/finance/share";

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  doc: InvoiceOrQuotation | null;
}

export function InvoicePrintModal({ isOpen, onClose, doc }: InvoicePrintModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !doc) return null;

  const isQuo = doc.type === "quotation";

  const shareDoc = {
    type: doc.type,
    docNumber: doc.docNumber,
    recipientName: doc.driverName,
    recipientEmail: doc.driverEmail,
    recipientPhone: doc.driverPhone,
    bikeReference: doc.bikeRegistration,
    issueDate: doc.issueDate,
    dueDate: doc.dueDate,
    items: doc.items,
    subtotal: doc.subtotal,
    vatAmount: doc.taxAmount,
    totalAmount: doc.totalAmount,
    notes: doc.notes,
    paymentInstructions: doc.paymentInstructions,
  };

  const whatsappUrl = getWhatsAppShareUrl(shareDoc, doc.driverPhone);
  const emailUrl = getEmailShareUrl(shareDoc, doc.driverEmail);

  function handleCopy() {
    const text = buildWhatsAppMessage(shareDoc);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 bg-slate-900 text-white text-xs gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider uppercase text-amber-400">
              VMC / VS Procurement
            </span>
            <span className="text-slate-400">|</span>
            <span className="font-mono text-slate-300">{doc.docNumber}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Share Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer text-xs"
              title="Share document details directly to WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            {/* Email Share Button */}
            <a
              href={emailUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-colors cursor-pointer text-xs"
              title="Share document details via email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </a>

            {/* Copy Summary Button */}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors cursor-pointer text-xs"
              title="Copy formatted summary to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>

            {/* Print / Save PDF */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition-colors cursor-pointer text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="p-6 sm:p-10 space-y-6 text-slate-800 bg-white" id="printable-invoice">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white font-extrabold text-sm tracking-wider">
                  VMC
                </span>
                <div>
                  <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight block leading-tight">
                    VALHALLA MOTORCYCLES
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                    VS PROCUREMENT
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 leading-snug">
                Fleet Operations & Procurement Hub<br />
                Pretoria & Midrand · South Africa<br />
                <a href={`mailto:${OFFICIAL_BANK_DETAILS.email}`} className="text-slate-600 hover:underline">
                  {OFFICIAL_BANK_DETAILS.email}
                </a>{" "}
                ·{" "}
                <a href={`tel:${OFFICIAL_BANK_DETAILS.phone.replace(/\s+/g, "")}`} className="text-slate-600 hover:underline">
                  {OFFICIAL_BANK_DETAILS.phone}
                </a>
              </p>
            </div>

            <div className="text-left sm:text-right">
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

          {/* Quick In-Document Share Bar (visible on mobile / inside preview, hidden during print) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
            <span className="text-slate-600 font-medium">
              Share this {isQuo ? "quotation" : "invoice"} with client or records:
            </span>
            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <MessageCircle className="w-3 h-3" />
                Share to WhatsApp
              </a>
              <a
                href={emailUrl}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold"
              >
                <Mail className="w-3 h-3" />
                Share to Email
              </a>
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

          {/* Official Capitec Bank Details & Payment Instructions */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div>
              <p className="font-bold text-slate-900 m-0 mb-1.5 text-[11px] uppercase tracking-wider text-amber-900">
                Official Banking Details (EFT)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 font-mono text-xs bg-white p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Bank Name:</span>
                  <strong className="text-slate-950 font-bold">{OFFICIAL_BANK_DETAILS.bankName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Account Holder:</span>
                  <strong className="text-slate-950 font-bold">{OFFICIAL_BANK_DETAILS.accountHolder}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Account No:</span>
                  <strong className="text-slate-950 font-bold tracking-wider">{OFFICIAL_BANK_DETAILS.accountNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Account Type:</span>
                  <strong className="text-slate-950 font-bold">{OFFICIAL_BANK_DETAILS.accountType}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Branch Code:</span>
                  <strong className="text-slate-950 font-bold">{OFFICIAL_BANK_DETAILS.branchCode}</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block font-sans">Payment Reference:</span>
                  <strong className="text-emerald-700 font-bold">{doc.docNumber}</strong>
                </div>
              </div>
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
            VS Procurement · Valhalla Motorcycles · Tel: {OFFICIAL_BANK_DETAILS.phone} · Email: {OFFICIAL_BANK_DETAILS.email}
          </div>
        </div>
      </div>
    </div>
  );
}
