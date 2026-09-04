import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";

const driverNavigation = [
  { href: "/driver", label: "Overview" },
  { href: "/driver/profile", label: "My profile" },
  { href: "/driver/bike", label: "My motorcycle" },
  { href: "/driver/onboarding", label: "My onboarding" },
] as const;

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(DRIVER_ROLES);

  return (
    <AppShell area="VMC Driver" navigation={driverNavigation} profile={profile}>
      {children}
    </AppShell>
  );
}
