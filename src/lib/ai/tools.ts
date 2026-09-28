import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { AuthenticatedProfile } from "@/lib/auth/authorization";

export type AiToolResult = { ok: boolean; data?: unknown; error?: string };

function cleanQuery(value: unknown) {
  return String(value ?? "").trim().slice(0, 80);
}

async function getDriverContext(profile: AuthenticatedProfile) {
  const supabase = await createClient();
  const { data: driver } = await supabase
    .from("drivers")
    .select("id, bike_id, status, start_date")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!driver) return { supabase, driver: null, bike: null, contract: null };

  const [{ data: bike }, { data: contract }] = await Promise.all([
    driver.bike_id
      ? supabase
          .from("bikes")
          .select("id, brand, model, colour, registration_number, current_mileage_km, next_service_due_km, status")
          .eq("id", driver.bike_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("contracts")
      .select("id, weekly_amount, total_weeks, start_date, status")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return { supabase, driver, bike, contract };
}

export const AI_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_my_vehicle",
      description: "For a driver, retrieve only their own assigned VMC motorcycle and current operational status.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_my_payment_status",
      description: "For a driver, summarize only their own contract and payment periods.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_parts",
      description: "Search VMC parts inventory. Drivers only receive parts compatible with their assigned bike; management receives operational inventory details.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Part name, part number, SKU, or category." } },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_management_summary",
      description: "For VMC management only, summarize fleet, driver, payment, maintenance, emergency and stock counts.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_management_attention",
      description: "For VMC management only, list urgent open emergencies and maintenance items.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

async function getMyVehicle(profile: AuthenticatedProfile): Promise<AiToolResult> {
  if (profile.role !== "driver") return { ok: false, error: "Driver access required." };
  const { driver, bike } = await getDriverContext(profile);
  return { ok: true, data: driver ? { driverStatus: driver.status, startDate: driver.start_date, motorcycle: bike ?? "No motorcycle assigned." } : { message: "No driver record is available yet." } };
}

async function getMyPaymentStatus(profile: AuthenticatedProfile): Promise<AiToolResult> {
  if (profile.role !== "driver") return { ok: false, error: "Driver access required." };
  const { supabase, driver, contract } = await getDriverContext(profile);

  if (!driver) return { ok: true, data: { message: "No driver record is available yet." } };
  if (!contract) return { ok: true, data: { message: "No contract is available yet." } };

  const { data: periods } = await supabase
    .from("payment_periods")
    .select("period_number, due_date, amount_due, status, submitted_at, verified_at")
    .eq("contract_id", contract.id)
    .order("period_number", { ascending: true })
    .limit(52);

  const rows = periods ?? [];
  return {
    ok: true,
    data: {
      weeklyAmount: contract.weekly_amount,
      contractStart: contract.start_date,
      contractStatus: contract.status,
      verifiedCount: rows.filter((row) => row.status === "verified").length,
      attention: rows.filter((row) => ["due", "awaiting_verification", "overdue"].includes(row.status)).slice(0, 5),
      nextPayments: rows.filter((row) => row.status === "upcoming").slice(0, 3),
    },
  };
}

