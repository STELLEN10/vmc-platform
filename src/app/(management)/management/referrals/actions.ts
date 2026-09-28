"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES, MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit/server";

async function notifyReferrer(referralId: string, title: string, body: string) {
  const admin = createAdminClient();
  const { data: referral } = await admin
    .from("driver_referrals")
    .select("referrer_driver_id")
    .eq("id", referralId)
    .maybeSingle();

  if (!referral) return;

  const { data: driver } = await admin
    .from("drivers")
    .select("profile_id")
    .eq("id", referral.referrer_driver_id)
    .maybeSingle();

  if (!driver?.profile_id) return;

  await admin.from("notifications").insert({
    recipient_profile_id: driver.profile_id,
    channel: "in_app",
    type: "driver_referral_update",
    title,
    body,
    status: "unread",
    related_entity_type: "driver_referral",
    related_entity_id: referralId,
  });
}

export async function qualifyReferral(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const referralId = String(formData.get("referralId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!referralId) throw new Error("Referral ID is required.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("qualify_driver_referral", {
    p_referral_id: referralId,
    p_note: note,
  });

  if (error) throw new Error(error.message);

  await notifyReferrer(
    referralId,
    "Your VMC referral qualified",
    "Your referral has been qualified by VMC. A R250 reward is now pending payment."
  );
  await recordAuditEvent({
    action: "driver_referral_qualified",
    entityType: "driver_referral",
    entityId: referralId,
    metadata: { note },
  });

  revalidatePath("/management/referrals");
  revalidatePath("/management");
  revalidatePath("/driver");
  revalidatePath("/driver/referrals");
}

export async function cancelReferral(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  const referralId = String(formData.get("referralId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!referralId) throw new Error("Referral ID is required.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_driver_referral", {
    p_referral_id: referralId,
    p_note: note,
  });

  if (error) throw new Error(error.message);

  await notifyReferrer(
    referralId,
    "VMC referral updated",
    "Your referral has been cancelled. Contact VMC if you believe this was recorded incorrectly."
  );
  await recordAuditEvent({
    action: "driver_referral_cancelled",
    entityType: "driver_referral",
    entityId: referralId,
    metadata: { note },
  });

  revalidatePath("/management/referrals");
  revalidatePath("/management");
  revalidatePath("/driver/referrals");
}

export async function rewardReferral(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const referralId = String(formData.get("referralId") ?? "").trim();
  if (!referralId) throw new Error("Referral ID is required.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("reward_driver_referral", {
    p_referral_id: referralId,
  });

  if (error) throw new Error(error.message);

  await notifyReferrer(
    referralId,
    "R250 referral reward paid",
    "VMC has marked your R250 referral reward as paid."
  );
  await recordAuditEvent({
    action: "driver_referral_rewarded",
    entityType: "driver_referral",
    entityId: referralId,
  });

  revalidatePath("/management/referrals");
  revalidatePath("/management");
  revalidatePath("/driver");
  revalidatePath("/driver/referrals");
}
