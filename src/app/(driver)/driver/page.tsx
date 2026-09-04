import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function DriverHomePage() {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();
  const { data: driver } = await supabase
    .from("drivers")
    .select("status, bike_id, start_date")
    .eq("profile_id", profile.id)
    .maybeSingle();

  return (
    <>
      <PageHeading
        eyebrow="VMC DRIVER"
        title={`Welcome, ${profile.fullName || "rider"}`}
        description="Your secure VMC account is ready. Payments, maintenance and notifications will be added in later phases."
      />
      <section className="driver-hero panel panel--dark">
        <div>
          <p className="eyebrow eyebrow--light">YOUR HERO MOTORCYCLE</p>
          <h2>{driver?.bike_id ? "Assigned and ready" : "Assignment pending"}</h2>
          <p>
            {driver?.bike_id
              ? "View the motorcycle assigned to your driver record."
              : "Your VMC team will update this area once a motorcycle is assigned."}
          </p>
        </div>
        <Link className="button button--light" href="/driver/bike">
          View motorcycle
        </Link>
      </section>
      <section className="information-grid" aria-label="Driver account summary">
        <article className="panel">
          <p className="card-label">Account status</p>
          <StatusBadge tone={driver?.status === "active" ? "green" : "slate"}>
            {driver?.status ?? "Profile awaiting setup"}
          </StatusBadge>
          <p className="card-copy">Your account information is protected and visible only to you and authorized VMC staff.</p>
        </article>
        <article className="panel">
          <p className="card-label">Coming next</p>
          <h3>Payments & service</h3>
          <p className="card-copy">Payment history, service reporting and VMC notices will appear here as the platform expands.</p>
        </article>
      </section>
    </>
  );
}
