"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function uploadPaymentProof(formData: FormData) {
  const profile = await requireRole(DRIVER_ROLES);
  const paymentPeriodId = String(formData.get("paymentPeriodId") ?? "");
  const file = formData.get("file") as File;

  if (!paymentPeriodId || !file) {
    throw new Error("Payment period and file are required.");
  }

  const supabase = await createClient();

  // Verify the driver has access to this payment period (RLS will enforce this)
  const { data: period, error: periodError } = await supabase
    .from("payment_periods")
    .select("id")
    .eq("id", paymentPeriodId)
    .single();

  if (periodError || !period) {
    throw new Error("Payment period not found or unauthorized.");
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `payment_proof_${paymentPeriodId}_${Date.now()}.${fileExt}`;
  const filePath = `payment_proofs/${profile.id}/${fileName}`;

  // Upload proof using authenticated user client (guarded by storage RLS)
  const { error: uploadError } = await supabase.storage
    .from("vmc-application-documents")
    .upload(filePath, file);

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error("Failed to upload file to storage.");
  }

  // Insert payment proof record using authenticated user client (guarded by table RLS)
  const { error: insertError } = await supabase.from("payment_proofs").insert({
    payment_period_id: paymentPeriodId,
    storage_bucket: "vmc-application-documents",
    storage_path: filePath,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    file_size_bytes: file.size,
    submitted_by: profile.id,
  });

  if (insertError) {
    console.error("DB insert error:", insertError);
    throw new Error("Failed to record payment proof.");
  }

  // Update payment period status to 'awaiting_verification' (guarded by table RLS)
  const { error: updateError } = await supabase
    .from("payment_periods")
    .update({
      status: "awaiting_verification",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", paymentPeriodId);

  if (updateError) {
    console.error("DB update error:", updateError);
    throw new Error("Failed to update payment period status.");
  }

  revalidatePath("/driver/payments");
}
