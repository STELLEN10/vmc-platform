import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ portal?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const { portal } = await searchParams;

  return (
    <main className="simple-auth-page">
      <BrandMark href="/" />
      <section className="simple-auth-card panel">
        <p className="eyebrow">VMC ACCOUNT RECOVERY</p>
        <h1>Reset your password</h1>
        <p>
          Enter the email linked to your VMC account. If it exists in our system, we’ll send secure reset instructions.
        </p>
        <ForgotPasswordForm />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.85rem" }}>
          {portal === "driver" ? (
            <Link className="text-action" href="/driver/login">
              ← Back to Driver Sign In
            </Link>
          ) : portal === "management" ? (
            <Link className="text-action" href="/management/login">
              ← Back to Management Sign In
            </Link>
          ) : (
            <>
              <Link className="text-action" href="/driver/login">
                Driver Sign In
              </Link>
              <Link className="text-action" href="/management/login">
                Management Sign In
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
