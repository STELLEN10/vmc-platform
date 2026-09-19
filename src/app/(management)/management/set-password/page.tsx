import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { InvitationAccountForm } from "@/components/invitation-account-form";

export default function ManagementSetPasswordPage() {
  return (
    <main className="simple-auth-page">
      <BrandMark href="/" />
      <section className="simple-auth-card panel">
        <p className="eyebrow">VMC MANAGEMENT INVITATION</p>
        <h1>Set your password</h1>
        <p>
          Welcome to the Valhalla Motorcycles operations team. Complete your credentials to enter the Management Portal.
        </p>
        <InvitationAccountForm />
        <div style={{ marginTop: "1rem", textAlign: "center" }}>
          <Link className="text-action" href="/management/login">
            Already have your password? Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
