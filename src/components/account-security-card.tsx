"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function AccountSecurityCard({ email }: { email: string | null }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function sendReset() {
    if (!email) return;
    setSending(true);
    await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setSent(true);
    setSending(false);
  }

  return <section className="panel account-security-card"><p className="card-label">PASSWORD SECURITY</p><h2>Reset your password</h2><p className="card-copy">A secure password-reset link will be sent to <strong>{email ?? "your account email"}</strong>. You choose the new password yourself; VMC administrators cannot view, set or store it.</p>{sent ? <p className="form-message form-message--success">If this account has a VMC email address, secure reset instructions are on their way.</p> : <button className="button button--primary" type="button" onClick={sendReset} disabled={sending || !email}>{sending ? "Sending…" : "Email password reset link"}</button>}</section>;
}
