"use server";

import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

export async function createDocumentSignedUrl(
  bucket: string,
  storagePath: string
): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const targetBucket = bucket || "vmc-application-documents";

  const { data, error } = await supabase.storage
    .from(targetBucket)
    .createSignedUrl(storagePath, 300);

  if (error || !data?.signedUrl) {
    console.error("Failed to generate signed document URL:", error);
    return {
      success: false,
      error: error?.message || "Failed to generate signed access link",
    };
  }

  return { success: true, signedUrl: data.signedUrl };
}
