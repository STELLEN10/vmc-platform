"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import type { MaintenanceCategory, MaintenanceSeverity } from "@/lib/database.types";

const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_PREFIXES = ["image/", "video/", "application/pdf"];

export async function submitMaintenanceRequest(formData: FormData) {
  const profile = await requireRole(DRIVER_ROLES);
  if (!(await hasFeatureAccess("new_maintenance"))) {
    return { error: "Maintenance reporting is currently locked by release control." };
  }

  const category = String(formData.get("category") ?? "").trim() as MaintenanceCategory;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const severity = (String(formData.get("severity") ?? "medium").trim()) as MaintenanceSeverity;
  const attachment = formData.get("attachment") as File | null;

  if (!title || title.length < 3) {
    return { error: "Please enter a descriptive issue title (at least 3 characters)." };
  }
  if (!description || description.length < 10) {
    return { error: "Please describe the problem in detail (at least 10 characters)." };
  }

  const validCategories: MaintenanceCategory[] = [
    "engine", "brakes", "tyres", "electrical", "battery", "lights", "chain", "suspension", "body", "oil_service", "other"
  ];
  if (!validCategories.includes(category)) {
    return { error: "Please select a valid maintenance category." };
  }

  const supabase = await createClient();

  // Find driver's active bike assignment
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, bike_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!driver || !driver.bike_id) {
    return { error: "You must have an assigned HERO motorcycle to submit a maintenance request." };
  }

  // Verify active assignment
  const { data: assignment } = await supabase
    .from("bike_assignments")
    .select("id")
    .eq("driver_id", driver.id)
    .eq("bike_id", driver.bike_id)
    .eq("status", "assigned")
    .maybeSingle();

  if (!assignment) {
    return { error: "No active motorcycle assignment was verified for your account." };
  }

  // Insert maintenance request
  const { data: req, error: insertErr } = await supabase
    .from("maintenance_requests")
    .insert({
      driver_id: driver.id,
      bike_id: driver.bike_id,
      category,
      title,
      description,
      severity,
      status: "submitted",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (insertErr || !req) {
    console.error("Error creating maintenance request:", insertErr);
    return { error: insertErr?.message || "Failed to record maintenance request." };
  }

  // Handle optional attachment upload
  if (attachment && attachment.size > 0) {
    if (attachment.size > MAX_ATTACHMENT_SIZE) {
      return { error: "Attachment file exceeds maximum allowed size (50MB)." };
    }

    const mime = attachment.type;
    const isAllowed = ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
    if (!isAllowed) {
      return { error: "Attachment must be an image, video, or PDF document." };
    }

    const sanitizedName = attachment.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `maintenance/${profile.id}/${req.id}-${Date.now()}-${sanitizedName}`;

    const { error: uploadErr } = await supabase.storage
      .from("vmc-application-documents")
      .upload(storagePath, attachment, {
        contentType: mime,
        upsert: true,
      });

    if (uploadErr) {
      console.error("Error uploading maintenance attachment:", uploadErr);
    } else {
      await supabase.from("maintenance_attachments").insert({
        maintenance_request_id: req.id,
        storage_bucket: "vmc-application-documents",
        storage_path: storagePath,
        file_name: attachment.name,
        mime_type: mime,
        file_size_bytes: attachment.size,
        created_by: profile.id,
      });
    }
  }

  revalidatePath("/driver/maintenance");
  revalidatePath("/management/maintenance");
  return { success: true };
}
