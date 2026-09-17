"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";

import { createClient } from "@/lib/supabase/server";

export async function verifyPayment(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const periodId = String(formData.get("periodId") ?? "");
  const action = String(formData.get("action") ?? "");

  if (!periodId || !action) {
    throw new Error("Invalid request.");
  }

  // Use regular client with management JWT to call RPC
  const userSupabase = await createClient();
  const newStatus = action === "approve" ? "paid" : "overdue";
  const note = action === "approve" ? "Payment verified by VMC." : "Payment proof rejected by VMC.";

  const { error } = await userSupabase.rpc("transition_payment_period" as any, {
    p_period_id: periodId,
    p_status: newStatus,
    p_note: note,
  });

  if (error) {
    console.error("Error verifying payment:", error);
    throw new Error("Failed to update payment status.");
  }

  revalidatePath("/management/payments");
}
