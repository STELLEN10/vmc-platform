"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import type { DriverOnboardingStatus } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/client";

type OnboardingData = {
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  residential_address: string | null;
  delivery_platforms: string[];
  onboarding_status: DriverOnboardingStatus;
  review_note: string | null;
} | null;

type Props = {
  profile: { id: string; fullName: string; phone: string | null; email: string | null };
  onboarding: OnboardingData;
  hasAssignedBike: boolean;
};

const platforms = [
  ["uber_eats", "Uber Eats"],
  ["checkers_sixty60", "Checkers Sixty60"],
  ["mr_d", "Mr D"],
  ["takealot", "Takealot"],
] as const;

const statusLabels: Record<DriverOnboardingStatus, string> = {
  pending: "Pending details",
  incomplete: "Incomplete",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  active: "Active",
  changes_requested: "Changes requested",
  rejected: "Not approved",
  suspended: "Suspended",
};

export function DriverOnboardingForm({ profile, onboarding, hasAssignedBike }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<DriverOnboardingStatus>(onboarding?.onboarding_status ?? "pending");
  const [platformValues, setPlatformValues] = useState<string[]>(onboarding?.delivery_platforms ?? []);
  const lockedForReview = ["submitted", "under_review", "approved", "active", "rejected", "suspended"].includes(status);
  const canEdit = !lockedForReview || status === "changes_requested";

  const completion = useMemo(() => {
    const completed = [
      Boolean(profile.fullName),
      Boolean(profile.phone),
      Boolean(onboarding?.emergency_contact_name),
      Boolean(onboarding?.emergency_contact_phone),
      Boolean(onboarding?.residential_address),
      platformValues.length > 0,
    ].filter(Boolean).length;
    return Math.round((completed / 6) * 100);
  }, [onboarding, platformValues, profile.fullName, profile.phone]);

  function togglePlatform(value: string) {
    setPlatformValues((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function save(event: FormEvent<HTMLFormElement>, submitForReview: boolean) {
    event.preventDefault();
    if (!canEdit) return;
    setMessage(null);
    setIsSaving(true);
    const data = new FormData(event.currentTarget);
    const fullName = String(data.get("fullName") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const nextStatus: DriverOnboardingStatus = submitForReview ? "submitted" : "incomplete";
    const supabase = createClient();

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", profile.id);

    if (profileError) {
      setMessage("We could not save your personal details. Please try again.");
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("driver_onboardings").upsert(
      {
        profile_id: profile.id,
        emergency_contact_name: String(data.get("emergencyName") ?? "").trim() || null,
        emergency_contact_phone: String(data.get("emergencyPhone") ?? "").trim() || null,
        residential_address: String(data.get("address") ?? "").trim() || null,
        delivery_platforms: platformValues,
        onboarding_status: nextStatus,
      },
      { onConflict: "profile_id" },
    );

    if (error) {
      setMessage(submitForReview ? "Complete all required fields before submitting for review." : "We could not save your onboarding details. Please try again.");
      setIsSaving(false);
      return;
    }

    setStatus(nextStatus);
    setMessage(submitForReview ? "Your profile is now submitted for VMC review." : "Your progress has been saved.");
    setIsSaving(false);
    router.refresh();
  }

  return (
    <div className="onboarding-layout">
      <aside className="onboarding-progress panel">
        <p className="card-label">PROFILE COMPLETION</p>
        <strong>{completion}%</strong>
        <div className="progress-track" aria-label={`${completion}% profile completion`}><span style={{ width: `${completion}%` }} /></div>
        <p>{completion === 100 ? "All driver-editable details are complete." : "Complete the remaining personal and delivery details before submitting."}</p>
        <div className="onboarding-status"><span>Current status</span><strong>{statusLabels[status]}</strong></div>
        {onboarding?.review_note && <p className="review-note">VMC note: {onboarding.review_note}</p>}
      </aside>
      <form className="onboarding-form panel" onSubmit={(event) => save(event, false)}>
        <fieldset disabled={!canEdit || isSaving}>
          <div className="form-section-heading"><p className="card-label">PERSONAL INFORMATION</p><span>Driver editable</span></div>
          <div className="form-grid">
            <label>Full name<input name="fullName" defaultValue={profile.fullName} required /></label>
            <label>Email address<input value={profile.email ?? ""} disabled /></label>
            <label>Phone number<input name="phone" type="tel" defaultValue={profile.phone ?? ""} required /></label>
            <label>Emergency contact name<input name="emergencyName" defaultValue={onboarding?.emergency_contact_name ?? ""} required /></label>
            <label>Emergency contact phone<input name="emergencyPhone" type="tel" defaultValue={onboarding?.emergency_contact_phone ?? ""} required /></label>
            <label className="form-grid__wide">Residential address<textarea name="address" defaultValue={onboarding?.residential_address ?? ""} required /></label>
          </div>
          <div className="form-section-heading"><p className="card-label">DELIVERY INFORMATION</p><span>Driver editable</span></div>
          <div className="platform-list">{platforms.map(([value, label]) => <label key={value}><input type="checkbox" checked={platformValues.includes(value)} onChange={() => togglePlatform(value)} />{label}</label>)}</div>
        </fieldset>
        <section className="managed-information">
          <div><p className="card-label">VMC-MANAGED INFORMATION</p><h3>Motorcycle and contract details</h3><p>{hasAssignedBike ? "Your assigned HERO motorcycle is visible in My motorcycle." : "VMC will confirm your HERO motorcycle assignment after review."}</p></div>
          <span>Read-only for your security</span>
        </section>
        {canEdit && <div className="onboarding-actions"><button className="button driver-button" type="submit">{isSaving ? "Saving…" : "Save progress"}</button><button className="button button--primary" type="button" onClick={(event) => { const form = event.currentTarget.form; if (form) void save({ preventDefault: () => undefined, currentTarget: form } as FormEvent<HTMLFormElement>, true); }}>Submit for review</button></div>}
        {message && <p className="form-message form-message--success" role="status">{message}</p>}
      </form>
    </div>
  );
}
