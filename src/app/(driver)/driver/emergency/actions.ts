"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import type { EmergencySeverity, EmergencyType } from "@/lib/database.types";

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "application/pdf"];

export async function submitEmergencyReport(formData: FormData) {
  const profile = await requireRole(DRIVER_ROLES);
  if (!(await hasFeatureAccess("emergency_bike_support"))) {
    return { error: "Emergency support is currently locked by release control." };
  }

  const emergency_type = String(formData.get("emergency_type") ?? "").trim() as EmergencyType;
  const severity = (String(formData.get("severity") ?? "high").trim()) as EmergencySeverity;
  const location_description = String(formData.get("location_description") ?? "").trim();
  const rawDescription = String(formData.get("description") ?? "").trim();
  const description = rawDescription || `Emergency report logged at ${location_description || "roadside"}`;
  const attachment = formData.get("attachment") as File | null;

  const validTypes: EmergencyType[] = ["accident", "bike_breakdown", "safety_issue", "medical_emergency", "other"];
  if (!validTypes.includes(emergency_type)) {
    return { error: "Please select a valid emergency type." };
  }

  if (!location_description || location_description.length < 5) {
    return { error: "Please provide a specific location or landmark so help can reach you." };
  }

  const supabase = await createClient();

  // Find driver record
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, bike_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!driver || !driver.bike_id) {
    return { error: "Emergency dispatch requires an assigned motorcycle on your driver profile." };
  }

  const { data: report, error: insertErr } = await supabase
    .from("emergency_reports")
    .insert({
      driver_id: driver.id,
      bike_id: driver.bike_id,
      emergency_type,
      severity,
      location_description,
      description,
      status: "open",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (insertErr || !report) {
    console.error("Error creating emergency report:", insertErr);
    return { error: insertErr?.message || "Failed to submit emergency report." };
  }

  // Handle optional photo or video upload
  if (attachment && attachment.size > 0) {
    if (attachment.size <= MAX_ATTACHMENT_SIZE) {
      const mime = attachment.type;
      const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
      if (isAllowed) {
        const sanitizedName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `emergency/${profile.id}/${report.id}-${Date.now()}-${sanitizedName}`;

        const { error: uploadErr } = await supabase.storage
          .from("vmc-application-documents")
          .upload(storagePath, attachment, { contentType: mime, upsert: true });

        if (!uploadErr) {
          await supabase.from("emergency_attachments").insert({
            emergency_report_id: report.id,
            storage_bucket: "vmc-application-documents",
            storage_path: storagePath,
            file_name: attachment.name,
            mime_type: mime,
            file_size_bytes: attachment.size,
            created_by: profile.id,
          });
        }
      }
    }
  }

  revalidatePath("/driver/emergency");
  revalidatePath("/management/emergency");
  return { success: true };
}
