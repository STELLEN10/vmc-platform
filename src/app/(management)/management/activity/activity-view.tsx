"use client";

import { useState } from "react";
import {
  Activity,
  User,
  Clock,
  Search,
  ChevronRight,
} from "lucide-react";

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export function ActivityView({ logs }: { logs: AuditLogItem[] }) {
  const [search, setSearch] = useState("");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter((log) => {
    if (selectedEntity !== "all" && log.entityType !== selectedEntity) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        (log.entityId && log.entityId.toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes("verified") || action.includes("approved") || action.includes("resolved") || action.includes("completed")) {
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
    if (action.includes("rejected") || action.includes("deleted") || action.includes("critical") || action.includes("failed")) {
      return "bg-red-100 text-red-800 border-red-200";
    }
    if (action.includes("update") || action.includes("transition") || action.includes("scheduled")) {
      return "bg-blue-100 text-blue-800 border-blue-200";
    }
    return "bg-neutral-100 text-neutral-800 border-neutral-200";
  };

  const entityTypes = Array.from(new Set(logs.map((l) => l.entityType).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedEntity("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedEntity === "all"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            All Activity ({logs.length})
          </button>
          {entityTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedEntity(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                selectedEntity === type
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {type.replace("_", " ")} ({logs.filter((l) => l.entityType === type).length})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, actor, entity ID..."
            className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Activity Timeline / Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="divide-y divide-neutral-200">
          {filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-neutral-400">
              <Activity className="h-8 w-8 mx-auto mb-2 text-neutral-300" />
              <p className="text-sm font-medium">No audit activity recorded.</p>
              <p className="text-xs text-neutral-400 mt-1">
                Actions taken across the system will be recorded and displayed here in real time.
              </p>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-neutral-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-neutral-100 p-2 text-neutral-600 mt-0.5">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${getActionBadgeColor(log.action)}`}>
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs font-semibold text-neutral-900">
                            {log.entityType.replace(/_/g, " ")}
                          </span>
                          {log.entityId && (
                            <span className="font-mono text-[11px] text-neutral-400">
                              #{log.entityId.slice(0, 8)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5 text-neutral-400" />
                            <strong className="text-neutral-700">{log.actorName}</strong>
                            <span className="text-neutral-400">({log.actorRole})</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-neutral-400" />
                            {new Date(log.createdAt).toLocaleString("en-ZA")}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        {isExpanded ? "Hide Details" : "Inspect Payload"}
                        <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      </button>
                    </div>
                  </div>

                  {/* Expanded JSON Inspector */}
                  {isExpanded && (
                    <div className="mt-4 rounded-lg bg-neutral-900 p-3 text-neutral-200 text-xs font-mono overflow-x-auto space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-neutral-400 border-b border-neutral-800 pb-1">
                        <span>AUDIT EVENT PAYLOAD (ID: {log.id})</span>
                        <span>ACTOR ID: {log.actorId || "system"}</span>
                      </div>

                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div>
                          <span className="text-amber-400">{"// Metadata:"}</span>
                          <pre className="text-[11px] mt-1 text-neutral-300">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.oldValues && (
                        <div>
                          <span className="text-red-400">{"// Previous State:"}</span>
                          <pre className="text-[11px] mt-1 text-neutral-300">
                            {JSON.stringify(log.oldValues, null, 2)}
                          </pre>
                        </div>
                      )}

                      {log.newValues && (
                        <div>
                          <span className="text-emerald-400">{"// Transitioned State:"}</span>
                          <pre className="text-[11px] mt-1 text-neutral-300">
                            {JSON.stringify(log.newValues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
