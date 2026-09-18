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

export async function reviewDriverOnboarding(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireRole(MANAGEMENT_ROLES);
  } catch {
    return { error: "You must be signed in with VMC management permissions." };
  }

  const profileId = String(formData.get("profileId") ?? "");
  const status = String(formData.get("status") ?? "") as DriverOnboardingStatus;
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;

  if (!profileId) {
    return { error: "Missing driver profile ID." };
  }

  if (!managementStatuses.includes(status)) {
    return { error: "Invalid driver review status selected." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_driver_onboarding", {
    p_profile_id: profileId,
    p_status: status,
    p_review_note: reviewNote,
  });

  if (error) {
    console.error("Database error during driver review:", error);

    // Map known database error messages to clear, safe user-facing feedback
    if (error.message?.includes("Only VMC management can review driver onboarding")) {
      return { error: "Only VMC management can review driver onboarding." };
    }
    if (error.message?.includes("Driver onboarding record not found")) {
      return { error: "Driver onboarding record could not be found." };
    }
    if (error.message?.includes("Invalid management onboarding status")) {
      return { error: "The selected review status is not permitted." };
    }
    return { error: "Unable to update driver review status. Please try again." };
  }

  revalidatePath(`/management/drivers/${profileId}`);
  revalidatePath("/management/drivers");
  revalidatePath("/management");
  revalidatePath("/driver/onboarding");

  return { success: true };
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

  const today = new Date().toISOString().split("T")[0];

  await supabase
    .from("bike_assignments")
    .update({ status: "ended", ended_at: today })
    .eq("driver_id", driver.id)
    .eq("status", "assigned");
  
  await supabase.from("bike_assignments").insert({
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

  const { data: contract, error: contractError } = await supabase.from("contracts").insert({
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

  if (contractError || !contract) {
    console.error("Contract Error:", contractError);
    throw new Error("Failed to create contract.");
  }

  // Use the standard client with the management user's JWT to call the RPC since it relies on RLS auth checking for is_management()
  const userSupabase = await createClient();
  const { error: rpcError } = await userSupabase.rpc("generate_contract_payment_schedule", { p_contract_id: contract.id });
  
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

  const today = new Date().toISOString().split("T")[0];
  await supabase
    .from("bike_assignments")
    .update({ status: "ended", ended_at: today })
    .eq("driver_id", driver.id)
    .eq("status", "assigned");
  await supabase.from("drivers").update({ bike_id: null }).eq("id", driver.id);
  await supabase.from("bikes").update({ status: "available" }).eq("id", driver.bike_id);

  revalidatePath(`/management/drivers/${profileId}`);
  revalidatePath("/management/bikes");
}

export async function uploadContractPdf(
  prevState: unknown,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  try {
    await requireRole(MANAGEMENT_ROLES);
  } catch {
    return { error: "You must be signed in with VMC management permissions." };
  }

  const profileId = String(formData.get("profileId") ?? "").trim();
  const contractId = String(formData.get("contractId") ?? "").trim();
  const file = formData.get("file") as File | null;

  if (!profileId || !contractId) {
    return { error: "Missing driver profile or contract reference." };
  }

  if (!file || typeof file.size !== "number" || file.size === 0) {
    return { error: "Please select a contract PDF to upload." };
  }

  // Server-side PDF validation: extension, MIME type, and size
  const fileName = file.name ? file.name.trim() : "contract.pdf";
  const isPdfExtension = fileName.toLowerCase().endsWith(".pdf");
  const isPdfMime = file.type === "application/pdf" || file.type === "application/x-pdf";

  if (!isPdfExtension || (!isPdfMime && file.type !== "")) {
    return { error: "Invalid file format. Only official PDF documents (.pdf) are accepted." };
  }

  const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "Contract file exceeds the 15MB limit. Please upload a smaller PDF." };
  }

  const supabase = createAdminClient();

  // Verify the contract exists
  const { data: contract, error: contractErr } = await supabase
    .from("contracts")
    .select("id, driver_id")
    .eq("id", contractId)
    .maybeSingle();

  if (contractErr || !contract) {
    return { error: "Contract record could not be found." };
  }

  // Predictable isolated path: contracts/{profileId}/{contractId}.pdf
  const storagePath = `contracts/${profileId}/${contractId}.pdf`;

  try {
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("vmc-application-documents")
      .upload(storagePath, Buffer.from(fileBuffer), {
        upsert: true,
        contentType: "application/pdf",
      });

    if (uploadError) {
      console.error("Storage upload error for contract PDF:", uploadError);
      return { error: "Failed to upload contract PDF to secure storage." };
    }

    const { error: updateError } = await supabase
      .from("contracts")
      .update({
        document_storage_path: storagePath,
        document_file_name: fileName,
        document_uploaded_at: new Date().toISOString(),
        document_file_size_bytes: file.size,
        document_mime_type: "application/pdf",
      })
      .eq("id", contractId);

    if (updateError) {
      console.error("DB update error for contract PDF metadata:", updateError);
      return { error: "Contract PDF uploaded, but failed to save document reference." };
    }
  } catch (err) {
    console.error("Unexpected error during contract PDF upload:", err);
    return { error: "An unexpected error occurred while processing the contract PDF." };
  }

  revalidatePath(`/management/drivers/${profileId}`);
  revalidatePath("/driver/payments");
  revalidatePath("/driver/profile");

  return { success: true };
}
