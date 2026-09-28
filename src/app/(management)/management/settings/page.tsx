import Link from "next/link";
import { AccountSettingsForm } from "@/components/account-settings-form";
import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { SystemSettingsPanel } from "./system-settings-panel";

export default async function ManagementSettingsPage() {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from("system_settings")
    .select("key, value, category, description, updated_at")
    .order("category", { ascending: true });

  const fallbackSettings = [
    {
      key: "default_weekly_lease_rate_zar",
      value: 650,
      category: "financial",
      description: "Standard weekly motorcycle lease deduction in South African Rand.",
      updated_at: new Date().toISOString(),
    },
    {
      key: "payment_grace_period_days",
      value: 2,
      category: "financial",
      description: "Grace days permitted after due date before overdue arrears status activates.",
      updated_at: new Date().toISOString(),
    },
    {
      key: "service_interval_km",
      value: 3000,
      category: "operations",
      description: "Target kilometer threshold between motorcycle routine workshop oil & plug services.",
      updated_at: new Date().toISOString(),
    },
    {
      key: "emergency_dispatch_hotline",
      value: "+27 76 668 1879",
      category: "safety",
      description: "Dedicated 24/7 road assistance and medical dispatcher telephone number.",
      updated_at: new Date().toISOString(),
    },
  ];

  const activeSettings = settings && settings.length > 0 ? settings : fallbackSettings;

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="VMC MANAGEMENT"
        title="Settings & Business Rules"
        description="Configure your personal management credentials as well as global fleet operation rules."
        actions={<Link className="text-action" href="/management">Back to dashboard</Link>}
      />
      <div className="space-y-6">
        <SystemSettingsPanel settings={activeSettings} isAdmin={profile.role === "admin"} />
        <section className="panel space-y-4">
          <div>
            <h2 className="text-base font-bold text-ink">Personal Profile & Credentials</h2>
            <p className="text-xs text-muted">Update your display name and change your password.</p>
          </div>
          <AccountSettingsForm profileId={profile.id} fullName={profile.fullName} email={profile.email} />
        </section>
      </div>
    </div>
  );
}
