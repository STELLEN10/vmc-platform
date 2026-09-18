import { PageHeading } from "@/components/page-heading";

import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { VerifyPaymentForm } from "./verify-payment-form";

export default async function ManagementPaymentsPage() {
  await requireRole(MANAGEMENT_ROLES);
  
  const supabase = createAdminClient();

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

  // Generate signed URLs
  const proofsWithUrls = await Promise.all(
    (proofs || []).map(async (proof) => {
      const { data } = await supabase.storage
        .from("vmc-application-documents")
        .createSignedUrl(proof.storage_path, 3600);
      return { ...proof, signedUrl: data?.signedUrl || "#" };
    })
  );

  return (
    <>
      <PageHeading eyebrow="VMC MANAGEMENT" title="Payments" description="Verify uploaded payment proofs and manage driver payments." />
      
      <section className="panel mb-6">
        <p className="card-label">NEEDS VERIFICATION</p>
        
        {proofsWithUrls.length === 0 ? (
          <div className="mt-4 text-sm text-muted">No pending payment proofs to review.</div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="py-2 px-3 font-medium">Driver</th>
                  <th className="py-2 px-3 font-medium">Period</th>
                  <th className="py-2 px-3 font-medium">Amount Due</th>
                  <th className="py-2 px-3 font-medium">Proof File</th>
                  <th className="py-2 px-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {proofsWithUrls.map((proof) => (
                  <tr key={proof.id} className="border-b border-line/50 hover:bg-paper/50">
                    <td className="py-3 px-3">
                      <div className="font-medium">{proof.payment_periods.contracts.drivers.profiles.full_name}</div>
                      <div className="text-xs text-muted">{proof.payment_periods.contracts.drivers.profiles.email}</div>
                    </td>
                    <td className="py-3 px-3">Week {proof.payment_periods.period_number}</td>
                    <td className="py-3 px-3">R{proof.payment_periods.amount_due}</td>
                    <td className="py-3 px-3">
                      <a href={proof.signedUrl} target="_blank" rel="noreferrer" className="text-action underline">{proof.file_name}</a>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <VerifyPaymentForm periodId={proof.payment_period_id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
