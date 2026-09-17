"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("bikes").update({ status: status as any }).eq("id", bikeId);

  if (error) {
    console.error("Error updating bike status:", error);
    return { error: "Failed to update status" };
  }

  revalidatePath("/management/bikes");
  return { success: true };
}
