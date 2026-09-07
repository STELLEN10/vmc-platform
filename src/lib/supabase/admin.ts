import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { getSupabasePublicConfig } from "@/lib/env";

function getAdminKey() {
  const key = process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!key) {
    throw new Error("VMC staff invitations are not configured on this server.");
  }

  return key;
}

/** Server-only privileged client. Never import this from a Client Component. */
export function createAdminClient() {
  const { url } = getSupabasePublicConfig();

  return createClient<Database>(url, getAdminKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function getSiteUrl() {
  const value = process.env.VMC_SITE_URL?.trim();
  if (!value) throw new Error("VMC_SITE_URL is required before staff invitations can be sent.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("VMC_SITE_URL must be an absolute URL.");
  }

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("VMC_SITE_URL must use HTTPS outside local development.");
  }

  return url.origin;
}
