import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(DRIVER_ROLES);
  const referralsEnabled = await hasFeatureAccess("driver_referrals");

  const driverNavigation = [
    { href: "/driver", label: "Overview" },
    { href: "/driver/notifications", label: "Notifications" },
    { href: "/driver/payments", label: "Payments" },
    { href: "/driver/maintenance", label: "Maintenance" },
    { href: "/driver/inventory", label: "Parts" },
    { href: "/driver/emergency", label: "Emergency" },
    { href: "/driver/services", label: "Service booking" },
    ...(referralsEnabled ? [{ href: "/driver/referrals", label: "Referrals" }] : []),
    { href: "/driver/bike", label: "My motorcycle" },
    { href: "/driver/profile", label: "My profile" },
    { href: "/driver/onboarding", label: "My onboarding" },
    { href: "/driver/settings", label: "Settings" },
  ] as const;

  return (
    <AppShell area="VMC Driver" navigation={driverNavigation} profile={profile}>
      {children}
    </AppShell>
  );
}
