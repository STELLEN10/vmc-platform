"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit/server";

export async function reviewFinancePayment(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const periodId = String(formData.get("periodId") ?? "");
  const action = String(formData.get("action") ?? "");
  const customReason = String(formData.get("reason") ?? "").trim();

  if (!periodId || !action) {
    throw new Error("Missing required parameters.");
  }

  const supabase = await createClient();
  const newStatus = action === "approve" ? "verified" : "rejected";
  const reason = customReason || (action === "approve" ? "Payment verified by VMC." : "Payment proof rejected by VMC.");

  const { error } = await supabase.rpc("transition_payment_period", {
    p_payment_period_id: periodId,
    p_status: newStatus,
    p_reason: reason,
  });

  if (error) {
    console.error("Error transitioning payment period:", error);
    throw new Error(error.message || "Failed to update payment status.");
  }

  await recordAuditEvent({
    action: `payment_${newStatus}`,
    entityType: "payment_period",
    entityId: periodId,
    metadata: { action, reason },
  });

  revalidatePath("/management/finance");
  revalidatePath("/management/payments");
  revalidatePath("/management");
}

export async function getPaymentProofSignedUrl(proofPath: string): Promise<string | null> {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from("vmc-application-documents")
    .createSignedUrl(proofPath, 300);

  if (error || !data?.signedUrl) {
    console.error("Failed to sign payment proof URL:", error);
    return null;
  }

  return data.signedUrl;
}
