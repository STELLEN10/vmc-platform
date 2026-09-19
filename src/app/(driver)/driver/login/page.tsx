import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { DriverLoginForm } from "@/components/driver-login-form";

type DriverLoginPageProps = {
  searchParams: Promise<{ registered?: string; error?: string }>;
};

export default async function DriverLoginPage({ searchParams }: DriverLoginPageProps) {
  const { registered, error } = await searchParams;

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

          {registered === "1" && (
            <p className="form-message form-message--success">
              Your driver account was created! Sign in below to view your onboarding status and bike allocation.
            </p>
          )}

          {error === "driver_required" && (
            <p className="form-message form-message--error">
              You must sign in with a registered driver account to access the Driver Portal.
            </p>
          )}

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
