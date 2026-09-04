"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");

    if (password.length < 12) {
      setMessage("Use a password with at least 12 characters.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await createClient().auth.updateUser({ password });
    if (error) {
      setMessage("Your reset link may have expired. Request another password reset and try again.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/auth/complete");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
      <label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></label>
      {message && <p className="form-message form-message--error" role="alert">{message}</p>}
      <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Updating…" : "Update password"}</button>
    </form>
  );
}
