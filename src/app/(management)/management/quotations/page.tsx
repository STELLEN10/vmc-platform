import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { QuotationsPanel } from "@/components/quotations-panel";

export default async function ManagementQuotationsPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const [{ data: driversData }, { data: bikesData }] = await Promise.all([
    supabase
      .from("drivers")
      .select("id, profiles(full_name, phone_number)")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("bikes")
      .select("id, registration_number, model")
      .order("registration_number", { ascending: true })
      .limit(50),
  ]);

  const availableDrivers = (driversData || []).map((d) => ({
    id: d.id,
    name: (d.profiles as { full_name?: string } | null)?.full_name || "Unknown driver",
    phone: (d.profiles as { phone_number?: string } | null)?.phone_number || "",
  }));

  const availableBikes = (bikesData || []).map((b) => ({
    id: b.id,
    reg: b.registration_number || "PENDING",
    model: b.model || "HERO Eco 150",
  }));

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="VMC OPERATIONS · FINANCIAL DISPATCH"
        title="Official Quotations & Invoicing"
        description="Generate official quotations, schedule parts and repair charges, and dispatch clean WhatsApp quotes for the Pretoria to Midrand corridor."
      />
      <QuotationsPanel
        availableDrivers={availableDrivers}
        availableBikes={availableBikes}
      />
    </div>
  );
}
