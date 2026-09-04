import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";

export default function AccessDeniedPage() {
  return (
    <main className="access-page">
      <BrandMark />
      <section className="access-card panel">
        <p className="eyebrow">ACCESS RESTRICTED</p>
        <h1>This account is not authorized for that area.</h1>
        <p>Your VMC account needs a valid role and the appropriate authorization before access can be granted. Contact an authorized VMC administrator if you believe this is incorrect.</p>
        <div className="access-card__actions">
          <Link className="button button--primary" href="/auth/complete">Check my access</Link>
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
