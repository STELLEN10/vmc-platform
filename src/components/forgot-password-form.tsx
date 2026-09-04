"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setSent(true);
    setIsSubmitting(false);
  }

  return sent ? (
    <p className="form-message form-message--success">If that address has a VMC account, password reset instructions are on their way.</p>
  ) : (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send reset instructions"}</button>
    </form>
  );
}
