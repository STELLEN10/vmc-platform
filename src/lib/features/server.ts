import "server-only";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type FeatureKey, isDriverFeatureKey } from "./catalog";

/**
 * Release Control switches are driver-access switches for driver-facing features.
 * Management access is intentionally independent and remains available.
 *
 * A driver-facing feature defaults to ON for drivers until an explicit
 * feature_driver_<key> override is saved in system_settings.
 */
export async function hasFeatureAccess(feature: FeatureKey): Promise<boolean> {
  const userClient = await createClient();

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) return false;

  const { data: profile, error: profileError } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) return false;

  // Management is never disabled by the driver-access switches.
  if (profile.role !== "driver") return true;

  // Only these catalog items are exposed to drivers.
  if (!isDriverFeatureKey(feature)) return false;

  const admin = createAdminClient();
  const settingKey = `feature_driver_${feature}`;

  const { data: setting, error: settingError } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", settingKey)
    .maybeSingle();

  if (settingError) {
    console.error(`Driver feature override lookup failed for ${feature}:`, settingError.message);
    return false;
  }

  // No explicit override means the feature stays ON for drivers.
  const value = setting?.value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const enabled = (value as { enabled?: unknown }).enabled;
    if (typeof enabled === "boolean") return enabled;
  }

  return true;
}

export async function requireFeature(feature: FeatureKey, fallback = "/access-denied") {
  if (!(await hasFeatureAccess(feature))) {
    redirect(fallback);
  }
}
