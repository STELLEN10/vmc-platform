"use client";

import { useState } from "react";
import { X, Save, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { updatePart, deletePart } from "./actions";
import type { Database } from "@/lib/database.types";

type PartRow = Database["public"]["Tables"]["parts"]["Row"];

interface EditPartModalProps {
  part: PartRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditPartModal({ part, isOpen, onClose, onSuccess }: EditPartModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !part) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    formData.set("id", part!.id);

    try {
      const res = await updatePart(formData);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update part.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await deletePart(part!.id);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to delete part.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-2xl border border-line flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-line bg-surface/50">
          <div>
            <h2 className="text-lg font-bold text-navy m-0">Edit Inventory Part</h2>
            <p className="text-xs text-muted m-0">
              Update catalogue specifications, storage details, and live stock levels
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted hover:text-navy rounded-md hover:bg-black/5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-5 mt-4 p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-navy block mb-1">
                Part Name *
              </label>
              <input
                name="name"
                defaultValue={part.name}
                required
                className="w-full text-xs p-2.5 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-navy block mb-1">
                Part Number / SKU
              </label>
              <input
                name="part_number"
                defaultValue={part.part_number || part.sku || ""}
                placeholder="e.g. H-BRK-150-F"
                className="w-full text-xs p-2.5 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden font-mono"
              />
              <input type="hidden" name="sku" defaultValue={part.sku || part.part_number || ""} />
            </div>

            <div>
              <label className="text-xs font-bold text-navy block mb-1">
                Category
              </label>
              <select
                name="category"
                defaultValue={part.category || "General"}
                className="w-full text-xs p-2.5 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden"
              >
                <option value="Engine">Engine</option>
                <option value="Brakes">Brakes</option>
                <option value="Tyres & Wheels">Tyres & Wheels</option>
                <option value="Electrical">Electrical & Battery</option>
                <option value="Drive & Chain">Drive & Chain</option>
                <option value="Body & Frame">Body & Frame</option>
                <option value="Fluids & Filters">Fluids & Filters</option>
                <option value="General">General / Consumable</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-navy block mb-1">
                Compatible Motorcycle Model
              </label>
              <input
                name="compatible_model"
                defaultValue={part.compatible_model || ""}
                placeholder="e.g. HERO Hunter 150 / ECO 150"
                className="w-full text-xs p-2.5 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Stock & Inventory Numbers Block */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-200/70 rounded-md">
            <div className="text-xs font-bold text-navy mb-2 flex items-center justify-between">
              <span>Stock & Pricing Controls</span>
              <span className="text-[11px] font-normal text-muted">
                Changes to current stock will automatically log an inventory movement
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-navy block mb-1">
                  Current Stock Quantity
                </label>
                <input
                  name="stock_quantity"
                  type="number"
                  min={0}
                  defaultValue={part.stock_quantity}
                  required
                  className="w-full text-xs p-2 rounded border border-line bg-white font-bold text-navy focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-navy block mb-1">
                  Min Reorder Threshold
                </label>
                <input
                  name="minimum_stock_level"
                  type="number"
                  min={0}
                  defaultValue={part.minimum_stock_level}
                  required
                  className="w-full text-xs p-2 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-navy block mb-1">
                  Unit Price (ZAR)
                </label>
                <input
                  name="unit_price"
                  type="number"
                  step="0.01"
                  min={0}
                  defaultValue={part.unit_price ?? ""}
                  placeholder="0.00"
                  className="w-full text-xs p-2 rounded border border-line bg-white font-mono focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="text-xs font-bold text-navy block mb-1">
                Storage Bin / Location
              </label>
              <input
                name="storage_location"
                defaultValue={part.storage_location || ""}
                placeholder="e.g. Bin B-14, Main Depot"
                className="w-full text-xs p-2.5 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-navy block mb-1">
                Supplier / Brand
              </label>
              <input
                name="supplier"
                defaultValue={part.supplier || ""}
                placeholder="e.g. Hero MotoCorp / Castrol"
                className="w-full text-xs p-2.5 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-navy block mb-1">
              Notes & Technical Specifications
            </label>
            <textarea
              name="notes"
              defaultValue={part.notes || ""}
              rows={2}
              placeholder="Fitting instructions, warranty details, or compatibility remarks"
              className="w-full text-xs p-2.5 rounded border border-line bg-white focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-line flex items-center justify-between">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-800 p-1.5 rounded hover:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove part</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-rose-700 font-semibold">Confirm remove?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2 py-1 bg-rose-600 text-white rounded text-xs font-bold hover:bg-rose-700"
                >
                  {isDeleting ? "Removing..." : "Yes, remove"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-1 bg-gray-100 text-muted rounded text-xs hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="button button--light !py-1.5 !px-3 !text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="button button--primary !py-1.5 !px-4 !text-xs font-bold inline-flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
