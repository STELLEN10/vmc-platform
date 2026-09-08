import Link from "next/link";

import { AccountSettingsForm } from "@/components/account-settings-form";
import { PageHeading } from "@/components/page-heading";
import type { AuthenticatedProfile } from "@/lib/auth/authorization";

export function AccountSettingsPage({ profile, home }: { profile: AuthenticatedProfile; home: string }) {
  return <><PageHeading eyebrow="VMC ACCOUNT" title="Settings" description="Update your personal details and password securely. Your password is never visible to VMC." actions={<Link className="text-action" href={home}>Back to dashboard</Link>} /><AccountSettingsForm profileId={profile.id} fullName={profile.fullName} email={profile.email} /></>;
}
