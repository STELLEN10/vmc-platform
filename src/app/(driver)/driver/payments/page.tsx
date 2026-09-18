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

  type Contract = {
    id: string;
    start_date: string;
    weekly_amount: number;
    total_weeks: number;
    document_storage_path?: string | null;
    document_file_name?: string | null;
  };
  let contracts: Contract[] = [];
  type PaymentPeriod = {
    id: string;
    period_number: number;
    due_date: string;
    amount_due: number;
    status: string;
    rejection_reason?: string | null;
  };
  let paymentPeriods: PaymentPeriod[] = [];
  let contractViewUrl: string | null = null;
  let contractDownloadUrl: string | null = null;

  if (driver) {
    const { data } = await supabase.from("contracts").select("*").eq("driver_id", driver.id).order("created_at", { ascending: false });
    contracts = data ?? [];

    if (contracts.length > 0) {
      const { data: periods } = await supabase.from("payment_periods").select("*").eq("contract_id", contracts[0].id).order("period_number", { ascending: true });
      paymentPeriods = periods ?? [];

      if (contracts[0].document_storage_path) {
        const { data: viewSigned } = await supabase.storage
          .from("vmc-application-documents")
          .createSignedUrl(contracts[0].document_storage_path, 300);
        contractViewUrl = viewSigned?.signedUrl ?? `/api/contracts/${contracts[0].id}/document`;

        const { data: downloadSigned } = await supabase.storage
          .from("vmc-application-documents")
          .createSignedUrl(contracts[0].document_storage_path, 300, {
            download: contracts[0].document_file_name || "VMC_Rent_to_Own_Contract.pdf",
          });
        contractDownloadUrl = downloadSigned?.signedUrl ?? `/api/contracts/${contracts[0].id}/document?download=1`;
      }
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
                        <StatusBadge tone={period.status === "verified" ? "green" : (period.status === "overdue" || period.status === "rejected") ? "red" : "blue"}>
                          {period.status === "verified" ? "Verified" : period.status === "awaiting_verification" ? "Awaiting Review" : period.status}
                        </StatusBadge>
                        {period.rejection_reason && (
                          <span className="text-xs text-red-500 max-w-xs text-right">Reason: {period.rejection_reason}</span>
                        )}
                        {(period.status === "due" || period.status === "overdue" || period.status === "rejected") && (
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

            <div className="pt-3 border-t border-line text-xs">
              <p className="card-label mb-2">CONTRACT DOCUMENT</p>
              {contracts[0].document_storage_path ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 p-2 rounded bg-paper/60 border border-line">
                    <span aria-hidden="true">📄</span>
                    <span className="font-medium text-foreground truncate">
                      {contracts[0].document_file_name || "VMC Rent-to-Own Contract"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <a
                      href={contractViewUrl ?? `/api/contracts/${contracts[0].id}/document`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button--secondary text-xs text-center py-1.5"
                    >
                      View Contract
                    </a>
                    <a
                      href={contractDownloadUrl ?? `/api/contracts/${contracts[0].id}/document?download=1`}
                      className="button button--primary text-xs text-center py-1.5"
                    >
                      Download PDF
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-muted text-xs">
                  Your contract document is not available yet.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
