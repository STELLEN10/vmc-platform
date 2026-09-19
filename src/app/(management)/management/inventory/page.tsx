import { LockedFeature } from "@/components/locked-feature";
import { PageHeading } from "@/components/page-heading";
import { StatusBadge } from "@/components/status-badge";
import { requireRole } from "@/lib/auth/authorization";
import { MANAGEMENT_ROLES } from "@/lib/auth/roles";
import { hasFeatureAccess } from "@/lib/features/server";
import { createClient } from "@/lib/supabase/server";
import { addPart, adjustPartStock } from "./actions";

export default async function ManagementInventoryPage() {
  await requireRole(MANAGEMENT_ROLES);
  const enabled = await hasFeatureAccess("parts_inventory");
  if (!enabled) {
    return (
      <>
        <PageHeading
          eyebrow="VMC MANAGEMENT · INVENTORY"
          title="Parts & spares inventory"
          description="Track stock levels, compatible Hero parts, and warehouse movements."
        />
        <LockedFeature feature="parts_inventory" />
      </>
    );
  }

  const supabase = await createClient();
  const { data: parts } = await supabase
    .from("parts")
    .select("*")
    .order("name", { ascending: true });

  const totalParts = parts?.length ?? 0;
  const lowStockCount = parts?.filter((p) => p.status === "low_stock").length ?? 0;
  const outOfStockCount = parts?.filter((p) => p.status === "out_of_stock").length ?? 0;

  return (
    <>
      <PageHeading
        eyebrow="VMC MANAGEMENT · INVENTORY"
        title="Parts & spares inventory"
        description="Live operational parts catalogue. Stock adjustments automatically record immutable audit movements."
      />

      <section className="metric-grid">
        <article className="panel metric-card">
          <p className="card-label">CATALOGUE ITEMS</p>
          <strong>{totalParts}</strong>
          <span>Total registered parts</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">LOW STOCK ALERTS</p>
          <strong className={lowStockCount > 0 ? "text-amber-600" : ""}>{lowStockCount}</strong>
          <span>At or below minimum threshold</span>
        </article>
        <article className="panel metric-card">
          <p className="card-label">OUT OF STOCK</p>
          <strong className={outOfStockCount > 0 ? "text-red-600" : ""}>{outOfStockCount}</strong>
          <span>Replenishment required</span>
        </article>
      </section>

      <section className="review-grid section-gap">
        <form
          className="panel review-form"
          action={async (formData) => {
            "use server";
            await addPart(formData);
          }}
        >
          <p className="card-label">ADD NEW INVENTORY PART</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label>
              Part name *
              <input name="name" required placeholder="e.g. Front Brake Pad Set" />
            </label>
            <label>
              Part number / SKU
              <input name="part_number" placeholder="e.g. H-BRK-150-F" />
            </label>
            <label>
              Category
              <select name="category" defaultValue="Brakes">
                <option value="Engine">Engine</option>
                <option value="Brakes">Brakes</option>
                <option value="Tyres & Wheels">Tyres & Wheels</option>
                <option value="Electrical">Electrical & Battery</option>
                <option value="Drive & Chain">Drive & Chain</option>
                <option value="Body & Frame">Body & Frame</option>
                <option value="Fluids & Filters">Fluids & Filters</option>
                <option value="General">General / Consumable</option>
              </select>
            </label>
            <label>
              Compatible model
              <input name="compatible_model" placeholder="e.g. HERO Hunter 150 / ECO 150" />
            </label>
            <label>
              Initial quantity
              <input name="stock_quantity" type="number" min={0} defaultValue={10} required />
            </label>
            <label>
              Minimum reorder level
              <input name="minimum_stock_level" type="number" min={0} defaultValue={5} required />
            </label>
            <label>
              Unit price (ZAR)
              <input name="unit_price" type="number" step="0.01" min={0} placeholder="e.g. 150.00" />
            </label>
            <label>
              Storage location
              <input name="storage_location" placeholder="e.g. Bin B-14, Pretoria Depot" />
            </label>
          </div>
          <label>
            Notes / specifications
            <textarea name="notes" placeholder="Optional supplier notes, fitting instructions, or warranty info" rows={2} />
          </label>
          <button className="button button--primary" type="submit">
            Add part to inventory
          </button>
        </form>
      </section>

      <section className="panel table-panel section-gap">
        <div className="p-4 border-b border-line flex items-center justify-between">
          <p className="card-label m-0">PARTS STOCK REGISTER</p>
          <span className="text-xs text-muted">All updates create immutable inventory movement logs</span>
        </div>
        <div className="data-table" role="table" aria-label="Inventory parts table">
          <div className="data-table__row data-table__head" role="row" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr" }}>
            <span role="columnheader">Part details</span>
            <span role="columnheader">Category & Model</span>
            <span role="columnheader">Stock level</span>
            <span role="columnheader">Quick stock update</span>
          </div>

          {parts?.map((part) => (
            <div className="data-table__row" role="row" key={part.id} style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1.2fr" }}>
              <span role="cell">
                <strong>{part.name}</strong>
                <span className="text-xs text-muted block mono-value">{part.part_number || part.sku || "No SKU"}</span>
                {part.storage_location && <span className="text-[11px] text-muted block">📍 {part.storage_location}</span>}
              </span>
              <span role="cell">
                <span className="text-xs font-semibold block">{part.category}</span>
                <span className="text-xs text-muted block">{part.compatible_model || "All models"}</span>
                {part.unit_price != null && <span className="text-xs font-mono block">R {Number(part.unit_price).toFixed(2)}</span>}
              </span>
              <span role="cell">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{part.stock_quantity}</span>
                  <StatusBadge tone={part.status === "in_stock" ? "green" : part.status === "low_stock" ? "blue" : "red"}>
                    {part.status.replace("_", " ")}
                  </StatusBadge>
                </div>
                <span className="text-[11px] text-muted block">Min threshold: {part.minimum_stock_level}</span>
              </span>
              <span role="cell">
                <div className="flex items-center gap-1.5">
                  <form action={async () => {
                    "use server";
                    await adjustPartStock(part.id, 1, "Quick restock (+1)", "received");
                  }}>
                    <button type="submit" className="button button--light !px-2 !py-0.5 !text-xs font-mono" title="Add 1 in stock">+1</button>
                  </form>
                  <form action={async () => {
                    "use server";
                    await adjustPartStock(part.id, 5, "Bulk restock (+5)", "received");
                  }}>
                    <button type="submit" className="button button--light !px-2 !py-0.5 !text-xs font-mono" title="Add 5 in stock">+5</button>
                  </form>
                  <form action={async () => {
                    "use server";
                    await adjustPartStock(part.id, -1, "Part fitted to bike (-1)", "used");
                  }}>
                    <button type="submit" className="button button--light !px-2 !py-0.5 !text-xs font-mono text-red-600" title="Deduct 1 (used)">-1</button>
                  </form>
                </div>
              </span>
            </div>
          ))}

          {(!parts || parts.length === 0) && (
            <div className="empty-state table-empty p-6 text-center">
              <h2>No inventory parts registered yet</h2>
              <p>Add your first spare part above to start tracking stock levels for the HERO motorcycle fleet.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
