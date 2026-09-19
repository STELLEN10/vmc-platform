import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsView } from "./analytics-view";

export default async function AnalyticsPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  const [
    { data: bikes },
    { data: payments },
    { data: maintenance },
    { data: emergencies },
    { data: onboardings },
  ] = await Promise.all([
    supabase.from("bikes").select("id, model, brand, status, created_at"),
    supabase.from("payment_periods").select("id, amount_due, status, due_date, submitted_at, verified_at"),
    supabase.from("maintenance_requests").select("id, category, severity, status, created_at, resolved_at"),
    supabase.from("emergency_reports").select("id, emergency_type, severity, status, created_at, resolved_at"),
    supabase.from("driver_onboardings").select("profile_id, onboarding_status, created_at"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="OPERATIONS INTELLIGENCE"
        title="Fleet & Financial Analytics"
        description="Comprehensive operational reporting, fleet utilization, financial collection metrics, and data export for VMC management."
      />
      <AnalyticsView
        bikes={bikes ?? []}
        payments={
          (payments ?? []).map((p) => ({
            id: p.id,
            amount: p.amount_due,
            status: p.status,
            due_date: p.due_date,
            paid_at: p.verified_at,
            payment_type: "weekly_rental",
          }))
        }
        maintenance={maintenance ?? []}
        emergencies={emergencies ?? []}
        drivers={
          (onboardings ?? []).map((o) => ({
            id: o.profile_id,
            status: o.onboarding_status,
            onboarding_status: o.onboarding_status,
            created_at: o.created_at,
          }))
        }
      />
    </div>
  );
}
