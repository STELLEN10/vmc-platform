"use client";

import { useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type AccountSettingsFormProps = { profileId: string; fullName: string; email: string | null };

export function AccountSettingsForm({ profileId, fullName, email }: AccountSettingsFormProps) {
  const nameParts = fullName.trim().split(/\s+/);
  const [message, setMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const firstName = String(values.get("firstName") ?? "").trim();
    const lastName = String(values.get("lastName") ?? "").trim();
    if (!firstName || !lastName) { setMessage("Enter both your first name and surname."); return; }
    setIsSavingProfile(true);
    const { error } = await createClient().from("profiles").update({ full_name: `${firstName} ${lastName}` }).eq("id", profileId);
    setMessage(error ? "Your name could not be updated. Please try again." : "Your personal details have been saved.");
    setIsSavingProfile(false);
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) { setMessage("This account has no email address available for password verification."); return; }
    const values = new FormData(event.currentTarget);
    const currentPassword = String(values.get("currentPassword") ?? "");
    const newPassword = String(values.get("newPassword") ?? "");
    const confirmation = String(values.get("confirmation") ?? "");
    if (newPassword.length < 12) { setMessage("Use a new password with at least 12 characters."); return; }
    if (newPassword !== confirmation) { setMessage("New-password confirmation does not match."); return; }
    setIsChangingPassword(true);
    const client = createClient();
    const { error: signInError } = await client.auth.signInWithPassword({ email, password: currentPassword });
    if (signInError) { setMessage("Your current password is incorrect."); setIsChangingPassword(false); return; }
    const { error } = await client.auth.updateUser({ password: newPassword });
    setMessage(error ? "Your password could not be updated. Please try again." : "Your password has been updated. Keep it private.");
    if (!error) event.currentTarget.reset();
    setIsChangingPassword(false);
  }

  return <div className="settings-grid">
    <form className="panel review-form" onSubmit={saveProfile}><p className="card-label">PERSONAL DETAILS</p><h2>Your name</h2><label>First name<input name="firstName" defaultValue={nameParts[0] ?? ""} autoComplete="given-name" required /></label><label>Surname<input name="lastName" defaultValue={nameParts.slice(1).join(" ")} autoComplete="family-name" required /></label><label>Email address<input value={email ?? "Not available"} disabled readOnly /></label><button className="button button--primary" type="submit" disabled={isSavingProfile}>{isSavingProfile ? "Saving…" : "Save personal details"}</button></form>
    <form className="panel review-form" onSubmit={changePassword}><p className="card-label">PASSWORD</p><h2>Change password</h2><label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label><label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></label><label>Confirm new password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></label><button className="button button--primary" type="submit" disabled={isChangingPassword}>{isChangingPassword ? "Updating…" : "Update password"}</button></form>
    {message && <p className={`form-message settings-message ${message.includes("could not") || message.includes("incorrect") || message.includes("Enter") || message.includes("Use a") || message.includes("match") ? "form-message--error" : "form-message--success"}`} role="status">{message}</p>}
  </div>;
}
