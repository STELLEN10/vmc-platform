import Link from "next/link";

import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function DriverHomePage() {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();

  const [{ data: driver }, { data: notifications }] = await Promise.all([
    supabase.from("drivers").select("bike_id").eq("profile_id", profile.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id, title, body, created_at, status, type")
      .neq("type", "payment_reminder")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const latestNotifications = notifications ?? [];

  return (
    <>
      <PageHeading
        eyebrow="VMC DRIVER"
        title={`Welcome, ${profile.fullName || "rider"}`}
        description="Your VMC Driver dashboard. Important updates from VMC will appear here."
      />

      <section className="driver-hero panel panel--dark">
        <div>
          <p className="eyebrow eyebrow--light">YOUR HERO MOTORCYCLE</p>
          <h2>{driver?.bike_id ? "Motorcycle assigned" : "Assignment pending"}</h2>
          <p>
            {driver?.bike_id
              ? "Your assigned motorcycle and its operational details are available in My motorcycle."
              : "Your VMC team will update your motorcycle assignment when it is ready."}
          </p>
        </div>
        <Link className="button button--light" href="/driver/bike">
          View motorcycle
        </Link>
      </section>

      <section className="panel section-gap" aria-labelledby="driver-updates-heading">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="card-label">IMPORTANT UPDATES</p>
            <h2 id="driver-updates-heading" className="text-lg font-bold text-ink">VMC notices</h2>
          </div>
          <Link href="/driver/notifications" className="text-action text-xs">View all →</Link>
        </div>

        {latestNotifications.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line bg-paper p-5 text-sm text-muted">
            No new VMC notices right now.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-line">
            {latestNotifications.map((notification) => (
              <article key={notification.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">{notification.title}</h3>
                    <p className="mt-1 text-sm text-muted">{notification.body}</p>
                  </div>
                  {notification.status === "unread" && (
                    <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">New</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-muted">{new Date(notification.created_at).toLocaleString("en-ZA")}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
