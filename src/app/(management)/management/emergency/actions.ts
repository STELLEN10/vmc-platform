"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import type { EmergencyStatus } from "@/lib/database.types";

export async function updateEmergencyStatus(
  emergencyId: string,
  newStatus: EmergencyStatus,
  managementNotes?: string | null
) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("emergency_bike_support"))) {
    return { error: "Emergency support module is currently locked by release control." };
  }

  const supabase = await createClient();

  // Try RPC transition
  const { error: rpcErr } = await supabase.rpc("transition_emergency_report", {
    p_emergency_id: emergencyId,
    p_status: newStatus,
    p_management_notes: managementNotes || null,
  });

  if (rpcErr) {
    console.error("RPC transition_emergency_report error:", rpcErr);
    // Direct update fallback
    const updatePayload: {
      status: EmergencyStatus;
      updated_at: string;
      management_notes?: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
    } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (managementNotes !== undefined) updatePayload.management_notes = managementNotes;
    if (newStatus === "resolved") {
      updatePayload.resolved_at = new Date().toISOString();
      updatePayload.resolved_by = profile.id;
    }

    const { error: fallbackErr } = await supabase
      .from("emergency_reports")
      .update(updatePayload)
      .eq("id", emergencyId);

    if (fallbackErr) {
      return { error: fallbackErr.message || "Failed to update emergency report" };
    }
  }

  revalidatePath("/management/emergency");
  revalidatePath("/driver/emergency");
  return { success: true };
}
