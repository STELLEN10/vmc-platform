import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { submitMaintenanceRequest } from "./actions";

export default async function DriverMaintenancePage() {
  const profile = await requireRole(DRIVER_ROLES);
  const enabled = await hasFeatureAccess("new_maintenance");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="HERO RIDER APP · MAINTENANCE"
          title="Motorcycle maintenance"
          description="Log and monitor maintenance and mechanical repairs for your assigned bike."
        />
        <LockedFeature feature="new_maintenance" />
      </>
    );
  }

  const supabase = await createClient();

  // Fetch driver & assigned bike
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, bike_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  const { data: bike } = driver?.bike_id
    ? await supabase
        .from("bikes")
        .select("id, brand, model, colour, registration_number, current_mileage_km")
        .eq("id", driver.bike_id)
        .maybeSingle()
    : { data: null };

  // Fetch driver's past requests
  const { data: requests } = driver?.id
    ? await supabase
        .from("maintenance_requests")
        .select("id, category, title, description, severity, status, submitted_at, management_notes, scheduled_for, resolved_at")
        .eq("driver_id", driver.id)
        .order("submitted_at", { ascending: false })
    : { data: [] };

  return (
    <>
      <PageHeading
        eyebrow="HERO RIDER APP · MAINTENANCE"
        title="Motorcycle maintenance"
        description="Report mechanical issues, book routine repairs, and track depot workshop progress in real time."
      />

      {bike ? (
        <section className="panel foundation-callout mb-6">
          <div>
            <p className="eyebrow">ASSIGNED MOTORCYCLE</p>
            <h2>{bike.brand} {bike.model}</h2>
            <p>
              Registration: <strong className="text-navy">{bike.registration_number || "Registration pending"}</strong>
              {bike.current_mileage_km != null && ` · Odometer: ${bike.current_mileage_km.toLocaleString()} km`}
            </p>
          </div>
          <span className="status-badge status-badge--green">Active assignment</span>
        </section>
      ) : (
        <section className="empty-state panel mb-6">
          <p className="card-label">NO ASSIGNED MOTORCYCLE</p>
          <h2>Maintenance reporting requires an assigned bike</h2>
          <p>Once your VMC management team assigns a HERO motorcycle to your profile, you will be able to report maintenance requests directly here.</p>
        </section>
      )}

      {bike && (
        <section className="review-grid mb-6">
          <form
            className="panel review-form"
            action={async (formData) => {
              "use server";
              await submitMaintenanceRequest(formData);
            }}
          >
            <p className="card-label">REPORT A MAINTENANCE ISSUE</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label>
                Category *
                <select name="category" required defaultValue="brakes">
                  <option value="brakes">Brakes & Cables</option>
                  <option value="engine">Engine & Transmission</option>
                  <option value="tyres">Tyres & Punctures</option>
                  <option value="electrical">Electrical & Starter</option>
                  <option value="battery">Battery & Charging</option>
                  <option value="lights">Headlight & Indicators</option>
                  <option value="chain">Drive Chain & Sprocket</option>
                  <option value="suspension">Suspension & Shock Absorbers</option>
                  <option value="body">Body, Frame & Mirrors</option>
                  <option value="oil_service">Oil Service / Leak</option>
                  <option value="other">Other Issue</option>
                </select>
              </label>

              <label>
                Urgency / Severity *
                <select name="severity" required defaultValue="medium">
                  <option value="low">Low (Safe to ride, minor noise/cosmetic)</option>
                  <option value="medium">Medium (Requires attention soon)</option>
                  <option value="high">High (Impairs riding or reliability)</option>
                  <option value="critical">Critical (Unsafe to ride / grounded)</option>
                </select>
              </label>
            </div>

            <label>
              Short summary / Title *
              <input name="title" required placeholder="e.g. Front brake lever feels spongy and lacks bite" />
            </label>

            <label>
              Detailed description *
              <textarea
                name="description"
                required
                rows={3}
                placeholder="Explain what is happening, when it started, and any symptoms (noises, leaks, vibration)..."
              />
            </label>

            <label>
              Attach photo or video (Optional)
              <input name="attachment" type="file" accept="image/*,video/*,application/pdf" />
              <span className="text-[11px] text-muted">Upload a clear photo or short video to help VMC mechanics diagnose the issue faster (Max 50MB).</span>
            </label>

            <button className="button button--primary" type="submit">
              Submit maintenance report
            </button>
          </form>
        </section>
      )}

      <section className="panel table-panel">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <p className="card-label m-0">YOUR MAINTENANCE HISTORY</p>
          <span className="text-xs text-muted">Updates from VMC workshop will appear below</span>
        </div>

        <div className="data-table" role="table" aria-label="Maintenance requests history">
          <div className="data-table__row data-table__head" role="row" style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1.2fr" }}>
            <span role="columnheader">Issue & Category</span>
            <span role="columnheader">Severity</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Depot notes / Updates</span>
          </div>

          {requests?.map((req) => (
            <div className="data-table__row" role="row" key={req.id} style={{ gridTemplateColumns: "1.2fr 1fr 1fr 1.2fr" }}>
              <span role="cell">
                <strong>{req.title}</strong>
                <span className="text-xs text-muted block capitalize">{req.category.replace("_", " ")} · {new Date(req.submitted_at).toLocaleDateString()}</span>
                <p className="text-xs text-muted mt-1 line-clamp-2">{req.description}</p>
              </span>
              <span role="cell">
                <StatusBadge tone={req.severity === "critical" ? "red" : req.severity === "high" ? "blue" : "slate"}>
                  {req.severity}
                </StatusBadge>
              </span>
              <span role="cell">
                <StatusBadge tone={req.status === "resolved" ? "green" : req.status === "in_progress" || req.status === "scheduled" ? "blue" : req.status === "awaiting_parts" ? "slate" : "blue"}>
                  {req.status.replace("_", " ")}
                </StatusBadge>
                {req.scheduled_for && (
                  <span className="text-[11px] text-muted block mt-1">
                    Scheduled: {new Date(req.scheduled_for).toLocaleDateString()}
                  </span>
                )}
              </span>
              <span role="cell">
                {req.management_notes ? (
                  <div className="text-xs review-note">
                    <span className="font-semibold text-navy">Workshop note:</span>
                    <p className="m-0 text-muted">{req.management_notes}</p>
                  </div>
                ) : (
                  <span className="text-xs text-muted">Awaiting depot review</span>
                )}
              </span>
            </div>
          ))}

          {(!requests || requests.length === 0) && (
            <div className="empty-state table-empty p-6 text-center">
              <h2>No maintenance requests recorded</h2>
              <p>When you report a motorcycle issue above, track its repair status and scheduled depot slot here.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
