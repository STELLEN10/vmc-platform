import { redirect } from "next/navigation";

import { getAuthenticatedProfile } from "@/lib/auth/authorization";
import { destinationForRole } from "@/lib/auth/roles";

export default async function AuthenticationCompletePage() {
  const profile = await getAuthenticatedProfile();

  if (!profile) {
    redirect("/access-denied");
  }

  redirect(destinationForRole(profile.role));
}
