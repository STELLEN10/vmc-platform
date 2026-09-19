import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { DriverNotificationsView } from "./driver-notifications-view";

export default async function DriverNotificationsPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, status, created_at, read_at, action_url")
    .eq("recipient_profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="HERO RIDER APP"
        title="My Notifications"
        description="Important alerts regarding your weekly motorcycle payments, scheduled maintenance bookings, and Valhalla fleet announcements."
      />
      <DriverNotificationsView initialNotifications={notifications ?? []} />
    </div>
  );
}
