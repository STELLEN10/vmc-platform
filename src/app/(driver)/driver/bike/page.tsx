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
        .select("brand, model, colour, registration_number, status")
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
