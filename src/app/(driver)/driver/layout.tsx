import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";

const driverNavigation = [
  { href: "/driver", label: "Overview" },
  { href: "/driver/notifications", label: "Notifications" },
  { href: "/driver/payments", label: "Payments" },
  { href: "/driver/maintenance", label: "Maintenance" },
  { href: "/driver/inventory", label: "Parts" },
  { href: "/driver/emergency", label: "Emergency" },
  { href: "/driver/services", label: "Service booking" },
  { href: "/driver/bike", label: "My motorcycle" },
  { href: "/driver/profile", label: "My profile" },
  { href: "/driver/onboarding", label: "My onboarding" },
  { href: "/driver/settings", label: "Settings" },
] as const;

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(DRIVER_ROLES);

  return (
    <AppShell area="VMC Driver" navigation={driverNavigation} profile={profile}>
      {children}
    </AppShell>
  );
}