async function searchParts(profile: AuthenticatedProfile, args: Record<string, unknown>): Promise<AiToolResult> {
  const query = cleanQuery(args.query);
  if (!query) return { ok: false, error: "A search query is required." };

  const supabase = await createClient();
  const [{ data: nameRows }, { data: numberRows }, { data: categoryRows }] = await Promise.all([
    supabase.from("parts").select("id, name, sku, part_number, category, description, compatible_model, unit_price, stock_quantity, minimum_stock_level, supplier, status, storage_location").ilike("name", `%${query}%`).limit(10),
    supabase.from("parts").select("id, name, sku, part_number, category, description, compatible_model, unit_price, stock_quantity, minimum_stock_level, supplier, status, storage_location").ilike("part_number", `%${query}%`).limit(10),
    supabase.from("parts").select("id, name, sku, part_number, category, description, compatible_model, unit_price, stock_quantity, minimum_stock_level, supplier, status, storage_location").ilike("category", `%${query}%`).limit(10),
  ]);

  const merged = new Map<string, Record<string, unknown>>();
  for (const part of [...(nameRows ?? []), ...(numberRows ?? []), ...(categoryRows ?? [])]) merged.set(part.id, part);

  let parts = [...merged.values()];

  if (profile.role === "driver") {
    const { bike } = await getDriverContext(profile);
    if (!bike) return { ok: true, data: { message: "No assigned motorcycle. Ask VMC to assign your bike before using bike-specific parts lookup." } };

    const model = bike.model.toLowerCase();
    parts = parts
      .filter((part) => {
        const compatible = String(part.compatible_model ?? "").trim().toLowerCase();
        return !compatible || compatible.includes(model) || model.includes(compatible);
      })
      .map((part) => ({
        name: part.name,
        partNumber: part.part_number ?? part.sku,
        category: part.category,
        description: part.description,
        compatibleModel: part.compatible_model,
        price: part.unit_price,
        stockStatus: part.status,
        stockQuantity: part.stock_quantity,
      }));
  } else {
    parts = parts.map((part) => ({
      name: part.name,
      partNumber: part.part_number ?? part.sku,
      category: part.category,
      description: part.description,
      compatibleModel: part.compatible_model,
      price: part.unit_price,
      stockStatus: part.status,
      stockQuantity: part.stock_quantity,
      minimumStockLevel: part.minimum_stock_level,
      supplier: part.supplier,
      storageLocation: part.storage_location,
    }));
  }

  return { ok: true, data: parts.slice(0, 20) };
}

async function getManagementSummary(profile: AuthenticatedProfile): Promise<AiToolResult> {
  if (profile.role !== "admin" && profile.role !== "staff") return { ok: false, error: "Management access required." };

  const supabase = await createClient();
  const [
    { count: drivers },
    { count: bikes },
    { count: assignedBikes },
    { count: emergencies },
    { count: maintenance },
    { count: payments },
    { count: lowStock },
  ] = await Promise.all([
    supabase.from("drivers").select("id", { count: "exact", head: true }),
    supabase.from("bikes").select("id", { count: "exact", head: true }),
    supabase.from("bikes").select("id", { count: "exact", head: true }).eq("status", "assigned"),
    supabase.from("emergency_reports").select("id", { count: "exact", head: true }).in("status", ["open", "acknowledged", "responding"]),
    supabase.from("maintenance_requests").select("id", { count: "exact", head: true }).in("status", ["submitted", "under_review", "scheduled", "in_progress", "awaiting_parts"]),
    supabase.from("payment_periods").select("id", { count: "exact", head: true }).in("status", ["due", "submitted", "awaiting_verification", "overdue"]),
    supabase.from("parts").select("id", { count: "exact", head: true }).in("status", ["low_stock", "out_of_stock"]),
  ]);

  return {
    ok: true,
    data: {
      activeDrivers: drivers ?? 0,
      totalBikes: bikes ?? 0,
      assignedBikes: assignedBikes ?? 0,
      openEmergencies: emergencies ?? 0,
      maintenanceQueue: maintenance ?? 0,
      paymentsNeedingReview: payments ?? 0,
      lowStockParts: lowStock ?? 0,
    },
  };
}

async function getManagementAttention(profile: AuthenticatedProfile): Promise<AiToolResult> {
  if (profile.role !== "admin" && profile.role !== "staff") return { ok: false, error: "Management access required." };

  const supabase = await createClient();
  const [{ data: emergencies }, { data: maintenance }] = await Promise.all([
    supabase.from("emergency_reports").select("id, emergency_type, description, severity, status, location_description, created_at").in("status", ["open", "acknowledged", "responding"]).order("created_at", { ascending: false }).limit(5),
    supabase.from("maintenance_requests").select("id, category, title, description, severity, status, scheduled_for, created_at").in("status", ["submitted", "under_review", "scheduled", "in_progress", "awaiting_parts"]).order("created_at", { ascending: false }).limit(5),
  ]);

  return { ok: true, data: { emergencies: emergencies ?? [], maintenance: maintenance ?? [] } };
}

export async function executeAiTool(name: string, args: Record<string, unknown>, profile: AuthenticatedProfile): Promise<AiToolResult> {
  switch (name) {
    case "get_my_vehicle": return getMyVehicle(profile);
    case "get_my_payment_status": return getMyPaymentStatus(profile);
    case "search_parts": return searchParts(profile, args);
    case "get_management_summary": return getManagementSummary(profile);
    case "get_management_attention": return getManagementAttention(profile);
    default: return { ok: false, error: "Unknown VMC AI tool." };
  }
}
