import type { AppRole } from "@/lib/database.types";

export const MANAGEMENT_ROLES = ["admin", "staff"] as const;
export const DRIVER_ROLES = ["driver"] as const;

export function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "staff" || value === "driver";
}

export function destinationForRole(role: AppRole): "/management" | "/driver" {
  return role === "driver" ? "/driver" : "/management";
}
