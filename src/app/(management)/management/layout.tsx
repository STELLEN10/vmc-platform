import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";

const managementNavigation = [
  { href: "/management", label: "Dashboard" },
  { href: "/management/drivers", label: "Drivers" },
  { href: "/management/bikes", label: "Bikes" },
  { href: "/management/maintenance", label: "Maintenance" },
  { href: "/management/inventory", label: "Inventory" },
  { href: "/management/emergency", label: "Emergency" },
  { href: "/management/services", label: "Services" },
  { href: "/management/payments", label: "Payments" },
  { href: "/management/releases", label: "Release control" },
  { href: "/management/team", label: "Team access" },
  { href: "/management/settings", label: "Settings" },
] as const;

export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const navigation = profile.role === "admin"
    ? managementNavigation
    : managementNavigation.filter((item) => item.href !== "/management/team");

  return (
    <AppShell area="VMC Management" navigation={navigation} profile={profile}>
      {children}
    </AppShell>
  );
}
