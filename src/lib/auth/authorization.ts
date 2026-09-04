import { redirect } from "next/navigation";

import type { AppRole } from "@/lib/database.types";
import { isAppRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedProfile = {
  id: string;
  fullName: string;
  email: string | null;
  role: AppRole;
};

async function getProfileForUser(userId: string): Promise<AuthenticatedProfile | null> {
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile || !isAppRole(profile.role)) {
    return null;
  }

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
  };
}

export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  return getProfileForUser(user.id);
}

export async function requireRole(allowedRoles: readonly AppRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const profile = await getProfileForUser(user.id);

  if (!profile) {
    redirect("/access-denied");
  }

  if (!allowedRoles.includes(profile.role)) {
    redirect("/access-denied");
  }

  return profile;
}
