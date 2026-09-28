"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { FEATURE_CATALOG, type FeatureKey, isDriverFeatureKey, isFeatureKey } from "@/lib/features/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
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

export type FeatureToggleScope = "driver" | "management";

export async function toggleFeatureFlag(
  key: string,
  enabled: boolean,
  requestedScope: FeatureToggleScope = "management"
) {
  const profile = await requireRole(ADMIN_ROLES);

  if (!isFeatureKey(key)) {
    return { success: false, error: "Invalid feature key" };
  }
  if (key === "core_platform" && !enabled) {
    return { success: false, error: "Core platform is required and cannot be disabled" };
  }

  const scope: FeatureToggleScope =
    requestedScope === "driver" && isDriverFeatureKey(key) ? "driver" : "management";

  const admin = createAdminClient();
  const catalogItem = FEATURE_CATALOG[key as FeatureKey];

  const { data: existingFlag, error: lookupError } = await admin
    .from("feature_flags")
    .select("id, enabled, driver_enabled, description")
    .eq("key", key)
    .maybeSingle();

  if (lookupError) {
    return { success: false, error: `Could not read feature flag: ${lookupError.message}` };
  }

  let flagId = existingFlag?.id ?? null;

  if (!flagId) {
    const { data: inserted, error: insertError } = await admin
      .from("feature_flags")
      .insert({
        key,
        enabled: scope === "management" ? enabled : true,
        driver_enabled: scope === "driver" ? enabled : enabled,
        description: catalogItem?.description ?? null,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      return {
        success: false,
        error: `Could not create feature flag: ${insertError?.message ?? "Unknown database error"}`,
      };
    }

    flagId = inserted.id;
  } else {
    const update = scope === "driver"
      ? { driver_enabled: enabled }
      : { enabled };

    const { error: updateError } = await admin
      .from("feature_flags")
      .update(update)
      .eq("id", flagId);

    if (updateError) {
      return { success: false, error: `Could not save feature flag: ${updateError.message}` };
    }
  }

  // Management/global switches also control the environment gate.
  // Driver-only switches intentionally leave management and environment state alone.
  if (scope === "management" && flagId) {
    const envs = ["development", "preview", "production"] as const;
    const { error: environmentError } = await admin
      .from("feature_flag_environments")
      .upsert(
        envs.map((environment) => ({
          feature_flag_id: flagId,
          environment,
          enabled,
          updated_by: profile.id,
        })),
        { onConflict: "feature_flag_id,environment" }
      );

    if (environmentError) {
      return { success: false, error: `Could not save environment state: ${environmentError.message}` };
    }
  }

  // Make sure the flag remains connected to releases matching the catalog version.
  if (flagId && catalogItem) {
    const baseVersion = catalogItem.release.split("-")[0];
    const { data: releases, error: releasesError } = await admin
      .from("releases")
      .select("id, version")
      .or(`version.eq.${catalogItem.release},version.like.${baseVersion}%`);

    if (releasesError) {
      return { success: false, error: `Could not read releases: ${releasesError.message}` };
    }

    if (releases && releases.length > 0) {
      const { error: linkError } = await admin
        .from("release_features")
        .upsert(
          releases.map((release) => ({
            release_id: release.id,
            feature_flag_id: flagId,
          })),
          { onConflict: "release_id,feature_flag_id" }
        );

      if (linkError) {
        return { success: false, error: `Could not link feature to release: ${linkError.message}` };
      }
    }
  }

  const { error: auditError } = await admin.from("audit_logs").insert({
    actor_id: profile.id,
    action: scope === "driver" ? "driver_feature_access_changed" : "feature_flag_changed",
    entity_type: "feature_flag",
    entity_id: flagId,
    old_values:
      scope === "driver"
        ? { driver_enabled: existingFlag?.driver_enabled ?? null }
        : { enabled: existingFlag?.enabled ?? null },
    new_values:
      scope === "driver"
        ? { driver_enabled: enabled, scope: "driver" }
        : { enabled, scope: "management" },
    metadata: {
      source: "release_control",
      feature: key,
      scope,
    },
  });

  if (auditError) {
    console.warn("Feature toggle saved but audit logging failed:", auditError.message);
  }

  revalidateAllFeaturePages();
  return {
    success: true,
    enabled,
    scope,
    managementEnabled: scope === "management" ? enabled : existingFlag?.enabled ?? true,
    driverEnabled: scope === "driver" ? enabled : existingFlag?.driver_enabled ?? enabled,
  };
}

export async function bulkSetFeatureFlags(keys: string[], enabled: boolean) {
  await requireRole(ADMIN_ROLES);

  const validKeys = keys.filter(isFeatureKey) as FeatureKey[];

  for (const key of validKeys) {
    const scope: FeatureToggleScope = isDriverFeatureKey(key) ? "driver" : "management";
    const result = await toggleFeatureFlag(key, enabled, scope);
    if (!result.success) {
      return { success: false, error: result.error || `Could not update ${key}` };
    }
  }

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
