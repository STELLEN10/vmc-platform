import "server-only";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type FeatureKey, isDriverFeatureKey } from "./catalog";

type RuntimeEnvironment = "development" | "preview" | "production";

function runtimeEnvironment(): RuntimeEnvironment {
  const configured = process.env.VMC_FEATURE_ENVIRONMENT;
  if (configured === "development" || configured === "preview" || configured === "production") {
    return configured;
  }
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return process.env.NODE_ENV === "development" ? "development" : "production";
}

/**
 * Feature access is resolved from persistent Supabase data.
 *
 * Management access uses feature_flags.enabled and is never affected by a
 * driver's scoped override. Driver access uses a small per-feature override
 * stored in the existing system_settings table, defaulting to the management
 * state when no driver override exists.
 *
 * This implementation intentionally avoids requiring a new database column so
 * the currently deployed VMC database remains compatible until the optional
 * driver_enabled migration is applied.
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

  const admin = createAdminClient();
  const environment = runtimeEnvironment();

  const { data: flag, error: flagError } = await admin
    .from("feature_flags")
    .select("id, key, enabled")
    .eq("key", feature)
    .maybeSingle();

  if (flagError || !flag) return false;
  if (feature === "core_platform") return true;

  // A disabled management/global flag means nobody gets the feature.
  if (!flag.enabled) return false;

  // Respect the environment gate when one exists. If the row does not exist,
  // preserve the previous VMC behavior and continue.
  const { data: environmentRow, error: environmentError } = await admin
    .from("feature_flag_environments")
    .select("enabled")
    .eq("feature_flag_id", flag.id)
    .eq("environment", environment)
    .maybeSingle();

  if (environmentError) return false;
  if (environmentRow && environmentRow.enabled === false) return false;

  // A feature must belong to an active release when release mappings exist.
  const { data: releaseMappings, error: releaseError } = await admin
    .from("release_features")
    .select("release_id, releases!inner(status)")
    .eq("feature_flag_id", flag.id);

  if (releaseError) return false;

  if (releaseMappings && releaseMappings.length > 0) {
    const hasActiveRelease = releaseMappings.some(
      (mapping) => mapping.releases?.status === "active"
    );
    if (!hasActiveRelease) return false;
  }

  // Beta assignments restrict the feature to designated profiles/roles.
  const { data: assignments, error: assignmentError } = await admin
    .from("feature_flag_assignments")
    .select("profile_id, role")
    .eq("feature_flag_id", flag.id);

  if (assignmentError) return false;

  if (assignments && assignments.length > 0) {
    const allowed = assignments.some(
      (assignment) =>
        assignment.profile_id === user.id ||
        assignment.role === profile.role
    );
    if (!allowed) return false;
  }

  // Only the driver-facing subset uses the independent driver switch.
  if (profile.role === "driver" && isDriverFeatureKey(feature)) {
    const settingKey = `feature_driver_${feature}`;
    const { data: setting, error: settingError } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", settingKey)
      .maybeSingle();

    if (settingError) return false;

    const value = setting?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const enabled = (value as { enabled?: unknown }).enabled;
      if (typeof enabled === "boolean") return enabled;
    }
  }

  return true;
}

export async function requireFeature(feature: FeatureKey, fallback = "/access-denied") {
  if (!(await hasFeatureAccess(feature))) {
    redirect(fallback);
  }
}
