import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { LoginForm } from "@/components/login-form";

type LoginPageProps = { searchParams: Promise<{ error?: string; invited?: string; portal?: string }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, invited } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow eyebrow--light">VALHALLA MOTORCYCLES</p>
          <h1>Secure Platform Access</h1>
          <p>
            Choose your dedicated portal below. Drivers and management staff operate in distinct secure environments.
          </p>
        </div>
        <p className="auth-brand-panel__note">VMC · Pretoria–Midrand Hub</p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap" style={{ maxWidth: "32rem" }}>
          <p className="eyebrow">PORTAL SELECTION</p>
          <h2>Choose your portal</h2>
          <p className="page-description">
            Sign in or create an account for your designated role.
          </p>

          {error === "auth_callback" && (
            <p className="form-message form-message--error" style={{ margin: "1rem 0" }}>
              We could not complete that sign-in. Please select your portal to continue.
            </p>
          )}

          {invited === "1" && (
            <p className="form-message form-message--success" style={{ margin: "1rem 0" }}>
              Your account password has been created! Please sign in using your portal below.
            </p>
          )}

          <div style={{ display: "grid", gap: "1rem", marginTop: "1.5rem" }}>
            {/* Driver Portal Option */}
            <div
              style={{
                border: "2px solid #e2e8f0",
                borderRadius: "0.6rem",
                padding: "1.25rem",
                background: "#ffffff",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#fee2e2",
                      color: "#991b1b",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "0.25rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    HERO Delivery Rider
                  </span>
                  <h3 style={{ margin: "0.4rem 0 0.25rem", fontSize: "1.2rem", color: "#111827" }}>
                    Driver Portal
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                    Access your bike details, track weekly payments, request servicing, and log emergencies.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
                <Link
                  href="/driver/login"
                  className="button driver-button"
                  style={{ padding: "0.55rem 1.1rem", fontSize: "0.88rem" }}
                >
                  Driver Sign In →
                </Link>
                <Link
                  href="/driver/register"
                  className="text-action"
                  style={{ fontSize: "0.85rem" }}
                >
                  Apply to become a driver
                </Link>
              </div>
            </div>

            {/* Management Portal Option */}
            <div
              style={{
                border: "2px solid #e2e8f0",
                borderRadius: "0.6rem",
                padding: "1.25rem",
                background: "#ffffff",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span
                    style={{
                      display: "inline-block",
                      background: "#e0f2fe",
                      color: "#0369a1",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.55rem",
                      borderRadius: "0.25rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Operations & Staff
                  </span>
                  <h3 style={{ margin: "0.4rem 0 0.25rem", fontSize: "1.2rem", color: "#111827" }}>
                    Management Console
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b", lineHeight: 1.5 }}>
                    Operations dispatch, fleet telemetry, maintenance scheduling, and team administration.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", alignItems: "center" }}>
                <Link
                  href="/management/login"
                  className="button button--primary"
                  style={{ padding: "0.55rem 1.1rem", fontSize: "0.88rem" }}
                >
                  Management Sign In →
                </Link>
                <Link
                  href="/management/set-password"
                  className="text-action"
                  style={{ fontSize: "0.85rem" }}
                >
                  Have an invitation?
                </Link>
              </div>
            </div>
          </div>

          <details style={{ marginTop: "1.75rem", borderTop: "1px solid #e2e8f0", paddingTop: "1rem" }}>
            <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "#475569", fontWeight: 600 }}>
              Or sign in with universal credentials
            </summary>
            <div style={{ marginTop: "0.75rem" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "#64748b" }}>
                The system will automatically direct you to your authorized area based on your assigned account role.
              </p>
              <LoginForm />
            </div>
          </details>
        </div>
      </section>
    </main>
  );
}
