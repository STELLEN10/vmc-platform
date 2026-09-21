import "server-only";

import { createClient } from "@/lib/supabase/server";

export type InAppNotificationInput = {
  recipientProfileId: string;
  type: string;
  title: string;
  body: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
};

/**
 * Creates an in-app notification for a driver or user profile.
 */
export async function sendInAppNotification(
  input: InAppNotificationInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        recipient_profile_id: input.recipientProfileId,
        channel: "in_app",
        type: input.type,
        title: input.title,
        body: input.body,
        status: "unread",
        related_entity_type: input.relatedEntityType || null,
        related_entity_id: input.relatedEntityId || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("Unexpected error creating notification:", err);
    return { success: false, error: "Failed to dispatch notification" };
  }
}

/**
 * Returns unread counts for management operational navigation badges.
 */
export async function getManagementBadgeCounts(): Promise<{
  unresolvedEmergencies: number;
  pendingPayments: number;
  openMaintenance: number;
  lowStockParts: number;
  unreadNotifications: number;
}> {
  try {
    const supabase = await createClient();

    const [
      emergenciesRes,
      paymentsRes,
      maintenanceRes,
      partsRes,
      notificationsRes,
    ] = await Promise.all([
      supabase
        .from("emergency_reports")
        .select("id", { count: "exact", head: true })
        .in("status", ["open", "acknowledged", "responding"]),
      supabase
        .from("payment_periods")
        .select("id", { count: "exact", head: true })
        .eq("status", "awaiting_verification"),
      supabase
        .from("maintenance_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ["submitted", "under_review", "awaiting_parts"]),
      supabase
        .from("parts")
        .select("id", { count: "exact", head: true })
        .in("status", ["low_stock", "out_of_stock"]),
      supabase
        .from("management_notifications")
        .select("id", { count: "exact", head: true })
        .eq("is_read", false),
    ]);

    return {
      unresolvedEmergencies: emergenciesRes.count ?? 0,
      pendingPayments: paymentsRes.count ?? 0,
      openMaintenance: maintenanceRes.count ?? 0,
      lowStockParts: partsRes.count ?? 0,
      unreadNotifications: notificationsRes.count ?? 0,
    };
  } catch {
    return {
      unresolvedEmergencies: 0,
      pendingPayments: 0,
      openMaintenance: 0,
      lowStockParts: 0,
      unreadNotifications: 0,
    };
  }
}

/**
 * Returns unread notifications count for the authenticated driver.
 */
export async function getDriverUnreadCount(profileId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_profile_id", profileId)
      .eq("status", "unread");

    return count ?? 0;
  } catch {
    return 0;
  }
}
