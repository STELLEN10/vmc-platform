import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";

type AccessDeniedPageProps = {
  searchParams: Promise<{ current?: string; expected?: string; reason?: string }>;
};

export default async function AccessDeniedPage({ searchParams }: AccessDeniedPageProps) {
  const { current, expected } = await searchParams;

  const isDriverTryingManagement = current === "driver";
  const isStaffTryingDriver = (current === "staff" || current === "admin") && expected === "driver";

  return (
    <main className="access-page">
      <BrandMark />
      <section className="access-card panel">
        <p className="eyebrow">
          {isDriverTryingManagement ? "MANAGEMENT ACCESS RESTRICTED" : isStaffTryingDriver ? "DRIVER PORTAL RESTRICTED" : "ACCESS RESTRICTED"}
        </p>
        <h1>
          {isDriverTryingManagement
            ? "Driver accounts cannot access VMC Management."
            : isStaffTryingDriver
            ? "Management accounts cannot access the Driver Portal."
            : "This account is not authorized for that area."}
        </h1>
        <p>
          {isDriverTryingManagement
            ? "You are currently signed in with a VMC Driver account. Operations, fleet management, and administrative tools are restricted to authorized VMC operations staff."
            : isStaffTryingDriver
            ? "You are currently signed in with a VMC Staff or Administrator account. The Driver Portal is reserved for registered delivery riders."
            : "Your VMC account needs a valid role and the appropriate authorization before access can be granted. Contact an authorized VMC administrator if you believe this is incorrect."}
        </p>
        <div className="access-card__actions">
          {isDriverTryingManagement && (
            <Link className="button button--primary" href="/driver">
              Return to Driver Dashboard
            </Link>
          )}
          {isStaffTryingDriver && (
            <Link className="button button--primary" href="/management">
              Return to Management Dashboard
            </Link>
          )}
          {!isDriverTryingManagement && !isStaffTryingDriver && (
            <Link className="button button--primary" href="/auth/complete">
              Check my access
            </Link>
          )}
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
