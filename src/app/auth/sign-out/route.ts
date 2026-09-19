import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/auth/redirects";
import { createClient } from "@/lib/supabase/server";

async function handleSignOut(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const requestUrl = new URL(request.url);
  const next = safeInternalPath(requestUrl.searchParams.get("next")) ?? "/login";

  return NextResponse.redirect(new URL(next, request.url), { status: 303 });
}

export async function POST(request: NextRequest) {
  return handleSignOut(request);
}

export async function GET(request: NextRequest) {
  return handleSignOut(request);
}
