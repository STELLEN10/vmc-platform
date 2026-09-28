"use client";

import { useState } from "react";
import Image from "next/image";
import { MessageCircle, Mail, Copy, Check, Printer } from "lucide-react";
import { type InvoiceRecord, updateInvoiceStatusAction } from "./invoice-actions";
import {
  getWhatsAppShareUrl,
  getEmailShareUrl,
  buildWhatsAppMessage,
  OFFICIAL_BANK_DETAILS,
} from "@/lib/finance/share";

export function InvoiceReceiptModal({
  invoice,
  onClose,
  onStatusChange,
}: {
  invoice: InvoiceRecord;
  onClose: () => void;
  onStatusChange?: (newStatus: "draft" | "issued" | "paid" | "cancelled") => void;
}) {
  const [copied, setCopied] = useState(false);

  function handlePrint() {
    window.print();
  }

  async function handleMarkPaid() {
    if (onStatusChange) {
      onStatusChange("paid");
    }
    await updateInvoiceStatusAction(invoice.id, "paid");
  }

  const isQuote = invoice.document_type === "quotation";
  const docTitle = isQuote ? "FORMAL QUOTATION" : "TAX INVOICE";

  const shareDoc = {
    type: invoice.document_type,
    docNumber: invoice.invoice_number,
    recipientName: invoice.recipient_name,
    recipientEmail: invoice.recipient_email,
    recipientPhone: invoice.recipient_phone,
    bikeReference: invoice.bike_reference,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    items: invoice.items,
    subtotal: invoice.subtotal,
    vatAmount: invoice.vat_amount,
    totalAmount: invoice.total_amount,
    notes: invoice.notes,
  };

  const whatsappUrl = getWhatsAppShareUrl(shareDoc, invoice.recipient_phone);
  const emailUrl = getEmailShareUrl(shareDoc, invoice.recipient_email);

  function handleCopy() {
    const text = buildWhatsAppMessage(shareDoc);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Control Bar (Hidden during print) */}
        <div className="p-3 sm:p-4 bg-navy text-white flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              Preview · {invoice.invoice_number}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Share to WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer shadow transition-colors inline-flex items-center gap-1.5"
              title="Share this invoice/quotation via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </a>

            {/* Share to Email */}
            <a
              href={emailUrl}
              className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-bold cursor-pointer shadow transition-colors inline-flex items-center gap-1.5"
              title="Share this invoice/quotation via email"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </a>

            {/* Copy Summary */}
            <button
              type="button"
              onClick={handleCopy}
              className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold cursor-pointer shadow transition-colors inline-flex items-center gap-1.5"
              title="Copy details to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>

            {invoice.status !== "paid" && (
              <button
                type="button"
                onClick={handleMarkPaid}
                className="py-1.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold cursor-pointer shadow transition-colors"
              >
                Mark Paid
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs cursor-pointer shadow transition-colors inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-muted hover:text-white p-1 text-xl font-bold ml-1 cursor-pointer"
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div className="p-6 sm:p-10 overflow-y-auto flex-1 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          {/* Header Section with Official Logo & Contact */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b-2 border-slate-900 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-24 sm:w-28 h-auto relative flex-shrink-0">
                <Image
                  src="/vmc-logo.png"
                  alt="Valhalla Motorcycles"
                  width={140}
                  height={112}
                  priority
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 m-0">
                  VALHALLA MOTORCYCLES
                </h1>
                <p className="text-xs font-bold text-amber-800 m-0 uppercase tracking-wider">
                  VS PROCUREMENT · FLEET OPERATIONS
                </p>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  <div>Reg: 2024/092812/07 · VAT No: 4920281923</div>
                  <div>Pretoria to Midrand · South Africa</div>
                  <div>
                    <a href={`mailto:${OFFICIAL_BANK_DETAILS.email}`} className="text-slate-700 hover:underline">
                      {OFFICIAL_BANK_DETAILS.email}
                    </a>{" "}
                    ·{" "}
                    <a href={`tel:${OFFICIAL_BANK_DETAILS.phone.replace(/\s+/g, "")}`} className="text-slate-700 hover:underline">
                      {OFFICIAL_BANK_DETAILS.phone}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:text-right flex flex-col sm:items-end">
              <span className="inline-block px-3 py-1 text-xs font-black uppercase tracking-widest bg-slate-900 text-white rounded">
                {docTitle}
              </span>
              <div className="mt-2 text-xs">
                <div className="font-mono font-bold text-slate-900 text-sm">{invoice.invoice_number}</div>
                <div className="text-slate-500">Date: {invoice.issue_date}</div>
                {invoice.due_date && <div className="text-slate-500">Due: {invoice.due_date}</div>}
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      invoice.status === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    Status: {invoice.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Share Banner Inside Preview */}
          <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs print:hidden">
            <span className="text-slate-600 font-medium">
              Share with client via WhatsApp or Email:
            </span>
            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Share to WhatsApp
              </a>
              <a
                href={emailUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                Share to Email
              </a>
            </div>
          </div>

          {/* Recipient / Billed To Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div>
              <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Billed To (Driver Reception)
              </span>
              <div className="font-bold text-sm text-slate-950">{invoice.recipient_name}</div>
              {invoice.recipient_phone && (
                <div className="text-slate-700 mt-0.5">Contact: {invoice.recipient_phone}</div>
              )}
              {invoice.recipient_email && (
                <div className="text-slate-700 mt-0.5">Email: {invoice.recipient_email}</div>
              )}
              {invoice.recipient_address && (
                <div className="text-slate-600 mt-0.5">{invoice.recipient_address}</div>
              )}
            </div>

            <div>
              <span className="font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Motorcycle & Service Details
              </span>
              <div className="font-semibold text-slate-900">
                {invoice.bike_reference || "Assigned Hero Eco 150 Motorcycle"}
              </div>
              <div className="text-slate-600 mt-0.5">Fleet Division: Commercial Delivery Fleet</div>
              <div className="text-slate-600 mt-0.5">Contract Basis: Rent-to-Own Weekly Agreement</div>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="my-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-800">
                  <th className="py-2.5 px-3 font-bold uppercase">#</th>
                  <th className="py-2.5 px-3 font-bold uppercase">Item Description</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-center">Qty</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-right">Unit (ZAR)</th>
                  <th className="py-2.5 px-3 font-bold uppercase text-right">Total (ZAR)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">{item.description}</td>
                    <td className="py-3 px-3 text-center text-slate-700">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700">
                      R{Number(item.unitPrice).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      R{Number(item.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="flex flex-col items-end my-6 text-xs space-y-1.5">
            <div className="w-64 flex justify-between text-slate-600 py-1">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-slate-900">R{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.vat_rate > 0 ? (
              <div className="w-64 flex justify-between text-slate-600 py-1">
                <span>VAT ({invoice.vat_rate}%):</span>
                <span className="font-mono font-semibold text-slate-900">R{invoice.vat_amount.toFixed(2)}</span>
              </div>
            ) : (
              <div className="w-64 flex justify-between text-slate-600 py-1">
                <span>VAT (Zero-Rated):</span>
                <span className="font-mono font-semibold text-slate-900">R0.00</span>
              </div>
            )}
            <div className="w-64 flex justify-between text-base font-black text-slate-950 py-2 border-t-2 border-slate-900">
              <span>TOTAL DUE:</span>
              <span className="font-mono text-emerald-800">R{invoice.total_amount.toFixed(2)}</span>
            </div>
          </div>

          {/* Capitec Bank Details & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 pt-4 border-t border-slate-200 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="font-bold uppercase tracking-wider text-amber-900 block mb-1.5 text-[11px]">
                Official Banking Details (EFT)
              </span>
              <div className="text-slate-800 space-y-1 leading-relaxed font-mono text-xs">
                <div>Bank Name: <strong className="text-slate-950">{OFFICIAL_BANK_DETAILS.bankName}</strong></div>
                <div>Account Holder: <strong className="text-slate-950">{OFFICIAL_BANK_DETAILS.accountHolder}</strong></div>
                <div>Account No: <strong className="text-slate-950 tracking-wider">{OFFICIAL_BANK_DETAILS.accountNumber}</strong></div>
                <div>Account Type: <strong className="text-slate-950">{OFFICIAL_BANK_DETAILS.accountType}</strong></div>
                <div>Branch Code: <strong className="text-slate-950">{OFFICIAL_BANK_DETAILS.branchCode}</strong></div>
                <div>Reference: <strong className="text-emerald-700">{invoice.invoice_number}</strong></div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between">
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Payment Terms & Enquiries
                </span>
                <p className="text-slate-600 m-0 leading-relaxed">
                  {invoice.notes || "Payments are due on schedule. Proof of payment must be submitted in the driver portal."}
                </p>
                <div className="mt-2 text-slate-600">
                  Contact: <span className="font-semibold">{OFFICIAL_BANK_DETAILS.email}</span> · <span className="font-semibold">{OFFICIAL_BANK_DETAILS.phone}</span>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-400">
                Official Computer-Generated Tax Document · VS Procurement / Valhalla Motorcycles
              </div>
            </div>
          </div>

          {/* Official Signature Footer */}
          <div className="pt-6 border-t border-slate-300 flex items-center justify-between text-[11px] text-slate-500">
            <div>
              <span>Authorized Fleet Finance Officer: </span>
              <strong className="text-slate-800">VS Procurement & Valhalla Motorcycles</strong>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Verified Official Record
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
