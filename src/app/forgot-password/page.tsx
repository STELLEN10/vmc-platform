import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="simple-auth-page">
      <BrandMark href="/" />
      <section className="simple-auth-card panel">
        <p className="eyebrow">VMC ACCOUNT RECOVERY</p>
        <h1>Reset your password</h1>
        <p>Enter the email linked to your VMC account. If it exists, we’ll send secure reset instructions.</p>
        <ForgotPasswordForm />
        <Link className="text-action" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
