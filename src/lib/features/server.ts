import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { FeatureKey } from "./catalog";

function runtimeEnvironment(): "development" | "preview" | "production" {
  const configured = process.env.VMC_FEATURE_ENVIRONMENT;
  if (configured === "development" || configured === "preview" || configured === "production") {
    return configured;
  }
  if (process.env.VERCEL_ENV === "preview") return "preview";
  return process.env.NODE_ENV === "development" ? "development" : "production";
}

/**
 * The database is the single source of truth for feature access.
 *
 * This is intentionally strict: if the control-plane RPC cannot be evaluated,
 * access is denied instead of silently falling back to an in-memory/file default.
 */
export async function hasFeatureAccess(feature: FeatureKey): Promise<boolean> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("feature_is_enabled", {
      p_key: feature,
      p_environment: runtimeEnvironment(),
    });

    if (error) {
      console.error(`Feature access check failed for ${feature}:`, error.message);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error(`Feature access check failed for ${feature}:`, error);
    return false;
  }
}

export async function requireFeature(feature: FeatureKey, fallback = "/access-denied") {
  if (!(await hasFeatureAccess(feature))) {
    redirect(fallback);
  }
}
