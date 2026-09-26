import type { Metadata } from "next";
import Link from "next/link";

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
          <p className="eyebrow eyebrow--light">VMC DRIVER · HERO RIDER NETWORK</p>
          <h1>Driver Portal Sign In</h1>
          <p>
            Access your assigned HERO Eco 150 motorcycle, view contract balance, request service bookings, and record weekly payments.
          </p>
        </div>
        <p className="driver-auth-page__footer">Valhalla Motorcycles · Pretoria–Midrand</p>
      </section>

      <section className="driver-auth-page__form">
        <div className="auth-form-wrap">
          <p className="eyebrow driver-eyebrow">DELIVERY RIDER ACCESS</p>
          <h2>Sign into your bike</h2>
          <p className="page-description">
            Sign in with your registered driver email and password. This portal is strictly for active delivery riders.
          </p>
          <DriverLoginForm />
          <p className="form-note" style={{ marginTop: "1rem" }}>
            New to Valhalla Motorcycles?{" "}
            <Link href="/driver/register" className="text-action">
              Apply to become a driver
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
