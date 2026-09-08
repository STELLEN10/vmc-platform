import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { InvitationAccountForm } from "@/components/invitation-account-form";

export default function SetPasswordPage() {
  return <main className="simple-auth-page"><BrandMark href="/" /><section className="simple-auth-card panel"><p className="eyebrow">VMC TEAM INVITATION</p><h1>Create your account</h1><p>Complete your invited VMC account. Your access role was assigned securely by VMC and cannot be selected or changed here.</p><InvitationAccountForm /><Link className="text-action" href="/login">Back to sign in</Link></section></main>;
}
