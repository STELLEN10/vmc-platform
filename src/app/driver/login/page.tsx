import type { Metadata } from "next";

import { BrandMark } from "@/components/brand-mark";
import { DriverLoginForm } from "@/components/driver-login-form";

export const metadata: Metadata = {
  title: "Driver Sign In | Valhalla Motorcycles",
  description: "Sign into the Valhalla Motorcycles Driver Portal.",
};

export default function DriverLoginPage() {
  return (
    <main className="driver-auth-page">
      <section className="driver-auth-page__hero">
        <BrandMark href="/" />
        <div>
          <p className="eyebrow eyebrow--light">ROAD TO OWNERSHIP · VMC DRIVER</p>
          <h1>Driver Sign In</h1>
          <p>
            Sign in to view your motorcycle, payments, service requests, and VMC notices.
          </p>
        </div>
        <p className="driver-auth-page__footer">VMC · Pretoria–Midrand · <a href="tel:+27766681879">+27 76 668 1879</a></p>
      </section>

      <section className="driver-auth-page__form">
        <div className="auth-form-wrap">
          <p className="eyebrow driver-eyebrow">DELIVERY RIDER ACCESS</p>
          <h2>Sign into your bike</h2>
          <p className="page-description">Use the email and password registered for your VMC Driver account.</p>
          <DriverLoginForm />
        </div>
      </section>
    </main>
  );
}
