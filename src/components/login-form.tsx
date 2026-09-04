"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage("We could not sign you in with those details. Please try again.");
      setIsSubmitting(false);
      return;
    }

    router.replace("/auth/complete");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {message && <p className="form-message form-message--error" role="alert">{message}</p>}
      <button className="button button--primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign in securely"}</button>
      <Link className="text-action" href="/forgot-password">Forgot password?</Link>
      <p className="form-note">New delivery riders can <Link href="/driver/register">create a VMC Driver account</Link>. Staff and admin accounts remain controlled by VMC.</p>
    </form>
  );
}
