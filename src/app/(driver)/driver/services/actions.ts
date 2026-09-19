"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { DRIVER_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import type { ServiceType } from "@/lib/database.types";

export async function submitServiceRequest(formData: FormData) {
  const profile = await requireRole(DRIVER_ROLES);
  if (!(await hasFeatureAccess("service_requests"))) {
    return { error: "Service booking is currently locked by release control." };
  }

  const service_type = String(formData.get("service_type") ?? "").trim() as ServiceType;
  const preferred_date = String(formData.get("preferred_date") ?? "").trim();
  const preferred_time = String(formData.get("preferred_time") ?? "morning").trim();
  const odometerRaw = formData.get("odometer_reading_km");
  const odometer_reading_km = odometerRaw ? Number(odometerRaw) : null;
  const driver_notes = String(formData.get("driver_notes") ?? "").trim() || null;

  const validTypes: ServiceType[] = [
    "standard_service",
    "first_service_1000km",
    "scheduled_service_3000km",
    "major_service_6000km",
    "oil_change",
    "brake_tyre_inspection",
    "other",
  ];
  if (!validTypes.includes(service_type)) {
    return { error: "Please choose a valid service type." };
  }

  if (!preferred_date) {
    return { error: "Please select a preferred service date." };
  }

  const supabase = await createClient();

  // Find driver & assigned bike
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, bike_id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!driver || !driver.bike_id) {
    return { error: "You must have an assigned HERO motorcycle to book a service." };
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

  // Insert service request
  const { error: insertErr } = await supabase
    .from("service_requests")
    .insert({
      driver_id: driver.id,
      bike_id: driver.bike_id,
      service_type,
      preferred_date,
      preferred_time,
      odometer_reading_km: odometer_reading_km && odometer_reading_km > 0 ? Math.floor(odometer_reading_km) : null,
      driver_notes,
      status: "requested",
      created_by: profile.id,
    });

  if (insertErr) {
    console.error("Error creating service request:", insertErr);
    return { error: insertErr.message || "Failed to book service." };
  }

  // Update bike mileage if driver entered a higher odometer reading
  if (odometer_reading_km && odometer_reading_km > 0) {
    const { data: bike } = await supabase
      .from("bikes")
      .select("current_mileage_km")
      .eq("id", driver.bike_id)
      .single();

    if (bike && (!bike.current_mileage_km || odometer_reading_km > bike.current_mileage_km)) {
      await supabase
        .from("bikes")
        .update({ current_mileage_km: Math.floor(odometer_reading_km) })
        .eq("id", driver.bike_id);
    }
  }

  revalidatePath("/driver/services");
  revalidatePath("/driver/bike");
  revalidatePath("/management/services");
  revalidatePath("/management/bikes");
  return { success: true };
}
