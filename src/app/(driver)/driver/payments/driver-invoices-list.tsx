"use client";

import { useState } from "react";
import { MessageCircle, Mail } from "lucide-react";
import { type InvoiceRecord } from "@/app/(management)/management/payments/invoice-actions";
import { InvoiceReceiptModal } from "@/app/(management)/management/payments/invoice-receipt-view";
import { getWhatsAppShareUrl, getEmailShareUrl } from "@/lib/finance/share";

export function DriverInvoicesList({ invoices }: { invoices: InvoiceRecord[] }) {
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  if (invoices.length === 0) return null;

  return (
    <section className="panel mt-6">
      <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
        <div>
          <p className="card-label">OFFICIAL INVOICES & PDF RECEIPTS</p>
          <h3 className="text-sm font-bold text-foreground m-0">Issued Billing & Quotation Records</h3>
        </div>
        <span className="text-xs bg-navy/10 text-navy font-bold px-2 py-0.5 rounded">
          {invoices.length} Documents
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-2.5 px-3">Reference #</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Date</th>
              <th className="py-2.5 px-3">Amount</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-b border-line/50 hover:bg-paper/50">
                <td className="py-3 px-3 font-mono font-bold text-foreground">{inv.invoice_number}</td>
                <td className="py-3 px-3 capitalize">{inv.document_type}</td>
                <td className="py-3 px-3 text-muted">{inv.issue_date}</td>
                <td className="py-3 px-3 font-mono font-bold text-foreground">R{Number(inv.total_amount).toFixed(2)}</td>
                <td className="py-3 px-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    inv.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {inv.status}
                  </span>
                </td>
                <td className="py-3 px-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <a
                      href={getWhatsAppShareUrl({
                        type: inv.document_type,
                        docNumber: inv.invoice_number,
                        recipientName: inv.recipient_name,
                        recipientPhone: inv.recipient_phone,
                        issueDate: inv.issue_date,
                        dueDate: inv.due_date,
                        items: inv.items,
                        subtotal: inv.subtotal,
                        totalAmount: inv.total_amount,
                        notes: inv.notes,
                      }, inv.recipient_phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Share to WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={getEmailShareUrl({
                        type: inv.document_type,
                        docNumber: inv.invoice_number,
                        recipientName: inv.recipient_name,
                        recipientEmail: inv.recipient_email,
                        issueDate: inv.issue_date,
                        dueDate: inv.due_date,
                        items: inv.items,
                        subtotal: inv.subtotal,
                        totalAmount: inv.total_amount,
                        notes: inv.notes,
                      }, inv.recipient_email)}
                      className="p-1 rounded text-sky-700 hover:bg-sky-50 transition-colors"
                      title="Share via Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoice(inv)}
                      className="py-1 px-2.5 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded font-semibold text-xs cursor-pointer shadow-xs inline-flex items-center gap-1"
                    >
                      <span>📄</span> View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedInvoice && (
        <InvoiceReceiptModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </section>
  );
}
