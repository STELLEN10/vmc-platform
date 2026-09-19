import type { ReactNode } from "react";

import { AppShell, type NavigationItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function ManagementLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  // Query live operational counters for navigation badges
  const [
    { count: unreadNotifications },
    { count: activeEmergencies },
    { count: openMaintenance },
    { count: pendingServices },
  ] = await Promise.all([
    supabase
      .from("management_notifications")
      .select("*", { count: "exact", head: true })
      .is("read_at", null),
    supabase
      .from("emergency_reports")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "responding", "acknowledged"]),
    supabase
      .from("maintenance_requests")
      .select("*", { count: "exact", head: true })
      .in("status", ["submitted", "under_review", "in_progress", "scheduled"]),
    supabase
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "requested"),
  ]);

  const managementNavigation: NavigationItem[] = [
    { href: "/management", label: "Dashboard" },
    { href: "/management/drivers", label: "Drivers" },
    { href: "/management/bikes", label: "Bikes" },
    {
      href: "/management/emergency",
      label: "Emergency",
      badge: activeEmergencies || null,
      badgeTone: "red",
    },
    {
      href: "/management/maintenance",
      label: "Maintenance",
      badge: openMaintenance || null,
      badgeTone: "amber",
    },
    {
      href: "/management/services",
      label: "Services",
      badge: pendingServices || null,
      badgeTone: "blue",
    },
    { href: "/management/inventory", label: "Inventory" },
    { href: "/management/payments", label: "Payments" },
    { href: "/management/analytics", label: "Analytics" },
    { href: "/management/documents", label: "Documents" },
    { href: "/management/activity", label: "Activity audit" },
    {
      href: "/management/notifications",
      label: "Notifications",
      badge: unreadNotifications || null,
      badgeTone: "red",
    },
    { href: "/management/releases", label: "Release control" },
    ...(profile.role === "admin"
      ? [{ href: "/management/team", label: "Team access" }]
      : []),
    { href: "/management/settings", label: "Settings" },
  ];

  return (
    <AppShell
      area="VMC Management"
      navigation={managementNavigation}
      profile={profile}
      unreadNotificationsCount={unreadNotifications ?? 0}
    >
      {children}
    </AppShell>
  );
}

