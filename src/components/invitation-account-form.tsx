"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { AppRole } from "@/lib/database.types";

type InviteIdentity = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: AppRole;
};

export function InvitationAccountForm() {
  const router = useRouter();
  const [identity, setIdentity] = useState<InviteIdentity | null>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const client = createClient();

    async function initializeInvitation() {
      try {
        // 1. Check if token hash is directly present in the window location
        const hash = window.location.hash;
        if (hash.includes("access_token=")) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await client.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }

        // 2. Check search params for token_hash OTP
        const search = window.location.search;
        if (search.includes("token_hash=")) {
          const params = new URLSearchParams(search);
          const tokenHash = params.get("token_hash");
          const type = params.get("type") as "invite" | "recovery" | null;
          if (tokenHash && type) {
            await client.auth.verifyOtp({ token_hash: tokenHash, type });
          }
        }

        // 3. Fetch active user
        const { data: authData } = await client.auth.getUser();
        if (authData.user?.email && isMounted) {
          // Fetch profile to know assigned role
          const { data: profile } = await client
            .from("profiles")
            .select("full_name, phone, role")
            .eq("id", authData.user.id)
            .maybeSingle();

          const assignedRole = (profile?.role ?? authData.user.user_metadata?.role ?? "staff") as AppRole;

          setIdentity({
            id: authData.user.id,
            email: authData.user.email,
            fullName: profile?.full_name || String(authData.user.user_metadata?.full_name ?? ""),
            phone: profile?.phone || String(authData.user.user_metadata?.phone ?? ""),
            role: assignedRole,
          });
        }
      } catch {
        // Handled below if identity remains null
      } finally {
        if (isMounted) {
          setCheckingInvitation(false);
        }
      }
    }

    void initializeInvitation();

    // Listen for auth state changes
    const { data: listener } = client.auth.onAuthStateChange(async (event, session) => {
      if (session?.user?.email && isMounted && !identity) {
        const { data: profile } = await client
          .from("profiles")
          .select("full_name, phone, role")
          .eq("id", session.user.id)
          .maybeSingle();

        const assignedRole = (profile?.role ?? session.user.user_metadata?.role ?? "staff") as AppRole;

        setIdentity({
          id: session.user.id,
          email: session.user.email,
          fullName: profile?.full_name || String(session.user.user_metadata?.full_name ?? ""),
          phone: profile?.phone || String(session.user.user_metadata?.phone ?? ""),
          role: assignedRole,
        });
        setCheckingInvitation(false);
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [identity]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity) return;

    setMessage(null);
    const values = new FormData(event.currentTarget);
    const fullName = String(values.get("fullName") ?? "").trim();
    const phone = String(values.get("phone") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");

    if (fullName.length < 2) {
      setMessage("Please enter your full name.");
      return;
    }
    if (phone && !/^\+?[1-9]\d{7,14}$/.test(phone.replace(/[\s()-]/g, ""))) {
      setMessage("Please enter a valid phone number, including country code where possible.");
      return;
    }
    if (password.length < 12) {
      setMessage("Your password must be at least 12 characters long.");
      return;
    }
    if (password !== confirmation) {
      setMessage("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const client = createClient();

    try {
      const { error: authError } = await client.auth.updateUser({
        password,
        data: { full_name: fullName, phone },
      });

      if (authError) {
        setMessage(authError.message || "This invitation link has expired. Please ask a VMC administrator to send a fresh invitation.");
        setSubmitting(false);
        return;
      }

      // Update public.profiles
      await client
        .from("profiles")
        .update({ full_name: fullName, phone: phone || null })
        .eq("id", identity.id);

      setSuccess(true);
      setSubmitting(false);

      // Instantly direct them to their target dashboard because they are ALREADY signed in!
      setTimeout(() => {
        if (identity.role === "driver") {
          router.replace("/driver");
        } else {
          router.replace("/management");
        }
        router.refresh();
      }, 1200);
    } catch {
      setMessage("An unexpected error occurred while saving your credentials. Please try again.");
      setSubmitting(false);
    }
  }

  if (checkingInvitation) {
    return (
      <div style={{ padding: "1.5rem 0", textAlign: "center" }}>
        <p className="form-note">Verifying your VMC invitation and establishing secure connection…</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="form-message form-message--success" style={{ margin: "1rem 0", padding: "1.2rem" }}>
        <h3 style={{ margin: "0 0 0.5rem", color: "#0c684b" }}>Password Established Successfully!</h3>
        <p style={{ margin: 0, fontSize: "0.9rem" }}>
          Your VMC account is now ready. Entering the {identity?.role === "driver" ? "Driver Portal" : "Management Console"} now…
        </p>
      </div>
    );
  }

  if (!identity) {
    return (
      <div className="invite-link-state" style={{ marginTop: "1rem" }}>
        <p className="form-message form-message--error" style={{ marginBottom: "1rem" }}>
          We could not find an active invitation in this link. The link may have already been used, or it may have expired.
        </p>
        <p className="card-copy" style={{ fontSize: "0.9rem", color: "#54687a" }}>
          If you already created your password, sign in below. If you need a new invitation, ask a VMC administrator to send one to your email.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.2rem" }}>
          <Link className="button button--primary" href="/management/login">
            Management Sign In
          </Link>
          <Link className="button button--outline" href="/driver/login">
            Driver Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={createAccount}>
      <div
        style={{
          background: identity.role === "admin" ? "#eef6fc" : "#f0fdf4",
          border: `1px solid ${identity.role === "admin" ? "#c4dff5" : "#bbf7d0"}`,
          borderRadius: "0.35rem",
          padding: "0.75rem 0.9rem",
          marginBottom: "0.5rem",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#314457", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Invited Role
        </p>
        <p style={{ margin: "0.2rem 0 0", fontWeight: 600, color: identity.role === "admin" ? "#0f5fae" : "#15803d" }}>
          {identity.role === "admin" ? "VMC Fleet Administrator" : identity.role === "staff" ? "VMC Operations Staff" : "VMC Delivery Driver"}
        </p>
      </div>

      <label>
        Email address
        <input value={identity.email} disabled readOnly style={{ opacity: 0.8, cursor: "not-allowed" }} />
      </label>

      <label>
        Full name
        <input name="fullName" defaultValue={identity.fullName} autoComplete="name" required />
      </label>

      <label>
        Phone number <small style={{ color: "var(--muted)", fontWeight: 400 }}>(Optional)</small>
        <input name="phone" defaultValue={identity.phone} autoComplete="tel" placeholder="+27 82 123 4567" />
      </label>

      <label>
        Create password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="At least 12 characters"
          required
        />
      </label>

      <label>
        Confirm password
        <input
          name="confirmation"
          type="password"
          autoComplete="new-password"
          minLength={12}
          placeholder="Repeat your password"
          required
        />
      </label>

      {message && (
        <p className="form-message form-message--error" role="alert">
          {message}
        </p>
      )}

      <button className="button button--primary" type="submit" disabled={submitting}>
        {submitting ? "Saving credentials…" : "Create Password & Enter Platform"}
      </button>

      <p className="form-note">
        Your password will be saved securely. You can use it to sign in anytime at{" "}
        {identity.role === "driver" ? "Driver Sign In" : "Management Sign In"}.
      </p>
    </form>
  );
}
