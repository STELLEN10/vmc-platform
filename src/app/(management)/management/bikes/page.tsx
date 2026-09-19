import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AddBikeForm } from "./add-bike-form";
import { editBikeStatus, updateBikeMileage } from "./actions";

export default async function ManagementBikesPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();
  const { data: bikes } = await supabase
    .from("bikes")
    .select("id, brand, model, colour, registration_number, status, vin, engine_number, current_mileage_km, next_service_due_km")
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
                <div className="flex items-center justify-between pt-1 border-t border-line/60">
                  <span>Odometer: <strong>{(bike.current_mileage_km ?? 0).toLocaleString()} km</strong></span>
                  <span className="text-[11px]">Due: {bike.next_service_due_km ? `${bike.next_service_due_km.toLocaleString()} km` : "3,000 km"}</span>
                </div>
              </div>
              <form action={async (formData) => {
                "use server";
                const km = Number(formData.get("mileage"));
                if (!isNaN(km)) await updateBikeMileage(bike.id, km);
              }} className="mt-2 flex items-center gap-1.5 text-xs">
                <input
                  name="mileage"
                  type="number"
                  defaultValue={bike.current_mileage_km ?? 0}
                  min={0}
                  className="w-24 px-1.5 py-0.5 border border-line rounded bg-paper text-ink text-xs"
                  placeholder="km"
                  aria-label="Current mileage km"
                />
                <button type="submit" className="text-action text-[11px]">Save km</button>
              </form>
              {bike.status === "assigned" ? (
                <div className="mt-3 border-t border-line pt-3 text-xs text-muted flex items-center justify-between">
                  <span>Actively assigned to driver</span>
                  <span className="text-[11px] text-muted-foreground">Unassign to change</span>
                </div>
              ) : (
                <form action={async (formData) => {
                  "use server";
                  const newStatus = formData.get("status") as string;
                  if (newStatus) await editBikeStatus(bike.id, newStatus);
                }} className="mt-3 border-t border-line pt-3 flex items-center justify-between">
                  <select name="status" defaultValue={bike.status} className="text-xs p-1 rounded border border-line bg-paper text-ink" aria-label="Bike status">
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </select>
                  <button type="submit" className="text-action text-xs">Update</button>
                </form>
              )}
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
