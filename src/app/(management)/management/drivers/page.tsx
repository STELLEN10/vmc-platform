import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ManagementDriversPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();
  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, profile_id, bike_id, status, start_date")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT"
        title="Drivers"
        description="The secure driver register will grow into the operational home for driver onboarding, contracts and payment schedules."
      />
      {drivers && drivers.length > 0 ? (
        <section className="panel table-panel">
          <div className="data-table" role="table" aria-label="Driver records">
            <div className="data-table__row data-table__head" role="row">
              <span role="columnheader">Driver profile</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Bike assignment</span>
              <span role="columnheader">Start date</span>
            </div>
            {drivers.map((driver) => (
              <div className="data-table__row" role="row" key={driver.id}>
                <span role="cell" className="mono-value">{driver.profile_id.slice(0, 8)}</span>
                <span role="cell"><StatusBadge tone={driver.status === "active" ? "green" : "slate"}>{driver.status}</StatusBadge></span>
                <span role="cell">{driver.bike_id ? "Assigned" : "Unassigned"}</span>
                <span role="cell">{driver.start_date ?? "Not set"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <EmptyCollection title="No driver records yet" description="Driver accounts will be provisioned by authorized VMC staff. This phase does not expose public driver registration." />
      )}
    </>
  );
}

function EmptyCollection({ title, description }: { title: string; description: string }) {
  return (
    <section className="empty-state panel">
      <p className="card-label">SECURE FOUNDATION</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
  );
}
