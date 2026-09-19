"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";

type FormFeedback = {
  text: string;
  type: "error" | "role_mismatch";
  target?: string;
  targetLabel?: string;
};

export function ManagementLoginForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<FormFeedback | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error || !data.user) {
        setFeedback({
          type: "error",
          text: "We could not sign you in with those credentials. Please check your email and password. If you were recently invited, be sure to set your password first.",
        });
        setIsSubmitting(false);
        return;
      }

      // Query role strictly from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const userRole = profile?.role ?? data.user.user_metadata?.role;

      if (userRole === "driver") {
        // Sign out immediately so driver credentials are not retained on management
        await supabase.auth.signOut();
        setFeedback({
          type: "role_mismatch",
          text: "This email is registered as a VMC Driver. The Management Portal is restricted to operations staff and fleet administrators.",
          target: "/driver/login",
          targetLabel: "Go to Driver Portal Sign In →",
        });
        setIsSubmitting(false);
        return;
      }

      if (userRole !== "admin" && userRole !== "staff") {
        await supabase.auth.signOut();
        setFeedback({
          type: "error",
          text: "Your account does not have an active management role. Please contact a VMC administrator.",
        });
        setIsSubmitting(false);
        return;
      }

      // Successful management sign-in
      router.replace("/management");
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Could not connect to authentication service. Please check your network connection.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Work email address
        <input name="email" type="email" autoComplete="email" placeholder="staff@vmc.co.za" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>

      {feedback && (
        <div
          className={`form-message ${feedback.type === "role_mismatch" ? "form-message--warning" : "form-message--error"}`}
          role="alert"
          style={feedback.type === "role_mismatch" ? { background: "#fff9eb", color: "#855302", border: "1px solid #fce3b4" } : undefined}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>{feedback.text}</p>
          {feedback.target && (
            <div style={{ marginTop: "0.5rem" }}>
              <Link
                href={feedback.target}
                className="button button--primary"
                style={{ display: "inline-block", fontSize: "0.85rem", padding: "0.45rem 0.9rem" }}
              >
                {feedback.targetLabel}
              </Link>
            </div>
          )}
        </div>
      )}

      <button className="button button--primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Authenticating…" : "Sign into Operations Console"}
      </button>

      <div className="login-links">
        <Link className="text-action" href="/forgot-password?portal=management">
          Forgot password?
        </Link>
        <Link className="text-action" href="/management/set-password">
          Set up invited account
        </Link>
      </div>

      <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #e7ecf0", textAlign: "center" }}>
        <p className="form-note" style={{ margin: 0 }}>
          Are you a HERO delivery rider?{" "}
          <Link href="/driver/login" className="text-action" style={{ fontWeight: 700 }}>
            Go to Driver Sign In →
          </Link>
        </p>
      </div>
    </form>
  );
}
