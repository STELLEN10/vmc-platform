import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { requireFeature } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { DocumentsView, type UnifiedDocumentItem } from "./documents-view";

type RawContractDoc = {
  id: string;
  document_storage_path: string | null;
  document_file_name: string | null;
  document_uploaded_at: string | null;
  created_at: string;
  drivers: {
    id: string;
    profile_id: string;
    profiles: { id: string; full_name: string } | null;
  } | null;
  bikes: { id: string; registration: string } | null;
};

type RawProofDoc = {
  id: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
  payment_periods: {
    id: string;
    period_number: number;
    contracts: {
      drivers: {
        profile_id: string;
        profiles: { id: string; full_name: string } | null;
      } | null;
      bikes: { registration: string } | null;
    } | null;
  } | null;
};

type RawMaintDoc = {
  id: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
  maintenance_requests: {
    id: string;
    title: string;
    drivers: {
      profile_id: string;
      profiles: { id: string; full_name: string } | null;
    } | null;
    bikes: { registration: string } | null;
  } | null;
};

type RawEmergencyDoc = {
  id: string;
  file_name: string;
  storage_bucket: string;
  storage_path: string;
  created_at: string;
  emergency_reports: {
    id: string;
    emergency_type: string;
    drivers: {
      profile_id: string;
      profiles: { id: string; full_name: string } | null;
    } | null;
    bikes: { registration: string } | null;
  } | null;
};

export default async function ManagementDocumentsPage() {
  await requireRole(MANAGEMENT_ROLES);
  await requireFeature("management_documents");
  const supabase = await createClient();

  const documents: UnifiedDocumentItem[] = [];

  // 1. Contracts with documents
  const { data: rawContracts } = await supabase
    .from("contracts")
    .select(`
      id,
      document_storage_path,
      document_file_name,
      document_uploaded_at,
      document_file_size_bytes,
      created_at,
      drivers (
        id,
        profile_id,
        profiles (
          id,
          full_name
        )
      ),
      bikes (
        id,
        registration
      )
    `)
    .not("document_storage_path", "is", null);

  ((rawContracts || []) as unknown as RawContractDoc[]).forEach((c) => {
    if (c.document_storage_path) {
      documents.push({
        id: `contract-${c.id}`,
        category: "contract",
        fileName: c.document_file_name || `Contract_${c.bikes?.registration || "Bike"}.pdf`,
        storageBucket: "vmc-application-documents",
        storagePath: c.document_storage_path,
        driverName: c.drivers?.profiles?.full_name || "Unknown Driver",
        driverProfileId: c.drivers?.profile_id || "",
        bikeRegistration: c.bikes?.registration || "Unassigned",
        uploadedAt: c.document_uploaded_at || c.created_at,
      });
    }
  });

  // 2. Payment Proofs
  const { data: rawProofs } = await supabase
    .from("payment_proofs")
    .select(`
      id,
      file_name,
      storage_bucket,
      storage_path,
      created_at,
      payment_periods (
        id,
        period_number,
        contracts (
          drivers (
            profile_id,
            profiles (
              id,
              full_name
            )
          ),
          bikes (
            registration
          )
        )
      )
    `);

  ((rawProofs || []) as unknown as RawProofDoc[]).forEach((p) => {
    const period = p.payment_periods;
    const contract = period?.contracts;
    documents.push({
      id: `proof-${p.id}`,
      category: "payment_proof",
      fileName: p.file_name || `Payment_Proof_Wk${period?.period_number || ""}`,
      storageBucket: p.storage_bucket || "vmc-application-documents",
      storagePath: p.storage_path,
      driverName: contract?.drivers?.profiles?.full_name || "Driver",
      driverProfileId: contract?.drivers?.profile_id || "",
      bikeRegistration: contract?.bikes?.registration || "Unassigned",
      uploadedAt: p.created_at,
    });
  });

  // 3. Maintenance Attachments
  const { data: rawMaintAttachments } = await supabase
    .from("maintenance_attachments")
    .select(`
      id,
      file_name,
      storage_bucket,
      storage_path,
      created_at,
      maintenance_requests (
        id,
        title,
        drivers (
          profile_id,
          profiles (
            id,
            full_name
          )
        ),
        bikes (
          registration
        )
      )
    `);

  ((rawMaintAttachments || []) as unknown as RawMaintDoc[]).forEach((m) => {
    const req = m.maintenance_requests;
    documents.push({
      id: `maint-${m.id}`,
      category: "maintenance",
      fileName: m.file_name || `Maintenance_${req?.title || "Receipt"}`,
      storageBucket: m.storage_bucket || "vmc-application-documents",
      storagePath: m.storage_path,
      driverName: req?.drivers?.profiles?.full_name || "Driver",
      driverProfileId: req?.drivers?.profile_id || "",
      bikeRegistration: req?.bikes?.registration || "Unassigned",
      uploadedAt: m.created_at,
    });
  });

  // 4. Emergency Attachments
  const { data: rawEmergencyAttachments } = await supabase
    .from("emergency_attachments")
    .select(`
      id,
      file_name,
      storage_bucket,
      storage_path,
      created_at,
      emergency_reports (
        id,
        emergency_type,
        drivers (
          profile_id,
          profiles (
            id,
            full_name
          )
        ),
        bikes (
          registration
        )
      )
    `);

  ((rawEmergencyAttachments || []) as unknown as RawEmergencyDoc[]).forEach((em) => {
    const rep = em.emergency_reports;
    documents.push({
      id: `emergency-${em.id}`,
      category: "emergency",
      fileName: em.file_name || `Emergency_${rep?.emergency_type || "Photo"}`,
      storageBucket: em.storage_bucket || "vmc-application-documents",
      storagePath: em.storage_path,
      driverName: rep?.drivers?.profiles?.full_name || "Driver",
      driverProfileId: rep?.drivers?.profile_id || "",
      bikeRegistration: rep?.bikes?.registration || "Unassigned",
      uploadedAt: em.created_at,
    });
  });

  // Sort latest first
  documents.sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Central Documents Vault
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Unified, secure document repository spanning contracts, payment receipts, maintenance invoices, and emergency incident evidence.
        </p>
      </div>

      <DocumentsView documents={documents} />
    </div>
  );
}
