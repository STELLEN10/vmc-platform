import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorization";
import { ADMIN_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRole(ADMIN_ROLES);
    const { key, value } = await req.json();

    if (!key) {
      return NextResponse.json({ error: "Missing key" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("system_settings")
      .upsert({
        key,
        value,
        updated_by: admin.id,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to update system setting:", err);
    return NextResponse.json({ error: "Unauthorized or failed to save" }, { status: 500 });
  }
}
