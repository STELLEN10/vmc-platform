"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import type { InventoryMovementType, PartStatus } from "@/lib/database.types";

export async function addPart(formData: FormData) {
  await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("parts_inventory"))) {
    return { error: "Parts inventory is currently locked by release control." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const part_number = String(formData.get("part_number") ?? "").trim() || null;
  const sku = String(formData.get("sku") ?? "").trim() || part_number;
  const category = String(formData.get("category") ?? "General").trim();
  const compatible_model = String(formData.get("compatible_model") ?? "").trim() || null;
  const unit_price = formData.get("unit_price") ? Number(formData.get("unit_price")) : null;
  const stock_quantity = Math.max(0, Number(formData.get("stock_quantity") ?? 0));
  const minimum_stock_level = Math.max(0, Number(formData.get("minimum_stock_level") ?? 5));
  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const storage_location = String(formData.get("storage_location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) {
    return { error: "Part name is required" };
  }

  let status: PartStatus = "in_stock";
  if (stock_quantity === 0) status = "out_of_stock";
  else if (stock_quantity <= minimum_stock_level) status = "low_stock";

  const supabase = await createClient();
  const { data: insertedPart, error } = await supabase.from("parts").insert({
    name,
    part_number,
    sku,
    category,
    compatible_model,
    unit_price,
    stock_quantity,
    minimum_stock_level,
    supplier,
    storage_location,
    notes,
    status,
  }).select("id").single();

  if (error) {
    console.error("Error adding part:", error);
    return { error: error.message || "Failed to add part to inventory" };
  }

  // Record opening balance movement if quantity > 0
  if (stock_quantity > 0 && insertedPart) {
    const { data: user } = await supabase.auth.getUser();
    if (user.user) {
      await supabase.from("inventory_movements").insert({
        part_id: insertedPart.id,
        movement_type: "opening_balance",
        quantity_delta: stock_quantity,
        reason: "Initial catalog stock entry",
        performed_by: user.user.id,
      });
    }
  }

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");
  return { success: true };
}

export async function adjustPartStock(partId: string, quantityDelta: number, reason: string, movementType: InventoryMovementType = "adjustment") {
  const profile = await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("parts_inventory"))) {
    return { error: "Parts inventory is currently locked by release control." };
  }

  if (isNaN(quantityDelta) || quantityDelta === 0) {
    return { error: "Valid non-zero quantity delta is required" };
  }

  const supabase = await createClient();
  const { data: part, error: fetchErr } = await supabase
    .from("parts")
    .select("stock_quantity, minimum_stock_level")
    .eq("id", partId)
    .single();

  if (fetchErr || !part) {
    return { error: "Part not found" };
  }

  const newQty = Math.max(0, part.stock_quantity + quantityDelta);
  let newStatus: PartStatus = "in_stock";
  if (newQty === 0) newStatus = "out_of_stock";
  else if (newQty <= part.minimum_stock_level) newStatus = "low_stock";

  const { error: updateErr } = await supabase
    .from("parts")
    .update({ stock_quantity: newQty, status: newStatus })
    .eq("id", partId);

  if (updateErr) {
    return { error: updateErr.message || "Failed to update stock quantity" };
  }

  // Record movement
  await supabase.from("inventory_movements").insert({
    part_id: partId,
    movement_type: movementType,
    quantity_delta: quantityDelta,
    reason: reason || "Manual stock adjustment",
    performed_by: profile.id,
  });

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");
  return { success: true };
}
