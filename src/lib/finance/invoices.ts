import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

export type InvoiceType = "invoice" | "quotation";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "converted"
  | "issued"
  | "paid"
  | "cancelled";

export interface InvoiceLineItem {
  id: string;
  partId?: string | null;
  description: string;
  partNumber?: string | null;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface InvoiceOrQuotation {
  id: string;
  docNumber: string;
  type: InvoiceType;
  driverId: string;
  driverProfileId: string;
  driverName: string;
  driverEmail?: string;
  driverPhone?: string;
  bikeRegistration?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceLineItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string | null;
  paymentInstructions?: string | null;
  createdAt: string;
  updatedAt: string;
  paidAt?: string | null;
  acceptedAt?: string | null;
}

const SETTINGS_KEY = "finance_invoices_and_quotations";

// Initial seed data if no records exist yet
const SEED_INVOICES: InvoiceOrQuotation[] = [
  {
    id: "quo-seed-001",
    docNumber: "QUO-2026-001",
    type: "quotation",
    driverId: "d0000000-0000-4000-8000-000000000002",
    driverProfileId: "d0000000-0000-4000-8000-000000000002",
    driverName: "Lameck",
    driverEmail: "lameck@vmc.test",
    driverPhone: "+27785206862",
    bikeRegistration: "rsuC31ZJGP",
    issueDate: "2026-09-28",
    dueDate: "2026-10-05",
    status: "sent",
    items: [
      {
        id: "item-q001",
        description: "Tyre Front",
        partNumber: "H-TYR-001",
        sku: "TYR-FRONT-01",
        quantity: 1,
        unitPrice: 436.58,
        totalPrice: 436.58,
      },
    ],
    subtotal: 436.58,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 436.58,
    notes: "Official replacement tyre quotation for delivery motorcycle. Payment confirms warehouse release and fitment slot.",
    paymentInstructions: "Bank Name: Capitec | Account Holder: VS Procurement | Account No: 10976145 | Account Type: Business Account | Branch Code: 25854 | Ref: QUO-2026-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "inv-seed-001",
    docNumber: "INV-2026-001",
    type: "invoice",
    driverId: "d0000000-0000-4000-8000-000000000001",
    driverProfileId: "d0000000-0000-4000-8000-000000000001",
    driverName: "Test Driver",
    driverEmail: "driver@vmc.test",
    driverPhone: "+27000000003",
    bikeRegistration: "TEST-VMC-001",
    issueDate: "2026-09-20",
    dueDate: "2026-09-27",
    status: "issued",
    items: [
      {
        id: "item-1",
        description: "Front Brake Pad Set (OEM Hero Eco 150)",
        partNumber: "H-BRK-001",
        sku: "BRK-PAD-01",
        quantity: 2,
        unitPrice: 180,
        totalPrice: 360,
      },
      {
        id: "item-2",
        description: "Heavy Duty Drive Chain Lube 400ml",
        partNumber: "H-LUB-009",
        sku: "LUB-CHN-01",
        quantity: 1,
        unitPrice: 95,
        totalPrice: 95,
      },
    ],
    subtotal: 455,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 455,
    notes: "Parts replacement requested during routine 5,000km workshop inspection.",
    paymentInstructions: "Bank Name: Capitec | Account Holder: VS Procurement | Account No: 10976145 | Account Type: Business Account | Branch Code: 25854 | Ref: INV-2026-001",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: "quo-seed-002",
    docNumber: "QUO-2026-002",
    type: "quotation",
    driverId: "d0000000-0000-4000-8000-000000000001",
    driverProfileId: "d0000000-0000-4000-8000-000000000001",
    driverName: "Test Driver",
    driverEmail: "driver@vmc.test",
    driverPhone: "+27000000003",
    bikeRegistration: "TEST-VMC-001",
    issueDate: "2026-09-25",
    dueDate: "2026-10-02",
    status: "sent",
    items: [
      {
        id: "item-3",
        description: "Rear Tubeless Tyre (100/90-18 MRF)",
        partNumber: "H-TYR-002",
        sku: "TYR-REAR-02",
        quantity: 1,
        unitPrice: 650,
        totalPrice: 650,
      },
      {
        id: "item-4",
        description: "Tyre Fitting & Balancing Service",
        quantity: 1,
        unitPrice: 120,
        totalPrice: 120,
      },
    ],
    subtotal: 770,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 770,
    notes: "Quotation valid for 7 days. Once accepted, parts will be reserved from inventory.",
    paymentInstructions: "Bank Name: Capitec | Account Holder: VS Procurement | Account No: 10976145 | Account Type: Business Account | Branch Code: 25854 | Ref: QUO-2026-002",
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

export async function getInvoicesAndQuotations(): Promise<InvoiceOrQuotation[]> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.value && Array.isArray(data.value)) {
      const records = data.value as unknown as InvoiceOrQuotation[];
      const hasQuo001 = records.some((r) => r.docNumber === "QUO-2026-001");
      if (!hasQuo001) {
        return [SEED_INVOICES[0], ...records];
      }
      return records;
    }

    // Initialize with seed data if not present
    await supabase.from("system_settings").upsert(
      {
        key: SETTINGS_KEY,
        value: SEED_INVOICES as unknown as Json,
        category: "finance",
        description: "Store of driver parts and service invoices and quotations",
      },
      { onConflict: "key" }
    );
  } catch (err) {
    console.error("Error fetching invoices from system_settings:", err);
  }

  return SEED_INVOICES;
}

export async function saveInvoicesAndQuotations(
  records: InvoiceOrQuotation[]
): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from("system_settings").upsert(
    {
      key: SETTINGS_KEY,
      value: records as unknown as Json,
      category: "finance",
      description: "Store of driver parts and service invoices and quotations",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

export async function getDriverInvoicesAndQuotations(
  driverProfileId: string
): Promise<InvoiceOrQuotation[]> {
  const all = await getInvoicesAndQuotations();
  return all.filter((inv) => inv.driverProfileId === driverProfileId || !driverProfileId);
}

export async function notifyDriverAboutDoc(doc: InvoiceOrQuotation): Promise<void> {
  const supabase = await createClient();
  const isQuo = doc.type === "quotation";
  const title = isQuo
    ? `New Parts Quotation: ${doc.docNumber}`
    : `New Invoice Issued: ${doc.docNumber}`;
  const body = isQuo
    ? `VMC Management sent you quotation ${doc.docNumber} for R${doc.totalAmount.toFixed(
        2
      )}. View and accept in Payments.`
    : `Invoice ${doc.docNumber} for R${doc.totalAmount.toFixed(
        2
      )} has been issued for your parts/services. Due: ${doc.dueDate}.`;

  try {
    await supabase.from("notifications").insert({
      recipient_profile_id: doc.driverProfileId,
      type: isQuo ? "general" : "payment_reminder",
      title,
      body,
      status: "unread",
      related_entity_type: "invoice",
      related_entity_id: doc.id,
    });
  } catch (err) {
    console.error("Failed to notify driver of invoice:", err);
  }
}
