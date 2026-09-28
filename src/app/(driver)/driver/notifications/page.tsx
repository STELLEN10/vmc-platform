import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import {
  DriverNotificationsView,
  type DriverNotificationItem,
} from "./driver-notifications-view";

export default async function DriverNotificationsPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const enabled = await hasFeatureAccess("notification_system");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC DRIVER · NOTIFICATIONS"
          title="Notifications & alerts"
          description="Operational notices, reminders, and alerts from Valhalla Motorcycles."
        />
        <LockedFeature feature="notification_system" />
      </>
    );
  }

  const supabase = await createClient();

  const { data: rawNotifs } = await supabase
    .from("notifications")
    .select("id, type, title, body, status, related_entity_type, related_entity_id, created_at")
    .eq("recipient_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const notifications: DriverNotificationItem[] = (rawNotifs ?? []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    status: n.status,
    related_entity_type: n.related_entity_type,
    related_entity_id: n.related_entity_id,
    created_at: n.created_at,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Notifications & Reminders
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Stay informed about your weekly payment status, motorcycle maintenance, and fleet notices.
        </p>
      </div>

      <DriverNotificationsView notifications={notifications} />
    </div>
  );
}
