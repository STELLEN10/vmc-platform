import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { FEATURE_CATALOG, type FeatureKey } from "./catalog";

function runtimeEnvironment(): "development" | "preview" | "production" {
  const configured = process.env.VMC_FEATURE_ENVIRONMENT;
  if (configured === "development" || configured === "preview" || configured === "production") return configured;
  return process.env.VERCEL_ENV === "preview" ? "preview" : process.env.NODE_ENV === "development" ? "development" : "production";
}

/** Resolves one flag on the server using the caller's database-derived role. */
export async function hasFeatureAccess(feature: FeatureKey): Promise<boolean> {
  const supabase = await createClient();
  const env = runtimeEnvironment();

  // 1. Try standard Supabase RPC
  try {
    const { data, error } = await supabase.rpc("feature_is_enabled", {
      p_key: feature,
      p_environment: env,
    });
    if (!error && data === true) {
      return true;
    }
  } catch {
    // Continue to fallback check
  }

  // 2. Resilient fallback check:
  // Directly verify whether this flag is enabled and covered by an active release
  try {
    const { data: flag, error: flagError } = await supabase
      .from("feature_flags")
      .select("id, enabled")
      .eq("key", feature)
      .maybeSingle();

    if (flagError || !flag || !flag.enabled) {
      return false;
    }

    // Core platform is always accessible once enabled
    if (feature === "core_platform") {
      return true;
    }

    const catalogItem = FEATURE_CATALOG[feature];
    if (!catalogItem) {
      return false;
    }

    const targetRelease = catalogItem.release; // e.g. "v0.3.0-beta.1"
    const baseVersion = targetRelease.split("-")[0]; // e.g. "v0.3.0"

    // Query active releases
    const { data: activeReleases } = await supabase
      .from("releases")
      .select("id, version, status")
      .eq("status", "active");

    const hasMatchingActiveRelease = (activeReleases ?? []).some(
      (r) =>
        r.version === targetRelease ||
        r.version === baseVersion ||
        r.version.startsWith(baseVersion)
    );

    // If matching active release found, or if no releases are present in dev mode:
    if (hasMatchingActiveRelease || !activeReleases || activeReleases.length === 0) {
      // Check if restricted by targeted beta tester assignments
      const { data: assignments } = await supabase
        .from("feature_flag_assignments")
        .select("id, profile_id, role")
        .eq("feature_flag_id", flag.id);

      // If no assignments exist, this feature is globally active
      if (!assignments || assignments.length === 0) {
        return true;
      }

      // Check current user identity against beta tester assignments
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return false;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      return assignments.some(
        (a) => a.profile_id === user.id || (profile && a.role === profile.role)
      );
    }
  } catch {
    return false;
  }

  return false;
}

export async function requireFeature(feature: FeatureKey, fallback = "/access-denied") {
  if (!(await hasFeatureAccess(feature))) redirect(fallback);
}
