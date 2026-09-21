"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit/server";

export async function markManagementNotificationAsRead(id: string) {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_management_notification_as_read", {
    p_notification_id: id,
  });

  if (error) {
    // Fallback direct update
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("management_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user?.id ?? null,
      })
      .eq("id", id);
  }

  revalidatePath("/management/notifications");
  revalidatePath("/management");
}

export async function markAllManagementNotificationsAsRead() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const { error } = await supabase.rpc("mark_all_management_notifications_as_read");

  if (error) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase
      .from("management_notifications")
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user?.id ?? null,
      })
      .eq("is_read", false);
  }

  revalidatePath("/management/notifications");
  revalidatePath("/management");
}

export async function triggerPaymentReminders() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("dispatch_payment_reminders");

  if (error) {
    console.error("Error dispatching payment reminders:", error);
    return {
      success: false,
      message: error.message || "Failed to dispatch reminders",
      processed: 0,
      upcoming: 0,
      due: 0,
      overdue: 0,
    };
  }

  const result = data && data[0] ? data[0] : {
    processed_count: 0,
    upcoming_count: 0,
    due_count: 0,
    overdue_count: 0,
  };

  await recordAuditEvent({
    action: "dispatch_payment_reminders",
    entityType: "payment_periods",
    metadata: {
      processed_count: result.processed_count,
      upcoming_count: result.upcoming_count,
      due_count: result.due_count,
      overdue_count: result.overdue_count,
    },
  });

  revalidatePath("/management/notifications");
  revalidatePath("/management/finance");
  revalidatePath("/driver/notifications");

  return {
    success: true,
    message: `Dispatched ${result.processed_count} reminders (${result.due_count} due today, ${result.overdue_count} overdue, ${result.upcoming_count} upcoming).`,
    processed: result.processed_count,
    upcoming: result.upcoming_count,
    due: result.due_count,
    overdue: result.overdue_count,
  };
}

export async function sendCustomNotification(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const recipientProfileId = String(formData.get("recipientProfileId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const type = String(formData.get("type") ?? "management_alert").trim();

  if (!recipientProfileId || !title || !body) {
    return { success: false, error: "Recipient, title, and body are required." };
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      recipient_profile_id: recipientProfileId,
      channel: "in_app",
      type,
      title,
      body,
      status: "unread",
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await recordAuditEvent({
    action: "send_custom_notification",
    entityType: "notifications",
    entityId: data.id,
    metadata: { recipientProfileId, title, type },
  });

  revalidatePath("/management/notifications");
  return { success: true, message: "Notification sent successfully." };
}
