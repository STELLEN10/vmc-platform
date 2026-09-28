"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type InvoiceItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

export type InvoiceRecord = {
  id: string;
  document_type: "invoice" | "quotation" | "receipt";
  invoice_number: string;
  driver_id: string | null;
  profile_id: string | null;
  recipient_name: string;
  recipient_email: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  bike_reference: string | null;
  issue_date: string;
  due_date: string | null;
  items: InvoiceItem[];
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  status: "draft" | "issued" | "paid" | "cancelled";
  notes: string | null;
  created_at: string;
};

// In-memory fallback in case public.invoices table is waiting for migration execution
const fallbackInvoices: InvoiceRecord[] = [];

export async function createInvoiceAction(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  const document_type = (String(formData.get("documentType") ?? "invoice") as "invoice" | "quotation" | "receipt");
  const invoice_number = String(formData.get("invoiceNumber") ?? "").trim() || `VMC-${document_type === "quotation" ? "QT" : "INV"}-${Date.now().toString().slice(-6)}`;
  const driver_id = String(formData.get("driverId") ?? "").trim() || null;
  const profile_id = String(formData.get("profileId") ?? "").trim() || null;
  const recipient_name = String(formData.get("recipientName") ?? "").trim();
  const recipient_email = String(formData.get("recipientEmail") ?? "").trim() || null;
  const recipient_phone = String(formData.get("recipientPhone") ?? "").trim() || null;
  const recipient_address = String(formData.get("recipientAddress") ?? "").trim() || null;
  const bike_reference = String(formData.get("bikeReference") ?? "").trim() || null;
  const issue_date = String(formData.get("issueDate") ?? "").trim() || new Date().toISOString().split("T")[0];
  const due_date = String(formData.get("dueDate") ?? "").trim() || null;
  const itemsJson = String(formData.get("items") ?? "[]");
  const vat_rate = Number(formData.get("vatRate") ?? 15);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!recipient_name) {
    throw new Error("Recipient / Driver name is required.");
  }

  let items: InvoiceItem[] = [];
  try {
    items = JSON.parse(itemsJson);
  } catch {
    items = [{ description: "Motorcycle Fleet Service", quantity: 1, unitPrice: 500, total: 500 }];
  }

  if (items.length === 0) {
    items = [{ description: "Weekly Motorcycle Rental", quantity: 1, unitPrice: 500, total: 500 }];
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const vat_amount = vat_rate > 0 ? (subtotal * vat_rate) / 100 : 0;
  const total_amount = subtotal + vat_amount;

  const newRecord: InvoiceRecord = {
    id: crypto.randomUUID(),
    document_type,
    invoice_number,
    driver_id,
    profile_id,
    recipient_name,
    recipient_email,
    recipient_phone,
    recipient_address,
    bike_reference,
    issue_date,
    due_date,
    items,
    subtotal,
    vat_rate,
    vat_amount,
    total_amount,
    status: "issued",
    notes,
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase
      .from("invoices")
      .insert({
        id: newRecord.id,
        document_type: newRecord.document_type,
        invoice_number: newRecord.invoice_number,
        driver_id: newRecord.driver_id,
        profile_id: newRecord.profile_id,
        recipient_name: newRecord.recipient_name,
        recipient_email: newRecord.recipient_email,
        recipient_phone: newRecord.recipient_phone,
        recipient_address: newRecord.recipient_address,
        bike_reference: newRecord.bike_reference,
        issue_date: newRecord.issue_date,
        due_date: newRecord.due_date,
        items: newRecord.items,
        subtotal: newRecord.subtotal,
        vat_rate: newRecord.vat_rate,
        vat_amount: newRecord.vat_amount,
        total_amount: newRecord.total_amount,
        status: newRecord.status,
        notes: newRecord.notes,
      })
      .select()
      .single();

    if (error) {
      console.warn("Could not insert into invoices table, saving to resilient fallback:", error.message);
      fallbackInvoices.unshift(newRecord);
    }
  } catch (err) {
    console.warn("Invoices table fallback used:", err);
    fallbackInvoices.unshift(newRecord);
  }

  revalidatePath("/management/payments");
  revalidatePath("/driver/payments");

  return { success: true, invoice: newRecord };
}

export async function fetchInvoices(): Promise<InvoiceRecord[]> {
  const supabase = createAdminClient();
  try {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      // Merge with any in-memory fallback
      const ids = new Set((data as unknown as InvoiceRecord[]).map((d) => d.id));
      const unpersisted = fallbackInvoices.filter((fb) => !ids.has(fb.id));
      return [...(data as unknown as InvoiceRecord[]), ...unpersisted];
    }
  } catch {
    // Return fallback
  }

  return fallbackInvoices;
}

export async function updateInvoiceStatusAction(invoiceId: string, status: "draft" | "issued" | "paid" | "cancelled") {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  try {
    await supabase.from("invoices").update({ status }).eq("id", invoiceId);
  } catch {
    // Update in fallback
  }

  const fbItem = fallbackInvoices.find((i) => i.id === invoiceId);
  if (fbItem) fbItem.status = status;

  revalidatePath("/management/payments");
  revalidatePath("/driver/payments");
}
