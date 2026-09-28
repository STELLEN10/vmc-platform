import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { VerifyPaymentForm } from "./verify-payment-form";
import { fetchInvoices } from "./invoice-actions";
import { InvoicesManager } from "./invoices-manager";

export default async function ManagementPaymentsPage() {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = createAdminClient();

  // Fetch pending proofs
  const { data: proofs } = await supabase
    .from("payment_proofs")
    .select(`
      id,
      file_name,
      storage_path,
      created_at,
      payment_period_id,
      payment_periods!inner(
        id,
        period_number,
        amount_due,
        status,
        contracts!inner(
          drivers!inner(
            profiles!inner(
              full_name,
              email
            )
          )
        )
      )
    `)
    .eq("payment_periods.status", "awaiting_verification")
    .order("created_at", { ascending: false });

  // Generate signed URLs for proofs
  const proofsWithUrls = await Promise.all(
    (proofs || []).map(async (proof) => {
      const { data } = await supabase.storage
        .from("vmc-application-documents")
        .createSignedUrl(proof.storage_path, 3600);
      return { ...proof, signedUrl: data?.signedUrl || "#" };
    })
  );

  // Fetch drivers with profile & bike details for reception selection
  const [{ data: driversData }, { data: bikesData }, invoices] = await Promise.all([
    supabase
      .from("drivers")
      .select(`
        id,
        profile_id,
        bike_id,
        profiles!inner(id, full_name, email, phone)
      `),
    supabase
      .from("bikes")
      .select("id, brand, model, registration_number"),
    fetchInvoices(),
  ]);

  const bikesMap = new Map((bikesData ?? []).map((b) => [b.id, `${b.brand} ${b.model} (${b.registration_number})`]));

  const driversList = (driversData ?? []).map((d) => {
    const prof = Array.isArray(d.profiles) ? d.profiles[0] : d.profiles;
    return {
      id: d.id,
      profileId: d.profile_id,
      name: prof?.full_name || prof?.email || "VMC Driver",
      email: prof?.email || null,
      phone: prof?.phone || null,
      address: "Johannesburg, Gauteng",
      bike: d.bike_id ? bikesMap.get(d.bike_id) || "Hero Eco 150" : "Hero Eco 150 (VMC Fleet)",
    };
  });

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · FINANCE & FLEET DESK"
        title="Payments & Invoicing"
        description="Generate official tax invoices and formal quotations with the VMC logo, print PDF receipts, and verify driver payments."
      />

      {/* Invoices, Quotations & PDF Receipts Section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="card-label">INVOICING & QUOTATIONS</span>
            <h2 className="text-base font-bold text-navy m-0">Official VMC Receipts & Billing</h2>
          </div>
        </div>
        <InvoicesManager initialInvoices={invoices} drivers={driversList} />
      </section>

      {/* Proofs Verification Section */}
      <section className="panel mb-6">
        <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
          <div>
            <p className="card-label">WEEKLY PAYMENT PROOF REVIEW</p>
            <h3 className="text-sm font-bold text-foreground m-0">Awaiting Verification</h3>
          </div>
          <span className="text-xs bg-navy/10 text-navy font-bold px-2 py-0.5 rounded">
            {proofsWithUrls.length} Pending
          </span>
        </div>

        {proofsWithUrls.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted">
            <span className="text-2xl block mb-1">✅</span>
            All submitted weekly payment proofs have been verified.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-line text-muted text-xs">
                  <th className="py-2.5 px-3 font-medium">Driver</th>
                  <th className="py-2.5 px-3 font-medium">Period</th>
                  <th className="py-2.5 px-3 font-medium">Amount Due</th>
                  <th className="py-2.5 px-3 font-medium">Proof File</th>
                  <th className="py-2.5 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {proofsWithUrls.map((proof) => {
                  const driverProfile = proof.payment_periods.contracts.drivers.profiles;
                  return (
                    <tr key={proof.id} className="border-b border-line/50 hover:bg-paper/50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-foreground">{driverProfile.full_name}</div>
                        <div className="text-xs text-muted">{driverProfile.email}</div>
                      </td>
                      <td className="py-3 px-3 text-xs">Week {proof.payment_periods.period_number}</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground">
                        R{proof.payment_periods.amount_due}
                      </td>
                      <td className="py-3 px-3">
                        <a
                          href={proof.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-action underline text-xs font-semibold"
                        >
                          📄 {proof.file_name}
                        </a>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <VerifyPaymentForm periodId={proof.payment_period_id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
