"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import type { ReleaseChannel, ReleaseStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

const releaseChannels: ReleaseChannel[] = ["stable", "beta"];
const releaseStatuses: ReleaseStatus[] = ["draft", "testing", "active", "paused", "rolled_back", "retired"];

export async function createRelease(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const version = String(formData.get("version") ?? "").trim();
  const channel = String(formData.get("channel") ?? "") as ReleaseChannel;
  const releaseNotes = String(formData.get("releaseNotes") ?? "").trim() || null;

  if (!/^v\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/i.test(version) || !releaseChannels.includes(channel)) {
    throw new Error("Provide a valid semantic VMC version and release channel.");
  }

  const { error } = await (await createClient()).rpc("create_release", {
    p_version: version,
    p_channel: channel,
    p_release_notes: releaseNotes,
  });

  if (error) throw new Error("Could not create the release.");
  revalidatePath("/management/releases");
}

export async function changeReleaseStatus(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const releaseId = String(formData.get("releaseId") ?? "");
  const status = String(formData.get("status") ?? "") as ReleaseStatus;

  if (!releaseId || !releaseStatuses.includes(status)) throw new Error("Invalid release transition.");

  const { error } = await (await createClient()).rpc("transition_release", {
    p_release_id: releaseId,
    p_status: status,
    p_note: null,
  });

  if (error) throw new Error("Could not change the release status.");
  revalidatePath("/management/releases");
}

export async function setFeatureFlag(formData: FormData) {
  await requireRole(ADMIN_ROLES);
  const key = String(formData.get("key") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "true";
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!/^[a-z][a-z0-9_]{2,80}$/.test(key)) throw new Error("Feature flag keys must use lowercase letters, numbers and underscores.");

  const { error } = await (await createClient()).rpc("set_feature_flag", {
    p_key: key,
    p_enabled: enabled,
    p_description: description,
  });

  if (error) throw new Error("Could not update the feature flag.");
  revalidatePath("/management/releases");
}
