import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { getSupabasePublicConfig } from "@/lib/env";

export function createClient() {
  const { url, publishableKey } = getSupabasePublicConfig();

  return createBrowserClient<Database>(url, publishableKey);
}
