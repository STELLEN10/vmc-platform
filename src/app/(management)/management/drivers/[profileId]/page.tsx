import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { AssignBikeForm } from "./assign-bike-form";
import { ContractDocumentForm } from "./contract-document-form";
import { CreateContractForm } from "./create-contract-form";
import { DriverReviewDecisionForm } from "./driver-review-decision-form";

export default async function ManagementDriverReviewPage({ params }: { params: Promise<{ profileId: string }> }) {
  await requireRole(MANAGEMENT_ROLES);
  const { profileId } = await params;
  const supabase = await createClient();
  const [{ data: profile }, { data: onboarding }, { data: driver }, { data: availableBikes }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, phone").eq("id", profileId).eq("role", "driver").maybeSingle(),
    supabase.from("driver_onboardings").select("*").eq("profile_id", profileId).maybeSingle(),
    supabase.from("drivers").select("id, bike_id, status, start_date").eq("profile_id", profileId).maybeSingle(),
    supabase.from("bikes").select("id, brand, model, registration_number").eq("status", "available"),
  ]);

  if (!profile || !onboarding) notFound();

  const { data: contracts } = driver?.id
    ? await supabase.from("contracts").select("*").eq("driver_id", driver.id).order("created_at", { ascending: false })
    : { data: null };

  let contractDocumentUrl: string | null = null;
  if (contracts && contracts.length > 0 && contracts[0].document_storage_path) {
    const { data: signed } = await supabase.storage
      .from("vmc-application-documents")
      .createSignedUrl(contracts[0].document_storage_path, 300);
    contractDocumentUrl = signed?.signedUrl ?? null;
  }

  return <>
    <PageHeading eyebrow="VMC MANAGEMENT · DRIVER REVIEW" title={profile.full_name || "New driver"} description="Review driver-provided onboarding information. Motorcycle, contract and operational assignments remain VMC-managed." actions={<Link className="text-action" href="/management/drivers">Back to drivers</Link>} />
    <div className="review-grid">
      <section className="panel"><p className="card-label">APPLICATION STATUS</p><StatusBadge tone={onboarding.onboarding_status === "active" || onboarding.onboarding_status === "approved" ? "green" : "blue"}>{(onboarding.onboarding_status ?? "").replaceAll("_", " ")}</StatusBadge><div className="detail-list"><span>Email<strong>{profile.email ?? "Not provided"}</strong></span><span>Phone<strong>{profile.phone ?? "Not provided"}</strong></span><span>Emergency contact<strong>{onboarding.emergency_contact_name ?? "Not provided"}</strong></span><span>Emergency phone<strong>{onboarding.emergency_contact_phone ?? "Not provided"}</strong></span><span>Address<strong>{onboarding.residential_address ?? "Not provided"}</strong></span><span>Platforms<strong>{onboarding.delivery_platforms.map((item) => item.replaceAll("_", " ")).join(", ") || "Not provided"}</strong></span></div></section>
      <section className="panel"><p className="card-label">VMC-MANAGED INFORMATION</p><h2>Operational assignment</h2><div className="detail-list"><span>Bike<strong>{driver?.bike_id ? "Assigned" : "Pending"}</strong></span><span>Driver record<strong>{driver?.status ?? "Not created"}</strong></span><span>Contract start<strong>{onboarding.contract_start_date ?? "To be set by VMC"}</strong></span></div>{driver && <AssignBikeForm profileId={profileId} assignedBikeId={driver.bike_id} availableBikes={availableBikes ?? []} />}{driver && (!contracts || contracts.length === 0) && <CreateContractForm profileId={profileId} driverId={driver.id} bikeId={driver.bike_id} />}{contracts && contracts.length > 0 && <div className="mt-4 pt-4 border-t border-line text-xs"><p className="font-semibold mb-2">Active Contract</p><div className="flex justify-between"><span>Start Date</span><span>{contracts[0].start_date}</span></div><div className="flex justify-between"><span>Weekly Rent</span><span>R{contracts[0].weekly_amount}</span></div><div className="flex justify-between"><span>Total Weeks</span><span>{contracts[0].total_weeks}</span></div><ContractDocumentForm profileId={profileId} contractId={contracts[0].id} documentFileName={contracts[0].document_file_name} documentStoragePath={contracts[0].document_storage_path} documentUploadedAt={contracts[0].document_uploaded_at} viewUrl={contractDocumentUrl} /></div>}</section>
      <DriverReviewDecisionForm
        profileId={profile.id}
        initialStatus={onboarding.onboarding_status}
        initialReviewNote={onboarding.review_note}
      />
    </div>
  </>;
}
