import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { DriverOnboardingForm } from "@/components/driver-onboarding-form";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";

export default async function DriverOnboardingPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const enabled = await hasFeatureAccess("new_onboarding");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC DRIVER ONBOARDING"
          title="Complete your driver profile"
          description="Share the information VMC needs to review your application. Motorcycle and contract records are confirmed by VMC."
        />
        <LockedFeature feature="new_onboarding" />
      </>
    );
  }

  const supabase = await createClient();
  const [{ data: onboarding }, { data: driver }] = await Promise.all([
    supabase.from("driver_onboardings").select("*").eq("profile_id", profile.id).maybeSingle(),
    supabase.from("drivers").select("bike_id").eq("profile_id", profile.id).maybeSingle(),
  ]);

  return (
    <>
      <PageHeading
        eyebrow="VMC DRIVER ONBOARDING"
        title="Complete your driver profile"
        description="Share the information VMC needs to review your application. Motorcycle and contract records are confirmed by VMC."
      />
      <DriverOnboardingForm
        profile={{ id: profile.id, fullName: profile.fullName, phone: profile.phone, email: profile.email }}
        onboarding={onboarding}
        hasAssignedBike={Boolean(driver?.bike_id)}
      />
    </>
  );
}
