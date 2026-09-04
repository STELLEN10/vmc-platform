import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export default async function DriverProfilePage() {
  const authenticatedProfile = await requireRole(DRIVER_ROLES);
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", authenticatedProfile.id)
    .maybeSingle();

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
        description="Review the personal details VMC has linked to your account. Profile editing will be introduced in a future phase."
      />
      <section className="panel detail-panel">
        {details.map(([label, value]) => (
          <div className="detail-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
    </>
  );
}
