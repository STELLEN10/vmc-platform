"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";

type SettingItem = {
  key: string;
  value: unknown;
  category: string;
  description: string | null;
  updated_at: string;
};

export function SystemSettingsPanel({
  settings,
  isAdmin,
}: {
  settings: SettingItem[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function startEdit(s: SettingItem) {
    if (!isAdmin) return;
    setEditingKey(s.key);
    setEditValue(typeof s.value === "object" ? JSON.stringify(s.value) : String(s.value));
    setMessage(null);
  }

  async function handleSave(key: string) {
    try {
      setSaving(true);
      setMessage(null);
      let parsedValue: unknown = editValue;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        // Keep as string or number
        if (!isNaN(Number(editValue))) {
          parsedValue = Number(editValue);
        }
      }

      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: parsedValue }),
      });

      if (res.ok) {
        setEditingKey(null);
        setMessage("Setting updated successfully.");
        router.refresh();
      } else {
        setMessage("Failed to update setting.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error updating setting.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Operational Rules & Business Config</h2>
          <p className="text-xs text-muted">
            Global parameters controlling lease rates, maintenance intervals, and emergency dispatch contact info.
          </p>
        </div>
        <StatusBadge tone="blue">{isAdmin ? "Admin editable" : "Management read-only"}</StatusBadge>
      </div>

      {message && (
        <div className="p-3 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-900 dark:text-amber-200">
          {message}
        </div>
      )}

      <div className="divide-y divide-line/40">
        {settings.map((s) => {
          const isEditing = editingKey === s.key;
          const displayValue = typeof s.value === "object" ? JSON.stringify(s.value, null, 2) : String(s.value);

          return (
            <div key={s.key} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="space-y-0.5 max-w-md">
                <div className="font-semibold text-ink font-mono text-[11px]">{s.key}</div>
                <p className="text-muted text-[11px]">{s.description || "Operational configuration"}</p>
                <span className="inline-block px-1.5 py-0.2 bg-paper text-[10px] rounded text-muted font-medium uppercase">
                  {s.category}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2.5 py-1 text-xs bg-paper border border-line rounded text-ink font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleSave(s.key)}
                      disabled={saving}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold cursor-pointer"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingKey(null)}
                      className="text-xs text-muted hover:text-ink cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-mono bg-paper px-2 py-0.5 rounded border border-line text-ink">
                      {displayValue}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="text-action text-[11px] cursor-pointer"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
