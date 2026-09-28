import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const profile = await requireRole(DRIVER_ROLES);
  const [
    notificationsEnabled,
    paymentsEnabled,
    maintenanceEnabled,
    inventoryEnabled,
    emergencyEnabled,
    servicesEnabled,
    referralsEnabled,
    aiEnabled,
    onboardingEnabled,
  ] = await Promise.all([
    hasFeatureAccess("notification_system"),
    hasFeatureAccess("new_payment_engine"),
    hasFeatureAccess("new_maintenance"),
    hasFeatureAccess("parts_inventory"),
    hasFeatureAccess("emergency_bike_support"),
    hasFeatureAccess("service_requests"),
    hasFeatureAccess("driver_referrals"),
    hasFeatureAccess("ai_assistant"),
    hasFeatureAccess("new_onboarding"),
  ]);

  const driverNavigation = [
    { href: "/driver", label: "Overview" },
    ...(notificationsEnabled ? [{ href: "/driver/notifications", label: "Notifications" }] : []),
    ...(paymentsEnabled ? [{ href: "/driver/payments", label: "Payments" }] : []),
    ...(maintenanceEnabled ? [{ href: "/driver/maintenance", label: "Maintenance" }] : []),
    ...(inventoryEnabled ? [{ href: "/driver/inventory", label: "Parts" }] : []),
    ...(emergencyEnabled ? [{ href: "/driver/emergency", label: "Emergency" }] : []),
    ...(servicesEnabled ? [{ href: "/driver/services", label: "Service booking" }] : []),
    ...(referralsEnabled ? [{ href: "/driver/referrals", label: "Referrals" }] : []),
    ...(aiEnabled ? [{ href: "/driver/ai", label: "VMC AI" }] : []),
    { href: "/driver/bike", label: "My motorcycle" },
    { href: "/driver/profile", label: "My profile" },
    ...(onboardingEnabled ? [{ href: "/driver/onboarding", label: "My onboarding" }] : []),
    { href: "/driver/settings", label: "Settings" },
  ];

  const [hasEmergency, hasMaintenance, hasInventory, hasServices, hasPayments] = await Promise.all([
    hasFeatureAccess("emergency_bike_support"),
    hasFeatureAccess("new_maintenance"),
    hasFeatureAccess("parts_inventory"),
    hasFeatureAccess("service_requests"),
    hasFeatureAccess("new_payment_engine"),
  ]);

  const driverNavigation = [
    { href: "/driver", label: "Overview" },
    ...(hasEmergency ? [{ href: "/driver/emergency", label: "Emergency" }] : []),
    ...(hasMaintenance ? [{ href: "/driver/maintenance", label: "Maintenance" }] : []),
    ...(hasInventory ? [{ href: "/driver/inventory", label: "Parts" }] : []),
    ...(hasServices ? [{ href: "/driver/services", label: "Service booking" }] : []),
    ...(hasPayments ? [{ href: "/driver/payments", label: "Payments" }] : []),
    { href: "/driver/profile", label: "My profile" },
    { href: "/driver/bike", label: "My motorcycle" },
    { href: "/driver/onboarding", label: "My onboarding" },
    { href: "/driver/settings", label: "Settings" },
  ];

  return (
    <AppShell area="VMC Driver" navigation={driverNavigation} profile={profile}>
      {children}
    </AppShell>
  );
}
