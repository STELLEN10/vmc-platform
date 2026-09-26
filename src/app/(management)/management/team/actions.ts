"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

function readText(formData: FormData, field: string) { return String(formData.get(field) ?? "").trim(); }

export async function createTeamMember(formData: FormData) {
  const admin = await requireRole(ADMIN_ROLES);
  const fullName = readText(formData, "fullName");
  const email = readText(formData, "email").toLowerCase();
  const role = readText(formData, "role") as AppRole;
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2 || fullName.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !["admin", "staff"].includes(role) || password.length < 12) {
    redirect("/management/team?error=invalid-account");
  }

  const client = createAdminClient();
  const { data: created, error: createError } = await client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName, role } });

  if (createError || !created.user) {
    console.error("Management account creation failed:", createError);
    redirect("/management/team?error=create-failed");
  }

  const targetUserId = created.user.id;
  const { error: profileError } = await client.from("profiles").upsert({ id: targetUserId, full_name: fullName, email, role }, { onConflict: "id" });
  const { error: staffProfileError } = role === "staff" ? await client.from("staff_profiles").upsert({ profile_id: targetUserId }, { onConflict: "profile_id" }) : { error: null };

  if (profileError || staffProfileError) {
    console.error("Management profile provisioning failed:", { profileError, staffProfileError });
    redirect("/management/team?error=create-failed");
  }

  await client.from("audit_logs").insert({ actor_id: admin.id, action: role === "admin" ? "admin_created" : "staff_created", entity_type: "profile", entity_id: targetUserId, new_values: { email, role } });
  revalidatePath("/management/team");
  revalidatePath("/management");
  redirect(`/management/team?created=1&email=${encodeURIComponent(email)}`);
}
