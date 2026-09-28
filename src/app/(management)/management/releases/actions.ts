"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { FEATURE_CATALOG, type FeatureKey, isFeatureKey } from "@/lib/features/catalog";
import { setFeatureFlagState, bulkSetFeatureFlagsState } from "@/lib/features/store";
import { createClient } from "@/lib/supabase/server";

function revalidateAllFeaturePages() {
  revalidatePath("/management/releases");
  revalidatePath("/management");
  revalidatePath("/driver");
  revalidatePath("/driver/services");
  revalidatePath("/management/services");
  revalidatePath("/driver/emergency");
  revalidatePath("/management/emergency");
  revalidatePath("/driver/maintenance");
  revalidatePath("/management/maintenance");
  revalidatePath("/driver/inventory");
  revalidatePath("/management/inventory");
  revalidatePath("/management/referrals");
  revalidatePath("/driver/referrals");
  revalidatePath("/management/ai");
  revalidatePath("/driver/ai");
  revalidatePath("/management/documents");
  revalidatePath("/management/analytics");
  revalidatePath("/management/activity");
  revalidatePath("/management/notifications");
  revalidatePath("/driver/notifications");
  revalidatePath("/management/finance");
  revalidatePath("/driver/payments");
  revalidatePath("/driver/onboarding");
}

function releaseError(reason: "invalid" | "database" | "not-found") {
  redirect(`/management/releases?error=${reason}`);
}

function releaseSuccess() {
  revalidateAllFeaturePages();
  redirect("/management/releases?updated=1");
}

export async function toggleFeatureFlag(key: string, enabled: boolean) {
  await requireRole(ADMIN_ROLES);
  if (!isFeatureKey(key)) {
    return { success: false, error: "Invalid feature key" };
  }
  if (key === "core_platform" && !enabled) {
    return { success: false, error: "Core platform is required and cannot be disabled" };
  }

  const supabase = await createClient();
  const catalogItem = FEATURE_CATALOG[key as FeatureKey];

  // 1. Ensure or update feature_flags row
  const { data: existingFlag } = await supabase
    .from("feature_flags")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  let flagId = existingFlag?.id;
  if (!flagId) {
    const { data: inserted, error: insertError } = await supabase
      .from("feature_flags")
      .insert({
        key,
        enabled,
        description: catalogItem?.description || null,
      })
      .select("id")
      .single();
    if (!insertError && inserted) {
      flagId = inserted.id;
    }
  } else {
    await supabase
      .from("feature_flags")
      .update({ enabled })
      .eq("id", flagId);
  }

  // 2. Call RPC set_feature_flag if available
  try {
    await supabase.rpc("set_feature_flag", {
      p_key: key,
      p_enabled: enabled,
      p_description: catalogItem?.description || null,
    });
  } catch {
    // Non-fatal
  }

  // 3. Keep all environments in sync
  if (flagId) {
    const envs = ["development", "preview", "production"] as const;
    await supabase.from("feature_flag_environments").upsert(
      envs.map((env) => ({
        feature_flag_id: flagId,
        environment: env,
        enabled,
      })),
      { onConflict: "feature_flag_id,environment" }
    );
  }

  // 4. Update the persistent local feature-flags state store
  setFeatureFlagState(key as FeatureKey, enabled);

  revalidateAllFeaturePages();
  return { success: true, enabled };
}

export async function bulkSetFeatureFlags(keys: string[], enabled: boolean) {
  await requireRole(ADMIN_ROLES);
  const validKeys = keys.filter(isFeatureKey);
  const updates: Partial<Record<FeatureKey, boolean>> = {};
  for (const key of validKeys) {
    if (key === "core_platform" && !enabled) continue;
    await toggleFeatureFlag(key, enabled);
    updates[key] = enabled;
  }
  bulkSetFeatureFlagsState(updates);
  revalidateAllFeaturePages();
  return { success: true };
}

export async function assignBetaTester(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const key = String(formData.get("key") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();

  if (!isFeatureKey(key) || (Boolean(email) === Boolean(role)) || (role && !["admin", "staff", "driver"].includes(role))) {
    releaseError("invalid");
  }

  const supabase = await createClient();
  const catalogItem = FEATURE_CATALOG[key as FeatureKey];

  // 1. Ensure the flag row exists
  const { data: existingFlag } = await supabase
    .from("feature_flags")
    .select("id")
    .eq("key", key)
    .maybeSingle();

  let flagId = existingFlag?.id;
  if (!flagId) {
    const { data: inserted } = await supabase
      .from("feature_flags")
      .insert({
        key,
        enabled: true,
        description: catalogItem.description,
      })
      .select("id")
      .single();
    flagId = inserted?.id;
  }

  if (!flagId) {
    releaseError("database");
  }

  let profileId: string | null = null;
  if (email) {
    const { data: p } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!p) {
      releaseError("not-found");
    }
    profileId = p?.id ?? null;
  }

  // 2. Try the assign_feature_flag_tester RPC
  let rpcSuccess = false;
  try {
    const { error } = await supabase.rpc("assign_feature_flag_tester", {
      p_key: key,
      p_profile_id: profileId,
      p_role: role ? (role as "admin" | "staff" | "driver") : null,
    });
    if (!error) rpcSuccess = true;
  } catch {
    // Fall back to direct insert below
  }

  if (!rpcSuccess && flagId) {
    const { error: insertErr } = await supabase.from("feature_flag_assignments").insert({
      feature_flag_id: flagId,
      profile_id: profileId,
      role: role ? (role as "admin" | "staff" | "driver") : null,
    });
    if (insertErr) releaseError("database");
  }

  releaseSuccess();
}

export async function removeBetaTester(assignmentId: string) {
  await requireRole(ADMIN_ROLES);
  if (!assignmentId) return { error: "Assignment ID is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("feature_flag_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    return { error: error.message || "Failed to remove tester assignment" };
  }

  revalidateAllFeaturePages();
  return { success: true };
}
