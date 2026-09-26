import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { safeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeInternalPath(requestUrl.searchParams.get("next")) ?? "/management/login";

  // 1. PKCE flow code exchange
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // 2. Token hash OTP verification
  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // 3. Implicit flow: The tokens are in the client-side URL hash (#access_token=...&type=invite).
  // HTTP requests do not include hash fragments on the server.
  // Redirect to /auth/confirm with the target next path; the browser automatically carries the hash over.
  return NextResponse.redirect(
    new URL(`/auth/confirm?next=${encodeURIComponent(next)}`, request.url),
  );
}
