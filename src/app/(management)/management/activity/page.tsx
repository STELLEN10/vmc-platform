import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { requireFeature } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { ActivityView, type AuditLogItem } from "./activity-view";

export default async function ManagementActivityPage() {
  await requireRole(MANAGEMENT_ROLES);
  await requireFeature("global_activity_audit");
  const supabase = await createClient();

  const { data: rawLogs } = await supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  // Fetch unique actors to populate actor names and roles
  const actorIds = Array.from(
    new Set((rawLogs ?? []).map((l) => l.actor_id).filter(Boolean))
  ) as string[];

  const { data: profiles } = actorIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, role").in("id", actorIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const logs: AuditLogItem[] = (rawLogs ?? []).map((l) => {
    const prof = l.actor_id ? profileMap.get(l.actor_id) : null;
    return {
      id: l.id,
      actorId: l.actor_id,
      actorName: prof?.full_name || (l.actor_id ? "Operations Staff" : "System Service"),
      actorRole: prof?.role || "system",
      action: l.action,
      entityType: l.entity_type,
      entityId: l.entity_id,
      oldValues: (l.old_values as Record<string, unknown>) || null,
      newValues: (l.new_values as Record<string, unknown>) || null,
      metadata: (l.metadata as Record<string, unknown>) || {},
      createdAt: l.created_at,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Global Operations Activity & Audit
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tamper-evident system activity log capturing payment reviews, maintenance transitions, release activations, and emergency events.
        </p>
      </div>

      <ActivityView logs={logs} />
    </div>
  );
}
