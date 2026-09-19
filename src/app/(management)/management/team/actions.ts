"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import type { AppRole } from "@/lib/database.types";
import { createAdminClient, getSiteUrl } from "@/lib/supabase/admin";

function readText(formData: FormData, field: string) {
  return String(formData.get(field) ?? "").trim();
}

export async function inviteTeamMember(formData: FormData) {
  const admin = await requireRole(ADMIN_ROLES);
  const fullName = readText(formData, "fullName");
  const email = readText(formData, "email").toLowerCase();
  const role = readText(formData, "role") as AppRole;

  if (
    fullName.length < 2 ||
    fullName.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !["admin", "staff"].includes(role)
  ) {
    redirect("/management/team?error=invalid-invitation");
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") || headerList.get("host") || "";
  const proto = headerList.get("x-forwarded-proto") || "https";
  const origin = host ? `${proto}://${host}` : getSiteUrl();
  const redirectTo = `${origin}/auth/callback?next=/management/set-password`;

  const client = createAdminClient();
  let targetUserId: string | null = null;
  let actionLink: string | null = null;

  // 1. Attempt standard Supabase invite email delivery
  const { data: inviteData, error: inviteError } = await client.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role },
    redirectTo,
  });

  if (!inviteError && inviteData.user) {
    targetUserId = inviteData.user.id;
  } else {
    // 2. If inviteUserByEmail failed (e.g. SMTP issues or user exists), generate a direct setup link
    const { data: linkData, error: linkError } = await client.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        data: { full_name: fullName, role },
        redirectTo,
      },
    });

    if (!linkError && linkData?.user) {
      targetUserId = linkData.user.id;
      actionLink = linkData.properties?.action_link ?? null;
    } else {
      // 3. If user already exists in auth.users, generate recovery link to let them set management password
      const { data: userList } = await client.auth.admin.listUsers();
      const existing = userList?.users?.find((u) => u.email?.toLowerCase() === email);
      if (existing) {
        targetUserId = existing.id;
        const { data: recData } = await client.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo },
        });
        actionLink = recData?.properties?.action_link ?? null;
      }
    }
  }

  if (!targetUserId) {
    redirect("/management/team?error=invite-failed");
  }

  // Assign role to public.profiles securely on the server
  const { error: profileError } = await client.from("profiles").upsert(
    { id: targetUserId, full_name: fullName, email, role },
    { onConflict: "id" },
  );

  const { error: staffProfileError } =
    role === "staff"
      ? await client.from("staff_profiles").upsert({ profile_id: targetUserId }, { onConflict: "profile_id" })
      : { error: null };

  if (profileError || staffProfileError) {
    throw new Error(
      "The invitation was processed, but staff access could not be provisioned in the database. Contact technical support.",
    );
  }

  await client.from("audit_logs").insert({
    actor_id: admin.id,
    action: role === "admin" ? "admin_invited" : "staff_invited",
    entity_type: "profile",
    entity_id: targetUserId,
    new_values: { email, role },
  });

  revalidatePath("/management/team");

  const queryParams = new URLSearchParams();
  queryParams.set("invited", "1");
  queryParams.set("email", email);
  if (actionLink) {
    queryParams.set("link", actionLink);
  }

  redirect(`/management/team?${queryParams.toString()}`);
}
