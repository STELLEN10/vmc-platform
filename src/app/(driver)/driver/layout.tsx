import type { ReactNode } from "react";

import { AppShell, type NavigationItem } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("recipient_profile_id", profile.id)
    .eq("status", "unread");

  const driverNavigation: NavigationItem[] = [
    { href: "/driver", label: "Overview" },
    { href: "/driver/bike", label: "My motorcycle" },
    { href: "/driver/payments", label: "Payments" },
    { href: "/driver/maintenance", label: "Maintenance" },
    { href: "/driver/services", label: "Service booking" },
    { href: "/driver/emergency", label: "Emergency" },
    { href: "/driver/inventory", label: "Parts catalog" },
    {
      href: "/driver/notifications",
      label: "Notifications",
      badge: unreadNotifications || null,
      badgeTone: "amber",
    },
    { href: "/driver/profile", label: "My profile" },
    { href: "/driver/onboarding", label: "My onboarding" },
    { href: "/driver/settings", label: "Settings" },
  ];

  return (
    <AppShell
      area="VMC Driver"
      navigation={driverNavigation}
      profile={profile}
      unreadNotificationsCount={unreadNotifications ?? 0}
    >
      {children}
    </AppShell>
  );
}
