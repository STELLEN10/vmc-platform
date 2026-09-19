"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type AuditItem = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type EmergencyItem = {
  id: string;
  emergency_type: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

type MaintenanceItem = {
  id: string;
  title: string;
  category: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

type PaymentItem = {
  id: string;
  amount: number;
  status: string;
  payment_type: string;
  created_at: string;
  paid_at: string | null;
};

export function ActivityView({
  auditLogs,
  emergencies,
  maintenance,
  payments,
}: {
  auditLogs: AuditItem[];
  emergencies: EmergencyItem[];
  maintenance: MaintenanceItem[];
  payments: PaymentItem[];
}) {
  const [filter, setFilter] = useState<"all" | "audit" | "operations">("all");
  const [search, setSearch] = useState("");

  // Synthesize unified operational events timeline
  type TimelineEvent = {
    id: string;
    type: "audit" | "emergency" | "maintenance" | "payment";
    title: string;
    description: string;
    timestamp: string;
    tone: "blue" | "green" | "amber" | "red" | "neutral";
    badgeText: string;
  };

  const timeline: TimelineEvent[] = [
    ...auditLogs.map((a) => ({
      id: `audit-${a.id}`,
      type: "audit" as const,
      title: `${a.action.replace("_", " ").toUpperCase()} on ${a.entity_type}`,
      description: `Target ID: ${a.entity_id || "Global"}`,
      timestamp: a.created_at,
      tone: "blue" as const,
      badgeText: "System Audit",
    })),
    ...emergencies.map((e) => ({
      id: `emg-${e.id}`,
      type: "emergency" as const,
      title: `Emergency Incident: ${e.emergency_type.replace("_", " ")}`,
      description: `Severity: ${e.severity} · Status: ${e.status}`,
      timestamp: e.created_at,
      tone: (e.severity === "critical" ? "red" : "amber") as "red" | "amber",
      badgeText: `Emergency · ${e.status}`,
    })),
    ...maintenance.map((m) => ({
      id: `maint-${m.id}`,
      type: "maintenance" as const,
      title: `Maintenance Request: ${m.title}`,
      description: `Category: ${m.category} · Status: ${m.status}`,
      timestamp: m.created_at,
      tone: (m.status === "completed" ? "green" : "amber") as "green" | "amber",
      badgeText: `Workshop · ${m.status}`,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      type: "payment" as const,
      title: `Payment ${p.status.toUpperCase()}: R${p.amount}`,
      description: `Type: ${p.payment_type.replace("_", " ")}`,
      timestamp: p.paid_at || p.created_at,
      tone: (p.status === "paid" ? "green" : "neutral") as "green" | "neutral",
      badgeText: `Finance · ${p.status}`,
    })),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const filteredTimeline = timeline.filter((event) => {
    if (filter === "audit" && event.type !== "audit") return false;
    if (filter === "operations" && event.type === "audit") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        event.title.toLowerCase().includes(q) ||
        event.description.toLowerCase().includes(q) ||
        event.badgeText.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            All Activity ({timeline.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("operations")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "operations"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            Operations & Fleet Events
          </button>
          <button
            type="button"
            onClick={() => setFilter("audit")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "audit"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            Security & Audit Logs
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter activity stream..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-xs bg-paper border border-line rounded-lg text-ink focus:outline-hidden w-full sm:w-64"
        />
      </div>

      <section className="panel space-y-4">
        <div className="divide-y divide-line/40">
          {filteredTimeline.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted">No timeline events match your criteria.</p>
          ) : (
            filteredTimeline.map((item) => (
              <div key={item.id} className="py-3.5 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{item.title}</span>
                    <StatusBadge tone={item.tone}>{item.badgeText}</StatusBadge>
                  </div>
                  <p className="text-muted text-[11px]">{item.description}</p>
                </div>
                <time className="text-[11px] text-muted whitespace-nowrap shrink-0">
                  {new Date(item.timestamp).toLocaleString()}
                </time>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
