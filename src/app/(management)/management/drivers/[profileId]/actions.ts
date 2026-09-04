"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import type { DriverOnboardingStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

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
  const { error } = await supabase
    .from("driver_onboardings")
    .update({ onboarding_status: status, review_note: reviewNote })
    .eq("profile_id", profileId);

  if (error) {
    throw new Error("Could not update the driver review status.");
  }

  revalidatePath(`/management/drivers/${profileId}`);
  revalidatePath("/management/drivers");
  revalidatePath("/management");
  revalidatePath("/driver/onboarding");
}
