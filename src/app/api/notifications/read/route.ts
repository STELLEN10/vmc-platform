import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedProfile } from "@/lib/auth/authorization";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const profile = await getAuthenticatedProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId, markAll, isManagement } = await req.json();
    const supabase = createAdminClient();

    if (isManagement) {
      if (markAll) {
        await supabase
          .from("management_notifications")
          .update({ read_at: new Date().toISOString(), read_by: profile.id })
          .is("read_at", null);
      } else if (notificationId) {
        await supabase
          .from("management_notifications")
          .update({ read_at: new Date().toISOString(), read_by: profile.id })
          .eq("id", notificationId);
      }
    } else {
      if (markAll) {
        await supabase
          .from("notifications")
          .update({ status: "read", read_at: new Date().toISOString() })
          .eq("recipient_profile_id", profile.id)
          .eq("status", "unread");
      } else if (notificationId) {
        await supabase
          .from("notifications")
          .update({ status: "read", read_at: new Date().toISOString() })
          .eq("id", notificationId)
          .eq("recipient_profile_id", profile.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Mark notification read failed:", err);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

