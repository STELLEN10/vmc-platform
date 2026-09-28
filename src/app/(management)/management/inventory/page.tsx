import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { InventoryView } from "./inventory-view";

export default async function ManagementInventoryPage() {
  await requireRole(MANAGEMENT_ROLES);
  const enabled = await hasFeatureAccess("parts_inventory");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC MANAGEMENT · INVENTORY"
          title="Parts & spares inventory"
          description="Track stock levels, compatible Hero parts, and warehouse movements."
        />
        <LockedFeature feature="parts_inventory" />
      </>
    );
  }

  const supabase = await createClient();
  const { data: parts } = await supabase
    .from("parts")
    .select("*")
    .neq("status", "discontinued")
    .order("name", { ascending: true });

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · INVENTORY"
        title="Parts & spares inventory"
        description="Live operational parts catalogue and warehouse stock management. Upload spreadsheets (.xlsx, .csv), edit live stock levels, and review movement audits."
      />

      <InventoryView initialParts={parts || []} />
    </>
  );
}
