import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function DriverBikePage() {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();
  const { data: driver } = await supabase
    .from("drivers")
    .select("bike_id")
    .eq("profile_id", profile.id)
    .maybeSingle();
  const { data: bike } = driver?.bike_id
    ? await supabase
        .from("bikes")
        .select("brand, model, colour, registration_number, status, current_mileage_km, next_service_due_km")
        .eq("id", driver.bike_id)
        .maybeSingle()
    : { data: null };

  return (
    <>
      <PageHeading
        eyebrow="VMC DRIVER"
        title="My motorcycle"
        description="The details below are read from your assigned bike record. Only your assigned motorcycle is visible in this area."
      />
      {bike ? (
        <div className="space-y-6">
          <section className="bike-card panel panel--dark">
            <div className="bike-card__mark" aria-hidden="true">H</div>
            <div>
              <p className="eyebrow eyebrow--light">HERO MOTORCYCLE</p>
              <h2>{bike.model}</h2>
              <div className="bike-specs">
                <span>{bike.brand}</span>
                <span>{bike.colour || "Colour not recorded"}</span>
                <span>{bike.registration_number || "Registration pending"}</span>
              </div>
              <StatusBadge tone={bike.status === "assigned" ? "green" : "blue"}>{bike.status}</StatusBadge>
            </div>
          </section>

          <section className="information-grid">
            <article className="panel">
              <p className="card-label">CURRENT ODOMETER</p>
              <h3>{(bike.current_mileage_km ?? 0).toLocaleString()} km</h3>
              <p className="card-copy">Current recorded mileage for this motorcycle.</p>
            </article>
            <article className="panel">
              <p className="card-label">NEXT SERVICE TARGET</p>
              <h3>{bike.next_service_due_km ? `${bike.next_service_due_km.toLocaleString()} km` : "Standard 3,000 km"}</h3>
              <p className="card-copy">
                {(bike.next_service_due_km && bike.current_mileage_km && bike.current_mileage_km >= bike.next_service_due_km)
                  ? "Service due now. Please book a routine inspection."
                  : "Keep your scheduled service up to date for peak reliability."}
              </p>
            </article>
          </section>
        </div>
      ) : (
        <section className="empty-state panel">
          <p className="card-label">MOTORCYCLE ASSIGNMENT</p>
          <h2>No motorcycle has been assigned yet.</h2>
          <p>Your VMC team will add the assigned HERO motorcycle here when your driver setup is complete.</p>
        </section>
      )}
    </>
  );
}
