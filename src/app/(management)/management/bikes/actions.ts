"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

import type { BikeStatus } from "@/lib/database.types";

export async function addBike(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const brand = String(formData.get("brand") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const colour = String(formData.get("colour") ?? "").trim() || null;
  const registration_number = String(formData.get("registration_number") ?? "").trim() || null;
  const vin = String(formData.get("vin") ?? "").trim() || null;
  const engine_number = String(formData.get("engine_number") ?? "").trim() || null;

  if (!brand || !model) {
    return { error: "Brand and model are required" };
  }

  const { error } = await supabase.from("bikes").insert({
    brand,
    model,
    colour,
    registration_number,
    vin,
    engine_number,
    status: "available",
  });

  if (error) {
    console.error("Error adding bike:", error);
    return { error: "Failed to add bike" };
  }

  revalidatePath("/management/bikes");
  return { success: true };
}

export async function editBikeStatus(bikeId: string, status: string) {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  // Guard against changing status if bike is actively assigned
  const { data: activeAssignment, error: assignmentError } = await supabase
    .from("bike_assignments")
    .select("id")
    .eq("bike_id", bikeId)
    .eq("status", "assigned")
    .maybeSingle();

  if (assignmentError) {
    console.error("Error checking bike assignment:", assignmentError);
    return { error: "Failed to verify bike assignment status" };
  }

  if (activeAssignment && status !== "assigned") {
    return {
      error: "Cannot change status of an actively assigned bike. Please unassign the bike first.",
    };
  }

  const { error } = await supabase
    .from("bikes")
    .update({ status: status as BikeStatus })
    .eq("id", bikeId);

  if (error) {
    console.error("Error updating bike status:", error);
    return { error: error.message || "Failed to update status" };
  }

  revalidatePath("/management/bikes");
  return { success: true };
}

export async function updateBikeMileage(bikeId: string, mileageKm: number, nextServiceKm?: number | null) {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  if (mileageKm < 0 || isNaN(mileageKm)) {
    return { error: "Mileage must be a positive number" };
  }

  const payload: { current_mileage_km: number; next_service_due_km?: number | null } = {
    current_mileage_km: Math.floor(mileageKm),
  };

  if (nextServiceKm !== undefined) {
    payload.next_service_due_km = nextServiceKm ? Math.floor(nextServiceKm) : null;
  }

  const { error } = await supabase
    .from("bikes")
    .update(payload)
    .eq("id", bikeId);

  if (error) {
    console.error("Error updating bike mileage:", error);
    return { error: error.message || "Failed to update mileage" };
  }

  revalidatePath("/management/bikes");
  revalidatePath("/driver/bike");
  return { success: true };
}
