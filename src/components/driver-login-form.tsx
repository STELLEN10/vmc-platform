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

export function DriverLoginForm() {
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
          text: "We could not sign you in with those details. Check your email and password or register a new rider account below.",
        });
        setIsSubmitting(false);
        return;
      }

      // Check the user's role to strictly prevent staff/admin entering driver portal
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      const userRole = profile?.role ?? data.user.user_metadata?.role;

      if (userRole === "admin" || userRole === "staff") {
        // Sign out immediately so driver session is not kept for management staff
        await supabase.auth.signOut();
        setFeedback({
          type: "role_mismatch",
          text: "This email is registered for VMC Management. Staff and administrators must use the dedicated Management Portal.",
          target: "/management/login",
          targetLabel: "Go to Management Sign In →",
        });
        setIsSubmitting(false);
        return;
      }

      // Successful driver login
      router.replace("/driver");
      router.refresh();
    } catch {
      setFeedback({
        type: "error",
        text: "Could not connect to authentication service. Please ensure your network is connected.",
      });
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        Driver email address
        <input name="email" type="email" autoComplete="email" placeholder="rider@example.com" required />
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

      <button className="button driver-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing into driver portal…" : "Sign into Driver Portal"}
      </button>

      <div className="login-links">
        <Link className="text-action" href="/forgot-password?portal=driver">
          Forgot password?
        </Link>
        <Link className="text-action" href="/driver/register">
          Create driver account
        </Link>
      </div>

      <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #e7ecf0", textAlign: "center" }}>
        <p className="form-note" style={{ margin: 0 }}>
          Are you a VMC staff member or supervisor?{" "}
          <Link href="/management/login" className="text-action" style={{ fontWeight: 700 }}>
            Sign into Management Portal →
          </Link>
        </p>
      </div>
    </form>
  );
}
