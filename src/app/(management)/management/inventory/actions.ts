"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { recordAuditEvent } from "@/lib/audit/server";
import type { InventoryMovementType, PartStatus, Database } from "@/lib/database.types";

type PartUpdate = Database["public"]["Tables"]["parts"]["Update"];

export interface ParsedPartInput {
  name: string;
  part_number?: string | null;
  sku?: string | null;
  category?: string;
  compatible_model?: string | null;
  stock_quantity?: number;
  minimum_stock_level?: number;
  unit_price?: number | null;
  storage_location?: string | null;
  supplier?: string | null;
  notes?: string | null;
}

export type ImportMode = "upsert" | "add_stock" | "new_only";

export async function addPart(formData: FormData) {
  const profile = await requireRole(MANAGEMENT_ROLES);
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
    await supabase.from("inventory_movements").insert({
      part_id: insertedPart.id,
      movement_type: "opening_balance",
      quantity_delta: stock_quantity,
      reason: "Initial catalogue stock entry",
      performed_by: profile.id,
    });
  }

  await recordAuditEvent({
    action: "inventory_part_created",
    entityType: "part",
    entityId: insertedPart?.id,
    newValues: { name, sku, stock_quantity, unit_price },
  });

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");
  return { success: true, id: insertedPart?.id };
}

export async function adjustPartStock(
  partId: string,
  quantityDelta: number,
  reason: string,
  movementType: InventoryMovementType = "adjustment"
) {
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
    .select("id, name, stock_quantity, minimum_stock_level")
    .eq("id", partId)
    .single();

  if (fetchErr || !part) {
    return { error: "Part not found" };
  }

  const oldQty = part.stock_quantity;
  const newQty = Math.max(0, oldQty + quantityDelta);
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

  await recordAuditEvent({
    action: "part_stock_adjusted",
    entityType: "part",
    entityId: partId,
    oldValues: { stock_quantity: oldQty },
    newValues: { stock_quantity: newQty, delta: quantityDelta, reason },
  });

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");
  return { success: true, newStock: newQty };
}

export async function setPartStock(
  partId: string,
  newStockQuantity: number,
  reason: string = "Direct stock edit",
  movementType?: InventoryMovementType
) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("parts_inventory"))) {
    return { error: "Parts inventory is currently locked by release control." };
  }

  if (isNaN(newStockQuantity) || newStockQuantity < 0) {
    return { error: "Stock quantity must be a non-negative number" };
  }

  const supabase = await createClient();
  const { data: part, error: fetchErr } = await supabase
    .from("parts")
    .select("id, name, stock_quantity, minimum_stock_level")
    .eq("id", partId)
    .single();

  if (fetchErr || !part) {
    return { error: "Part not found" };
  }

  const currentStock = part.stock_quantity;
  const delta = newStockQuantity - currentStock;

  if (delta === 0) {
    return { success: true, message: "Stock unchanged", newStock: currentStock };
  }

  const calculatedType: InventoryMovementType = movementType || (delta > 0 ? "received" : "adjustment");
  let newStatus: PartStatus = "in_stock";
  if (newStockQuantity === 0) newStatus = "out_of_stock";
  else if (newStockQuantity <= part.minimum_stock_level) newStatus = "low_stock";

  const { error: updateErr } = await supabase
    .from("parts")
    .update({ stock_quantity: newStockQuantity, status: newStatus })
    .eq("id", partId);

  if (updateErr) {
    return { error: updateErr.message || "Failed to update stock quantity" };
  }

  // Record movement audit
  await supabase.from("inventory_movements").insert({
    part_id: partId,
    movement_type: calculatedType,
    quantity_delta: delta,
    reason: reason || `Stock reconciled from ${currentStock} to ${newStockQuantity}`,
    performed_by: profile.id,
  });

  await recordAuditEvent({
    action: "part_stock_set",
    entityType: "part",
    entityId: partId,
    oldValues: { stock_quantity: currentStock },
    newValues: { stock_quantity: newStockQuantity, delta, reason },
  });

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");
  return { success: true, newStock: newStockQuantity };
}

