"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  Search,
  Filter,
  Upload,
  Download,
  Plus,
  Pencil,
  Check,
  X,
  Clock,
  AlertCircle,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Boxes,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { adjustPartStock, setPartStock, addPart } from "./actions";
import { SpreadsheetImportModal } from "./spreadsheet-import-modal";
import { EditPartModal } from "./edit-part-modal";
import { PartHistoryModal } from "./part-history-modal";
import type { Database } from "@/lib/database.types";

type PartRow = Database["public"]["Tables"]["parts"]["Row"];

interface InventoryViewProps {
  initialParts: PartRow[];
}

export function InventoryView({ initialParts }: InventoryViewProps) {
  const [parts, setParts] = useState<PartRow[]>(initialParts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<PartRow | null>(null);
  const [historyPart, setHistoryPart] = useState<PartRow | null>(null);

  // In-line stock edit state: partId -> { newStock: number, reason: string }
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineStockValue, setInlineStockValue] = useState<number>(0);
  const [inlineReason, setInlineReason] = useState<string>("Physical stock count reconciliation");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Synchronize initialParts if revalidated from server
  if (parts !== initialParts && initialParts.length !== parts.length) {
    setParts(initialParts);
  }

  const categories = [
    "all",
    "Brakes",
    "Engine",
    "Tyres & Wheels",
    "Electrical",
    "Drive & Chain",
    "Body & Frame",
    "Fluids & Filters",
    "General",
  ];

  // Filtering
  const filteredParts = parts.filter((part) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      part.name.toLowerCase().includes(q) ||
      (part.sku && part.sku.toLowerCase().includes(q)) ||
      (part.part_number && part.part_number.toLowerCase().includes(q)) ||
      (part.compatible_model && part.compatible_model.toLowerCase().includes(q)) ||
      (part.storage_location && part.storage_location.toLowerCase().includes(q));

    const matchesCategory =
      selectedCategory === "all" || part.category.toLowerCase() === selectedCategory.toLowerCase();

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "low_stock" && part.status === "low_stock") ||
      (selectedStatus === "out_of_stock" && part.status === "out_of_stock") ||
      (selectedStatus === "in_stock" && part.status === "in_stock");

    return matchesQuery && matchesCategory && matchesStatus;
  });

  const lowStockCount = parts.filter((p) => p.status === "low_stock").length;
  const outOfStockCount = parts.filter((p) => p.status === "out_of_stock").length;

  function handleStartInlineEdit(part: PartRow) {
    setInlineEditId(part.id);
    setInlineStockValue(part.stock_quantity);
    setInlineReason("Physical stock count reconciliation");
    setInlineError(null);
  }

  function handleCancelInlineEdit() {
    setInlineEditId(null);
    setInlineError(null);
  }

  async function handleSaveInlineEdit(partId: string) {
    if (isNaN(inlineStockValue) || inlineStockValue < 0) {
      setInlineError("Stock must be 0 or greater");
      return;
    }

    startTransition(async () => {
      try {
        const res = await setPartStock(partId, inlineStockValue, inlineReason);
        if (res.error) {
          setInlineError(res.error);
        } else {
          // Optimistically update local parts list
          setParts((prev) =>
            prev.map((p) => {
              if (p.id !== partId) return p;
              const newQty = inlineStockValue;
              let newStatus: PartRow["status"] = "in_stock";
              if (newQty === 0) newStatus = "out_of_stock";
              else if (newQty <= p.minimum_stock_level) newStatus = "low_stock";
              return { ...p, stock_quantity: newQty, status: newStatus };
            })
          );
          setInlineEditId(null);
          setInlineError(null);
        }
      } catch (err) {
        setInlineError(err instanceof Error ? err.message : "Failed to update stock");
      }
    });
  }

  async function handleQuickAdjust(partId: string, delta: number, reason: string) {
    startTransition(async () => {
      try {
        const res = await adjustPartStock(
          partId,
          delta,
          reason,
          delta > 0 ? "received" : "used"
        );
        if (res.success && res.newStock !== undefined) {
          setParts((prev) =>
            prev.map((p) => {
              if (p.id !== partId) return p;
              const newQty = res.newStock!;
              let newStatus: PartRow["status"] = "in_stock";
              if (newQty === 0) newStatus = "out_of_stock";
              else if (newQty <= p.minimum_stock_level) newStatus = "low_stock";
              return { ...p, stock_quantity: newQty, status: newStatus };
            })
          );
        }
      } catch (err) {
        console.error("Adjustment failed:", err);
      }
    });
  }

  function handleExport(format: "xlsx" | "csv") {
    const exportData = filteredParts.map((p) => ({
      "Part Name": p.name,
      "Part Number": p.part_number || "",
      "SKU": p.sku || "",
      "Category": p.category,
      "Compatible Model": p.compatible_model || "All models",
      "Stock Quantity": p.stock_quantity,
      "Stock Status": p.status.replace("_", " "),
      "Minimum Level": p.minimum_stock_level,
      "Unit Price (ZAR)": p.unit_price ?? "",
      "Storage Location": p.storage_location || "",
      "Supplier": p.supplier || "",
      "Notes": p.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 24 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 30 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Register");
    const dateStr = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `vmc_parts_inventory_${dateStr}.${format}`, {
      bookType: format,
    });
  }

  return (
    <>
      {/* Metric summary cards */}
      <section className="metric-grid">
        <article className="panel metric-card">
          <p className="card-label">CATALOGUE ITEMS</p>
          <strong>{parts.length}</strong>
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
          <span>Replenishment required immediately</span>
        </article>
      </section>

      {/* Primary Actions & Controls Bar */}
      <section className="panel mt-4 p-4 border border-line bg-white shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-navy m-0">Inventory Operations</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="button button--primary !py-1.5 !px-3.5 !text-xs font-bold inline-flex items-center gap-2 shadow-xs"
            >
              <Upload className="w-4 h-4" />
              Upload Excel / CSV
            </button>

            <div className="relative inline-block text-left group">
              <button
                type="button"
                className="button button--light !py-1.5 !px-3 !text-xs font-semibold inline-flex items-center gap-1.5 border border-line hover:border-blue-300"
              >
                <Download className="w-3.5 h-3.5 text-muted" />
                Export Catalogue
                <ChevronDown className="w-3.5 h-3.5 text-muted" />
              </button>
              <div className="hidden group-hover:block absolute right-0 mt-1 w-44 bg-white rounded-md shadow-lg border border-line z-20 py-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleExport("xlsx")}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-navy font-semibold flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("csv")}
                  className="w-full text-left px-3 py-1.5 hover:bg-blue-50 text-navy font-semibold flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  CSV (.csv)
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="button button--light !py-1.5 !px-3 !text-xs font-semibold inline-flex items-center gap-1.5 border border-line"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? "Hide Form" : "Add Part Manually"}
              {showAddForm ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Add New Part Form */}
        {showAddForm && (
          <div className="mt-4 pt-4 border-t border-line animate-in fade-in duration-200">
            <form
              className="review-form"
              action={async (formData) => {
                const res = await addPart(formData);
                if (res?.success) {
                  setShowAddForm(false);
                }
              }}
            >
              <p className="card-label">ADD NEW INVENTORY PART</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <label>
                  Supplier / Brand
                  <input name="supplier" placeholder="e.g. Hero MotoCorp / Castrol" />
                </label>
                <label>
                  Notes / specifications
                  <input name="notes" placeholder="Optional supplier notes, fitting instructions" />
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="button button--light !py-1.5 !px-3.5 !text-xs"
                >
                  Cancel
                </button>
                <button className="button button--primary !py-1.5 !px-4 !text-xs font-bold" type="submit">
                  Save Part to Inventory
                </button>
              </div>
            </form>
          </div>
        )}
      </section>

      {/* Filter and Search Bar */}
      <section className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 min-w-[16rem]">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by part name, SKU, model, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-2 rounded-md border border-line bg-white shadow-xs focus:border-blue-500 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-navy text-xs"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status quick pills */}
        <div className="flex items-center gap-1 text-xs bg-surface p-1 rounded-md border border-line">
          <button
            type="button"
            onClick={() => setSelectedStatus("all")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              selectedStatus === "all" ? "bg-white text-navy shadow-xs" : "text-muted hover:text-navy"
            }`}
          >
            All ({parts.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("low_stock")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              selectedStatus === "low_stock" ? "bg-amber-100 text-amber-900 shadow-xs" : "text-muted hover:text-navy"
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus("out_of_stock")}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              selectedStatus === "out_of_stock" ? "bg-red-100 text-red-900 shadow-xs" : "text-muted hover:text-navy"
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-1.5 text-xs">
          <Filter className="w-3.5 h-3.5 text-muted" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-1.5 px-2.5 rounded-md border border-line bg-white text-navy font-semibold focus:outline-hidden"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "all" ? "All Categories" : c}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Main Parts Stock Register Table */}
      <section className="panel table-panel mt-4">
        <div className="p-4 border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="card-label m-0">PARTS STOCK REGISTER</p>
            <span className="text-xs text-muted">
              Showing {filteredParts.length} of {parts.length} registered components
            </span>
          </div>
          <span className="text-xs text-muted flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            All stock edits automatically record immutable audit movements
          </span>
        </div>

        <div className="data-table" role="table" aria-label="Inventory parts table">
          <div
            className="data-table__row data-table__head"
            role="row"
            style={{ gridTemplateColumns: "1.4fr 1.1fr 1.5fr 1.1fr" }}
          >
            <span role="columnheader">Part details</span>
            <span role="columnheader">Category & Model</span>
            <span role="columnheader">Stock level & In-line Edit</span>
            <span role="columnheader" className="text-right">Actions</span>
          </div>

          {filteredParts.map((part) => {
            const isEditingThis = inlineEditId === part.id;

            return (
              <div
                className={`data-table__row hover:bg-surface/30 transition-colors ${
                  isEditingThis ? "bg-blue-50/40 border-l-4 border-l-blue-600" : ""
                }`}
                role="row"
                key={part.id}
                style={{ gridTemplateColumns: "1.4fr 1.1fr 1.5fr 1.1fr" }}
              >
                {/* Part Details */}
                <span role="cell">
                  <div className="flex items-start gap-2">
                    <div>
                      <strong className="text-navy text-sm font-bold block">{part.name}</strong>
                      <span className="text-xs text-muted block mono-value font-mono">
                        {part.part_number || part.sku || "No SKU"}
                      </span>
                      {part.storage_location && (
                        <span className="text-[11px] text-muted block">📍 {part.storage_location}</span>
                      )}
                    </div>
                  </div>
                </span>

                {/* Category & Model */}
                <span role="cell">
                  <span className="text-xs font-semibold block text-navy">{part.category}</span>
                  <span className="text-xs text-muted block">{part.compatible_model || "All models"}</span>
                  {part.unit_price != null && (
                    <span className="text-xs font-mono font-semibold text-navy block">
                      R {Number(part.unit_price).toFixed(2)}
                    </span>
                  )}
                </span>

                {/* Stock Level & In-line Stock Edit */}
                <span role="cell">
                  {!isEditingThis ? (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg font-bold text-navy font-mono">{part.stock_quantity}</span>
                        <StatusBadge
                          tone={
                            part.status === "in_stock"
                              ? "green"
                              : part.status === "low_stock"
                              ? "blue"
                              : "red"
                          }
                        >
                          {part.status.replace("_", " ")}
                        </StatusBadge>

                        {/* In-line edit trigger button */}
                        <button
                          type="button"
                          onClick={() => handleStartInlineEdit(part)}
                          className="p-1 text-muted hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Click to edit stock quantity directly"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-muted">
                          Min threshold: <strong>{part.minimum_stock_level}</strong>
                        </span>

                        {/* Rapid +1, +5, -1 buttons */}
                        <div className="flex items-center gap-1 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(part.id, 1, "Quick restock (+1)")}
                            disabled={isPending}
                            className="button button--light !px-2 !py-0.5 !text-xs font-mono"
                            title="Add 1 in stock"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(part.id, 5, "Bulk restock (+5)")}
                            disabled={isPending}
                            className="button button--light !px-2 !py-0.5 !text-xs font-mono"
                            title="Add 5 in stock"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjust(part.id, -1, "Part fitted to bike (-1)")}
                            disabled={isPending || part.stock_quantity <= 0}
                            className="button button--light !px-2 !py-0.5 !text-xs font-mono text-red-600"
                            title="Deduct 1 (used)"
                          >
                            -1
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* In-line Stock Editor */
                    <div className="p-2.5 bg-white rounded-md border border-blue-400 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-navy">Set Exact Stock:</span>
                        <span className="text-[10px] text-muted">
                          Current: <strong>{part.stock_quantity}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          value={inlineStockValue}
                          onChange={(e) => setInlineStockValue(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-20 text-xs font-bold font-mono p-1 rounded border border-blue-500 bg-white text-navy focus:outline-hidden"
                          autoFocus
                        />
                        <select
                          value={inlineReason}
                          onChange={(e) => setInlineReason(e.target.value)}
                          className="text-[11px] p-1 rounded border border-line bg-white flex-1 focus:outline-hidden"
                        >
                          <option value="Physical stock count reconciliation">Stock count / audit</option>
                          <option value="Supplier delivery receipt">Supplier delivery</option>
                          <option value="Scrapped / damaged / written off">Damaged / scrapped</option>
                          <option value="Workshop usage / fitment">Workshop fitment</option>
                          <option value="Customer return / replenishment">Return / replacement</option>
                        </select>
                      </div>

                      {inlineError && (
                        <div className="text-[10px] text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>{inlineError}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-line/60">
                        <button
                          type="button"
                          onClick={handleCancelInlineEdit}
                          className="px-2 py-0.5 text-[11px] text-muted hover:text-navy rounded hover:bg-gray-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(part.id)}
                          disabled={isPending}
                          className="px-2.5 py-0.5 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Save Stock
                        </button>
                      </div>
                    </div>
                  )}
                </span>

                {/* Row Actions */}
                <span role="cell" className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingPart(part)}
                      className="button button--light !px-2.5 !py-1 !text-xs font-semibold inline-flex items-center gap-1 border border-line hover:border-blue-300"
                      title="Edit part details and stock"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit Part
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryPart(part)}
                      className="button button--light !px-2 !py-1 !text-xs font-semibold text-muted hover:text-navy border border-line"
                      title="View movement history & audit trail"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </span>
              </div>
            );
          })}

          {filteredParts.length === 0 && (
            <div className="empty-state table-empty p-8 text-center">
              <Boxes className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <h2 className="text-base font-bold text-navy">No parts found</h2>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                {searchQuery || selectedCategory !== "all" || selectedStatus !== "all"
                  ? "No parts match your search or filter criteria. Try clearing filters or searching for another term."
                  : "No inventory parts registered yet. You can upload an Excel/CSV spreadsheet or add parts manually."}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="button button--primary !py-1.5 !px-3.5 !text-xs font-bold"
                >
                  <Upload className="w-3.5 h-3.5 mr-1" />
                  Upload Parts Spreadsheet
                </button>
                {(searchQuery || selectedCategory !== "all" || selectedStatus !== "all") && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                      setSelectedStatus("all");
                    }}
                    className="button button--light !py-1.5 !px-3 !text-xs"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Spreadsheet Upload Modal */}
      <SpreadsheetImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          // Re-fetch or state will be updated via Next.js revalidation
        }}
      />

      {/* Edit Part Modal */}
      <EditPartModal
        part={editingPart}
        isOpen={!!editingPart}
        onClose={() => setEditingPart(null)}
        onSuccess={() => {
          setEditingPart(null);
        }}
      />

      {/* Part History Modal */}
      <PartHistoryModal
        part={historyPart}
        isOpen={!!historyPart}
        onClose={() => setHistoryPart(null)}
      />
    </>
  );
}
