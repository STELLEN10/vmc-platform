import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { createTeamMember } from "./actions";

export default async function TeamPage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string; email?: string }> }) {
  await requireRole(ADMIN_ROLES);
  const { created, error, email } = await searchParams;
  const { data: staff } = await (await createClient()).from("profiles").select("id, full_name, email, role, created_at").in("role", ["admin", "staff"]).order("created_at");

  return (
    <>
      <PageHeading eyebrow="VMC MANAGEMENT · ADMIN" title="Team access" description="Create management accounts with individual work emails. Staff may use the same VMC staff access password if that is your internal policy." />
      {created === "1" && <p className="form-message form-message--success">Management account created {email ? `for ${email}` : ""}. The account can sign in immediately.</p>}
      {error === "create-failed" && <p className="form-message form-message--error">The account could not be created. The email may already belong to an existing account, or the password may not meet Supabase requirements.</p>}
      {error === "invalid-account" && <p className="form-message form-message--error">Enter a valid name, email, role, and password of at least 12 characters.</p>}
      <section className="review-grid">
        <form className="panel review-form" action={createTeamMember}>
          <p className="card-label">CREATE MANAGEMENT ACCOUNT</p>
          <label>Full name<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" /></label>
          <label>Work email<input name="email" type="email" required autoComplete="email" /></label>
          <label>Access role<select name="role" defaultValue="staff"><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>
          <label>Staff access password<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
          <p className="form-note">Each person keeps their own email address. If you use one shared staff password, treat it as a staff-only credential and never reuse the administrator password.</p>
          <button className="button button--primary" type="submit">Create account</button>
        </form>
        <section className="panel">
          <p className="card-label">HOW STAFF ACCESS WORKS</p>
          <h2>Individual emails, simple staff access</h2>
          <p className="card-copy">An administrator creates the account and chooses the password. Staff then sign in directly at <strong>/management</strong> with their own work email and the staff password.</p>
          <p className="card-copy">No invitation links, setup screens, or driver portal links are shown to management users.</p>
        </section>
      </section>
      <section className="panel table-panel section-gap">
        <div className="data-table" role="table" aria-label="VMC team members">
          <div className="data-table__row data-table__head" role="row"><span role="columnheader">Member</span><span role="columnheader">Email</span><span role="columnheader">Role</span><span role="columnheader">Created</span></div>
          {staff?.map((member) => <div className="data-table__row" role="row" key={member.id}><span role="cell">{member.full_name || "VMC team member"}</span><span role="cell">{member.email ?? "Not recorded"}</span><span role="cell"><StatusBadge tone={member.role === "admin" ? "blue" : "green"}>{member.role}</StatusBadge></span><span role="cell">{new Date(member.created_at).toLocaleDateString("en-ZA")}</span></div>)}
        </div>
      </section>
    </>
  );
}
