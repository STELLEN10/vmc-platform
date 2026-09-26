import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ManagementLoginForm } from "@/components/management-login-form";

export const metadata: Metadata = {
  title: "Management Sign In | Valhalla Motorcycles",
  description: "Sign into the Valhalla Motorcycles Management Console.",
};

export default function ManagementLoginPage() {
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
          <ManagementLoginForm />
          <p className="form-note" style={{ marginTop: "1rem" }}>
            Need team access? Ask a VMC administrator to send an invitation to your work email.
          </p>
          <p className="form-note" style={{ marginTop: "0.5rem" }}>
            Have an invitation token?{" "}
            <Link href="/management/set-password" className="text-action">
              Set up invited account →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
