import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type FeatureKey } from "./catalog";
import { isFeatureFlagEnabled } from "./store";

function runtimeEnvironment(): "development" | "preview" | "production" {
  const configured = process.env.VMC_FEATURE_ENVIRONMENT;
  if (configured === "development" || configured === "preview" || configured === "production") return configured;
  return process.env.VERCEL_ENV === "preview" ? "preview" : process.env.NODE_ENV === "development" ? "development" : "production";
}

/** Resolves one flag on the server using the caller's database-derived role. */
export async function hasFeatureAccess(feature: FeatureKey): Promise<boolean> {
  // Core platform is the foundational shell and cannot be disabled
  if (feature === "core_platform") {
    return true;
  }

  // 1. Direct authoritative check from persistent store:
  // When an admin flips the switch OFF, it is canceled and blocked immediately for everyone!
  const isEnabledInStore = isFeatureFlagEnabled(feature);
  if (!isEnabledInStore) {
    return false;
  }

  // 2. The switch is ON (enabled === true).
  // Check if this feature has restrictions or testing accounts assigned via Supabase:
  try {
    const supabase = await createClient();
    const { data: flag } = await supabase
      .from("feature_flags")
      .select("id, enabled")
      .eq("key", feature)
      .maybeSingle();

    if (flag && flag.enabled === false) {
      return false;
    }

    if (flag?.id) {
      const { data: assignments } = await supabase
        .from("feature_flag_assignments")
        .select("id, profile_id, role")
        .eq("feature_flag_id", flag.id);

      if (assignments && assignments.length > 0) {
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
    }
  } catch {
    // If database check encounters an error, respect the store state (true)
  }

  return true;
}

export async function requireFeature(feature: FeatureKey, fallback = "/access-denied") {
  if (!(await hasFeatureAccess(feature))) redirect(fallback);
}

