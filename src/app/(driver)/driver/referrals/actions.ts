"use server";

import { createMyReferralCode } from "@/lib/referrals/server";

export async function generateReferralCode() {
  return createMyReferralCode();
}
