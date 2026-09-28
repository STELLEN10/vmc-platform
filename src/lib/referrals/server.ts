import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { requireFeature } from "@/lib/features/server";

export const DRIVER_REFERRAL_REWARD = 250;

export type DriverReferralSummary = {
  id: string;
  referralCode: string;
  status: "created" | "applied" | "qualified" | "reward_pending" | "rewarded" | "cancelled";
  referredDriverId: string | null;
  qualificationNote: string | null;
  qualifiedAt: string | null;
  createdAt: string;
  rewardAmount: number | null;
  rewardStatus: "created" | "applied" | "qualified" | "reward_pending" | "rewarded" | "cancelled" | null;
  paidAt: string | null;
};

export async function createMyReferralCode() {
  const profile = await requireRole(DRIVER_ROLES);
  await requireFeature("driver_referrals");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_driver_referral");
  if (error || !data?.[0]) {
    throw new Error(error?.message ?? "Unable to create your VMC referral code.");
  }

  return {
    profileId: profile.id,
    referralId: data[0].referral_id,
    referralCode: data[0].referral_code,
  };
}

export async function getMyReferrals(): Promise<DriverReferralSummary[]> {
  const profile = await requireRole(DRIVER_ROLES);
  await requireFeature("driver_referrals");
  const supabase = await createClient();

  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!driver) return [];

  const { data: referrals } = await supabase
    .from("driver_referrals")
    .select("id, referral_code, status, referred_driver_id, qualification_note, qualified_at, created_at")
    .eq("referrer_driver_id", driver.id)
    .order("created_at", { ascending: false });

  if (!referrals?.length) return [];

  const referralIds = referrals.map((referral) => referral.id);
  const { data: rewards } = await supabase
    .from("referral_rewards")
    .select("referral_id, amount, status, paid_at")
    .in("referral_id", referralIds);

  const rewardMap = new Map((rewards ?? []).map((reward) => [reward.referral_id, reward]));

  return referrals.map((referral) => {
    const reward = rewardMap.get(referral.id);
    return {
      id: referral.id,
      referralCode: referral.referral_code,
      status: referral.status,
      referredDriverId: referral.referred_driver_id,
      qualificationNote: referral.qualification_note,
      qualifiedAt: referral.qualified_at,
      createdAt: referral.created_at,
      rewardAmount: reward?.amount ?? null,
      rewardStatus: reward?.status ?? null,
      paidAt: reward?.paid_at ?? null,
    };
  });
}

/**
 * Called by management after a driver record exists. The referral code is
 * carried in the driver's Auth metadata from public signup, so the browser
 * never controls the target driver ID during the secure attach operation.
 */
export async function claimReferralFromSignup(profileId: string) {
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: authData } = await admin.auth.admin.getUserById(profileId);
  const referralCode = String(authData.user?.user_metadata?.referral_code ?? "").trim();
  if (!referralCode) return { claimed: false };

  const { data: driver } = await admin
    .from("drivers")
    .select("id")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!driver) return { claimed: false };

  const { data: existingReferral } = await admin
    .from("driver_referrals")
    .select("id")
    .eq("referred_driver_id", driver.id)
    .not("status", "in", "(cancelled,rewarded)")
    .maybeSingle();

  if (existingReferral) return { claimed: false, alreadyClaimed: true };

  const { data: referralId, error } = await supabase.rpc("claim_referral_for_driver", {
    p_referred_driver_id: driver.id,
    p_referral_code: referralCode,
  });

  if (error) {
    console.error("Referral claim skipped:", error.message);
    return { claimed: false, error: error.message };
  }

  return { claimed: Boolean(referralId), referralId };
}
