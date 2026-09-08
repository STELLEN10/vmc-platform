import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { FeatureKey } from "./catalog";

function runtimeEnvironment(): "development" | "preview" | "production" {
  const configured = process.env.VMC_FEATURE_ENVIRONMENT;
  if (configured === "development" || configured === "preview" || configured === "production") return configured;
  return process.env.VERCEL_ENV === "preview" ? "preview" : process.env.NODE_ENV === "development" ? "development" : "production";
}

/** Resolves one flag on the server using the caller's database-derived role. */
export async function hasFeatureAccess(feature: FeatureKey): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("feature_is_enabled", {
    p_key: feature,
    p_environment: runtimeEnvironment(),
  });
  return !error && data === true;
}

export async function requireFeature(feature: FeatureKey, fallback = "/access-denied") {
  if (!(await hasFeatureAccess(feature))) redirect(fallback);
}
