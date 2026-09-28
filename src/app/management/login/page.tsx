import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { ManagementLoginForm } from "@/components/management-login-form";

export const metadata: Metadata = {
  title: "Management Sign In | Valhalla Motorcycles",
  description: "Sign into the Valhalla Motorcycles Management Portal.",
};

export default function ManagementLoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow eyebrow--light">ROAD TO OWNERSHIP · VMC OPERATIONS</p>
          <h1>Road to Ownership</h1>
          <p>
            Dedicated operations access for authorized Valhalla Motorcycles management staff.
          </p>
        </div>
        <p className="auth-brand-panel__note">VMC · Pretoria–Midrand · <a href="tel:+27766681879">+27 76 668 1879</a> · <a href="mailto:info@vsprocurement.co.za">info@vsprocurement.co.za</a></p>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <p className="eyebrow">VMC MANAGEMENT</p>
          <h2>Staff Sign In</h2>
          <p className="page-description">
            Use your VMC work email and management password.
          </p>
          <ManagementLoginForm />
        </div>
      </section>
    </main>
  );
}
