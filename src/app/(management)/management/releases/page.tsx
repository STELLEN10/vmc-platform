import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { isDriverFeatureKey } from "@/lib/features/catalog";
import { createClient } from "@/lib/supabase/server";
import { FeatureToggleBoard, type BetaAssignmentData } from "./feature-toggle-board";

export default async function ReleaseControlPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  const { error, updated } = await searchParams;
  const supabase = await createClient();

  const [{ data: flags }, { data: rawAssignments }] = await Promise.all([
    supabase
      .from("feature_flags")
      .select("id, key, enabled, description")
      .order("key"),
    supabase
      .from("feature_flag_assignments")
      .select(`
        id,
        feature_flag_id,
        profile_id,
        role,
        created_at
      `)
      .order("created_at", { ascending: false }),
  ]);

  // Fetch profiles for assignments if any
  const profileIds = (rawAssignments ?? [])
    .map((a) => a.profile_id)
    .filter((id): id is string => Boolean(id));

  const { data: profiles } = profileIds.length > 0
    ? await supabase.from("profiles").select("id, email, full_name").in("id", profileIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const flagMap = new Map((flags ?? []).map((f) => [f.id, f.key]));

  const adminClient = createAdminClient();
  const { data: driverOverrides } = await adminClient
    .from("system_settings")
    .select("key, value")
    .like("key", "feature_driver_%");

  const driverOverrideMap = new Map<string, boolean>();
  for (const override of driverOverrides ?? []) {
    const value = override.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const enabled = (value as { enabled?: unknown }).enabled;
      if (typeof enabled === "boolean") {
        driverOverrideMap.set(override.key, enabled);
      }
    }
  }

  const formattedFlags = (flags ?? []).map((flag) => ({
    key: flag.key,
    enabled: flag.enabled,
    driverEnabled:
      isDriverFeatureKey(flag.key as import("@/lib/features/catalog").FeatureKey)
        ? (driverOverrideMap.get(`feature_driver_${flag.key}`) ?? true)
        : false,
    description: flag.description,
  }));

  const formattedAssignments: BetaAssignmentData[] = (rawAssignments ?? []).map((a) => {
    const prof = a.profile_id ? profileMap.get(a.profile_id) : null;
    return {
      id: a.id,
      featureKey: flagMap.get(a.feature_flag_id) || "unknown",
      profileId: a.profile_id,
      email: prof?.email || null,
      fullName: prof?.full_name || null,
      role: a.role,
      createdAt: a.created_at,
    };
  });

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · CONTROL PLANE"
        title="Release & Feature Control"
        description="Each switch is persistent. Driver-facing features have a Driver Access switch, so turning one OFF hides it from drivers while management keeps its operational access. Management-only switches control management availability."
      />

      {updated === "1" && (
        <p className="form-message form-message--success">
          Changes saved successfully. Feature toggles and testing account access updated across the application.
        </p>
      )}
      {error === "invalid" && (
        <p className="form-message form-message--error">
          Check the details provided. Core platform cannot be disabled, and beta access requires either a valid email or role.
        </p>
      )}
      {error === "not-found" && (
        <p className="form-message form-message--error">
          No VMC account was found for that tester email address.
        </p>
      )}
      {error === "database" && (
        <p className="form-message form-message--error">
          Could not save change to database. Please check connection and try again.
        </p>
      )}

      <section className="panel foundation-callout">
        <div>
          <p className="eyebrow">CURRENT ACCESS</p>
          <h2>{profile.role === "admin" ? "Administrator controls active" : "Feature toggle visibility"}</h2>
          <p>
            {profile.role === "admin"
              ? "Administrators can flip any feature switch ON or OFF and configure testing accounts."
              : "Staff can view current feature states and assigned testing accounts."}
          </p>
        </div>
        <StatusBadge tone={profile.role === "admin" ? "green" : "slate"}>{profile.role}</StatusBadge>
      </section>

      {/* Main Interactive Feature Toggle Board with Testing Accounts */}
      <FeatureToggleBoard
        initialFlags={formattedFlags}
        assignments={formattedAssignments}
        isAdmin={profile.role === "admin"}
      />
    </>
  );
}
