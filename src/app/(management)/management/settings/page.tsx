import { AccountSettingsPage } from "@/components/account-settings-page";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";

export default async function ManagementSettingsPage() {
  return <AccountSettingsPage profile={await requireRole(MANAGEMENT_ROLES)} home="/management" />;
}
