import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import Link from "next/link";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ManagementDriversPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();
  const [{ data: profiles }, { data: onboardings }, { data: driverRecords }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email").eq("role", "driver").order("created_at", { ascending: false }),
    supabase.from("driver_onboardings").select("profile_id, onboarding_status"),
    supabase.from("drivers").select("profile_id, bike_id"),
  ]);
  const onboardingByProfile = new Map(onboardings?.map((item) => [item.profile_id, item]) ?? []);
  const driverByProfile = new Map(driverRecords?.map((item) => [item.profile_id, item]) ?? []);

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT"
        title="Drivers"
        description="The secure driver register will grow into the operational home for driver onboarding, contracts and payment schedules."
      />
      {profiles && profiles.length > 0 ? (
        <section className="panel table-panel">
          <div className="data-table" role="table" aria-label="Driver records">
            <div className="data-table__row data-table__head" role="row">
              <span role="columnheader">Driver</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Bike assignment</span>
              <span role="columnheader">Review</span>
            </div>
            {profiles.map((driver) => {
              const onboarding = onboardingByProfile.get(driver.id);
              const record = driverByProfile.get(driver.id);
              const status = onboarding?.onboarding_status ?? "pending";
              return <div className="data-table__row" role="row" key={driver.id}>
                <span role="cell"><Link className="driver-link" href={`/management/drivers/${driver.id}`}>{driver.full_name || driver.email || "New driver"}</Link></span>
                <span role="cell"><StatusBadge tone={status === "active" || status === "approved" ? "green" : status === "submitted" || status === "under_review" ? "blue" : "slate"}>{status.replaceAll("_", " ")}</StatusBadge></span>
                <span role="cell">{record?.bike_id ? "Assigned" : "Pending VMC assignment"}</span>
                <span role="cell"><Link className="text-action" href={`/management/drivers/${driver.id}`}>Review</Link></span>
              </div>
            })}
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
