"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { createAdminClient, getSiteUrl } from "@/lib/supabase/admin";

function readText(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

export async function inviteStaffMember(formData: FormData) {
  const admin = await requireRole(ADMIN_ROLES);
  const fullName = readText(formData, "fullName");
  const email = readText(formData, "email").toLowerCase();

  if (fullName.length < 2 || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/management/team?error=invalid-invitation");
  }

  const client = createAdminClient();
  const { data, error } = await client.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
    redirectTo: `${getSiteUrl()}/auth/callback?next=/set-password`,
  });

  if (error || !data.user) {
    redirect("/management/team?error=invite-failed");
  }

  // The Auth trigger creates a default driver profile. Promotion happens only
  // here, after the caller passed both server and database admin checks.
  const { error: profileError } = await client.from("profiles").upsert(
    { id: data.user.id, full_name: fullName, email, role: "staff" },
    { onConflict: "id" },
  );
  const { error: staffProfileError } = await client
    .from("staff_profiles")
    .upsert({ profile_id: data.user.id }, { onConflict: "profile_id" });

  if (profileError || staffProfileError) {
    throw new Error("The invitation was sent, but staff access could not be provisioned. Contact VMC technical support before the recipient signs in.");
  }

  await client.from("audit_logs").insert({
    actor_id: admin.id,
    action: "staff_invited",
    entity_type: "profile",
    entity_id: data.user.id,
    new_values: { email, role: "staff" },
  });

  revalidatePath("/management/team");
  redirect("/management/team?invited=1");
}
