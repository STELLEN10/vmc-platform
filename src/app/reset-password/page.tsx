import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="simple-auth-page">
      <BrandMark href="/" />
      <section className="simple-auth-card panel">
        <p className="eyebrow">VMC ACCOUNT RECOVERY</p>
        <h1>Choose a new password</h1>
        <p>Use a new password of at least 12 characters. VMC staff cannot see your password.</p>
        <ResetPasswordForm />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.85rem" }}>
          <Link className="text-action" href="/driver/login">
            Driver Sign In
          </Link>
          <Link className="text-action" href="/management/login">
            Management Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
