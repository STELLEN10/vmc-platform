import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ActivityView } from "./activity-view";

export default async function ManagementActivityPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  const [
    { data: auditLogs },
    { data: recentEmergencies },
    { data: recentMaintenance },
    { data: recentPayments },
  ] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id, actor_id, action, entity_type, entity_id, old_values, new_values, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("emergency_reports")
      .select("id, emergency_type, severity, status, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("maintenance_requests")
      .select("id, title, category, severity, status, created_at, resolved_at")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payments")
      .select("id, amount, status, payment_type, created_at, paid_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="OPERATIONS INTELLIGENCE"
        title="Audit Trail & Operations Activity"
        description="Immutable operational timeline tracking entity modifications, safety dispatches, payment reconciliations, and staff decisions."
      />
      <ActivityView
        auditLogs={auditLogs ?? []}
        emergencies={recentEmergencies ?? []}
        maintenance={recentMaintenance ?? []}
        payments={recentPayments ?? []}
      />
    </div>
  );
}
