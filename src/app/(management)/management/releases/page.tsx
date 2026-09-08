import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { FEATURE_CATALOG } from "@/lib/features/catalog";
import { createClient } from "@/lib/supabase/server";
import { assignBetaTester, changeReleaseStatus, createRelease, setFeatureFlag } from "./actions";

export default async function ReleaseControlPage() {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();
  const { data: releases } = await supabase.from("releases").select("*").order("created_at", { ascending: false });
  const { data: flags } = profile.role === "admin"
    ? await supabase.from("feature_flags").select("*").order("key")
    : { data: null };
  const flagsByKey = new Map((flags ?? []).map((flag) => [flag.key, flag]));

  return <>
    <PageHeading eyebrow="VMC MANAGEMENT · CONTROL PLANE" title="Release control" description="Releases and feature flags control already-deployed behaviour. This screen never deploys source code." />
    <section className="panel foundation-callout"><div><p className="eyebrow">CURRENT ACCESS</p><h2>{profile.role === "admin" ? "Administrator controls enabled" : "Release visibility only"}</h2><p>{profile.role === "admin" ? "Only administrators can create releases, change release state or alter global flags." : "Staff can view release state but cannot activate releases or alter feature flags."}</p></div><StatusBadge tone={profile.role === "admin" ? "green" : "slate"}>{profile.role}</StatusBadge></section>
    {profile.role === "admin" && <section className="review-grid release-admin-grid section-gap">
      <form className="panel review-form" action={createRelease}><p className="card-label">CREATE RELEASE</p><label>Version<input name="version" required placeholder="v0.2.0-beta.1" pattern="v\d+\.\d+\.\d+(-[A-Za-z0-9.]+)?" /></label><label>Channel<select name="channel" defaultValue="beta"><option value="beta">Beta</option><option value="stable">Stable</option></select></label><label>Release notes<textarea name="releaseNotes" placeholder="What changed in this deployed release?" /></label><button className="button button--primary" type="submit">Create release</button></form>
      <form className="panel review-form" action={setFeatureFlag}><p className="card-label">FEATURE FLAG</p><label>Feature<select name="key" required>{Object.entries(FEATURE_CATALOG).map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}</select></label><label>Description<input name="description" placeholder="Optional operational context" /></label><label>State<select name="enabled" defaultValue="false"><option value="false">Disabled</option><option value="true">Enabled</option></select></label><button className="button button--primary" type="submit">Save flag</button></form>
      <form className="panel review-form" action={assignBetaTester}><p className="card-label">BETA ACCESS</p><label>Feature<select name="key" required>{Object.entries(FEATURE_CATALOG).filter(([key]) => key !== "core_platform").map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}</select></label><label>Tester email <small>Optional</small><input name="email" type="email" placeholder="tester@example.com" /></label><label>Or role<select name="role" defaultValue=""><option value="">Choose a tester email</option><option value="admin">All administrators</option><option value="staff">All staff</option><option value="driver">All drivers</option></select></label><button className="button button--primary" type="submit">Assign beta access</button></form>
    </section>}
    <section className="panel table-panel section-gap"><div className="data-table" role="table" aria-label="VMC releases"><div className="data-table__row data-table__head" role="row"><span role="columnheader">Release</span><span role="columnheader">Channel</span><span role="columnheader">Status</span><span role="columnheader">Control</span></div>{releases?.map((release) => <div className="data-table__row" role="row" key={release.id}><span role="cell"><strong>{release.version}</strong></span><span role="cell">{release.channel}</span><span role="cell"><StatusBadge tone={release.status === "active" ? "green" : release.status === "paused" || release.status === "rolled_back" ? "red" : "blue"}>{release.status.replaceAll("_", " ")}</StatusBadge></span><span role="cell">{profile.role === "admin" ? <form action={changeReleaseStatus}><input type="hidden" name="releaseId" value={release.id} /><select name="status" defaultValue={release.status} aria-label={`Status for ${release.version}`}><option value="draft">Draft</option><option value="testing">Testing</option><option value="active">Active</option><option value="paused">Paused</option><option value="rolled_back">Rolled back</option><option value="retired">Retired</option></select><button className="text-action" type="submit">Update</button></form> : "Admin only"}</span></div>)}{(!releases || releases.length === 0) && <div className="empty-state table-empty"><h2>No releases yet</h2><p>Create a release only after the code has been deployed through GitHub and Vercel.</p></div>}</div></section>
    {profile.role === "admin" && <section className="panel section-gap"><p className="card-label">FEATURE CATALOGUE</p><div className="detail-list">{Object.entries(FEATURE_CATALOG).map(([key, item]) => { const flag = flagsByKey.get(key); return <span key={key}><strong>{item.name} · {flag?.enabled ? "enabled" : "locked"}</strong><small>{item.release} · {item.description}</small></span>; })}</div></section>}
  </>;
}
