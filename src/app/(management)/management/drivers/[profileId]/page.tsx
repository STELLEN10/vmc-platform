import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { reviewDriverOnboarding } from "./actions";
import { AssignBikeForm } from "./assign-bike-form";
import { CreateContractForm } from "./create-contract-form";

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

  return <>
    <PageHeading eyebrow="VMC MANAGEMENT · DRIVER REVIEW" title={profile.full_name || "New driver"} description="Review driver-provided onboarding information. Motorcycle, contract and operational assignments remain VMC-managed." actions={<Link className="text-action" href="/management/drivers">Back to drivers</Link>} />
    <div className="review-grid">
      <section className="panel"><p className="card-label">APPLICATION STATUS</p><StatusBadge tone={onboarding.onboarding_status === "active" || onboarding.onboarding_status === "approved" ? "green" : "blue"}>{(onboarding.onboarding_status ?? "").replaceAll("_", " ")}</StatusBadge><div className="detail-list"><span>Email<strong>{profile.email ?? "Not provided"}</strong></span><span>Phone<strong>{profile.phone ?? "Not provided"}</strong></span><span>Emergency contact<strong>{onboarding.emergency_contact_name ?? "Not provided"}</strong></span><span>Emergency phone<strong>{onboarding.emergency_contact_phone ?? "Not provided"}</strong></span><span>Address<strong>{onboarding.residential_address ?? "Not provided"}</strong></span><span>Platforms<strong>{onboarding.delivery_platforms.map((item) => item.replaceAll("_", " ")).join(", ") || "Not provided"}</strong></span></div></section>
      <section className="panel"><p className="card-label">VMC-MANAGED INFORMATION</p><h2>Operational assignment</h2><div className="detail-list"><span>Bike<strong>{driver?.bike_id ? "Assigned" : "Pending"}</strong></span><span>Driver record<strong>{driver?.status ?? "Not created"}</strong></span><span>Contract start<strong>{onboarding.contract_start_date ?? "To be set by VMC"}</strong></span></div>{driver && <AssignBikeForm profileId={profileId} assignedBikeId={driver.bike_id} availableBikes={availableBikes ?? []} />}{driver && (!contracts || contracts.length === 0) && <CreateContractForm profileId={profileId} driverId={driver.id} bikeId={driver.bike_id} />}{contracts && contracts.length > 0 && <div className="mt-4 pt-4 border-t border-line text-xs"><p className="font-semibold mb-2">Active Contract</p><div className="flex justify-between"><span>Start Date</span><span>{contracts[0].start_date}</span></div><div className="flex justify-between"><span>Weekly Rent</span><span>R{contracts[0].weekly_amount}</span></div></div>}</section>
      <form className="panel review-form" action={reviewDriverOnboarding}><input type="hidden" name="profileId" value={profile.id} /><p className="card-label">VMC REVIEW DECISION</p><label>Review note<textarea name="reviewNote" defaultValue={onboarding.review_note ?? ""} placeholder="Optional note shown to the driver" /></label><label>Set status<select name="status" defaultValue={onboarding.onboarding_status === "submitted" ? "under_review" : onboarding.onboarding_status}><option value="under_review">Under review</option><option value="changes_requested">Request changes</option><option value="approved">Approve</option><option value="active">Activate</option><option value="rejected">Reject</option><option value="suspended">Suspend</option></select></label><button className="button button--primary" type="submit">Save review decision</button></form>
    </div>
  </>;
}
