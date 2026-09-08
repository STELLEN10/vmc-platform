import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function SetPasswordPage() {
  return <main className="simple-auth-page"><BrandMark href="/" /><section className="simple-auth-card panel"><p className="eyebrow">VMC TEAM INVITATION</p><h1>Create your account</h1><p>Create a password and confirm it. You will then be taken to sign in with your invited email and new password.</p><ResetPasswordForm invitation /><Link className="text-action" href="/login">Back to sign in</Link></section></main>;
}
