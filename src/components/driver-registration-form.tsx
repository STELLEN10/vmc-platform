"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

export function DriverRegistrationForm({ referralCode = "" }: { referralCode?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").replace(/[\s()-]/g, "");
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

    if (!PHONE_PATTERN.test(phone)) {
      setMessage("Enter a valid phone number, including country code where possible.");
      return;
    }
    if (password.length < 12) {
      setMessage("Use a password with at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            ...(referralCode.trim() ? { referral_code: referralCode.trim().toUpperCase() } : {}),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/driver/onboarding`,
        },
      });

      if (error) {
        setMessage("We could not create that account. Please check your details or sign in if you already have an account.");
        setIsSubmitting(false);
        return;
      }

      if (!data.session) {
        setMessage("Check your email to confirm your account, then return to sign in and continue your VMC Driver profile.");
        setIsSubmitting(false);
        return;
      }

      router.replace("/driver/onboarding");
      router.refresh();
    } catch {
      setMessage("Could not connect to authentication service. Please ensure Supabase credentials are configured.");
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>Full name<input name="fullName" autoComplete="name" minLength={2} required /></label>
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Phone number<input name="phone" type="tel" autoComplete="tel" placeholder="+27…" required /></label>
      {referralCode.trim() && (
        <div className="rounded-lg border border-red-100 bg-red-50/70 p-3">
          <p className="card-label text-red-700">VMC REFERRAL</p>
          <p className="text-xs text-neutral-600">
            Referral code <strong className="font-mono text-neutral-900">{referralCode.trim().toUpperCase()}</strong> has been attached to this signup.
          </p>
          <input type="hidden" name="referralCode" value={referralCode.trim().toUpperCase()} />
        </div>
      )}
      <label>Password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
      <label>Confirm password<input name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
      {message && <p className="form-message form-message--error" role="alert">{message}</p>}
      <button className="button driver-button" type="submit" disabled={isSubmitting}>{isSubmitting ? "Creating account…" : "Create account"}</button>
      <p className="form-note">By continuing, you submit details for VMC driver onboarding. Staff and admin accounts cannot be created here.</p>
    </form>
  );
}
