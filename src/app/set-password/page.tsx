import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { InvitationAccountForm } from "@/components/invitation-account-form";

export default function SetPasswordPage() {
  return (
    <main className="simple-auth-page">
      <BrandMark href="/" />
      <section className="simple-auth-card panel">
        <p className="eyebrow">VMC TEAM INVITATION</p>
        <h1>Complete your account</h1>
        <p>
          Complete your invited VMC account by setting a secure personal password. Your access role has been securely assigned by VMC.
        </p>
        <InvitationAccountForm />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "0.85rem" }}>
          <Link className="text-action" href="/management/login">
            Management Sign In
          </Link>
          <Link className="text-action" href="/driver/login">
            Driver Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}
