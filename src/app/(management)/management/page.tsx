import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ManagementDashboardPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();
  const [{ count: driverCount }, { count: bikeCount }, { count: assignedBikeCount }, { data: notifications }] = await Promise.all([
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("bikes").select("id", { count: "exact", head: true }),
    supabase.from("bikes").select("id", { count: "exact", head: true }).eq("status", "assigned"),
    supabase.from("management_notifications").select("id, title, body, driver_profile_id").is("read_at", null).order("created_at", { ascending: false }).limit(5),
  ]);

  const cards = [
    { label: "Driver records", value: driverCount ?? 0, note: "Secure operational records" },
    { label: "Bike records", value: bikeCount ?? 0, note: "HERO fleet foundation" },
    { label: "Assigned bikes", value: assignedBikeCount ?? 0, note: "Current assignments" },
  ];

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT"
        title="Operations dashboard"
        description="A secure foundation for Valhalla Motorcycles operations across the Pretoria–Midrand service area."
      />
      <section className="metric-grid" aria-label="Operational summary">
        {cards.map((card) => (
          <article className="metric-card panel" key={card.label}>
            <p className="card-label">{card.label}</p>
            <strong>{card.value}</strong>
            <span>{card.note}</span>
          </article>
        ))}
      </section>
      <section className="panel foundation-callout">
        <div>
          <p className="eyebrow">PHASE ONE</p>
          <h2>Foundation in place</h2>
          <p>
            Authentication, server-side role checks and database-level access controls are ready for the next VMC modules.
          </p>
        </div>
        <StatusBadge tone="blue">Payments & maintenance next</StatusBadge>
      </section>
      {notifications && notifications.length > 0 && <section className="panel notification-panel"><p className="eyebrow">MANAGEMENT NOTIFICATIONS</p><h2>Driver onboarding needs review</h2>{notifications.map((notification) => <article key={notification.id} className="notification-item"><div><strong>{notification.title}</strong><p>{notification.body}</p></div><a className="text-action" href={`/management/drivers/${notification.driver_profile_id}`}>Review driver</a></article>)}</section>}
    </>
  );
}
