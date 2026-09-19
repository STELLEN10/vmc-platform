"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import type { ServiceStatus } from "@/lib/database.types";

export async function updateServiceRequestStatus(
  serviceId: string,
  newStatus: ServiceStatus,
  confirmedDate?: string | null,
  confirmedTime?: string | null,
  managementNotes?: string | null
) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("service_requests"))) {
    return { error: "Service requests module is currently locked by release control." };
  }

  const supabase = await createClient();

  // Try RPC transition first
  const { error: rpcErr } = await supabase.rpc("transition_service_request", {
    p_request_id: serviceId,
    p_status: newStatus,
    p_confirmed_date: confirmedDate || null,
    p_confirmed_time: confirmedTime || null,
    p_management_notes: managementNotes || null,
  });

  if (rpcErr) {
    console.error("transition_service_request RPC error, applying direct update:", rpcErr);
    const updatePayload: {
      status: ServiceStatus;
      updated_at: string;
      confirmed_date?: string | null;
      confirmed_time?: string | null;
      management_notes?: string | null;
      completed_at?: string | null;
      completed_by?: string | null;
    } = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (confirmedDate !== undefined) updatePayload.confirmed_date = confirmedDate || null;
    if (confirmedTime !== undefined) updatePayload.confirmed_time = confirmedTime || null;
    if (managementNotes !== undefined) updatePayload.management_notes = managementNotes || null;
    if (newStatus === "completed") {
      updatePayload.completed_at = new Date().toISOString();
      updatePayload.completed_by = profile.id;
    }

    const { error: fallbackErr } = await supabase
      .from("service_requests")
      .update(updatePayload)
      .eq("id", serviceId);

    if (fallbackErr) {
      return { error: fallbackErr.message || "Failed to update service request" };
    }
  }

  // If completed, update bike's next service due
  if (newStatus === "completed") {
    const { data: service } = await supabase
      .from("service_requests")
      .select("bike_id, odometer_reading_km")
      .eq("id", serviceId)
      .single();

    if (service?.bike_id) {
      const { data: bike } = await supabase
        .from("bikes")
        .select("current_mileage_km")
        .eq("id", service.bike_id)
        .single();

      const currentKm = service.odometer_reading_km || bike?.current_mileage_km || 0;
      const nextDue = currentKm + 3000;

      await supabase
        .from("bikes")
        .update({
          current_mileage_km: currentKm,
          next_service_due_km: nextDue,
        })
        .eq("id", service.bike_id);
    }
  }

  revalidatePath("/management/services");
  revalidatePath("/driver/services");
  revalidatePath("/management/bikes");
  revalidatePath("/driver/bike");
  return { success: true };
}