export async function updatePart(formData: FormData) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("parts_inventory"))) {
    return { error: "Parts inventory is currently locked by release control." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { error: "Part ID is required" };

  const name = String(formData.get("name") ?? "").trim();
  const part_number = String(formData.get("part_number") ?? "").trim() || null;
  const sku = String(formData.get("sku") ?? "").trim() || part_number;
  const category = String(formData.get("category") ?? "General").trim();
  const compatible_model = String(formData.get("compatible_model") ?? "").trim() || null;
  const unit_price = formData.get("unit_price") ? Number(formData.get("unit_price")) : null;
  const newStock = Math.max(0, Number(formData.get("stock_quantity") ?? 0));
  const minimum_stock_level = Math.max(0, Number(formData.get("minimum_stock_level") ?? 5));
  const supplier = String(formData.get("supplier") ?? "").trim() || null;
  const storage_location = String(formData.get("storage_location") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!name) return { error: "Part name is required" };

  const supabase = await createClient();
  const { data: currentPart, error: fetchErr } = await supabase
    .from("parts")
    .select("stock_quantity")
    .eq("id", id)
    .single();

  if (fetchErr || !currentPart) return { error: "Part not found" };

  let status: PartStatus = "in_stock";
  if (newStock === 0) status = "out_of_stock";
  else if (newStock <= minimum_stock_level) status = "low_stock";

  const { error: updateErr } = await supabase
    .from("parts")
    .update({
      name,
      part_number,
      sku,
      category,
      compatible_model,
      unit_price,
      stock_quantity: newStock,
      minimum_stock_level,
      supplier,
      storage_location,
      notes,
      status,
    })
    .eq("id", id);

  if (updateErr) {
    return { error: updateErr.message || "Failed to update part" };
  }

  // Check if stock changed to record movement
  const delta = newStock - currentPart.stock_quantity;
  if (delta !== 0) {
    await supabase.from("inventory_movements").insert({
      part_id: id,
      movement_type: delta > 0 ? "received" : "adjustment",
      quantity_delta: delta,
      reason: `Stock adjusted via part edit from ${currentPart.stock_quantity} to ${newStock}`,
      performed_by: profile.id,
    });
  }

  await recordAuditEvent({
    action: "part_updated",
    entityType: "part",
    entityId: id,
    newValues: { name, sku, newStock, unit_price, storage_location },
  });

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");
  return { success: true };
}

export async function deletePart(partId: string) {
  await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("parts_inventory"))) {
    return { error: "Parts inventory is currently locked by release control." };
  }

  const supabase = await createClient();
  // Check if there are movements
  const { error } = await supabase.from("parts").delete().eq("id", partId);

  if (error) {
    // If foreign key constraint prevents deletion, mark discontinued
    const { error: updateErr } = await supabase
      .from("parts")
      .update({ status: "discontinued" as PartStatus })
      .eq("id", partId);
    if (updateErr) {
      return { error: "Could not remove or discontinue part: " + updateErr.message };
    }
    revalidatePath("/management/inventory");
    return { success: true, discontinued: true };
  }

  await recordAuditEvent({
    action: "part_deleted",
    entityType: "part",
    entityId: partId,
  });

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");
  return { success: true };
}

export async function getPartMovements(partId: string) {
  await requireRole(MANAGEMENT_ROLES);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory_movements")
    .select("id, movement_type, quantity_delta, reason, created_at, performed_by")
    .eq("part_id", partId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return { error: error.message };
  }

  return { movements: data || [] };
}

