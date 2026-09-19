import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";

export default async function DriverInventoryPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const enabled = await hasFeatureAccess("parts_inventory");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="HERO RIDER APP · PARTS"
          title="Motorcycle parts catalogue"
          description="Browse genuine Hero motorcycle parts and consumables compatible with your bike."
        />
        <LockedFeature feature="parts_inventory" />
      </>
    );
  }

  const supabase = await createClient();

  // Get driver's assigned bike
  const { data: driver } = await supabase
    .from("drivers")
    .select("bike_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: bike } = driver?.bike_id
    ? await supabase
        .from("bikes")
        .select("brand, model, colour, registration_number")
        .eq("id", driver.bike_id)
        .maybeSingle()
    : { data: null };

  // Fetch parts catalog from database
  const { data: parts } = await supabase
    .from("parts")
    .select("id, name, part_number, sku, category, compatible_model, status, description")
    .neq("status", "discontinued")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  return (
    <>
      <PageHeading
        eyebrow="HERO RIDER APP · PARTS"
        title="Motorcycle parts catalogue"
        description="Genuine Hero parts and spares available for your motorcycle. All genuine components are supplied and fitted by VMC workshops."
      />

      {bike && (
        <section className="panel foundation-callout mb-6">
          <div>
            <p className="eyebrow">YOUR ASSIGNED MOTORCYCLE</p>
            <h2>{bike.brand} {bike.model}</h2>
            <p>Registration: <strong className="text-navy">{bike.registration_number || "Pending"}</strong> · Below are parts compatible with your vehicle.</p>
          </div>
          <span className="status-badge status-badge--green">Assigned</span>
        </section>
      )}

      <div className="bike-management-grid">
        {parts?.map((part) => (
          <article className="panel bike-management-card" key={part.id}>
            <div className="bike-management-card__top">
              <span className="hero-mark">{part.category}</span>
              <StatusBadge tone={part.status === "in_stock" ? "green" : part.status === "low_stock" ? "blue" : "red"}>
                {part.status === "in_stock" ? "In stock" : part.status === "low_stock" ? "Low stock" : "Out of stock"}
              </StatusBadge>
            </div>
            <h2>{part.name}</h2>
            <p className="mono-value text-xs text-muted">{part.part_number || part.sku || "Part ID: " + part.id.slice(0, 8)}</p>
            <div className="mt-2 text-xs text-muted space-y-1">
              <div>Compatibility: <strong>{part.compatible_model || "HERO Fleet Standard"}</strong></div>
              {part.description && <div className="text-[11px] text-muted-foreground mt-1">{part.description}</div>}
            </div>
            <div className="mt-3 pt-3 border-t border-line text-xs text-muted flex items-center justify-between">
              <span>Genuine Hero replacement</span>
              <span className="text-[11px] text-muted-foreground">Fitted at VMC Depot</span>
            </div>
          </article>
        ))}

        {(!parts || parts.length === 0) && (
          <div className="empty-state panel col-span-full">
            <h2>No parts listed yet</h2>
            <p>The parts catalogue is currently being synchronized with our depot inventory. Please check back shortly.</p>
          </div>
        )}
      </div>
    </>
  );
}
