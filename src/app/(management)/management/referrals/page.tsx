import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireFeature } from "@/lib/features/server";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { qualifyReferral, cancelReferral, rewardReferral } from "./actions";

type ReferralRow = {
  id: string;
  referral_code: string;
  status: "created" | "applied" | "qualified" | "reward_pending" | "rewarded" | "cancelled";
  referred_driver_id: string | null;
  qualification_note: string | null;
  created_at: string;
  referred_driver_name: string | null;
  referrer_name: string | null;
  reward_amount: number | null;
  reward_status: string | null;
};

export default async function ManagementReferralsPage() {
  await requireRole(MANAGEMENT_ROLES);
  await requireFeature("driver_referrals");

  const supabase = await createClient();
  const { data: referrals } = await supabase
    .from("driver_referrals")
    .select("id, referral_code, status, referred_driver_id, referrer_driver_id, qualification_note, created_at")
    .order("created_at", { ascending: false });

  const rows = referrals ?? [];
  const driverIds = Array.from(new Set(rows.flatMap((row) => [row.referrer_driver_id, row.referred_driver_id]).filter(Boolean))) as string[];
  const { data: drivers } = driverIds.length
    ? await supabase.from("drivers").select("id, profile_id").in("id", driverIds)
    : { data: [] };

  const profileIds = Array.from(new Set((drivers ?? []).map((driver) => driver.profile_id)));
  const { data: profiles } = profileIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", profileIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const driverProfileMap = new Map((drivers ?? []).map((driver) => [driver.id, driver.profile_id]));

  const referralIds = rows.map((row) => row.id);
  const { data: rewards } = referralIds.length
    ? await supabase.from("referral_rewards").select("referral_id, amount, status").in("referral_id", referralIds)
    : { data: [] };
  const rewardMap = new Map((rewards ?? []).map((reward) => [reward.referral_id, reward]));

  const viewRows: ReferralRow[] = rows.map((row) => {
    const referrerProfileId = driverProfileMap.get(row.referrer_driver_id);
    const referredProfileId = row.referred_driver_id ? driverProfileMap.get(row.referred_driver_id) : undefined;
    const reward = rewardMap.get(row.id);
    return {
      id: row.id,
      referral_code: row.referral_code,
      status: row.status,
      referred_driver_id: row.referred_driver_id,
      qualification_note: row.qualification_note,
      created_at: row.created_at,
      referrer_name: referrerProfileId ? profileMap.get(referrerProfileId) ?? null : null,
      referred_driver_name: referredProfileId ? profileMap.get(referredProfileId) ?? null : null,
      reward_amount: reward?.amount ?? null,
      reward_status: reward?.status ?? null,
    };
  });

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · V0.5"
        title="Driver referrals"
        description="Track referred riders, qualification, and the R250 reward workflow."
      />

      <section className="panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="card-label">REFERRAL PROGRAM</p>
            <h2 className="text-lg font-bold text-ink">R250 reward workflow</h2>
            <p className="mt-1 text-sm text-muted max-w-2xl">
              A referral starts when a driver shares their code, moves to Applied when VMC links the new driver, then requires management qualification before the reward can be paid.
            </p>
          </div>
          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">R250</span>
        </div>
      </section>

      <section className="panel table-panel section-gap">
        <div className="data-table" role="table" aria-label="Driver referrals">
          <div className="data-table__row data-table__head" role="row">
            <span role="columnheader">Referrer</span>
            <span role="columnheader">Referred rider</span>
            <span role="columnheader">Code / status</span>
            <span role="columnheader">Reward</span>
          </div>
          {viewRows.length === 0 ? (
            <div className="data-table__row" role="row">
              <span role="cell">No referrals yet</span>
              <span role="cell">—</span>
              <span role="cell">—</span>
              <span role="cell">—</span>
            </div>
          ) : viewRows.map((row) => (
            <div className="data-table__row" role="row" key={row.id}>
              <span role="cell">{row.referrer_name ?? "Unknown driver"}</span>
              <span role="cell">{row.referred_driver_name ?? "Not linked yet"}</span>
              <span role="cell">
                <div className="grid gap-1">
                  <span className="font-mono text-[11px]">{row.referral_code}</span>
                  <StatusBadge tone={row.status === "rewarded" ? "green" : row.status === "cancelled" ? "red" : "blue"}>{row.status.replaceAll("_", " ")}</StatusBadge>
                </div>
              </span>
              <span role="cell">
                <div className="grid gap-2">
                  <span>{row.reward_amount != null ? `R${row.reward_amount.toFixed(0)} · ${row.reward_status ?? "—"}` : "Pending qualification"}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {["created", "applied"].includes(row.status) && (
                      <form action={qualifyReferral}>
                        <input type="hidden" name="referralId" value={row.id} />
                        <button className="button button--secondary py-1 px-2 text-[11px]" type="submit">Qualify</button>
                      </form>
                    )}
                    {!["cancelled", "rewarded"].includes(row.status) && (
                      <form action={cancelReferral}>
                        <input type="hidden" name="referralId" value={row.id} />
                        <button className="button button--secondary py-1 px-2 text-[11px]" type="submit">Cancel</button>
                      </form>
                    )}
                    {row.reward_status === "reward_pending" && (
                      <form action={rewardReferral}>
                        <input type="hidden" name="referralId" value={row.id} />
                        <button className="button button--primary py-1 px-2 text-[11px]" type="submit">Mark R250 Paid</button>
                      </form>
                    )}
                  </div>
                </div>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