export async function importParts(
  parts: ParsedPartInput[],
  mode: ImportMode = "upsert",
  filename: string = "spreadsheet_import"
) {
  const profile = await requireRole(MANAGEMENT_ROLES);
  if (!(await hasFeatureAccess("parts_inventory"))) {
    return { error: "Parts inventory is currently locked by release control." };
  }

  if (!parts || parts.length === 0) {
    return { error: "No parts data provided in spreadsheet" };
  }

  const supabase = await createClient();

  // Fetch all existing parts to map by SKU and Part Number
  const { data: existingParts, error: fetchErr } = await supabase
    .from("parts")
    .select("id, name, sku, part_number, stock_quantity, minimum_stock_level");

  if (fetchErr) {
    return { error: "Failed to query existing catalogue: " + fetchErr.message };
  }

  const skuMap = new Map<string, (typeof existingParts)[number]>();
  const nameMap = new Map<string, (typeof existingParts)[number]>();

  existingParts?.forEach((p) => {
    if (p.sku) skuMap.set(p.sku.trim().toLowerCase(), p);
    if (p.part_number) skuMap.set(p.part_number.trim().toLowerCase(), p);
    if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
  });

  let addedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const row = parts[i];
    const name = row.name?.trim();
    if (!name) {
      skippedCount++;
      errors.push(`Row ${i + 1}: Skipped due to missing part name`);
      continue;
    }

    const sku = row.sku?.trim() || row.part_number?.trim() || null;
    const part_number = row.part_number?.trim() || sku;
    const category = row.category?.trim() || "General";
    const compatible_model = row.compatible_model?.trim() || null;
    const unit_price = row.unit_price != null && !isNaN(row.unit_price) ? Number(row.unit_price) : null;
    const incomingQty = Math.max(0, Math.floor(Number(row.stock_quantity ?? 0)));
    const minLevel = Math.max(0, Math.floor(Number(row.minimum_stock_level ?? 5)));
    const storage_location = row.storage_location?.trim() || null;
    const supplier = row.supplier?.trim() || null;
    const notes = row.notes?.trim() || null;

    // Check if part exists
    const existing = (sku ? skuMap.get(sku.toLowerCase()) : null) || nameMap.get(name.toLowerCase());

    if (existing) {
      if (mode === "new_only") {
        skippedCount++;
        continue;
      }

      let finalStock = incomingQty;
      let delta = 0;

      if (mode === "add_stock") {
        finalStock = existing.stock_quantity + incomingQty;
        delta = incomingQty;
      } else {
        // upsert / overwrite
        finalStock = incomingQty;
        delta = finalStock - existing.stock_quantity;
      }

      let status: PartStatus = "in_stock";
      if (finalStock === 0) status = "out_of_stock";
      else if (finalStock <= (row.minimum_stock_level ?? existing.minimum_stock_level)) status = "low_stock";

      const updateData: PartUpdate = {
        stock_quantity: finalStock,
        status,
      };

      if (category) updateData.category = category;
      if (compatible_model) updateData.compatible_model = compatible_model;
      if (unit_price !== null) updateData.unit_price = unit_price;
      if (minLevel !== undefined) updateData.minimum_stock_level = minLevel;
      if (storage_location) updateData.storage_location = storage_location;
      if (supplier) updateData.supplier = supplier;
      if (notes) updateData.notes = notes;

      const { error: updErr } = await supabase.from("parts").update(updateData).eq("id", existing.id);

      if (updErr) {
        errors.push(`Row ${i + 1} (${name}): Update failed - ${updErr.message}`);
      } else {
        updatedCount++;
        // Record inventory movement if stock changed
        if (delta !== 0) {
          await supabase.from("inventory_movements").insert({
            part_id: existing.id,
            movement_type: delta > 0 ? "received" : "adjustment",
            quantity_delta: delta,
            reason: `Spreadsheet import (${filename}): ${mode === "add_stock" ? "Stock increment" : "Stock sync"}`,
            performed_by: profile.id,
          });
        }
      }
    } else {
      // Insert new part
      let status: PartStatus = "in_stock";
      if (incomingQty === 0) status = "out_of_stock";
      else if (incomingQty <= minLevel) status = "low_stock";

      const { data: newPart, error: insErr } = await supabase
        .from("parts")
        .insert({
          name,
          sku: sku || part_number,
          part_number,
          category,
          compatible_model,
          unit_price,
          stock_quantity: incomingQty,
          minimum_stock_level: minLevel,
          storage_location,
          supplier,
          notes,
          status,
        })
        .select("id")
        .single();

      if (insErr || !newPart) {
        errors.push(`Row ${i + 1} (${name}): Insert failed - ${insErr?.message || "Unknown error"}`);
      } else {
        addedCount++;
        // Keep in maps for subsequent rows in same spreadsheet
        if (sku) skuMap.set(sku.toLowerCase(), { id: newPart.id, name, sku, part_number, stock_quantity: incomingQty, minimum_stock_level: minLevel });
        nameMap.set(name.toLowerCase(), { id: newPart.id, name, sku, part_number, stock_quantity: incomingQty, minimum_stock_level: minLevel });

        if (incomingQty > 0) {
          await supabase.from("inventory_movements").insert({
            part_id: newPart.id,
            movement_type: "opening_balance",
            quantity_delta: incomingQty,
            reason: `Spreadsheet import initial stock (${filename})`,
            performed_by: profile.id,
          });
        }
      }
    }
  }

  await recordAuditEvent({
    action: "inventory_bulk_imported",
    entityType: "parts_catalogue",
    metadata: {
      filename,
      mode,
      total_rows: parts.length,
      added_count: addedCount,
      updated_count: updatedCount,
      skipped_count: skippedCount,
      errors_count: errors.length,
    },
  });

  revalidatePath("/management/inventory");
  revalidatePath("/driver/inventory");

  return {
    success: true,
    addedCount,
    updatedCount,
    skippedCount,
    errors,
  };
}
