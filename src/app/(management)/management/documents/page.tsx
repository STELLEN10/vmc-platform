import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { DocumentsView } from "./documents-view";

export default async function DocumentsManagementPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  const [
    { data: contracts },
    { data: paymentProofs },
    { data: maintenanceAttachments },
    { data: emergencyAttachments },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, driver_id, weekly_amount, start_date, status, document_storage_path, drivers(profiles(full_name))")
      .order("created_at", { ascending: false }),
    supabase
      .from("payment_proofs")
      .select("id, payment_period_id, file_name, file_size_bytes, mime_type, storage_path, created_at, submitted_by")
      .order("created_at", { ascending: false }),
    supabase
      .from("maintenance_attachments")
      .select("id, maintenance_request_id, file_name, file_size_bytes, mime_type, storage_path, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("emergency_attachments")
      .select("id, emergency_report_id, file_name, file_size_bytes, mime_type, storage_path, created_at")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="OPERATIONS INTELLIGENCE"
        title="Documents & Evidence Center"
        description="Unified registry for executed contracts, driver compliance credentials, payment receipts, and maintenance evidence."
      />
      <DocumentsView
        contracts={contracts ?? []}
        paymentProofs={paymentProofs ?? []}
        maintenanceAttachments={maintenanceAttachments ?? []}
        emergencyAttachments={emergencyAttachments ?? []}
      />
    </div>
  );
}
