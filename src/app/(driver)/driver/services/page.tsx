import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { submitServiceRequest } from "./actions";

export default async function DriverServicesPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const enabled = await hasFeatureAccess("service_requests");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="HERO RIDER APP · SERVICE BOOKING"
          title="Scheduled service & maintenance"
          description="Book routine servicing, oil changes, and inspections for your assigned bike."
        />
        <LockedFeature feature="service_requests" />
      </>
    );
  }

  const supabase = await createClient();

  // Find driver & assigned bike
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, bike_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: bike } = driver?.bike_id
    ? await supabase
        .from("bikes")
        .select("id, brand, model, registration_number, current_mileage_km, next_service_due_km")
        .eq("id", driver.bike_id)
        .maybeSingle()
    : { data: null };

  // Fetch past service bookings
  const { data: bookings } = driver?.id
    ? await supabase
        .from("service_requests")
        .select("id, service_type, preferred_date, preferred_time, odometer_reading_km, status, confirmed_date, confirmed_time, management_notes, created_at, completed_at")
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeading
        eyebrow="HERO RIDER APP · SERVICE BOOKING"
        title="Scheduled service & inspections"
        description="Maintain your HERO warranty and keep your motorcycle running safely by booking regular depot services."
      />

      {bike ? (
        <section className="information-grid mb-6">
          <article className="panel">
            <p className="card-label">CURRENT MILEAGE</p>
            <h3>{(bike.current_mileage_km ?? 0).toLocaleString()} km</h3>
            <p className="card-copy">Record your current odometer reading whenever you book a service.</p>
          </article>
          <article className="panel">
            <p className="card-label">RECOMMENDED SERVICE INTERVAL</p>
            <h3>{bike.next_service_due_km ? `${bike.next_service_due_km.toLocaleString()} km` : "Every 3,000 km"}</h3>
            <p className="card-copy">
              {bike.next_service_due_km && bike.current_mileage_km && bike.current_mileage_km >= bike.next_service_due_km
                ? "Your bike has reached its target service mileage. Book now!"
                : "Routine service covers oil, filter, valve check, and drive chain adjustment."}
            </p>
          </article>
        </section>
      ) : (
        <section className="empty-state panel mb-6">
          <p className="card-label">MOTORCYCLE ASSIGNMENT</p>
          <h2>No assigned motorcycle found</h2>
          <p>Service booking is only available once your VMC management team assigns your HERO bike.</p>
        </section>
      )}

      {bike && (
        <section className="review-grid mb-6">
          <form
            className="panel review-form"
            action={async (formData) => {
              "use server";
              await submitServiceRequest(formData);
            }}
          >
            <p className="card-label">BOOK A SERVICE APPOINTMENT</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label>
                Service package *
                <select name="service_type" required defaultValue="standard_service">
                  <option value="standard_service">Standard Service (Routine inspection & tune)</option>
                  <option value="first_service_1000km">First Service (1,000 km initial check)</option>
                  <option value="scheduled_service_3000km">Scheduled Service (3,000 km package)</option>
                  <option value="major_service_6000km">Major Service (6,000 km comprehensive overhaul)</option>
                  <option value="oil_change">Oil Change & Filter</option>
                  <option value="brake_tyre_inspection">Brake & Tyre Inspection</option>
                  <option value="other">Other Routine Workshop Service</option>
                </select>
              </label>

              <label>
                Preferred service date *
                <input type="date" name="preferred_date" min={todayStr} required />
              </label>

              <label>
                Preferred time *
                <select name="preferred_time" defaultValue="Morning (08:00 - 12:00)">
                  <option value="Morning (08:00 - 12:00)">Morning (08:00 - 12:00)</option>
                  <option value="Afternoon (12:00 - 16:30)">Afternoon (12:00 - 16:30)</option>
                </select>
              </label>

              <label>
                Current odometer (km)
                <input
                  type="number"
                  name="odometer_reading_km"
                  min={0}
                  defaultValue={bike.current_mileage_km ?? ""}
                  placeholder="e.g. 6250"
                />
              </label>
            </div>

            <label>
              Special requests or rider notes
              <textarea
                name="driver_notes"
                rows={2}
                placeholder="Mention any specific areas to inspect (e.g. clutch play, tyre wear, squeaking front disc)..."
              />
            </label>

            <button className="button button--primary" type="submit">
              Submit booking request
            </button>
          </form>
        </section>
      )}

      <section className="panel table-panel">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <p className="card-label m-0">SERVICE BOOKING HISTORY</p>
          <span className="text-xs text-muted">Confirmed appointments and completed inspection logs</span>
        </div>

        <div className="data-table" role="table" aria-label="Service booking history">
          <div className="data-table__row data-table__head" role="row" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1.2fr" }}>
            <span role="columnheader">Service type</span>
            <span role="columnheader">Requested slot</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Depot confirmation</span>
          </div>

          {bookings?.map((booking) => (
            <div className="data-table__row" role="row" key={booking.id} style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1.2fr" }}>
              <span role="cell">
                <strong className="capitalize">{booking.service_type.replace(/_/g, " ")}</strong>
                {booking.odometer_reading_km && (
                  <span className="text-xs text-muted block">{booking.odometer_reading_km.toLocaleString()} km logged</span>
                )}
              </span>
              <span role="cell">
                <span className="text-xs font-semibold block">{new Date(booking.preferred_date).toLocaleDateString()}</span>
                <span className="text-xs text-muted block">{booking.preferred_time}</span>
              </span>
              <span role="cell">
                <StatusBadge tone={booking.status === "completed" ? "green" : booking.status === "confirmed" ? "blue" : booking.status === "cancelled" ? "slate" : "blue"}>
                  {booking.status}
                </StatusBadge>
              </span>
              <span role="cell">
                {booking.confirmed_date ? (
                  <div className="text-xs">
                    <span className="font-semibold text-navy block">
                      Confirmed: {new Date(booking.confirmed_date).toLocaleDateString()} {booking.confirmed_time || ""}
                    </span>
                    {booking.management_notes && <p className="text-muted m-0 mt-0.5">{booking.management_notes}</p>}
                  </div>
                ) : (
                  <span className="text-xs text-muted">{booking.management_notes || "Awaiting depot confirmation"}</span>
                )}
              </span>
            </div>
          ))}

          {(!bookings || bookings.length === 0) && (
            <div className="empty-state table-empty p-6 text-center">
              <h2>No scheduled bookings yet</h2>
              <p>Keep your motorcycle in top condition by submitting a service appointment above.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
