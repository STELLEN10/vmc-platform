"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import type { DriverOnboardingStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const managementStatuses: DriverOnboardingStatus[] = [
  "under_review", "approved", "active", "changes_requested", "rejected", "suspended",
];

export async function reviewDriverOnboarding(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const profileId = String(formData.get("profileId") ?? "");
  const status = String(formData.get("status") ?? "") as DriverOnboardingStatus;
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;

  if (!profileId || !managementStatuses.includes(status)) {
    throw new Error("Invalid driver review request.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_driver_onboarding", {
    p_profile_id: profileId,
    p_status: status,
    p_review_note: reviewNote,
  });

  if (error) {
    throw new Error("Could not update the driver review status.");
  }

  revalidatePath(`/management/drivers/${profileId}`);
  revalidatePath("/management/drivers");
  revalidatePath("/management");
  revalidatePath("/driver/onboarding");
}

export async function assignBikeToDriver(formData: FormData) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const profileId = String(formData.get("profileId") ?? "");
  const bikeId = String(formData.get("bikeId") ?? "");

  if (!profileId || !bikeId) {
    throw new Error("Profile ID and Bike ID are required.");
  }

  const supabase = createAdminClient();

  const { data: driver } = await supabase.from("drivers").select("id").eq("profile_id", profileId).single();
  if (!driver) throw new Error("Driver not found");

  await (supabase.from("bike_assignments") as any).update({ status: "ended", ended_at: new Date().toISOString() }).eq("driver_id", driver.id).eq("status", "assigned");
  
  await (supabase.from("bike_assignments") as any).insert({
    bike_id: bikeId,
    driver_id: driver.id,
    status: "assigned",
    assigned_by: profile.id,
  });

  await supabase.from("drivers").update({ bike_id: bikeId }).eq("id", driver.id);
  await supabase.from("bikes").update({ status: "assigned" }).eq("id", bikeId);

  revalidatePath(`/management/drivers/${profileId}`);
  revalidatePath("/management/bikes");
}

export async function createContract(formData: FormData) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const profileId = String(formData.get("profileId") ?? "");
  const driverId = String(formData.get("driverId") ?? "");
  const bikeId = String(formData.get("bikeId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const weeklyAmount = Number(formData.get("weeklyAmount") ?? 0);
  const totalWeeks = Number(formData.get("totalWeeks") ?? 0);
  const paymentWeekday = Number(formData.get("paymentWeekday") ?? 0);

  if (!profileId || !driverId || !bikeId || !startDate || weeklyAmount <= 0 || totalWeeks <= 0) {
    throw new Error("Invalid contract data provided.");
  }

  const supabase = createAdminClient();

  const { data: contract, error: contractError } = await (supabase.from("contracts") as any).insert({
    driver_id: driverId,
    bike_id: bikeId,
    start_date: startDate,
    weekly_amount: weeklyAmount,
    total_weeks: totalWeeks,
    payment_weekday: paymentWeekday,
    status: "active", // We activate it immediately for now
    created_by: profile.id,
    activated_at: new Date().toISOString(),
  }).select("id").single();

  if (contractError) {
    console.error("Contract Error:", contractError);
    throw new Error("Failed to create contract.");
  }

  // Use the standard client with the management user's JWT to call the RPC since it relies on RLS auth checking for is_management()
  const userSupabase = await createClient();
  const { error: rpcError } = await userSupabase.rpc("generate_contract_payment_schedule" as any, { p_contract_id: (contract as any).id });
  
  if (rpcError) {
    console.error("RPC Error:", rpcError);
    throw new Error("Failed to generate payment schedule.");
  }

  revalidatePath(`/management/drivers/${profileId}`);
}

export async function unassignBikeFromDriver(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const profileId = String(formData.get("profileId") ?? "");

  if (!profileId) {
    throw new Error("Profile ID is required.");
  }

  const supabase = createAdminClient();
  const { data: driver } = await supabase.from("drivers").select("id, bike_id").eq("profile_id", profileId).single();
  
  if (!driver || !driver.bike_id) return;

  await (supabase.from("bike_assignments") as any).update({ status: "ended", ended_at: new Date().toISOString() }).eq("driver_id", driver.id).eq("status", "assigned");
  await supabase.from("drivers").update({ bike_id: null }).eq("id", driver.id);
  await supabase.from("bikes").update({ status: "available" }).eq("id", driver.bike_id);

  revalidatePath(`/management/drivers/${profileId}`);
  revalidatePath("/management/bikes");
}
