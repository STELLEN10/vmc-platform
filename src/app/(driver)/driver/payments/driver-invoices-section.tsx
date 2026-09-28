"use client";

import { useState, useTransition } from "react";
import { Check, X, Eye, MessageCircle, Mail } from "lucide-react";
import { driverRespondToQuotation } from "./actions";
import { InvoicePrintModal } from "@/app/(management)/management/finance/invoice-print-modal";
import type { InvoiceOrQuotation } from "@/lib/finance/invoices";
import { getWhatsAppShareUrl, getEmailShareUrl } from "@/lib/finance/share";

interface DriverInvoicesSectionProps {
  invoices: InvoiceOrQuotation[];
}

export function DriverInvoicesSection({ invoices }: DriverInvoicesSectionProps) {
  const [list, setList] = useState<InvoiceOrQuotation[]>(invoices);
  const [viewingDoc, setViewingDoc] = useState<InvoiceOrQuotation | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleResponse = (quoteId: string, response: "accept" | "decline") => {
    startTransition(async () => {
      const res = await driverRespondToQuotation(quoteId, response);
      if (res.success) {
        setList((prev) =>
          prev.map((d) =>
            d.id === quoteId
              ? {
                  ...d,
                  status: response === "accept" ? "accepted" : "declined",
                  acceptedAt: response === "accept" ? new Date().toISOString() : d.acceptedAt,
                }
              : d
          )
        );
        setFeedback(
          response === "accept"
            ? "Quotation accepted! VMC management will issue the final invoice."
            : "Quotation declined."
        );
      }
    });
  };

  if (list.length === 0) {
    return null;
  }

  return (
    <section className="panel section-gap border border-slate-200 shadow-sm rounded-xl p-5 bg-white">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <p className="card-label text-xs font-bold tracking-wider text-indigo-700 m-0">
            PARTS & SERVICE BILLING
          </p>
          <h2 className="text-base font-bold text-navy mt-0.5 mb-0">
            Invoices & Quotations ({list.length})
          </h2>
          <p className="text-xs text-muted m-0 mt-0.5">
            Individual part purchases, replacement components, and workshop service estimates issued by VMC.
          </p>
        </div>
      </div>

      {feedback && (
        <div className="mt-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback(null)} className="text-xs text-emerald-600 hover:underline">
            ✕
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((doc) => {
          const isQuo = doc.type === "quotation";
          return (
            <div
              key={doc.id}
              className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                isQuo
                  ? "bg-amber-50/20 border-amber-200"
                  : doc.status === "paid"
                  ? "bg-emerald-50/20 border-emerald-200"
                  : "bg-indigo-50/20 border-indigo-200"
              }`}
            >
              <div>
                {/* Header: Doc # and Status */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isQuo
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      }`}
                    >
                      {isQuo ? "Quotation" : "Invoice"}
                    </span>
                    <strong className="font-mono text-xs text-slate-800">{doc.docNumber}</strong>
                  </div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      doc.status === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : doc.status === "issued"
                        ? "bg-blue-100 text-blue-800"
                        : doc.status === "accepted"
                        ? "bg-teal-100 text-teal-800"
                        : doc.status === "declined"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {doc.status.replace("_", " ")}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-1.5 my-3 bg-white/70 p-3 rounded-lg border border-slate-200/60">
                  {doc.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-800 font-medium truncate pr-2">
                        {it.description} <span className="text-slate-400">×{it.quantity}</span>
                      </span>
                      <span className="font-mono font-bold text-slate-900 shrink-0">
                        R {it.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-200 flex justify-between text-xs font-bold text-slate-900">
                    <span>Total {isQuo ? "Quoted" : "Amount"}:</span>
                    <span className="text-emerald-700">R {doc.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-0.5">
                  <div>Issued: {doc.issueDate}</div>
                  <div>{isQuo ? "Valid Until:" : "Due Date:"} {doc.dueDate}</div>
                  {doc.notes && <div className="text-slate-600 italic mt-1">&quot;{doc.notes}&quot;</div>}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setViewingDoc(doc)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-navy cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>

                  <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                    <a
                      href={getWhatsAppShareUrl({
                        type: doc.type,
                        docNumber: doc.docNumber,
                        recipientName: doc.driverName,
                        recipientPhone: doc.driverPhone,
                        issueDate: doc.issueDate,
                        dueDate: doc.dueDate,
                        items: doc.items,
                        subtotal: doc.subtotal,
                        totalAmount: doc.totalAmount,
                        notes: doc.notes,
                      }, doc.driverPhone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title="Share to WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={getEmailShareUrl({
                        type: doc.type,
                        docNumber: doc.docNumber,
                        recipientName: doc.driverName,
                        recipientEmail: doc.driverEmail,
                        issueDate: doc.issueDate,
                        dueDate: doc.dueDate,
                        items: doc.items,
                        subtotal: doc.subtotal,
                        totalAmount: doc.totalAmount,
                        notes: doc.notes,
                      }, doc.driverEmail)}
                      className="p-1 rounded text-sky-700 hover:bg-sky-50 transition-colors"
                      title="Share via Email"
                    >
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {isQuo && doc.status === "sent" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleResponse(doc.id, "accept")}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-2xs disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept Quote
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleResponse(doc.id, "decline")}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                      Decline
                    </button>
                  </div>
                )}

                {!isQuo && doc.status === "issued" && (
                  <span className="text-[11px] text-indigo-700 font-semibold">
                    Payment pending (use bank ref {doc.docNumber})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <InvoicePrintModal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        doc={viewingDoc}
      />
    </section>
  );
}
