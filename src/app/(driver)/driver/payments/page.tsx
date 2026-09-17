import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { UploadProofForm } from "./upload-proof-form";

export default async function DriverPaymentsPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();

  const { data: driver } = await supabase.from("drivers").select("id").eq("profile_id", profile.id).single();

  type Contract = { id: string; start_date: string; weekly_amount: number; total_weeks: number; };
  let contracts: Contract[] = [];
  type PaymentPeriod = { id: string; period_number: number; due_date: string; amount_due: number; status: string; };
  let paymentPeriods: PaymentPeriod[] = [];

  if (driver) {
    const { data } = await supabase.from("contracts").select("*").eq("driver_id", driver.id).order("created_at", { ascending: false });
    contracts = data ?? [];

    if (contracts.length > 0) {
      const { data: periods } = await supabase.from("payment_periods").select("*").eq("contract_id", contracts[0].id).order("period_number", { ascending: true });
      paymentPeriods = periods ?? [];
    }
  }

  return (
    <>
      <PageHeading eyebrow="VMC DRIVER" title="Payments" description="View your contract and weekly payment schedule." />
      {contracts.length === 0 ? (
        <section className="empty-state panel">
          <p className="card-label">NO CONTRACT YET</p>
          <h2>Your payment schedule will appear here</h2>
          <p>Once VMC assigns a motorcycle and creates your contract, your weekly payments will be listed here.</p>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_300px]">
          <section className="panel">
            <p className="card-label">PAYMENT SCHEDULE</p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2 px-3 font-medium">Week</th>
                    <th className="py-2 px-3 font-medium">Due Date</th>
                    <th className="py-2 px-3 font-medium">Amount</th>
                    <th className="py-2 px-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentPeriods.map((period) => (
                    <tr key={period.id} className="border-b border-line/50 hover:bg-paper/50">
                      <td className="py-4 px-3 align-top">Week {period.period_number}</td>
                      <td className="py-4 px-3 align-top">{period.due_date}</td>
                      <td className="py-4 px-3 align-top">R{period.amount_due}</td>
                      <td className="py-4 px-3 align-top text-right flex flex-col items-end gap-2">
                        <StatusBadge tone={period.status === "paid" ? "green" : period.status === "overdue" ? "red" : "blue"}>{period.status}</StatusBadge>
                        {(period.status === "due" || period.status === "overdue") && (
                          <UploadProofForm paymentPeriodId={period.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          
          <aside className="panel h-fit space-y-4">
            <p className="card-label">ACTIVE CONTRACT</p>
            <div className="flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><span className="text-muted">Start Date</span><span>{contracts[0].start_date}</span></div>
              <div className="flex justify-between"><span className="text-muted">Weekly Rent</span><span>R{contracts[0].weekly_amount}</span></div>
              <div className="flex justify-between"><span className="text-muted">Total Weeks</span><span>{contracts[0].total_weeks}</span></div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
