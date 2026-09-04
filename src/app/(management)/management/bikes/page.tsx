import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ManagementBikesPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();
  const { data: bikes } = await supabase
    .from("bikes")
    .select("id, brand, model, colour, registration_number, status")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT"
        title="Motorcycles"
        description="Your HERO fleet register is protected by the same role and database policies as the rest of the platform."
      />
      {bikes && bikes.length > 0 ? (
        <section className="bike-management-grid">
          {bikes.map((bike) => (
            <article className="panel bike-management-card" key={bike.id}>
              <div className="bike-management-card__top">
                <span className="hero-mark">HERO</span>
                <StatusBadge tone={bike.status === "assigned" ? "green" : "blue"}>{bike.status}</StatusBadge>
              </div>
              <h2>{bike.model}</h2>
              <p>{bike.brand} · {bike.colour || "Colour not recorded"}</p>
              <span className="mono-value">{bike.registration_number || "Registration pending"}</span>
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
