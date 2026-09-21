import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type AuditEventParams = {
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Json | null;
  newValues?: Json | null;
  metadata?: Record<string, unknown>;
};

/**
 * Records an immutable operational audit event in the database.
 * Derives actor identity strictly from the authenticated session.
 */
export async function recordAuditEvent({
  action,
  entityType,
  entityId = null,
  oldValues = null,
  newValues = null,
  metadata = {},
}: AuditEventParams): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthenticated audit attempt" };
    }

    const { data, error } = await supabase.rpc("log_audit_event", {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId,
      p_old_values: oldValues,
      p_new_values: newValues,
      p_metadata: metadata as Json,
    });

    if (error) {
      console.error("Failed to record audit event via RPC, attempting direct insert:", error);
      // Fallback insert if RPC not yet run in environment
      const { data: inserted, error: insertError } = await supabase
        .from("audit_logs")
        .insert({
          actor_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          old_values: oldValues,
          new_values: newValues,
          metadata: metadata as Json,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Audit log direct insert failed:", insertError);
        return { success: false, error: insertError.message };
      }

      return { success: true, id: inserted?.id };
    }

    return { success: true, id: data };
  } catch (err) {
    console.error("Unexpected error in recordAuditEvent:", err);
    return { success: false, error: "Failed to persist audit event" };
  }
}
