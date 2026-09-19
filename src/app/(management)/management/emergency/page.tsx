import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { updateEmergencyStatus } from "./actions";
import type { EmergencyStatus } from "@/lib/database.types";

export default async function ManagementEmergencyPage() {
  await requireRole(MANAGEMENT_ROLES);
  const enabled = await hasFeatureAccess("emergency_bike_support");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC MANAGEMENT · EMERGENCY"
          title="Emergency incident dispatch"
          description="Live road safety incidents, accident dispatching, and recovery coordination."
        />
        <LockedFeature feature="emergency_bike_support" />
      </>
    );
  }

  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("emergency_reports")
    .select(`
      id,
      emergency_type,
      severity,
      location_description,
      description,
      status,
      created_at,
      management_notes,
      resolved_at,
      bikes (
        id,
        brand,
        model,
        registration_number
      ),
      drivers (
        id,
        profiles (
          full_name,
          phone_number
        )
      )
    `)
    .order("created_at", { ascending: false });

  const reportIds = reports?.map((r) => r.id) || [];
  const { data: attachments } = reportIds.length > 0
    ? await supabase
        .from("emergency_attachments")
        .select("id, emergency_report_id, file_name, mime_type, storage_path")
        .in("emergency_report_id", reportIds)
    : { data: [] };

  const openCount = reports?.filter((r) => r.status === "open").length ?? 0;
  const respondingCount = reports?.filter((r) => r.status === "responding" || r.status === "acknowledged").length ?? 0;
  const resolvedCount = reports?.filter((r) => r.status === "resolved").length ?? 0;

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · DISPATCH"
        title="Emergency incident dispatch"
        description="Monitor active roadside breakdowns and collisions. Dispatch recovery units and communicate with riders."
      />

      {openCount > 0 && (
        <section className="panel mb-6 bg-red-50 border-2 border-red-500 text-red-950 p-4 rounded-lg flex items-center justify-between">
          <div>
            <span className="card-label text-red-700 font-bold">⚠️ CRITICAL ALERT</span>
            <h2 className="text-lg font-bold text-red-900 m-0">
              {openCount} unresolved emergency {openCount === 1 ? "incident requires" : "incidents require"} immediate dispatch attention!
            </h2>
          </div>
          <span className="status-badge status-badge--red !text-sm !py-1 !px-3 animate-pulse">Action required</span>
        </section>
      )}

      <section className="metric-grid mb-6">
        <article className="panel metric-card border-red-200">
          <p className="card-label">OPEN INCIDENTS</p>
          <strong className={openCount > 0 ? "text-red-600" : ""}>{openCount}</strong>
          <span>Awaiting response</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">RESPONDING / EN ROUTE</p>
          <strong className={respondingCount > 0 ? "text-amber-600" : ""}>{respondingCount}</strong>
          <span>Assistance dispatched</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">RESOLVED INCIDENTS</p>
          <strong className="text-emerald-700">{resolvedCount}</strong>
          <span>Safely concluded</span>
        </article>
      </section>

      <div className="space-y-4">
        {reports?.map((report) => {
          const reportAttachments = attachments?.filter((a) => a.emergency_report_id === report.id) || [];
          const bike = report.bikes as { brand?: string; model?: string; registration_number?: string } | null;
          const driver = report.drivers as { profiles?: { full_name?: string; phone_number?: string } } | null;

          return (
            <article
              key={report.id}
              className={`panel space-y-4 ${report.status === "open" ? "border-2 border-red-400 bg-red-50/20" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge tone={report.severity === "critical" ? "red" : "blue"}>
                      {report.severity}
                    </StatusBadge>
                    <span className="text-xs font-bold text-navy uppercase tracking-wider">
                      {report.emergency_type.replace("_", " ")}
                    </span>
                    <span className="text-xs text-muted">· Reported {new Date(report.created_at).toLocaleString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-navy mt-1">📍 {report.location_description || "Roadside"}</h3>
                </div>
                <StatusBadge tone={report.status === "resolved" ? "green" : report.status === "open" ? "red" : "blue"}>
                  {report.status}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-muted block card-label">RIDER ON SCENE</span>
                  <strong>{driver?.profiles?.full_name || "Driver"}</strong>
                  {driver?.profiles?.phone_number && (
                    <div className="text-navy font-semibold mt-0.5 text-sm">
                      📞 {driver.profiles.phone_number}
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-muted block card-label">MOTORCYCLE</span>
                  <strong>{bike?.brand} {bike?.model}</strong>
                  <div className="mono-value text-muted">{bike?.registration_number || "Registration pending"}</div>
                </div>
                <div>
                  <span className="text-muted block card-label">DISPATCH STATUS</span>
                  <strong className="capitalize">{report.status}</strong>
                  {report.resolved_at && (
                    <div className="text-emerald-700 font-semibold mt-0.5">
                      Resolved {new Date(report.resolved_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {report.description && (
                <div className="bg-surface p-3 rounded border border-line text-sm text-ink">
                  <p className="card-label mb-1">RIDER SITUATION REPORT</p>
                  <p className="m-0 whitespace-pre-wrap">{report.description}</p>
                </div>
              )}

              {reportAttachments.length > 0 && (
                <div className="text-xs">
                  <span className="card-label">EVIDENCE / SCENE MEDIA</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {reportAttachments.map((att) => (
                      <span key={att.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-paper border border-line rounded text-xs">
                        📷 {att.file_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <form
                action={async (formData) => {
                  "use server";
                  const status = formData.get("status") as EmergencyStatus;
                  const notes = String(formData.get("notes") ?? "");
                  await updateEmergencyStatus(report.id, status, notes || null);
                }}
                className="pt-3 border-t border-line flex flex-col md:flex-row gap-3 items-end bg-paper"
              >
                <label className="text-xs font-semibold text-muted flex-1">
                  Dispatch status
                  <select name="status" defaultValue={report.status} className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink">
                    <option value="open">Open (Awaiting assignment)</option>
                    <option value="acknowledged">Acknowledged by VMC</option>
                    <option value="responding">Responding (Van / Roadside En Route)</option>
                    <option value="resolved">Resolved (Rider & Bike Secured)</option>
                    <option value="cancelled">Cancelled (False alarm / Stood down)</option>
                  </select>
                </label>

                <label className="text-xs font-semibold text-muted flex-2 w-full">
                  Dispatch & resolution notes
                  <input
                    name="notes"
                    defaultValue={report.management_notes || ""}
                    placeholder="e.g. Recovery bakkie dispatched, ETA 20 mins; or towing completed to depot"
                    className="w-full mt-1 p-1.5 text-xs rounded border border-line bg-paper text-ink"
                  />
                </label>

                <button type="submit" className="button button--primary !py-1.5 !px-3 !text-xs whitespace-nowrap">
                  Update response
                </button>
              </form>
            </article>
          );
        })}

        {(!reports || reports.length === 0) && (
          <div className="empty-state panel text-center py-10">
            <h2>No emergency reports logged</h2>
            <p>All emergency breakdown and accident alerts from riders will immediately stream to this screen.</p>
          </div>
        )}
      </div>
    </>
  );
}
