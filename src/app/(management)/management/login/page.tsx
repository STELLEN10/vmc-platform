import { BrandMark } from "@/components/brand-mark";
import { ManagementLoginForm } from "@/components/management-login-form";

type ManagementLoginPageProps = {
  searchParams: Promise<{ invited?: string; error?: string }>;
};

export default async function ManagementLoginPage({ searchParams }: ManagementLoginPageProps) {
  const { invited, error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow eyebrow--light">VMC FLEET & OPERATIONS MANAGEMENT</p>
          <h1>Operations Control</h1>
          <p>
            Secure terminal for fleet supervisors, dispatch coordinators, mechanics, and system administrators.
          </p>
        </div>
        <p className="auth-brand-panel__note">VMC · Pretoria–Midrand Hub</p>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">MANAGEMENT CONSOLE</p>
          <h2>Staff Sign In</h2>
          <p className="page-description">
            Access is restricted to authorized VMC personnel. Staff accounts are created by administrator invitation only.
          </p>

          {invited === "1" && (
            <p className="form-message form-message--success">
              Your password has been successfully established! Please sign in with your email and new password.
            </p>
          )}

          {error === "management_required" && (
            <p className="form-message form-message--error">
              You must sign in with a verified VMC Staff or Admin account to access Management.
            </p>
          )}

          <ManagementLoginForm />

          <p className="form-note" style={{ marginTop: "1rem" }}>
            Need team access? Ask a VMC administrator to send an invitation to your work email.
          </p>
        </div>
      </section>
    </main>
  );
}
