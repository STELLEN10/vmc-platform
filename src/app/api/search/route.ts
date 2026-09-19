import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  try {
    await requireRole(MANAGEMENT_ROLES);
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim() || "";

    if (q.length < 2) {
      return NextResponse.json({ groups: [] });
    }

    const supabase = createAdminClient();
    const pattern = `%${q}%`;

    const [
      { data: drivers },
      { data: bikes },
      { data: contracts },
      { data: maintenance },
      { data: emergencies },
      { data: parts },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .eq("role", "driver")
        .or(`full_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern}`)
        .limit(5),
      supabase
        .from("bikes")
        .select("id, brand, model, colour, registration_number, status, vin, engine_number")
        .or(`model.ilike.${pattern},registration_number.ilike.${pattern},vin.ilike.${pattern},engine_number.ilike.${pattern}`)
        .limit(5),
      supabase
        .from("contracts")
        .select("id, driver_id, weekly_amount, status, drivers(profiles(full_name))")
        .limit(5),
      supabase
        .from("maintenance_requests")
        .select("id, title, category, severity, status")
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .limit(5),
      supabase
        .from("emergency_reports")
        .select("id, emergency_type, severity, status, location_description, description")
        .or(`description.ilike.${pattern},location_description.ilike.${pattern}`)
        .limit(5),
      supabase
        .from("parts")
        .select("id, name, sku, category, status, stock_quantity")
        .or(`name.ilike.${pattern},sku.ilike.${pattern},category.ilike.${pattern}`)
        .limit(5),
    ]);

    const groups: Array<{
      category: string;
      items: Array<{
        id: string;
        title: string;
        subtitle: string;
        url: string;
        badge?: string;
      }>;
    }> = [];

    if (drivers && drivers.length > 0) {
      groups.push({
        category: "Drivers",
        items: drivers.map((d) => ({
          id: d.id,
          title: d.full_name || "Driver Profile",
          subtitle: `${d.email || ""} ${d.phone ? `· ${d.phone}` : ""}`,
          url: `/management/drivers/${d.id}`,
          badge: "Driver",
        })),
      });
    }

    if (bikes && bikes.length > 0) {
      groups.push({
        category: "Motorcycles",
        items: bikes.map((b) => ({
          id: b.id,
          title: `${b.model} (${b.registration_number || "Registration Pending"})`,
          subtitle: `${b.brand} · ${b.colour || "Standard"} · VIN: ${b.vin || "-"}`,
          url: `/management/bikes/${b.id}`,
          badge: b.status,
        })),
      });
    }

    if (contracts && contracts.length > 0) {
      // Filter in memory for contract matching
      const matchingContracts = contracts.filter((c) => {
        const name = (c.drivers as { profiles?: { full_name?: string } } | null)?.profiles?.full_name || "";
        return name.toLowerCase().includes(q.toLowerCase()) || c.id.toLowerCase().includes(q.toLowerCase());
      });
      if (matchingContracts.length > 0) {
        groups.push({
          category: "Contracts",
          items: matchingContracts.map((c) => {
            const driverName = (c.drivers as { profiles?: { full_name?: string } } | null)?.profiles?.full_name || "Driver";
            return {
              id: c.id,
              title: `Contract · ${driverName}`,
              subtitle: `R${c.weekly_amount}/wk · Status: ${c.status}`,
              url: `/management/drivers/${c.driver_id}`,
              badge: c.status,
            };
          }),
        });
      }
    }

    if (maintenance && maintenance.length > 0) {
      groups.push({
        category: "Maintenance",
        items: maintenance.map((m) => ({
          id: m.id,
          title: m.title,
          subtitle: `${m.category.replace("_", " ")} · ${m.severity} severity`,
          url: "/management/maintenance",
          badge: m.status.replace("_", " "),
        })),
      });
    }

    if (emergencies && emergencies.length > 0) {
      groups.push({
        category: "Emergencies",
        items: emergencies.map((e) => ({
          id: e.id,
          title: `Incident: ${e.emergency_type.replace("_", " ")}`,
          subtitle: `${e.severity} · ${e.location_description || e.description || ""}`,
          url: "/management/emergency",
          badge: e.status,
        })),
      });
    }

    if (parts && parts.length > 0) {
      groups.push({
        category: "Inventory & Parts",
        items: parts.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: `SKU: ${p.sku} · Stock: ${p.stock_quantity} units`,
          url: "/management/inventory",
          badge: p.status.replace("_", " "),
        })),
      });
    }

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Search API failed:", error);
    return NextResponse.json({ error: "Failed to perform search" }, { status: 500 });
  }
}
