import Link from "next/link";

import { AccountSecurityCard } from "@/components/account-security-card";
import { PageHeading } from "@/components/page-heading";
import type { AuthenticatedProfile } from "@/lib/auth/authorization";

export function AccountSettingsPage({ profile, home }: { profile: AuthenticatedProfile; home: string }) {
  return <><PageHeading eyebrow="VMC ACCOUNT" title="Settings" description="Manage account security without sharing your password with anyone." actions={<Link className="text-action" href={home}>Back to dashboard</Link>} /><AccountSecurityCard email={profile.email} /></>;
}
