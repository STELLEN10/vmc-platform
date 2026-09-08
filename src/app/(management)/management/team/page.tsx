import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { inviteStaffMember } from "./actions";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ invited?: string; error?: string }> }) {
  await requireRole(ADMIN_ROLES);
  const { invited, error } = await searchParams;
  const { data: staff } = await (await createClient())
    .from("profiles")
    .select("id, full_name, email, role, created_at")
    .in("role", ["admin", "staff"])
    .order("created_at");

  return <>
    <PageHeading eyebrow="VMC MANAGEMENT · ADMIN" title="Team access" description="Invite VMC staff securely. The email link opens a password-setup page; VMC never sees or stores their password." />
    {invited === "1" && <p className="form-message form-message--success">Invitation sent. The staff member must use the emailed link to set a password.</p>}
    {error && <p className="form-message form-message--error">The invitation could not be sent. Check the details and server invitation configuration.</p>}
    <section className="review-grid">
      <form className="panel review-form" action={inviteStaffMember}>
        <p className="card-label">INVITE STAFF MEMBER</p>
        <label>Full name<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" /></label>
        <label>Email address<input name="email" type="email" required autoComplete="email" /></label>
        <button className="button button--primary" type="submit">Send staff invitation</button>
      </form>
      <section className="panel"><p className="card-label">WHAT THE STAFF MEMBER DOES</p><h2>Set a personal password</h2><p className="card-copy">They open the VMC invitation email, select the secure link, create a password of at least 12 characters, then sign in at the VMC login page.</p></section>
    </section>
    <section className="panel table-panel"><div className="data-table" role="table" aria-label="VMC team members"><div className="data-table__row data-table__head" role="row"><span role="columnheader">Member</span><span role="columnheader">Email</span><span role="columnheader">Role</span><span role="columnheader">Created</span></div>{staff?.map((member) => <div className="data-table__row" role="row" key={member.id}><span role="cell">{member.full_name || "VMC team member"}</span><span role="cell">{member.email ?? "Not recorded"}</span><span role="cell"><StatusBadge tone={member.role === "admin" ? "blue" : "green"}>{member.role}</StatusBadge></span><span role="cell">{new Date(member.created_at).toLocaleDateString("en-ZA")}</span></div>)}</div></section>
  </>;
}
