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
        <Link className="text-action" href="/login">Back to sign in</Link>
      </section>
    </main>
  );
}
