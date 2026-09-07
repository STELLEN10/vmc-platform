import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";

const managementNavigation = [
  { href: "/management", label: "Dashboard" },
  { href: "/management/drivers", label: "Drivers" },
  { href: "/management/bikes", label: "Bikes" },
  { href: "/management/releases", label: "Release control" },
] as const;

export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(MANAGEMENT_ROLES);

  return (
    <AppShell area="VMC Management" navigation={managementNavigation} profile={profile}>
      {children}
    </AppShell>
  );
}
