import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { DriverRegistrationForm } from "@/components/driver-registration-form";

export default function DriverRegistrationPage() {
  return (
    <main className="driver-auth-page">
      <section className="driver-auth-page__hero">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow eyebrow--light">ROAD TO OWNERSHIP · VMC DRIVER</p>
          <h1>Create your driver account.</h1>
          <p>Create your VMC Driver account and continue with your rider onboarding.</p>
        </div>
        <p className="driver-auth-page__footer">VMC · Pretoria–Midrand · <a href="tel:+27766681879">+27 76 668 1879</a></p>
      </section>
      <section className="driver-auth-page__form">
        <div className="auth-form-wrap">
          <p className="eyebrow driver-eyebrow">VMC DRIVER</p>
          <h2>Create your account</h2>
          <p className="page-description">Driver access only. VMC reviews every onboarding submission.</p>
          <DriverRegistrationForm />
          <p className="form-note">Already registered as a driver? <Link href="/driver/login">Sign in to Driver Portal</Link></p>
        </div>
      </section>
    </main>
  );
}
