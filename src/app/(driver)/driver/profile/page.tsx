import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function DriverProfilePage() {
  const authenticatedProfile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();
  const [{ data: profile }, { data: driver }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", authenticatedProfile.id)
      .maybeSingle(),
    supabase
      .from("drivers")
      .select("id")
      .eq("profile_id", authenticatedProfile.id)
      .maybeSingle(),
  ]);

  let contract = null;
  let contractViewUrl: string | null = null;
  let contractDownloadUrl: string | null = null;

  if (driver) {
    const { data: contracts } = await supabase
      .from("contracts")
      .select("*")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (contracts && contracts.length > 0) {
      contract = contracts[0];
      if (contract.document_storage_path) {
        const { data: viewSigned } = await supabase.storage
          .from("vmc-application-documents")
          .createSignedUrl(contract.document_storage_path, 300);
        contractViewUrl = viewSigned?.signedUrl ?? `/api/contracts/${contract.id}/document`;

        const { data: downloadSigned } = await supabase.storage
          .from("vmc-application-documents")
          .createSignedUrl(contract.document_storage_path, 300, {
            download: contract.document_file_name || "VMC_Rent_to_Own_Contract.pdf",
          });
        contractDownloadUrl = downloadSigned?.signedUrl ?? `/api/contracts/${contract.id}/document?download=1`;
      }
    }
  }

  const details = [
    ["Full name", profile?.full_name || "Not provided"],
    ["Email", profile?.email || "Not provided"],
    ["Phone", profile?.phone || "Not provided"],
  ];

  return (
    <>
      <PageHeading
        eyebrow="VMC DRIVER"
        title="My profile"
        description="Review the personal details and contract VMC has linked to your account."
      />
      <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
        <section className="panel detail-panel h-fit">
          <p className="card-label">PERSONAL DETAILS</p>
          {details.map(([label, value]) => (
            <div className="detail-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </section>

        <section className="panel detail-panel h-fit">
          <p className="card-label">CONTRACT & RENT-TO-OWN</p>
          {contract ? (
            <div className="space-y-4">
              <div className="detail-row">
                <span>Start Date</span>
                <strong>{contract.start_date}</strong>
              </div>
              <div className="detail-row">
                <span>Weekly Rent</span>
                <strong>R{contract.weekly_amount}</strong>
              </div>
              <div className="detail-row">
                <span>Total Duration</span>
                <strong>{contract.total_weeks} weeks</strong>
              </div>

              <div className="pt-3 border-t border-line text-xs">
                <p className="card-label mb-2">CONTRACT DOCUMENT</p>
                {contract.document_storage_path ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-paper/60 border border-line">
                      <span aria-hidden="true">📄</span>
                      <span className="font-medium text-foreground truncate">
                        {contract.document_file_name || "VMC Rent-to-Own Contract"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <a
                        href={contractViewUrl ?? `/api/contracts/${contract.id}/document`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button--secondary text-xs text-center py-1.5"
                      >
                        View Contract
                      </a>
                      <a
                        href={contractDownloadUrl ?? `/api/contracts/${contract.id}/document?download=1`}
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
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-muted">
              No active contract assigned yet.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
