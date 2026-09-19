"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";

type ContractItem = {
  id: string;
  driver_id: string;
  weekly_amount: number;
  start_date: string;
  status: string;
  document_storage_path?: string | null;
  drivers?: { profiles?: { full_name?: string } } | null;
};

type AttachmentItem = {
  id: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  storage_path: string;
  created_at: string;
  payment_period_id?: string;
  maintenance_request_id?: string;
  emergency_report_id?: string;
};

export function DocumentsView({
  contracts,
  paymentProofs,
  maintenanceAttachments,
  emergencyAttachments,
}: {
  contracts: ContractItem[];
  paymentProofs: AttachmentItem[];
  maintenanceAttachments: AttachmentItem[];
  emergencyAttachments: AttachmentItem[];
}) {
  const [filter, setFilter] = useState<"all" | "contracts" | "payments" | "maintenance" | "emergency">("all");
  const [search, setSearch] = useState("");

  function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  const filteredContracts = contracts.filter((c) => {
    const name = c.drivers?.profiles?.full_name || "";
    return (
      name.toLowerCase().includes(search.toLowerCase()) ||
      c.id.toLowerCase().includes(search.toLowerCase())
    );
  });

  const filteredPayments = paymentProofs.filter((p) =>
    p.file_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.payment_period_id && p.payment_period_id.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredMaintenance = maintenanceAttachments.filter((m) =>
    m.file_name.toLowerCase().includes(search.toLowerCase()) ||
    (m.maintenance_request_id && m.maintenance_request_id.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredEmergency = emergencyAttachments.filter((e) =>
    e.file_name.toLowerCase().includes(search.toLowerCase()) ||
    (e.emergency_report_id && e.emergency_report_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "all"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            All Documents ({contracts.length + paymentProofs.length + maintenanceAttachments.length + emergencyAttachments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("contracts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "contracts"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            Contracts ({contracts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("payments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "payments"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            Payment Proofs ({paymentProofs.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("maintenance")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "maintenance"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            Maintenance Media ({maintenanceAttachments.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("emergency")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              filter === "emergency"
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-paper text-ink border-line hover:border-ink/40"
            }`}
          >
            Emergency Media ({emergencyAttachments.length})
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter by driver or filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 text-xs bg-paper border border-line rounded-lg text-ink focus:outline-hidden w-full sm:w-64"
        />
      </div>

      {/* Contracts Section */}
      {(filter === "all" || filter === "contracts") && (
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink">Executed Motorcycle Lease Contracts</h3>
              <p className="text-xs text-muted">Legal rental agreements signed between Valhalla and drivers.</p>
            </div>
            <StatusBadge tone="blue">{`${filteredContracts.length} records`}</StatusBadge>
          </div>

          <div className="divide-y divide-line/40">
            {filteredContracts.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">No contracts match your criteria.</p>
            ) : (
              filteredContracts.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div>
                    <div className="font-semibold text-ink">
                      {c.drivers?.profiles?.full_name || "Contract " + c.id.slice(0, 8)}
                    </div>
                    <div className="text-muted text-[11px]">
                      Weekly rate: R{c.weekly_amount} · Started: {c.start_date || "N/A"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={c.status === "active" ? "green" : "slate"}>
                      {c.status}
                    </StatusBadge>
                    <Link
                      href={`/api/contracts/${c.id}/pdf`}
                      target="_blank"
                      className="px-2.5 py-1 bg-paper hover:bg-paper/80 border border-line rounded text-[11px] font-semibold text-ink transition-colors flex items-center gap-1"
                    >
                      <span>PDF</span>
                      <span className="text-[10px] text-muted">↓</span>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Payment Proofs Section */}
      {(filter === "all" || filter === "payments") && (
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink">Driver Payment Proof Submissions</h3>
              <p className="text-xs text-muted">Bank slip and EFT receipts submitted by drivers for verification.</p>
            </div>
            <StatusBadge tone="slate">{`${filteredPayments.length} receipts`}</StatusBadge>
          </div>

          <div className="divide-y divide-line/40">
            {filteredPayments.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">No payment proofs match your criteria.</p>
            ) : (
              filteredPayments.map((p) => (
                <div key={p.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink truncate">{p.file_name}</div>
                    <div className="text-muted text-[11px]">
                      {p.mime_type} · {formatBytes(p.file_size_bytes)} · {new Date(p.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href="/management/payments"
                      className="text-action text-[11px]"
                    >
                      View in ledger →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Maintenance Attachments Section */}
      {(filter === "all" || filter === "maintenance") && (
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink">Workshop Damage & Maintenance Photos</h3>
              <p className="text-xs text-muted">Photos and inspection documentation attached to maintenance tickets.</p>
            </div>
            <StatusBadge tone="slate">{`${filteredMaintenance.length} files`}</StatusBadge>
          </div>

          <div className="divide-y divide-line/40">
            {filteredMaintenance.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">No maintenance media files logged.</p>
            ) : (
              filteredMaintenance.map((m) => (
                <div key={m.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink truncate">{m.file_name}</div>
                    <div className="text-muted text-[11px]">
                      {m.mime_type} · {formatBytes(m.file_size_bytes)} · {new Date(m.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    href="/management/maintenance"
                    className="text-action text-[11px]"
                  >
                    Maintenance ticket →
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Emergency Attachments Section */}
      {(filter === "all" || filter === "emergency") && (
        <section className="panel space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink">Emergency Incident Photos & Evidence</h3>
              <p className="text-xs text-muted">Photos captured at accident and breakdown locations.</p>
            </div>
            <StatusBadge tone="red">{`${filteredEmergency.length} files`}</StatusBadge>
          </div>

          <div className="divide-y divide-line/40">
            {filteredEmergency.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">No emergency photos recorded.</p>
            ) : (
              filteredEmergency.map((e) => (
                <div key={e.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink truncate">{e.file_name}</div>
                    <div className="text-muted text-[11px]">
                      {e.mime_type} · {formatBytes(e.file_size_bytes)} · {new Date(e.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    href="/management/emergency"
                    className="text-action text-[11px]"
                  >
                    Emergency dispatch →
                  </Link>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
