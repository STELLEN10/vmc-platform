import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { DriverRegistrationForm } from "@/components/driver-registration-form";

export default function DriverRegistrationPage() {
  return (
    <main className="driver-auth-page">
      <section className="driver-auth-page__hero">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow eyebrow--light">VMC DRIVER · HERO RIDER NETWORK</p>
          <h1>Start your VMC journey.</h1>
          <p>Create your VMC Driver account, complete your profile and submit it for team review.</p>
        </div>
        <p className="driver-auth-page__footer">Valhalla Motorcycles · Pretoria–Midrand</p>
      </section>
      <section className="driver-auth-page__form">
        <div className="auth-form-wrap">
          <p className="eyebrow driver-eyebrow">VMC DRIVER</p>
          <h2>Create your account</h2>
          <p className="page-description">Your account is for driver access only. VMC verifies every onboarding submission.</p>
          <DriverRegistrationForm />
          <p className="form-note">Already have an account? <Link href="/login">Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}
