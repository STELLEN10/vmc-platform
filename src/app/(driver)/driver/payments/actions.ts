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

  const fileExt = file.name.split(".").pop();
  const fileName = `payment_proof_${paymentPeriodId}_${Date.now()}.${fileExt}`;
  const filePath = `payment_proofs/${profile.id}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("vmc-application-documents")
    .upload(filePath, file);

  if (uploadError) {
    throw new Error("Failed to upload file to storage.");
  }

  const { error: insertError } = await (supabase.from("payment_proofs") as any).insert({
    payment_period_id: paymentPeriodId,
    storage_bucket: "vmc-application-documents",
    storage_path: filePath,
    file_name: file.name,
  });

  if (insertError) {
    throw new Error("Failed to record payment proof.");
  }

  // Update payment period status to 'processing'
  await (supabase.from("payment_periods") as any).update({ status: "processing" }).eq("id", paymentPeriodId);

  revalidatePath("/driver/payments");
}
