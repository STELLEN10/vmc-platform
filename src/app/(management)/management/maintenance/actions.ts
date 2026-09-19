"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceStatus } from "@/lib/database.types";

export async function updateMaintenanceStatus(
  requestId: string,
  newStatus: MaintenanceStatus,
  managementNotes?: string | null,
  scheduledFor?: string | null
) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("new_maintenance"))) {
    return { error: "Maintenance module is currently locked by release control." };
  }

  const supabase = await createClient();

  // Call the transition RPC
  const { error } = await supabase.rpc("transition_maintenance_request", {
    p_request_id: requestId,
    p_status: newStatus,
    p_notes: managementNotes || null,
    p_scheduled_for: scheduledFor || null,
  });

  if (error) {
    console.error("Error transitioning maintenance request via RPC:", error);
    // Fallback direct update if RPC has permission or signature variation
    const updatePayload: {
      status: MaintenanceStatus;
      updated_at: string;
      management_notes?: string | null;
      scheduled_for?: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
    } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (managementNotes !== undefined) updatePayload.management_notes = managementNotes;
    if (scheduledFor !== undefined) updatePayload.scheduled_for = scheduledFor;
    if (newStatus === "resolved") {
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolved_by = profile.id;
    }

    const { error: fallbackErr } = await supabase
      .from("maintenance_requests")
      .update(updatePayload)
      .eq("id", requestId);

    if (fallbackErr) {
      return { error: fallbackErr.message || "Failed to update maintenance request" };
    }
  }

  revalidatePath("/management/maintenance");
  revalidatePath("/driver/maintenance");
  return { success: true };
}
