"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import type { ReleaseChannel, ReleaseStatus } from "@/lib/database.types";
import { FEATURE_CATALOG, type FeatureKey, isFeatureKey } from "@/lib/features/catalog";
import { createClient } from "@/lib/supabase/server";

const releaseChannels: ReleaseChannel[] = ["stable", "beta"];
const releaseStatuses: ReleaseStatus[] = ["draft", "testing", "active", "paused", "rolled_back", "retired"];

function revalidateAllFeaturePages() {
  revalidatePath("/management/releases");
  revalidatePath("/driver/services");
  revalidatePath("/management/services");
  revalidatePath("/driver/emergency");
  revalidatePath("/management/emergency");
  revalidatePath("/driver/maintenance");
  revalidatePath("/management/maintenance");
  revalidatePath("/driver/inventory");
  revalidatePath("/management/inventory");
}

function releaseError(reason: "invalid" | "database" | "not-found") {
  redirect(`/management/releases?error=${reason}`);
}

function releaseSuccess() {
  revalidateAllFeaturePages();
  redirect("/management/releases?updated=1");
}

export async function createRelease(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const version = String(formData.get("version") ?? "").trim();
  const channel = String(formData.get("channel") ?? "") as ReleaseChannel;
  const releaseNotes = String(formData.get("releaseNotes") ?? "").trim() || null;

  if (!/^v\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/i.test(version) || !releaseChannels.includes(channel)) {
    releaseError("invalid");
  }

  const supabase = await createClient();

  let releaseId: string | null = null;
  try {
    const { data } = await supabase.rpc("create_release", {
      p_version: version,
      p_channel: channel,
      p_release_notes: releaseNotes,
    });
    releaseId = data as string;
  } catch {
    // Fall back to direct insert
  }

  if (!releaseId) {
    const { data: inserted, error: insertError } = await supabase
      .from("releases")
      .upsert(
        {
          version,
          channel,
          status: "draft",
          release_notes: releaseNotes,
        },
        { onConflict: "version" }
      )
      .select("id")
      .single();

    if (insertError) releaseError("database");
    releaseId = inserted?.id ?? null;
  }

  // Link matching feature flags to this release
  if (releaseId) {
    const baseVersion = version.split("-")[0];
    const matchingKeys = Object.entries(FEATURE_CATALOG)
      .filter(([, item]) => item.release === version || item.release.startsWith(baseVersion))
      .map(([k]) => k);

    if (matchingKeys.length > 0) {
      const { data: flags } = await supabase
        .from("feature_flags")
        .select("id, key")
        .in("key", matchingKeys);

      if (flags && flags.length > 0) {
        await supabase.from("release_features").upsert(
          flags.map((f) => ({
            release_id: releaseId,
            feature_flag_id: f.id,
          })),
          { onConflict: "release_id,feature_flag_id" }
        );
      }
    }
  }

  releaseSuccess();
}

export async function changeReleaseStatus(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const releaseId = String(formData.get("releaseId") ?? "");
  const status = String(formData.get("status") ?? "") as ReleaseStatus;

  if (!releaseId || !releaseStatuses.includes(status)) releaseError("invalid");

  const supabase = await createClient();

  try {
    await supabase.rpc("transition_release", {
      p_release_id: releaseId,
      p_status: status,
      p_note: null,
    });
  } catch {
    // Fallback: direct table update
    await supabase
      .from("releases")
      .update({
        status,
        activated_at: status === "active" ? new Date().toISOString() : undefined,
      })
      .eq("id", releaseId);
  }

  // When activating a release, ensure all its matching features are in release_features
  if (status === "active") {
    const { data: rel } = await supabase
      .from("releases")
      .select("id, version")
      .eq("id", releaseId)
      .maybeSingle();

    if (rel) {
      const baseVersion = rel.version.split("-")[0];
      const matchingKeys = Object.entries(FEATURE_CATALOG)
        .filter(([, item]) => item.release === rel.version || item.release.startsWith(baseVersion))
        .map(([k]) => k);

      if (matchingKeys.length > 0) {
        const { data: flags } = await supabase
          .from("feature_flags")
          .select("id, key")
          .in("key", matchingKeys);

        if (flags && flags.length > 0) {
          await supabase.from("release_features").upsert(
            flags.map((f) => ({
              release_id: rel.id,
              feature_flag_id: f.id,
            })),
            { onConflict: "release_id,feature_flag_id" }
          );
        }
      }
    }
  }

  releaseSuccess();
}

