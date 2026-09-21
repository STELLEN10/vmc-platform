"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function markDriverNotificationAsRead(id: string) {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();

  // Enforce caller ownership
  const { error } = await supabase.rpc("mark_notification_as_read", {
    p_notification_id: id,
  });

  if (error) {
    await supabase
      .from("notifications")
      .update({
        status: "read",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("recipient_profile_id", profile.id);
  }

  revalidatePath("/driver/notifications");
  revalidatePath("/driver");
}

export async function markAllDriverNotificationsAsRead() {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_all_notifications_as_read");

  if (error) {
    await supabase
      .from("notifications")
      .update({
        status: "read",
        updated_at: new Date().toISOString(),
      })
      .eq("recipient_profile_id", profile.id)
      .eq("status", "unread");
  }

  revalidatePath("/driver/notifications");
  revalidatePath("/driver");
}
