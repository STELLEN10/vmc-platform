import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ManagementDashboardPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  const [
    { count: driverCount },
    { count: bikeCount },
    { count: assignedBikeCount },
    { count: emergencyCount },
    { count: maintenanceCount },
    { count: pendingPaymentCount },
    { data: notifications },
  ] = await Promise.all([
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("bikes").select("id", { count: "exact", head: true }),
    supabase.from("bikes").select("id", { count: "exact", head: true }).eq("status", "assigned"),
    supabase.from("emergency_reports").select("id", { count: "exact", head: true }).in("status", ["open", "responding", "acknowledged"]),
    supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "in_progress", "scheduled"]),
    supabase.from("payment_periods").select("id", { count: "exact", head: true }).in("status", ["due", "submitted", "awaiting_verification"]),
    supabase
      .from("management_notifications")
      .select("id, title, body, driver_profile_id, created_at, severity, action_url")
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalBikes = bikeCount ?? 0;
  const assignedBikes = assignedBikeCount ?? 0;
  const utilizationRate = totalBikes > 0 ? Math.round((assignedBikes / totalBikes) * 100) : 0;

  const cards = [
    {
      label: "Fleet utilization",
      value: `${utilizationRate}%`,
      note: `${assignedBikes} of ${totalBikes} bikes in active lease`,
      href: "/management/bikes",
    },
    {
      label: "Active drivers",
      value: driverCount ?? 0,
      note: "Registered & verified drivers",
      href: "/management/drivers",
    },
    {
      label: "Road emergencies",
      value: emergencyCount ?? 0,
      note: emergencyCount && emergencyCount > 0 ? "Urgent dispatch required" : "All routes clear",
      tone: emergencyCount && emergencyCount > 0 ? "red" : "green",
      href: "/management/emergency",
    },
    {
      label: "Workshop queue",
      value: maintenanceCount ?? 0,
      note: "Repairs & scheduled services",
      href: "/management/maintenance",
    },
    {
      label: "Payment proofs to review",
      value: pendingPaymentCount ?? 0,
      note: "Receipts awaiting verification",
      href: "/management/payments",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="VMC MANAGEMENT"
        title="Operations Command Center"
        description="Live operational intelligence, fleet telemetry, driver safety dispatches, and financial ledger control across Pretoria to Midrand."
      />

      <section className="metric-grid" aria-label="Operational summary">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="block no-underline hover:opacity-90 transition-opacity"
          >
            <article className="metric-card panel h-full">
              <div className="flex items-center justify-between">
                <p className="card-label">{card.label}</p>
                {card.tone === "red" && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />}
              </div>
              <strong>{card.value}</strong>
              <span className={card.tone === "red" ? "text-red-500 font-medium" : ""}>
                {card.note}
              </span>
            </article>
          </Link>
        ))}
      </section>

      {/* Quick Access Operations Intelligence Suite */}
      <section className="panel space-y-4">
        <div>
          <h2 className="text-base font-bold text-ink">Operations Intelligence Tools</h2>
          <p className="text-xs text-muted">Direct navigation to v0.4 analytical and auditing modules.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/management/analytics"
            className="p-3 bg-paper border border-line rounded-lg hover:border-amber-600 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-xs text-ink">Fleet & Revenue Analytics</div>
              <p className="text-[11px] text-muted mt-1">Utilization curves, collection rates, and CSV exports.</p>
            </div>
            <span className="text-action text-[11px] mt-2">Open analytics →</span>
          </Link>

          <Link
            href="/management/documents"
            className="p-3 bg-paper border border-line rounded-lg hover:border-amber-600 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-xs text-ink">Documents & Contracts</div>
              <p className="text-[11px] text-muted mt-1">Lease PDFs, compliance IDs, and damage photos.</p>
            </div>
            <span className="text-action text-[11px] mt-2">Open documents →</span>
          </Link>

          <Link
            href="/management/activity"
            className="p-3 bg-paper border border-line rounded-lg hover:border-amber-600 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-xs text-ink">Activity & Audit Trail</div>
              <p className="text-[11px] text-muted mt-1">Immutable log of dispatches, payments, and staff changes.</p>
            </div>
            <span className="text-action text-[11px] mt-2">Open activity log →</span>
          </Link>

          <Link
            href="/management/notifications"
            className="p-3 bg-paper border border-line rounded-lg hover:border-amber-600 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="font-bold text-xs text-ink">Notifications Hub</div>
              <p className="text-[11px] text-muted mt-1">Central alerts, onboarding reviews, and broadcast alerts.</p>
            </div>
            <span className="text-action text-[11px] mt-2">Open alerts →</span>
          </Link>
        </div>
      </section>

      {notifications && notifications.length > 0 && (
        <section className="panel notification-panel space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">URGENT OPERATIONS ALERTS</p>
              <h2 className="text-base font-bold text-ink">Items requiring management attention</h2>
            </div>
            <Link href="/management/notifications" className="text-action text-xs">
              View all alerts →
            </Link>
          </div>
          <div className="divide-y divide-line/40">
            {notifications.map((notification) => {
              const url = notification.action_url || `/management/drivers/${notification.driver_profile_id}`;
              return (
                <article key={notification.id} className="notification-item py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-ink">{notification.title}</strong>
                      {notification.severity && (
                        <StatusBadge tone={notification.severity === "critical" ? "red" : "blue"}>
                          {notification.severity}
                        </StatusBadge>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">{notification.body}</p>
                  </div>
                  <Link className="text-action text-xs shrink-0" href={url}>
                    Action →
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

