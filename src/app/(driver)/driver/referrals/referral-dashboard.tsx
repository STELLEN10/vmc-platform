"use client";

import { useState, useTransition } from "react";
import { Copy, Check, Share2, Gift, Clock3, CircleCheck } from "lucide-react";
import { generateReferralCode } from "./actions";
import type { DriverReferralSummary } from "@/lib/referrals/server";

function statusLabel(status: DriverReferralSummary["status"]) {
  switch (status) {
    case "created": return "Link created";
    case "applied": return "Driver joined";
    case "qualified": return "Qualified";
    case "reward_pending": return "Reward pending";
    case "rewarded": return "R250 rewarded";
    case "cancelled": return "Cancelled";
  }
}

export function ReferralDashboard({ referrals: initialReferrals }: { referrals: DriverReferralSummary[] }) {
  const [referrals, setReferrals] = useState(initialReferrals);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const active = referrals.find((referral) =>
    !["cancelled", "rewarded"].includes(referral.status)
  );
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralUrl = active ? `${baseUrl}/driver/register?ref=${active.referralCode}` : "";

  const ensureCode = () => {
    if (active) return active;
    let created: DriverReferralSummary | null = null;
    startTransition(async () => {
      try {
        const result = await generateReferralCode();
        created = {
          id: result.referralId,
          referralCode: result.referralCode,
          status: "created",
          referredDriverId: null,
          qualificationNote: null,
          qualifiedAt: null,
          createdAt: new Date().toISOString(),
          rewardAmount: null,
          rewardStatus: null,
          paidAt: null,
        };
        setReferrals((current) => [created!, ...current]);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Unable to create your referral code.");
      }
    });
    return created;
  };

  const copyLink = async () => {
    const current = active ?? ensureCode();
    if (!current) return;
    const url = `${window.location.origin}/driver/register?ref=${current.referralCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy your VMC referral link:", url);
    }
  };

  const shareLink = async () => {
    const current = active ?? ensureCode();
    if (!current) return;
    const url = `${window.location.origin}/driver/register?ref=${current.referralCode}`;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: "VMC Driver",
          text: "Join me on the VMC Road to Ownership.",
          url,
        });
      } else {
        await copyLink();
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="panel panel--dark">
        <p className="eyebrow eyebrow--light">R250 REFERRAL REWARD</p>
        <h2 className="text-2xl font-bold">Bring another rider to VMC</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/75 leading-6">
          Share your personal referral link. A referral becomes eligible for the R250 reward only after VMC qualifies the referred driver and marks the reward as paid.
        </p>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="flex min-h-11 flex-1 items-center rounded-lg border border-white/15 bg-black/20 px-3 font-mono text-sm text-white">
            {active ? active.referralCode : "Create your referral code"}
          </div>
          <button
            type="button"
            onClick={copyLink}
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-neutral-900 disabled:opacity-60"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={shareLink}
            disabled={isPending || sharing}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="card-label">REFERRAL HISTORY</p>
            <h2 className="text-lg font-bold text-ink">Your referrals</h2>
          </div>
          <Gift className="h-5 w-5 text-red-600" />
        </div>

        {referrals.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-line p-7 text-center">
            <p className="text-sm font-semibold text-ink">No referrals yet.</p>
            <p className="mt-1 text-xs text-muted">Create your code above and share it with a potential VMC rider.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-line">
            {referrals.map((referral) => (
              <article key={referral.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-bold text-ink">{referral.referralCode}</p>
                  <p className="mt-1 text-xs text-muted">{new Date(referral.createdAt).toLocaleDateString("en-ZA")}</p>
                  {referral.qualificationNote && <p className="mt-1 text-xs text-muted">{referral.qualificationNote}</p>}
                </div>
                <div className="inline-flex items-center gap-2">
                  {referral.status === "rewarded" ? <CircleCheck className="h-4 w-4 text-green-600" /> : <Clock3 className="h-4 w-4 text-neutral-400" />}
                  <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700">
                    {statusLabel(referral.status)}
                  </span>
                  {referral.rewardAmount != null && (
                    <span className="text-xs font-bold text-red-600">R{referral.rewardAmount.toFixed(0)}</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
