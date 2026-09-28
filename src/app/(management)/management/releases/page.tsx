import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { FEATURE_CATALOG } from "@/lib/features/catalog";
import { createClient } from "@/lib/supabase/server";
import { assignBetaTester, changeReleaseStatus, createRelease, quickActivateV03Suite, setFeatureFlag } from "./actions";
import { FeatureToggleBoard } from "./feature-toggle-board";

export default async function ReleaseControlPage({ searchParams }: { searchParams: Promise<{ error?: string; updated?: string }> }) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const { error, updated } = await searchParams;
  const supabase = await createClient();
  const { data: releases } = await supabase.from("releases").select("*").order("created_at", { ascending: false });
  const { data: flags } = await supabase.from("feature_flags").select("*").order("key");

  const activeReleases = new Set((releases ?? []).filter((r) => r.status === "active").map((r) => r.version));
  const v03Active = activeReleases.has("v0.3.0") || activeReleases.has("v0.3.0-beta.1");

  return <>
    <PageHeading eyebrow="VMC MANAGEMENT · CONTROL PLANE" title="Release control" description="Releases and feature flags control already-deployed behaviour. Turn features ON or OFF to test first before official release." />
    {updated === "1" && <p className="form-message form-message--success">Release Control updated successfully. Feature access synchronized.</p>}
    {error === "invalid" && <p className="form-message form-message--error">Check the release details. The core platform cannot be disabled, and beta access needs exactly one tester email or role.</p>}
    {error === "not-found" && <p className="form-message form-message--error">No VMC account was found for that tester email address.</p>}
    {error === "database" && <p className="form-message form-message--error">Release Control could not save this change. Confirm the latest Supabase migration has been applied, then try again.</p>}
    
    <section className="panel foundation-callout">
      <div>
        <p className="eyebrow">CURRENT ACCESS</p>
        <h2>{profile.role === "admin" ? "Administrator controls enabled" : "Release visibility only"}</h2>
        <p>{profile.role === "admin" ? "Only administrators can create releases, change release state or alter global flags." : "Staff can view release state but cannot activate releases or alter feature flags."}</p>
      </div>
      <StatusBadge tone={profile.role === "admin" ? "green" : "slate"}>{profile.role}</StatusBadge>
    </section>

    {/* Dedicated Interactive Toggle Switches for Features */}
    <FeatureToggleBoard
      initialFlags={flags ?? []}
      releases={releases ?? []}
      isAdmin={profile.role === "admin"}
    />

    {profile.role === "admin" && (
      <section className="panel section-gap flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-navy/5 border border-line p-4 rounded-xl">
        <div>
          <span className="card-label">V0.3.0 OPERATIONS SUITE</span>
          <h3 className="text-base font-bold text-navy m-0">Maintenance · Parts Inventory · Emergency Support · Service Requests</h3>
          <p className="text-xs text-muted m-0 mt-1">
            Status: {v03Active ? <strong className="text-emerald-700 font-semibold">Active & Live</strong> : <strong className="text-amber-700 font-semibold">Paused / Inactive</strong>}. Synchronize releases and feature flags across all environments with one click.
          </p>
        </div>
        <form action={quickActivateV03Suite}>
          <button className="button button--primary whitespace-nowrap text-sm" type="submit">
            {v03Active ? "Re-sync & activate v0.3.0 suite" : "Activate v0.3.0 Operations Suite"}
          </button>
        </form>
      </section>
    )}

    {profile.role === "admin" && <section className="review-grid release-admin-grid section-gap">
      <form className="panel review-form" action={createRelease}><p className="card-label">CREATE RELEASE</p><label>Version<input name="version" required placeholder="v0.3.0" pattern="v\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?" /></label><label>Channel<select name="channel" defaultValue="stable"><option value="beta">Beta</option><option value="stable">Stable</option></select></label><label>Release notes<textarea name="releaseNotes" placeholder="What changed in this deployed release?" /></label><button className="button button--primary" type="submit">Create release</button></form>
      <form className="panel review-form" action={setFeatureFlag}><p className="card-label">FEATURE FLAG MANUAL OVERRIDE</p><label>Feature<select name="key" required>{Object.entries(FEATURE_CATALOG).map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}</select></label><label>Description<input name="description" placeholder="Optional operational context" /></label><label>State<select name="enabled" defaultValue="false"><option value="false">Disabled</option><option value="true">Enabled</option></select></label><button className="button button--primary" type="submit">Save flag</button></form>
      <form className="panel review-form" action={assignBetaTester}><p className="card-label">BETA ACCESS</p><label>Feature<select name="key" required>{Object.entries(FEATURE_CATALOG).filter(([key]) => key !== "core_platform").map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}</select></label><label>Tester email <small>Optional</small><input name="email" type="email" placeholder="tester@example.com" /></label><label>Or role<select name="role" defaultValue=""><option value="">Choose a tester email</option><option value="admin">All administrators</option><option value="staff">All staff</option><option value="driver">All drivers</option></select></label><button className="button button--primary" type="submit">Assign beta access</button></form>
    </section>}
    <section className="panel table-panel section-gap"><div className="data-table" role="table" aria-label="VMC releases"><div className="data-table__row data-table__head" role="row"><span role="columnheader">Release</span><span role="columnheader">Channel</span><span role="columnheader">Status</span><span role="columnheader">Control</span></div>{releases?.map((release) => <div className="data-table__row" role="row" key={release.id}><span role="cell"><strong>{release.version}</strong></span><span role="cell">{release.channel}</span><span role="cell"><StatusBadge tone={release.status === "active" ? "green" : release.status === "paused" || release.status === "rolled_back" ? "red" : "blue"}>{release.status.replaceAll("_", " ")}</StatusBadge></span><span role="cell">{profile.role === "admin" ? <form action={changeReleaseStatus}><input type="hidden" name="releaseId" value={release.id} /><select name="status" defaultValue={release.status} aria-label={`Status for ${release.version}`}><option value="draft">Draft</option><option value="testing">Testing</option><option value="active">Active</option><option value="paused">Paused</option><option value="rolled_back">Rolled back</option><option value="retired">Retired</option></select><button className="text-action" type="submit">Update</button></form> : "Admin only"}</span></div>)}{(!releases || releases.length === 0) && <div className="empty-state table-empty"><h2>No releases yet</h2><p>Create a release only after the code has been deployed through GitHub and Vercel.</p></div>}</div></section>
  </>;
}
