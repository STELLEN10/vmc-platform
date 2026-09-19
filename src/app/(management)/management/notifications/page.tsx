import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ManagementNotificationsView } from "./notifications-view";

export default async function ManagementNotificationsPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  const { data: notifications } = await supabase
    .from("management_notifications")
    .select("id, type, driver_profile_id, title, body, created_at, read_at, read_by, action_url, severity")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="OPERATIONS INTELLIGENCE"
        title="Operations Notification Hub"
        description="Real-time alerts for driver registrations, payment arrivals, critical emergencies, and fleet workshop updates."
      />
      <ManagementNotificationsView initialNotifications={notifications ?? []} />
    </div>
  );
}
