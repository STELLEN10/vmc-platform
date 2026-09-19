import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { updateServiceRequestStatus } from "./actions";
import type { ServiceStatus } from "@/lib/database.types";

export default async function ManagementServicesPage() {
  await requireRole(MANAGEMENT_ROLES);
  const enabled = await hasFeatureAccess("service_requests");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC MANAGEMENT · SERVICES"
          title="Scheduled depot servicing"
          description="Manage routine motorcycle servicing, oil changes, and inspection bookings."
        />
        <LockedFeature feature="service_requests" />
      </>
    );
  }

  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("service_requests")
    .select(`
      id,
      service_type,
      preferred_date,
      preferred_time,
      odometer_reading_km,
      driver_notes,
      status,
      confirmed_date,
      confirmed_time,
      management_notes,
      created_at,
      completed_at,
      bikes (
        id,
        brand,
        model,
        registration_number,
        current_mileage_km,
        next_service_due_km
      ),
      drivers (
        id,
        profiles (
          full_name,
          phone_number
        )
      )
    `)
    .order("preferred_date", { ascending: false });

  const pendingCount = bookings?.filter((b) => b.status === "requested").length ?? 0;
  const confirmedCount = bookings?.filter((b) => b.status === "confirmed").length ?? 0;
  const completedCount = bookings?.filter((b) => b.status === "completed").length ?? 0;

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · WORKSHOP"
        title="Scheduled depot servicing"
        description="Review driver service appointments, schedule workshop bays, confirm appointment slots, and record odometer milestones."
      />

      <section className="metric-grid mb-6">
        <article className="panel metric-card">
          <p className="card-label">PENDING APPOINTMENTS</p>
          <strong className={pendingCount > 0 ? "text-amber-600" : ""}>{pendingCount}</strong>
          <span>Awaiting slot confirmation</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">CONFIRMED / SCHEDULED</p>
          <strong className="text-blue-600">{confirmedCount}</strong>
          <span>Booked in workshop calendar</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">COMPLETED SERVICES</p>
          <strong className="text-emerald-700">{completedCount}</strong>
          <span>Fully serviced & cleared</span>
        </article>
      </section>

      <div className="space-y-4">
        {bookings?.map((booking) => {
          const bike = booking.bikes as { brand?: string; model?: string; registration_number?: string; current_mileage_km?: number; next_service_due_km?: number } | null;
          const driver = booking.drivers as { profiles?: { full_name?: string; phone_number?: string } } | null;

          return (
            <article key={booking.id} className="panel space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">
                      {booking.service_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-muted">
                      · Requested for {new Date(booking.preferred_date).toLocaleDateString()} ({booking.preferred_time})
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-navy mt-1">
                    {driver?.profiles?.full_name || "Driver"} · {bike?.brand} {bike?.model} ({bike?.registration_number || "No reg"})
                  </h3>
                </div>
                <StatusBadge tone={booking.status === "completed" ? "green" : booking.status === "confirmed" ? "blue" : booking.status === "cancelled" ? "slate" : "blue"}>
                  {booking.status}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted block card-label">RIDER CONTACT</span>
                  <strong>{driver?.profiles?.full_name || "Rider"}</strong>
                  {driver?.profiles?.phone_number && <div className="text-navy">{driver.profiles.phone_number}</div>}
                </div>
                <div>
                  <span className="text-muted block card-label">MILEAGE & TARGET</span>
                  <div>Reported Odo: <strong>{booking.odometer_reading_km ? `${booking.odometer_reading_km.toLocaleString()} km` : "Not entered"}</strong></div>
                  <div className="text-muted">Recorded: {bike?.current_mileage_km ? `${bike.current_mileage_km.toLocaleString()} km` : "-"}</div>
                </div>
                <div>
                  <span className="text-muted block card-label">CONFIRMED APPOINTMENT</span>
                  <strong>
                    {booking.confirmed_date
                      ? `${new Date(booking.confirmed_date).toLocaleDateString()} ${booking.confirmed_time || ""}`
                      : "Pending confirmation"}
                  </strong>
                  {booking.completed_at && (
                    <div className="text-emerald-700 font-semibold">
                      Completed: {new Date(booking.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {booking.driver_notes && (
                <div className="bg-surface p-3 rounded border border-line text-sm text-ink">
                  <p className="card-label mb-1">RIDER NOTES</p>
                  <p className="m-0 whitespace-pre-wrap">{booking.driver_notes}</p>
                </div>
              )}

              <form
                action={async (formData) => {
                  "use server";
                  const status = formData.get("status") as ServiceStatus;
                  const confirmedDate = String(formData.get("confirmed_date") ?? "");
                  const confirmedTime = String(formData.get("confirmed_time") ?? "");
                  const notes = String(formData.get("notes") ?? "");
                  await updateServiceRequestStatus(booking.id, status, confirmedDate || null, confirmedTime || null, notes || null);
                }}
                className="pt-3 border-t border-line flex flex-col md:flex-row gap-3 items-end bg-paper"
              >
                <label className="text-xs font-semibold text-muted w-full md:w-44">
                  Booking status
                  <select name="status" defaultValue={booking.status} className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink">
                    <option value="requested">Requested</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rescheduled">Rescheduled</option>
                    <option value="completed">Completed (Service Done)</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no_show">No Show</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-muted w-full md:w-36">
                  Confirmed date
                  <input
                    type="date"
                    name="confirmed_date"
                    defaultValue={booking.confirmed_date || booking.preferred_date}
                    className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink"
                  />
                </label>

                <label className="text-xs font-semibold text-muted w-full md:w-28">
                  Time
                  <input
                    type="time"
                    name="confirmed_time"
                    defaultValue={booking.confirmed_time || "09:00"}
                    className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink"
                  />
                </label>

                <label className="text-xs font-semibold text-muted flex-1 w-full">
                  Depot notes / Bay allocation
                  <input
                    name="notes"
                    defaultValue={booking.management_notes || ""}
                    placeholder="e.g. Bay 2, mechanic Thabo, standard 3,000km service package"
                    className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink"
                  />
                </label>

                <button type="submit" className="button button--primary !py-1.5 !px-3 !text-xs whitespace-nowrap">
                  Save booking
                </button>
              </form>
            </article>
          );
        })}

        {(!bookings || bookings.length === 0) && (
          <div className="empty-state panel text-center py-10">
            <h2>No service appointments booked</h2>
            <p>Upcoming routine service and inspection requests submitted by drivers will appear here.</p>
          </div>
        )}
      </div>
    </>
  );
}
