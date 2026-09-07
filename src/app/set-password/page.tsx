import Link from "next/link";

import { BrandMark } from "@/components/brand-mark";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default function SetPasswordPage() {
  return <main className="simple-auth-page"><BrandMark href="/" /><section className="simple-auth-card panel"><p className="eyebrow">VMC MANAGEMENT INVITATION</p><h1>Set your account password</h1><p>Choose a password of at least 12 characters to activate your VMC staff account.</p><ResetPasswordForm /><Link className="text-action" href="/login">Back to sign in</Link></section></main>;
}
