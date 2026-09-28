import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { type FeatureKey } from "./catalog";

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

  const supabase = await createClient();

  // 1. Direct authoritative check from feature_flags table:
  // When an admin flips the switch OFF, it is canceled and blocked immediately for everyone!
  try {
    const { data: flag, error: flagError } = await supabase
      .from("feature_flags")
      .select("id, enabled")
      .eq("key", feature)
      .maybeSingle();

    if (flagError) {
      // In case of query error, fall through to RPC check
    } else if (!flag || flag.enabled === false) {
      // Feature is explicitly switched OFF or not yet created: completely canceled & hidden!
      return false;
    } else {
      // The switch is ON (enabled === true).
      // Check if this feature is restricted to specific testing accounts / beta testers:
      const { data: assignments } = await supabase
        .from("feature_flag_assignments")
        .select("id, profile_id, role")
        .eq("feature_flag_id", flag.id);

      // If no testing accounts are assigned, the feature is openly enabled for testing
      if (!assignments || assignments.length === 0) {
        return true;
      }

      // Feature has specific testing accounts assigned: check caller's account
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
    // Continue to fallback check
  }

  // 2. Secondary fallback via RPC
  try {
    const env = runtimeEnvironment();
    const { data, error } = await supabase.rpc("feature_is_enabled", {
      p_key: feature,
      p_environment: env,
    });
    if (!error && data === true) {
      return true;
    }
  } catch {
    // Return false by default
  }

  return false;
}

export async function requireFeature(feature: FeatureKey, fallback = "/access-denied") {
  if (!(await hasFeatureAccess(feature))) redirect(fallback);
}
