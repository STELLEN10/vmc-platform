import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/lib/database.types";
import { getSupabasePublicConfig } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey, isConfigured } = getSupabasePublicConfig();

  if (!isConfigured) {
    return response;
  }

  try {
    const supabase = createServerClient<Database>(url, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });

    // Verify and refresh the session cookie. This ensures expired tokens are properly renewed.
    await supabase.auth.getUser();
  } catch {
    // Suppress network or session refresh errors in development/unconfigured environments
  }

  return response;
}
