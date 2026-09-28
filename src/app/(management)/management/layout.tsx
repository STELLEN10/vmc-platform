import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { getManagementBadgeCounts } from "@/lib/notifications/server";
import { hasFeatureAccess } from "@/lib/features/server";

export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const [
    badges,
    notificationsEnabled,
    maintenanceEnabled,
    inventoryEnabled,
    emergencyEnabled,
    servicesEnabled,
    referralsEnabled,
    aiEnabled,
    documentsEnabled,
    analyticsEnabled,
    activityEnabled,
  ] = await Promise.all([
    getManagementBadgeCounts(),
    hasFeatureAccess("notification_system"),
    hasFeatureAccess("new_maintenance"),
    hasFeatureAccess("parts_inventory"),
    hasFeatureAccess("emergency_bike_support"),
    hasFeatureAccess("service_requests"),
    hasFeatureAccess("driver_referrals"),
    hasFeatureAccess("ai_assistant"),
    hasFeatureAccess("management_documents"),
    hasFeatureAccess("operations_analytics"),
    hasFeatureAccess("global_activity_audit"),
  ]);

  const baseNavigation = [
    { href: "/management", label: "Dashboard" },
    ...(notificationsEnabled
      ? [
          {
            href: "/management/notifications",
            label: "Alerts",
            badge: badges.unreadNotifications,
          },
        ]
      : []),
    { href: "/management/drivers", label: "Drivers" },
    { href: "/management/bikes", label: "Bikes" },
    {
      href: "/management/finance",
      label: "Finance",
      badge: badges.pendingPayments,
    },
    {
      href: "/management/quotations",
      label: "Quotations",
    },
    ...(maintenanceEnabled
      ? [
          {
            href: "/management/maintenance",
            label: "Maintenance",
            badge: badges.openMaintenance,
          },
        ]
      : []),
    ...(inventoryEnabled
      ? [
          {
            href: "/management/inventory",
            label: "Inventory",
            badge: badges.lowStockParts,
          },
        ]
      : []),
    ...(emergencyEnabled
      ? [
          {
            href: "/management/emergency",
            label: "Emergency",
            badge: badges.unresolvedEmergencies,
          },
        ]
      : []),
    ...(servicesEnabled ? [{ href: "/management/services", label: "Services" }] : []),
    ...(referralsEnabled ? [{ href: "/management/referrals", label: "Referrals" }] : []),
    ...(aiEnabled ? [{ href: "/management/ai", label: "VMC AI" }] : []),
    ...(documentsEnabled ? [{ href: "/management/documents", label: "Documents" }] : []),
    ...(analyticsEnabled ? [{ href: "/management/analytics", label: "Analytics" }] : []),
    ...(activityEnabled ? [{ href: "/management/activity", label: "Activity" }] : []),
    { href: "/management/releases", label: "Release control" },
    { href: "/management/team", label: "Team access" },
    { href: "/management/settings", label: "Settings" },
  ];

  const navigation = profile.role === "admin"
    ? baseNavigation
    : baseNavigation.filter((item) => item.href !== "/management/team");

  return (
    <AppShell area="VMC Management" navigation={navigation} profile={profile}>
      {children}
    </AppShell>
  );
}
