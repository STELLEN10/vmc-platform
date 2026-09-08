"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import type { ReleaseChannel, ReleaseStatus } from "@/lib/database.types";
import { isFeatureKey } from "@/lib/features/catalog";
import { createClient } from "@/lib/supabase/server";

const releaseChannels: ReleaseChannel[] = ["stable", "beta"];
const releaseStatuses: ReleaseStatus[] = ["draft", "testing", "active", "paused", "rolled_back", "retired"];

function releaseError(reason: "invalid" | "database" | "not-found") {
  redirect(`/management/releases?error=${reason}`);
}

function releaseSuccess() {
  revalidatePath("/management/releases");
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

  const { error } = await (await createClient()).rpc("create_release", {
    p_version: version,
    p_channel: channel,
    p_release_notes: releaseNotes,
  });

  if (error) releaseError("database");
  releaseSuccess();
}

export async function changeReleaseStatus(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const releaseId = String(formData.get("releaseId") ?? "");
  const status = String(formData.get("status") ?? "") as ReleaseStatus;

  if (!releaseId || !releaseStatuses.includes(status)) releaseError("invalid");

  const { error } = await (await createClient()).rpc("transition_release", {
    p_release_id: releaseId,
    p_status: status,
    p_note: null,
  });

  if (error) releaseError("database");
  releaseSuccess();
}

export async function setFeatureFlag(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const key = String(formData.get("key") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!isFeatureKey(key) || (key === "core_platform" && !enabled)) releaseError("invalid");

  const { error } = await (await createClient()).rpc("set_feature_flag", {
    p_key: key,
    p_enabled: enabled,
    p_description: description,
  });

  if (error) releaseError("database");
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
