"use client";

import { useEffect, useState } from "react";
import { X, Clock, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { getPartMovements } from "./actions";
import type { Database } from "@/lib/database.types";

type PartRow = Database["public"]["Tables"]["parts"]["Row"];

interface PartHistoryModalProps {
  part: PartRow | null;
  isOpen: boolean;
  onClose: () => void;
}

interface MovementItem {
  id: string;
  movement_type: string;
  quantity_delta: number;
  reason: string | null;
  created_at: string;
  performed_by: string;
}

export function PartHistoryModal({ part, isOpen, onClose }: PartHistoryModalProps) {
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !part) return;
    let isCancelled = false;

    async function fetchHistory() {
      setLoading(true);
      setError(null);
      try {
        const res = await getPartMovements(part!.id);
        if (!isCancelled) {
          if (res.error) {
            setError(res.error);
          } else {
            setMovements(res.movements as MovementItem[]);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : "Failed to load stock movements.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    fetchHistory();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, part]);

  if (!isOpen || !part) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[85vh] bg-white rounded-lg shadow-2xl border border-line flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-line bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-blue-50 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy m-0">Stock Movement Audit Trail</h2>
              <p className="text-xs text-muted m-0">
                {part.name} ({part.part_number || part.sku || "No SKU"})
              </p>
            </div>
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

        {/* Current status bar */}
        <div className="px-5 py-3 bg-surface border-b border-line flex items-center justify-between text-xs">
          <div>
            <span className="text-muted">Current Stock: </span>
            <strong className="text-navy text-sm font-bold">{part.stock_quantity} units</strong>
          </div>
          <div>
            <span className="text-muted">Reorder Threshold: </span>
            <strong className="text-navy">{part.minimum_stock_level}</strong>
          </div>
          <div>
            <span className="text-muted">Location: </span>
            <strong className="text-navy">{part.storage_location || "Not assigned"}</strong>
          </div>
        </div>

        {/* Body list */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {loading && (
            <div className="py-8 text-center text-xs text-muted flex flex-col items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Retrieving movement log...</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && movements.length === 0 && (
            <div className="py-8 text-center text-xs text-muted">
              <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="font-semibold text-navy">No logged movements recorded yet</p>
              <p>Movements are automatically logged whenever stock is added, deducted, or imported.</p>
            </div>
          )}

          {!loading && movements.length > 0 && (
            <div className="divide-y divide-line border border-line rounded-md">
              {movements.map((m) => {
                const isPositive = m.quantity_delta > 0;
                return (
                  <div key={m.id} className="p-3 flex items-start justify-between gap-3 text-xs hover:bg-surface/50">
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`p-1.5 rounded-full shrink-0 mt-0.5 ${
                          isPositive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {isPositive ? (
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowDownRight className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-navy">
                          {m.reason || "Stock modification"}
                        </div>
                        <div className="text-[11px] text-muted flex items-center gap-2 mt-0.5">
                          <span className="capitalize px-1.5 py-0.2 bg-gray-100 rounded text-[10px] font-mono">
                            {m.movement_type.replace("_", " ")}
                          </span>
                          <span>{new Date(m.created_at).toLocaleString("en-ZA")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-bold font-mono ${
                          isPositive ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {isPositive ? `+${m.quantity_delta}` : m.quantity_delta}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-line bg-surface/50 text-right">
          <button
            type="button"
            onClick={onClose}
            className="button button--light !py-1 !px-3 !text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
