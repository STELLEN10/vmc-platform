"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit/server";
import {
  getInvoicesAndQuotations,
  saveInvoicesAndQuotations,
  notifyDriverAboutDoc,
  type InvoiceOrQuotation,
  type InvoiceStatus,
  type InvoiceType,
  type InvoiceLineItem,
} from "@/lib/finance/invoices";

export async function reviewFinancePayment(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const periodId = String(formData.get("periodId") ?? "");
  const action = String(formData.get("action") ?? "");
  const customReason = String(formData.get("reason") ?? "").trim();

  if (!periodId || !action) {
    throw new Error("Missing required parameters.");
  }

  const supabase = await createClient();
  const newStatus = action === "approve" ? "verified" : "rejected";
  const reason = customReason || (action === "approve" ? "Payment verified by VMC." : "Payment proof rejected by VMC.");

  const { error } = await supabase.rpc("transition_payment_period", {
    p_payment_period_id: periodId,
    p_status: newStatus,
    p_reason: reason,
  });

  if (error) {
    console.error("Error transitioning payment period:", error);
    throw new Error(error.message || "Failed to update payment status.");
  }

  await recordAuditEvent({
    action: `payment_${newStatus}`,
    entityType: "payment_period",
    entityId: periodId,
    metadata: { action, reason },
  });

  revalidatePath("/management/finance");
  revalidatePath("/management/payments");
  revalidatePath("/management");
}

export async function getPaymentProofSignedUrl(proofPath: string): Promise<string | null> {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("vmc-application-documents")
    .createSignedUrl(proofPath, 300);

  if (error || !data?.signedUrl) {
    console.error("Failed to sign payment proof URL:", error);
    return null;
  }

  return data.signedUrl;
}

export interface CreateInvoicePayload {
  type: InvoiceType;
  driverId: string;
  driverProfileId: string;
  driverName: string;
  driverEmail?: string;
  driverPhone?: string;
  bikeRegistration?: string;
  dueDate: string;
  items: Array<{
    partId?: string | null;
    description: string;
    partNumber?: string | null;
    sku?: string | null;
    quantity: number;
    unitPrice: number;
  }>;
  taxRate?: number;
  notes?: string;
}

export async function createInvoiceOrQuotation(payload: CreateInvoicePayload) {
  const profile = await requireRole(MANAGEMENT_ROLES);

  if (!payload.driverProfileId || payload.items.length === 0) {
    return { error: "Driver and at least one item are required" };
  }

  const currentDocs = await getInvoicesAndQuotations();

  // Generate sequence number
  const prefix = payload.type === "invoice" ? "INV" : "QUO";
  const year = new Date().getFullYear();
  const countThisYear = currentDocs.filter((d) => d.type === payload.type).length + 1;
  const docNumber = `${prefix}-${year}-${String(countThisYear).padStart(3, "0")}`;

  const formattedItems: InvoiceLineItem[] = payload.items.map((item, idx) => ({
    id: `item-${Date.now()}-${idx}`,
    partId: item.partId || null,
    description: item.description,
    partNumber: item.partNumber || null,
    sku: item.sku || null,
    quantity: Math.max(1, item.quantity),
    unitPrice: Math.max(0, item.unitPrice),
    totalPrice: Math.max(1, item.quantity) * Math.max(0, item.unitPrice),
  }));

  const subtotal = formattedItems.reduce((sum, it) => sum + it.totalPrice, 0);
  const taxRate = payload.taxRate || 0;
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  const newDoc: InvoiceOrQuotation = {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    docNumber,
    type: payload.type,
    driverId: payload.driverId,
    driverProfileId: payload.driverProfileId,
    driverName: payload.driverName,
    driverEmail: payload.driverEmail,
    driverPhone: payload.driverPhone,
    bikeRegistration: payload.bikeRegistration,
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: payload.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    status: payload.type === "invoice" ? "issued" : "sent",
    items: formattedItems,
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    notes: payload.notes || null,
    paymentInstructions: `Bank Name: Capitec | Account Holder: VS Procurement | Account No: 10976145 | Account Type: Business Account | Branch Code: 25854 | Ref: ${docNumber}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const updatedList = [newDoc, ...currentDocs];
  await saveInvoicesAndQuotations(updatedList);

  // Notify driver
  await notifyDriverAboutDoc(newDoc);

  await recordAuditEvent({
    action: payload.type === "invoice" ? "finance_invoice_issued" : "finance_quotation_sent",
    entityType: "invoice",
    entityId: newDoc.id,
    metadata: { createdByProfileId: profile.id },
    newValues: {
      docNumber,
      driverName: payload.driverName,
      totalAmount,
      itemCount: formattedItems.length,
    },
  });

  revalidatePath("/management/finance");
  revalidatePath("/driver/payments");
  return { success: true, doc: newDoc };
}

export async function convertQuotationToInvoice(quotationId: string) {
  await requireRole(MANAGEMENT_ROLES);
  const currentDocs = await getInvoicesAndQuotations();
  const quote = currentDocs.find((d) => d.id === quotationId);

  if (!quote) return { error: "Quotation not found" };

  const year = new Date().getFullYear();
  const invoiceCount = currentDocs.filter((d) => d.type === "invoice").length + 1;
  const docNumber = `INV-${year}-${String(invoiceCount).padStart(3, "0")}`;

  const convertedInvoice: InvoiceOrQuotation = {
    ...quote,
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    docNumber,
    type: "invoice",
    status: "issued",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    paymentInstructions: `Bank Name: Capitec | Account Holder: VS Procurement | Account No: 10976145 | Account Type: Business Account | Branch Code: 25854 | Ref: ${docNumber}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Mark quote as converted
  const updatedDocs = currentDocs.map((d) => {
    if (d.id === quotationId) {
      return { ...d, status: "converted" as InvoiceStatus, updatedAt: new Date().toISOString() };
    }
    return d;
  });

  await saveInvoicesAndQuotations([convertedInvoice, ...updatedDocs]);
  await notifyDriverAboutDoc(convertedInvoice);

  revalidatePath("/management/finance");
  revalidatePath("/driver/payments");
  return { success: true, invoice: convertedInvoice };
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  notes?: string
) {
  await requireRole(MANAGEMENT_ROLES);
  const currentDocs = await getInvoicesAndQuotations();
  const doc = currentDocs.find((d) => d.id === id);

  if (!doc) return { error: "Document not found" };

  const updatedDocs = currentDocs.map((d) => {
    if (d.id === id) {
      return {
        ...d,
        status,
        notes: notes !== undefined ? notes : d.notes,
        paidAt: status === "paid" ? new Date().toISOString() : d.paidAt,
        acceptedAt: status === "accepted" ? new Date().toISOString() : d.acceptedAt,
        updatedAt: new Date().toISOString(),
      };
    }
    return d;
  });

  await saveInvoicesAndQuotations(updatedDocs);

  await recordAuditEvent({
    action: "finance_invoice_status_changed",
    entityType: "invoice",
    entityId: id,
    newValues: { status, notes },
  });

  revalidatePath("/management/finance");
  revalidatePath("/driver/payments");
  return { success: true };
}

export async function deleteInvoiceOrQuotation(id: string) {
  await requireRole(MANAGEMENT_ROLES);
  const currentDocs = await getInvoicesAndQuotations();
  const filtered = currentDocs.filter((d) => d.id !== id);
  await saveInvoicesAndQuotations(filtered);

  revalidatePath("/management/finance");
  revalidatePath("/driver/payments");
  return { success: true };
}