export async function setFeatureFlag(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const key = String(formData.get("key") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!isFeatureKey(key) || (key === "core_platform" && !enabled)) releaseError("invalid");

  const supabase = await createClient();
  const catalogItem = FEATURE_CATALOG[key as FeatureKey];

  // 1. Ensure the flag row exists in feature_flags table
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
        enabled,
        description: description || catalogItem?.description || null,
      })
      .select("id")
      .single();
    flagId = inserted?.id;
  } else {
    await supabase
      .from("feature_flags")
      .update({
        enabled,
        description: description || undefined,
      })
      .eq("id", flagId);
  }

  // 2. Call RPC
  try {
    await supabase.rpc("set_feature_flag", {
      p_key: key,
      p_enabled: enabled,
      p_description: description,
    });
  } catch {
    // Keep going if direct update succeeded
  }

  // 3. Synchronize feature_flag_environments across all environments
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

    // 4. Link into release_features for matching releases
    if (catalogItem) {
      const baseVersion = catalogItem.release.split("-")[0];
      const { data: releases } = await supabase
        .from("releases")
        .select("id, version");

      const matching = (releases ?? []).filter(
        (r) => r.version === catalogItem.release || r.version.startsWith(baseVersion)
      );

      if (matching.length > 0) {
        await supabase.from("release_features").upsert(
          matching.map((r) => ({
            release_id: r.id,
            feature_flag_id: flagId,
          })),
          { onConflict: "release_id,feature_flag_id" }
        );
      }
    }
  }

  releaseSuccess();
}

export async function quickActivateV03Suite() {
  await requireRole(ADMIN_ROLES);
  const supabase = await createClient();

  const v03Keys: FeatureKey[] = [
    "new_maintenance",
    "parts_inventory",
    "emergency_bike_support",
    "service_requests",
  ];

  // 1. Ensure v0.3.0 and v0.3.0-beta.1 releases exist and are active
  const versions = ["v0.3.0", "v0.3.0-beta.1"];
  const releaseIds: string[] = [];

  for (const ver of versions) {
    const { data: existing } = await supabase
      .from("releases")
      .select("id")
      .eq("version", ver)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("releases")
        .update({
          status: "active",
          activated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      releaseIds.push(existing.id);
    } else {
      const { data: inserted } = await supabase
        .from("releases")
        .insert({
          version: ver,
          channel: ver.includes("beta") ? "beta" : "stable",
          status: "active",
          release_notes: "Operations suite: maintenance, parts inventory, emergency support, service requests.",
          activated_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (inserted) releaseIds.push(inserted.id);
    }
  }

  // 2. Ensure all 4 flags exist and are enabled in feature_flags
  const flagIds: string[] = [];
  for (const key of v03Keys) {
    const item = FEATURE_CATALOG[key];
    const { data: existing } = await supabase
      .from("feature_flags")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("feature_flags")
        .update({ enabled: true })
        .eq("id", existing.id);
      flagIds.push(existing.id);
    } else {
      const { data: inserted } = await supabase
        .from("feature_flags")
        .insert({
          key,
          enabled: true,
          description: item.description,
        })
        .select("id")
        .single();
      if (inserted) flagIds.push(inserted.id);
    }
  }

  // 3. Sync environments
  const envs = ["development", "preview", "production"] as const;
  for (const fId of flagIds) {
    await supabase.from("feature_flag_environments").upsert(
      envs.map((env) => ({
        feature_flag_id: fId,
        environment: env,
        enabled: true,
      })),
      { onConflict: "feature_flag_id,environment" }
    );
  }

  // 4. Link release_features
  for (const rId of releaseIds) {
    await supabase.from("release_features").upsert(
      flagIds.map((fId) => ({
        release_id: rId,
        feature_flag_id: fId,
      })),
      { onConflict: "release_id,feature_flag_id" }
    );
  }

  releaseSuccess();
}

export async function assignBetaTester(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const key = String(formData.get("key") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "").trim();
  if (!isFeatureKey(key) || (!!email === !!role) || (role && !["admin", "staff", "driver"].includes(role))) {
    releaseError("invalid");
  }
  const supabase = await createClient();
  const profileId = email
    ? (await supabase.from("profiles").select("id").eq("email", email).maybeSingle()).data?.id ?? null
    : null;
  if (email && !profileId) releaseError("not-found");
  const { error } = await supabase.rpc("assign_feature_flag_tester", {
    p_key: key,
    p_profile_id: profileId,
    p_role: role ? role as "admin" | "staff" | "driver" : null,
  });
  if (error) releaseError("database");
  releaseSuccess();
}
