import { AccountSettingsPage } from "@/components/account-settings-page";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";

export default async function DriverSettingsPage() {
  return <AccountSettingsPage profile={await requireRole(DRIVER_ROLES)} home="/driver" />;
}
