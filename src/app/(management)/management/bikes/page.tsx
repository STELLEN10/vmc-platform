import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AddBikeForm } from "./add-bike-form";
import { editBikeStatus } from "./actions";

export default async function ManagementBikesPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();
  const { data: bikes } = await supabase
    .from("bikes")
    .select("id, brand, model, colour, registration_number, status, vin, engine_number")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT"
        title="Motorcycles"
        description="Your HERO fleet register is protected by the same role and database policies as the rest of the platform."
      />
      <div className="review-grid mb-6">
        <AddBikeForm />
      </div>
      {bikes && bikes.length > 0 ? (
        <section className="bike-management-grid">
          {bikes.map((bike) => (
            <article className="panel bike-management-card" key={bike.id}>
              <div className="bike-management-card__top">
                <span className="hero-mark">HERO</span>
                <StatusBadge tone={bike.status === "assigned" ? "green" : bike.status === "available" ? "blue" : "slate"}>{bike.status}</StatusBadge>
              </div>
              <h2>{bike.model}</h2>
              <p>{bike.brand} · {bike.colour || "Colour not recorded"}</p>
              <span className="mono-value">{bike.registration_number || "Registration pending"}</span>
              <div className="mt-2 text-xs text-muted space-y-1">
                <div>VIN: {bike.vin || "-"}</div>
                <div>Engine: {bike.engine_number || "-"}</div>
              </div>
              <form action={async (formData) => {
                "use server";
                const newStatus = formData.get("status") as string;
                if (newStatus) await editBikeStatus(bike.id, newStatus);
              }} className="mt-3 border-t border-line pt-3 flex items-center justify-between">
                <select name="status" defaultValue={bike.status} className="text-xs p-1 rounded border border-line bg-paper text-ink" aria-label="Bike status">
                  <option value="available">Available</option>
                  <option value="assigned" disabled>Assigned</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="retired">Retired</option>
                </select>
                <button type="submit" className="text-action text-xs">Update</button>
              </form>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state panel">
          <p className="card-label">SECURE FOUNDATION</p>
          <h2>No bike records yet</h2>
          <p>Motorcycle management will be introduced after this foundation phase. Test data, if used, should be clearly labelled.</p>
        </section>
      )}
    </>
  );
}
