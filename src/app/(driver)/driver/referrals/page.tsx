import { PageHeading } from "@/components/page-heading";
import { requireFeature } from "@/lib/features/server";
import { getMyReferrals } from "@/lib/referrals/server";
import { ReferralDashboard } from "./referral-dashboard";

export default async function DriverReferralsPage() {
  await requireFeature("driver_referrals");
  const referrals = await getMyReferrals();

  return (
    <>
      <PageHeading
        eyebrow="VMC DRIVER · REFERRALS"
        title="Refer a rider"
        description="Share your VMC referral code with someone you know. VMC reviews the referred driver's application before any reward is approved."
      />
      <ReferralDashboard referrals={referrals} />
    </>
  );
}
