"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type InviteIdentity = { id: string; email: string; fullName: string; phone: string };

export function InvitationAccountForm() {
  const router = useRouter();
  const [identity, setIdentity] = useState<InviteIdentity | null>(null);
  const [checkingInvitation, setCheckingInvitation] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const client = createClient();
    void client.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setIdentity({
          id: data.user.id,
          email: data.user.email,
          fullName: String(data.user.user_metadata.full_name ?? ""),
          phone: String(data.user.user_metadata.phone ?? ""),
        });
      }
      setCheckingInvitation(false);
    });
  }, []);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identity) return;
    const values = new FormData(event.currentTarget);
    const fullName = String(values.get("fullName") ?? "").trim();
    const phone = String(values.get("phone") ?? "").trim();
    const password = String(values.get("password") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");
    if (fullName.length < 2) { setMessage("Enter your full name."); return; }
    if (phone && !/^\+?[1-9]\d{7,14}$/.test(phone)) { setMessage("Enter a valid phone number, including the country code where possible."); return; }
    if (password.length < 12) { setMessage("Use a password with at least 12 characters."); return; }
    if (password !== confirmation) { setMessage("Passwords do not match."); return; }
    setSubmitting(true);
    const client = createClient();
    const { error: authError } = await client.auth.updateUser({ password, data: { full_name: fullName, phone } });
    if (authError) { setMessage("This invitation link has expired. Ask a VMC administrator to send a new invitation."); setSubmitting(false); return; }
    const { error: profileError } = await client.from("profiles").update({ full_name: fullName, phone: phone || null }).eq("id", identity.id);
    if (profileError) { setMessage("Your password was created, but your profile details could not be saved. Please contact VMC."); setSubmitting(false); return; }
    router.replace("/login?invited=1");
    router.refresh();
  }

  if (checkingInvitation) return <p className="form-note">Verifying your VMC invitation…</p>;

  if (!identity) return <div className="invite-link-state"><p className="form-message form-message--error">This page must be opened from your VMC invitation email. If the link has already been used or has expired, ask a VMC administrator to send a fresh invitation.</p><Link className="text-action" href="/login">Go to sign in</Link></div>;

  return <form className="login-form" onSubmit={createAccount}>
    <label>Full name<input name="fullName" defaultValue={identity.fullName} autoComplete="name" required /></label>
    <label>Email address<input value={identity.email} disabled readOnly /></label>
    <label>Phone number <small>Optional</small><input name="phone" defaultValue={identity.phone} autoComplete="tel" placeholder="+27..." /></label>
    <label>Create password<input name="password" type="password" autoComplete="new-password" minLength={12} required /></label>
    <label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></label>
    {message && <p className="form-message form-message--error" role="alert">{message}</p>}
    <button className="button button--primary" type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Create account"}</button>
  </form>;
}
