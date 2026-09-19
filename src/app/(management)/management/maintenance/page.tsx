import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { updateMaintenanceStatus } from "./actions";
import type { MaintenanceStatus } from "@/lib/database.types";

export default async function ManagementMaintenancePage() {
  await requireRole(MANAGEMENT_ROLES);
  const enabled = await hasFeatureAccess("new_maintenance");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC MANAGEMENT · MAINTENANCE"
          title="Fleet maintenance & repairs"
          description="Track driver-reported mechanical faults, depot schedule, and repair resolutions."
        />
        <LockedFeature feature="new_maintenance" />
      </>
    );
  }

  const supabase = await createClient();

  // Fetch all maintenance requests with bike and driver info
  const { data: requests } = await supabase
    .from("maintenance_requests")
    .select(`
      id,
      category,
      title,
      description,
      severity,
      status,
      submitted_at,
      scheduled_for,
      management_notes,
      resolved_at,
      bikes (
        id,
        brand,
        model,
        registration_number,
        current_mileage_km
      ),
      drivers (
        id,
        profiles (
          full_name,
          phone_number
        )
      )
    `)
    .order("submitted_at", { ascending: false });

  // Fetch attachments for these requests
  const requestIds = requests?.map((r) => r.id) || [];
  const { data: attachments } = requestIds.length > 0
    ? await supabase
        .from("maintenance_attachments")
        .select("id, maintenance_request_id, storage_bucket, storage_path, file_name, mime_type")
        .in("maintenance_request_id", requestIds)
    : { data: [] };

  const totalActive = requests?.filter((r) => r.status !== "resolved" && r.status !== "cancelled").length ?? 0;
  const awaitingReview = requests?.filter((r) => r.status === "submitted").length ?? 0;
  const awaitingParts = requests?.filter((r) => r.status === "awaiting_parts").length ?? 0;
  const resolvedCount = requests?.filter((r) => r.status === "resolved").length ?? 0;

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · MAINTENANCE"
        title="Fleet maintenance & repairs"
        description="Review driver reports, assign workshop time slots, order required parts, and sign off completed repairs."
      />

      <section className="metric-grid mb-6">
        <article className="panel metric-card">
          <p className="card-label">ACTIVE REPAIRS</p>
          <strong>{totalActive}</strong>
          <span>Requests currently open</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">AWAITING REVIEW</p>
          <strong className={awaitingReview > 0 ? "text-amber-600" : ""}>{awaitingReview}</strong>
          <span>New driver submissions</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">AWAITING PARTS</p>
          <strong className={awaitingParts > 0 ? "text-blue-600" : ""}>{awaitingParts}</strong>
          <span>Depot waiting on inventory</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">RESOLVED</p>
          <strong className="text-emerald-700">{resolvedCount}</strong>
          <span>Successfully signed off</span>
        </article>
      </section>

      <div className="space-y-4">
        {requests?.map((req) => {
          const reqAttachments = attachments?.filter((a) => a.maintenance_request_id === req.id) || [];
          const bike = req.bikes as { brand?: string; model?: string; registration_number?: string; current_mileage_km?: number } | null;
          const driver = req.drivers as { profiles?: { full_name?: string; phone_number?: string } } | null;

          return (
            <article className="panel space-y-4" key={req.id}>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={req.severity === "critical" ? "red" : req.severity === "high" ? "blue" : "slate"}>
                      {`${req.severity} severity`}
                    </StatusBadge>
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">{req.category.replace("_", " ")}</span>
                    <span className="text-xs text-muted">· {new Date(req.submitted_at).toLocaleString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-navy mt-1">{req.title}</h3>
                </div>
                <StatusBadge tone={req.status === "resolved" ? "green" : req.status === "cancelled" ? "slate" : "blue"}>
                  {req.status.replace("_", " ")}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted block card-label">DRIVER</span>
                  <strong>{driver?.profiles?.full_name || "Assigned driver"}</strong>
                  {driver?.profiles?.phone_number && <div className="text-muted">{driver.profiles.phone_number}</div>}
                </div>
                <div>
                  <span className="text-muted block card-label">MOTORCYCLE</span>
                  <strong>{bike?.brand} {bike?.model}</strong>
                  <div className="mono-value text-muted">{bike?.registration_number || "Registration pending"}</div>
                  {bike?.current_mileage_km != null && <div className="text-muted">{bike.current_mileage_km.toLocaleString()} km recorded</div>}
                </div>
                <div>
                  <span className="text-muted block card-label">SCHEDULED SLOT</span>
                  <strong>{req.scheduled_for ? new Date(req.scheduled_for).toLocaleDateString() : "Not scheduled"}</strong>
                  {req.resolved_at && <div className="text-emerald-700 font-semibold">Resolved: {new Date(req.resolved_at).toLocaleDateString()}</div>}
                </div>
              </div>

              <div className="bg-surface p-3 rounded border border-line text-sm text-ink">
                <p className="card-label mb-1">FAULT DESCRIPTION</p>
                <p className="m-0 whitespace-pre-wrap">{req.description}</p>
              </div>

              {reqAttachments.length > 0 && (
                <div className="text-xs">
                  <span className="card-label">ATTACHED MEDIA</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {reqAttachments.map((att) => (
                      <span key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-paper border border-line rounded text-xs">
                        📎 {att.file_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <form
                action={async (formData) => {
                  "use server";
                  const status = formData.get("status") as MaintenanceStatus;
                  const notes = String(formData.get("notes") ?? "");
                  const scheduledFor = String(formData.get("scheduled_for") ?? "");
                  await updateMaintenanceStatus(req.id, status, notes, scheduledFor || null);
                }}
                className="pt-3 border-t border-line flex flex-col md:flex-row gap-3 items-end bg-paper"
              >
                <label className="text-xs font-semibold text-muted flex-1">
                  Workshop status
                  <select name="status" defaultValue={req.status} className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink">
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="scheduled">Scheduled for Depot</option>
                    <option value="in_progress">In Progress (Bay Active)</option>
                    <option value="awaiting_parts">Awaiting Parts</option>
                    <option value="resolved">Resolved (Repairs Verified)</option>
                    <option value="cancelled">Cancelled / Void</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-muted w-full md:w-48">
                  Scheduled depot date
                  <input
                    type="date"
                    name="scheduled_for"
                    defaultValue={req.scheduled_for ? req.scheduled_for.slice(0, 10) : ""}
                    className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink"
                  />
                </label>

                <label className="text-xs font-semibold text-muted flex-2 w-full">
                  Depot notes / Resolution remarks
                  <input
                    name="notes"
                    defaultValue={req.management_notes || ""}
                    placeholder="Instructions for mechanic, parts used, or note for driver"
                    className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink"
                  />
                </label>

                <button type="submit" className="button button--primary !py-1.5 !px-3 !text-xs whitespace-nowrap">
                  Save updates
                </button>
              </form>
            </article>
          );
        })}

        {(!requests || requests.length === 0) && (
          <div className="empty-state panel text-center py-10">
            <h2>No maintenance requests recorded</h2>
            <p>Driver fault reports and routine repair orders will be displayed and managed here.</p>
          </div>
        )}
      </div>
    </>
  );
}
