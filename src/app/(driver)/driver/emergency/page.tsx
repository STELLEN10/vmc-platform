import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { submitEmergencyReport } from "./actions";

export default async function DriverEmergencyPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const enabled = await hasFeatureAccess("emergency_bike_support");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="HERO RIDER APP · EMERGENCY"
          title="Emergency incident support"
          description="Immediate operational dispatch, roadside assistance, and safety incident logging."
        />
        <LockedFeature feature="emergency_bike_support" />
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
        .select("brand, model, registration_number")
        .eq("id", driver.bike_id)
        .maybeSingle()
    : { data: null };

  // Fetch past emergency reports
  const { data: reports } = driver?.id
    ? await supabase
        .from("emergency_reports")
        .select("id, emergency_type, severity, location_description, description, status, created_at, management_notes, resolved_at")
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <>
      <PageHeading
        eyebrow="HERO RIDER APP · EMERGENCY SUPPORT"
        title="Emergency assistance"
        description="Priority dispatch desk for accidents, mechanical breakdowns on the road, and urgent safety incidents."
      />

      <section className="panel panel--dark mb-6 border-l-4 !border-l-red-600">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow eyebrow--light text-red-300">IMMEDIATE POLICE & MEDICAL LIFE THREAT</p>
            <h2 className="text-xl font-bold">Call 10111 or 112 (National Emergency) first</h2>
            <p className="text-sm text-gray-200 mt-1">
              If anyone is injured or in immediate physical danger, contact emergency medical/police services immediately before filing an in-app report.
            </p>
          </div>
          <div className="bg-red-700/40 p-3 rounded border border-red-500/50 text-xs">
            <span className="font-bold block text-white">VMC 24/7 ROADSIDE DESK</span>
            <span className="text-red-200 font-mono text-sm block">+27 (0) 11 555 0199</span>
            {bike && (
              <span className="text-red-200 text-[11px] block mt-1">
                Motorcycle: {bike.brand} {bike.model} ({bike.registration_number || "Reg Pending"})
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="review-grid mb-6">
        <form
          className="panel review-form border border-red-200"
          action={async (formData) => {
            "use server";
            await submitEmergencyReport(formData);
          }}
        >
          <div className="flex items-center justify-between">
            <p className="card-label text-red-600">SUBMIT ROAD INCIDENT / BREAKDOWN</p>
            <span className="status-badge status-badge--red">Priority Incident</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label>
              Emergency type *
              <select name="emergency_type" required defaultValue="bike_breakdown">
                <option value="bike_breakdown">Motorcycle Breakdown / Stall</option>
                <option value="accident">Traffic Accident / Collision</option>
                <option value="safety_issue">Rider Safety / Hijack / Threat</option>
                <option value="medical_emergency">Medical Emergency</option>
                <option value="other">Other Roadside Distress</option>
              </select>
            </label>

            <label>
              Incident severity *
              <select name="severity" required defaultValue="critical">
                <option value="critical">Critical (Stranded, immobilized, or danger)</option>
                <option value="high">High (Urgent roadside assistance needed)</option>
                <option value="medium">Medium (Roadworthy concern)</option>
              </select>
            </label>
          </div>

          <label>
            Exact location / Nearby landmark / Street address *
            <input
              name="location_description"
              required
              placeholder="e.g. Corner of Oxford Rd & Bolton Rd, Rosebank (outside Shell garage)"
            />
          </label>

          <label>
            Incident details & condition of motorcycle
            <textarea
              name="description"
              rows={3}
              placeholder="Briefly state what happened, condition of bike, and if you are in a safe waiting spot..."
            />
          </label>

          <label>
            Incident scene photo / video (Optional)
            <input name="attachment" type="file" accept="image/*,video/*" />
            <span className="text-[11px] text-muted">Upload a photo of the incident or damage to assist dispatch responders.</span>
          </label>

          <button className="button button--primary !bg-red-700 hover:!bg-red-800" type="submit">
            Dispatch emergency assistance request
          </button>
        </form>
      </section>

      <section className="panel table-panel">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <p className="card-label m-0">LOGGED EMERGENCY INCIDENTS</p>
          <span className="text-xs text-muted">Real-time status of your emergency reports</span>
        </div>

        <div className="data-table" role="table" aria-label="Emergency reports history">
          <div className="data-table__row data-table__head" role="row" style={{ gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr" }}>
            <span role="columnheader">Type & Time</span>
            <span role="columnheader">Location</span>
            <span role="columnheader">Dispatch status</span>
            <span role="columnheader">VMC response / Notes</span>
          </div>

          {reports?.map((report) => (
            <div className="data-table__row" role="row" key={report.id} style={{ gridTemplateColumns: "1.2fr 1.2fr 1fr 1fr" }}>
              <span role="cell">
                <strong className="capitalize">{report.emergency_type.replace("_", " ")}</strong>
                <span className="text-xs text-muted block">{new Date(report.created_at).toLocaleString()}</span>
                <StatusBadge tone={report.severity === "critical" ? "red" : "blue"}>{report.severity}</StatusBadge>
              </span>
              <span role="cell">
                <span className="text-xs font-semibold text-navy">{report.location_description || "Roadside"}</span>
                {report.description && <p className="text-xs text-muted mt-1">{report.description}</p>}
              </span>
              <span role="cell">
                <StatusBadge tone={report.status === "resolved" ? "green" : report.status === "responding" ? "blue" : report.status === "acknowledged" ? "blue" : "red"}>
                  {report.status}
                </StatusBadge>
              </span>
              <span role="cell">
                {report.management_notes ? (
                  <div className="text-xs review-note">
                    <span className="font-semibold text-navy">Desk response:</span>
                    <p className="m-0 text-muted">{report.management_notes}</p>
                  </div>
                ) : (
                  <span className="text-xs text-muted">VMC desk notified</span>
                )}
              </span>
            </div>
          ))}

          {(!reports || reports.length === 0) && (
            <div className="empty-state table-empty p-6 text-center">
              <h2>No emergency incidents on record</h2>
              <p>Drive safely. If you encounter mechanical failure or an accident, use the dispatch button above.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
