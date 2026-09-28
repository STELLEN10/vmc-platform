"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  DollarSign,
  Wrench,
  AlertTriangle,
  UserCheck,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { createDocumentSignedUrl } from "./actions";

export type UnifiedDocumentItem = {
  id: string;
  category: "contract" | "payment_proof" | "maintenance" | "emergency" | "onboarding";
  fileName: string;
  storageBucket: string;
  storagePath: string;
  driverName: string;
  driverProfileId: string;
  bikeRegistration: string;
  uploadedAt: string;
  fileSizeFormatted?: string;
  entityLink?: string;
};

export function DocumentsView({
  documents,
}: {
  documents: UnifiedDocumentItem[];
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  const filteredDocs = documents.filter((doc) => {
    if (selectedCategory !== "all" && doc.category !== selectedCategory) {
      return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        doc.fileName.toLowerCase().includes(q) ||
        doc.driverName.toLowerCase().includes(q) ||
        doc.bikeRegistration.toLowerCase().includes(q) ||
        doc.category.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const handleOpenDoc = async (doc: UnifiedDocumentItem) => {
    setLoadingDocId(doc.id);
    try {
      const res = await createDocumentSignedUrl(doc.storageBucket, doc.storagePath);
      if (res.success && res.signedUrl) {
        window.open(res.signedUrl, "_blank");
      } else {
        alert(res.error || "Unable to generate signed access link.");
      }
    } finally {
      setLoadingDocId(null);
    }
  };

  const getCategoryBadge = (cat: UnifiedDocumentItem["category"]) => {
    switch (cat) {
      case "contract":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
            <FileText className="h-3 w-3" /> Contract PDF
          </span>
        );
      case "payment_proof":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            <DollarSign className="h-3 w-3" /> Payment Proof
          </span>
        );
      case "maintenance":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
            <Wrench className="h-3 w-3" /> Maintenance
          </span>
        );
      case "emergency":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
            <AlertTriangle className="h-3 w-3" /> Emergency
          </span>
        );
      case "onboarding":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
            <UserCheck className="h-3 w-3" /> ID / License
          </span>
        );
    }
  };

  const counts = {
    all: documents.length,
    contract: documents.filter((d) => d.category === "contract").length,
    payment_proof: documents.filter((d) => d.category === "payment_proof").length,
    maintenance: documents.filter((d) => d.category === "maintenance").length,
    emergency: documents.filter((d) => d.category === "emergency").length,
    onboarding: documents.filter((d) => d.category === "onboarding").length,
  };

  return (
    <div className="space-y-6">
      {/* Search and filter controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategory("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "all"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            All Files ({counts.all})
          </button>
          <Link
            href="/management/quotations"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-600/40 bg-blue-50 hover:bg-blue-100 text-blue-900 transition-colors flex items-center gap-1"
          >
            <span>📋 Official Quotations (VS Procurement)</span>
            <span className="text-[10px] bg-blue-600 text-white px-1.5 rounded font-mono font-bold">New</span>
          </Link>
          <button
            type="button"
            onClick={() => setSelectedCategory("contract")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "contract"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Contracts ({counts.contract})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("payment_proof")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "payment_proof"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Payment Proofs ({counts.payment_proof})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("maintenance")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "maintenance"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Maintenance ({counts.maintenance})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("emergency")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "emergency"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            Emergency ({counts.emergency})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory("onboarding")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectedCategory === "onboarding"
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            ID / Licenses ({counts.onboarding})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents, driver, bike..."
            className="w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Motorcycle</th>
                <th className="px-4 py-3">Uploaded Date</th>
                <th className="px-4 py-3">Storage Location</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                    No documents found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-neutral-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-neutral-400 shrink-0" />
                        <span className="font-medium text-neutral-900 max-w-[220px] truncate" title={doc.fileName}>
                          {doc.fileName}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3">{getCategoryBadge(doc.category)}</td>

                    <td className="px-4 py-3">
                      {doc.driverProfileId ? (
                        <Link
                          href={`/management/drivers/${doc.driverProfileId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {doc.driverName}
                        </Link>
                      ) : (
                        <span>{doc.driverName}</span>
                      )}
                    </td>

                    <td className="px-4 py-3 font-mono">{doc.bikeRegistration}</td>

                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(doc.uploadedAt).toLocaleDateString("en-ZA")}
                    </td>

                    <td className="px-4 py-3 font-mono text-[11px] text-neutral-400 max-w-[160px] truncate" title={doc.storagePath}>
                      {doc.storagePath}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={loadingDocId === doc.id}
                        onClick={() => handleOpenDoc(doc)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
                      >
                        {loadingDocId === doc.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                        View File
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
