import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { getDriverInvoicesAndQuotations } from "@/lib/finance/invoices";
import { UploadProofForm } from "./upload-proof-form";
import { DriverInvoicesSection } from "./driver-invoices-section";

export default async function DriverPaymentsPage() {
  const profile = await requireRole(DRIVER_ROLES);
  const enabled = await hasFeatureAccess("new_payment_engine");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC DRIVER · PAYMENTS"
          title="Payment schedule & statements"
          description="Your rent-to-own motorcycle payment history, weekly schedule, and invoices."
        />
        <LockedFeature feature="new_payment_engine" />
      </>
    );
  }

  const supabase = await createClient();

  const [{ data: driver }, driverInvoices] = await Promise.all([
    supabase.from("drivers").select("id").eq("profile_id", profile.id).maybeSingle(),
    getDriverInvoicesAndQuotations(profile.id),
  ]);

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
    const { data } = await supabase
      .from("contracts")
      .select("*")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false });
    contracts = data ?? [];

    if (contracts.length > 0) {
      const { data: periods } = await supabase
        .from("payment_periods")
        .select("*")
        .eq("contract_id", contracts[0].id)
        .order("period_number", { ascending: true });
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
        contractDownloadUrl =
          downloadSigned?.signedUrl ?? `/api/contracts/${contracts[0].id}/document?download=1`;
      }
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="VMC DRIVER"
        title="Payments & Invoices"
        description="View your weekly rent-to-own schedule and parts & service billing statements."
      />

      {/* Driver Parts & Service Invoices / Quotations */}
      {driverInvoices && driverInvoices.length > 0 && (
        <DriverInvoicesSection invoices={driverInvoices} />
      )}

      {contracts.length === 0 ? (
        <section className="empty-state panel mt-4">
          <p className="card-label">NO CONTRACT YET</p>
          <h2>Your payment schedule will appear here</h2>
          <p>
            Once VMC assigns a motorcycle and creates your contract, your weekly payments will be listed here.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_300px] mt-4">
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
                        <StatusBadge
                          tone={
                            period.status === "verified"
                              ? "green"
                              : period.status === "overdue" || period.status === "rejected"
                              ? "red"
                              : "blue"
                          }
                        >
                          {period.status === "verified"
                            ? "Verified"
                            : period.status === "awaiting_verification"
                            ? "Awaiting Review"
                            : period.status}
                        </StatusBadge>
                        {period.rejection_reason && (
                          <span className="text-xs text-red-500 max-w-xs text-right">
                            Reason: {period.rejection_reason}
                          </span>
                        )}
                        {(period.status === "due" ||
                          period.status === "overdue" ||
                          period.status === "rejected") && (
                          <UploadProofForm paymentPeriodId={period.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="panel">
              <p className="card-label">CONTRACT SUMMARY</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Total Term</span>
                  <span className="font-semibold">{contracts[0]?.total_weeks} Weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Weekly Rate</span>
                  <span className="font-semibold">R{contracts[0]?.weekly_amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total Contract</span>
                  <span className="font-semibold">
                    R{(contracts[0]?.weekly_amount ?? 0) * (contracts[0]?.total_weeks ?? 0)}
                  </span>
                </div>
              </div>
              {contracts[0]?.document_storage_path && (
                <div className="mt-5 pt-4 border-t border-line space-y-2">
                  <p className="text-xs font-semibold text-muted">SIGNED AGREEMENT</p>
                  <div className="flex flex-col gap-2">
                    {contractViewUrl && (
                      <a
                        href={contractViewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button--secondary text-xs text-center"
                      >
                        View Lease PDF
                      </a>
                    )}
                    {contractDownloadUrl && (
                      <a
                        href={contractDownloadUrl}
                        className="button button--ghost text-xs text-center"
                      >
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              )}
            </section>

            <section className="panel">
              <p className="card-label">PAYMENT METHODS</p>
              <p className="text-xs text-muted mt-2">
                Make your weekly EFT or cash deposit using your unique reference:
              </p>
              <div className="mt-3 p-3 bg-paper border border-line rounded-lg text-xs font-mono space-y-1">
                <div>Bank Name: <strong>Capitec</strong></div>
                <div>Account Holder: <strong>VS Procurement</strong></div>
                <div>Account No: <strong>10976145</strong></div>
                <div>Account Type: <strong>Business Account</strong></div>
                <div>Branch Code: <strong>25854</strong></div>
                <div>Reference: <strong>VMC-{contracts[0]?.id?.slice(0, 6).toUpperCase()}</strong></div>
                <div className="pt-1.5 border-t border-line text-muted font-sans text-[11px]">
                  Enquiries: <a href="mailto:info@vsprocurement.co.za" className="text-action hover:underline">info@vsprocurement.co.za</a> · <a href="tel:+27766681879" className="text-action hover:underline">+27 76 668 1879</a>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
