import type { Metadata } from "next";
import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { InvitationAccountForm } from "@/components/invitation-account-form";

export const metadata: Metadata = {
  title: "Set Password | VMC Management",
  description: "Complete your invited Valhalla Motorcycles staff account.",
};

export default function ManagementSetPasswordPage() {
  return (
    <main className="simple-auth-page">
      <BrandMark href="/" />
      <section className="simple-auth-card panel">
        <p className="eyebrow">VMC TEAM INVITATION</p>
        <h1>Complete your staff account</h1>
        <p>
          Complete your invited VMC account by setting a secure personal password. Your operations role has been assigned by an administrator.
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
