import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { NotificationsView, type ManagementNotificationItem, type DriverOption } from "./notifications-view";

export default async function ManagementNotificationsPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  // 1. Fetch management notifications
  const { data: rawNotifs } = await supabase
    .from("management_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // 2. Fetch driver profiles for enrichment
  const driverProfileIds = (rawNotifs ?? [])
    .map((n) => n.driver_profile_id)
    .filter((id): id is string => Boolean(id));

  const { data: profiles } = driverProfileIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", driverProfileIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const notifications: ManagementNotificationItem[] = (rawNotifs ?? []).map((n) => {
    const prof = n.driver_profile_id ? profileMap.get(n.driver_profile_id) : undefined;
    return {
      id: n.id,
      type: n.type,
      driver_profile_id: n.driver_profile_id,
      title: n.title,
      body: n.body,
      is_read: n.is_read ?? false,
      created_at: n.created_at,
      read_at: n.read_at,
      driver_name: prof?.full_name ?? null,
      driver_phone: prof?.phone ?? null,
    };
  });

  // 3. Fetch all active drivers for direct message dialog
  const { data: allDrivers } = await supabase
    .from("drivers")
    .select("profile_id, profiles(full_name, phone)");

type RawDriverOption = {
  profile_id: string;
  profiles: {
    full_name: string | null;
    phone: string | null;
  } | null;
};

  const driverOptions: DriverOption[] = ((allDrivers ?? []) as unknown as RawDriverOption[]).map((d) => ({
    profile_id: d.profile_id,
    full_name: d.profiles?.full_name ?? null,
    phone: d.profiles?.phone ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Notifications & Alerts Center
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Central operational hub for fleet events, driver notifications, and automated payment reminder dispatching.
        </p>
      </div>

      <NotificationsView
        notifications={notifications}
        driverOptions={driverOptions}
      />
    </div>
  );
}
