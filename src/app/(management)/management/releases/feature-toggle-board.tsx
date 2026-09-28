"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Search,
  Sliders,
  ExternalLink,
  Sparkles,
  Zap,
  RotateCcw,
  Check,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { FEATURE_CATALOG, type FeatureKey } from "@/lib/features/catalog";
import { toggleFeatureFlag, bulkSetFeatureFlags } from "./actions";

type FlagData = {
  key: string;
  enabled: boolean;
  description?: string | null;
};

type ReleaseData = {
  id: string;
  version: string;
  channel: string;
  status: string;
};

interface FeatureToggleBoardProps {
  initialFlags: FlagData[];
  releases?: ReleaseData[];
  isAdmin: boolean;
}

const FEATURE_LINKS: Record<string, { label: string; managementHref?: string; driverHref?: string }> = {
  core_platform: { label: "Dashboard", managementHref: "/management", driverHref: "/driver" },
  new_payment_engine: { label: "Payments", managementHref: "/management/payments", driverHref: "/driver/payments" },
  historical_payments: { label: "Payments", managementHref: "/management/payments", driverHref: "/driver/payments" },
  payment_proof_upload: { label: "Payments", managementHref: "/management/payments", driverHref: "/driver/payments" },
  payment_verification: { label: "Payments", managementHref: "/management/payments" },
  new_maintenance: { label: "Maintenance", managementHref: "/management/maintenance", driverHref: "/driver/maintenance" },
  parts_inventory: { label: "Parts Inventory", managementHref: "/management/inventory", driverHref: "/driver/inventory" },
  emergency_bike_support: { label: "Emergency Support", managementHref: "/management/emergency", driverHref: "/driver/emergency" },
  service_requests: { label: "Service Requests", managementHref: "/management/services", driverHref: "/driver/services" },
  notification_system: { label: "Notifications", managementHref: "/management/notifications" },
  payment_reminders: { label: "Reminders", managementHref: "/management/notifications" },
  operations_analytics: { label: "Analytics", managementHref: "/management/analytics" },
  management_documents: { label: "Documents", managementHref: "/management/documents" },
  global_activity_audit: { label: "Activity Audit", managementHref: "/management/activity" },
  driver_referrals: { label: "Driver Referrals", managementHref: "/management/referrals", driverHref: "/driver/referrals" },
  application_system: { label: "Applications", managementHref: "/management/drivers" },
  new_onboarding: { label: "My Onboarding", driverHref: "/driver/onboarding" },
  ai_document_check: { label: "Documents Vault", managementHref: "/management/documents" },
  ai_assistant: { label: "VMC AI Assistant", managementHref: "/management/ai", driverHref: "/driver/ai" },
};

function getFeatureCategory(release: string): string {
  if (release.startsWith("v0.1")) return "Foundation";
  if (release.startsWith("v0.2")) return "Payments";
  if (release.startsWith("v0.3")) return "Operations";
  if (release.startsWith("v0.4")) return "Intelligence";
  if (release.startsWith("v0.5")) return "Referrals";
  if (release.startsWith("v0.6")) return "Applications & AI";
  if (release.startsWith("v0.7")) return "Parts AI";
  if (release.startsWith("v0.8")) return "Integrations";
  return "Notifications";
}

export function FeatureToggleBoard({
  initialFlags,
  isAdmin,
}: FeatureToggleBoardProps) {
  // Build lookup map from initial flags
  const initialMap: Record<string, boolean> = {};
  for (const flag of initialFlags) {
    initialMap[flag.key] = flag.enabled;
  }
  // Core platform is always enabled
  initialMap.core_platform = true;

  const [flagsState, setFlagsState] = useState<Record<string, boolean>>(initialMap);
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "disabled">("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const allEntries = Object.entries(FEATURE_CATALOG) as [FeatureKey, { name: string; release: string; description: string }][];

  const totalCount = allEntries.length;
  const activeCount = allEntries.filter(([k]) => flagsState[k] === true).length;
  const disabledCount = totalCount - activeCount;

  // Filter features based on search, status tab, and version category
  const filteredFeatures = allEntries.filter(([key, item]) => {
    const isEnabled = flagsState[key] ?? false;
    const category = getFeatureCategory(item.release);

    if (filterTab === "active" && !isEnabled) return false;
    if (filterTab === "disabled" && isEnabled) return false;

    if (versionFilter !== "all" && !item.release.startsWith(versionFilter)) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchKey = key.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchRel = item.release.toLowerCase().includes(q);
      const matchCat = category.toLowerCase().includes(q);
      if (!matchName && !matchKey && !matchDesc && !matchRel && !matchCat) {
        return false;
      }
    }

    return true;
  });

  const handleToggle = async (key: FeatureKey) => {
    if (!isAdmin) return;
    if (key === "core_platform") {
      setFeedbackMessage({ type: "error", text: "Core platform is required and cannot be disabled." });
      return;
    }

    const currentState = flagsState[key] ?? false;
    const nextState = !currentState;

    // Optimistic state update
    setFlagsState((prev) => ({ ...prev, [key]: nextState }));
    setPendingKeys((prev) => ({ ...prev, [key]: true }));
    setFeedbackMessage(null);

    startTransition(async () => {
      try {
        const result = await toggleFeatureFlag(key, nextState);
        if (result && !result.success) {
          // Revert optimistic update
          setFlagsState((prev) => ({ ...prev, [key]: currentState }));
          setFeedbackMessage({ type: "error", text: result.error || `Could not toggle ${FEATURE_CATALOG[key].name}` });
        } else {
          setFeedbackMessage({
            type: "success",
            text: `${FEATURE_CATALOG[key].name} is now ${nextState ? "ENABLED for testing" : "DISABLED"}.`,
          });
        }
      } catch (err: unknown) {
        setFlagsState((prev) => ({ ...prev, [key]: currentState }));
        setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to toggle feature." });
      } finally {
        setPendingKeys((prev) => ({ ...prev, [key]: false }));
      }
    });
  };

  const handleBatchToggle = (keys: string[], targetState: boolean, label: string) => {
    if (!isAdmin) return;
    const previous = { ...flagsState };
    const optimistic: Record<string, boolean> = { ...flagsState };
    const markPending: Record<string, boolean> = { ...pendingKeys };

    for (const k of keys) {
      if (k === "core_platform" && !targetState) continue;
      optimistic[k] = targetState;
      markPending[k] = true;
    }

    setFlagsState(optimistic);
    setPendingKeys(markPending);
    setFeedbackMessage(null);

    startTransition(async () => {
      try {
        await bulkSetFeatureFlags(keys, targetState);
        setFeedbackMessage({
          type: "success",
          text: `Successfully ${targetState ? "enabled" : "disabled"} ${label}.`,
        });
      } catch (err: unknown) {
        setFlagsState(previous);
        setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Failed batch operation." });
      } finally {
        setPendingKeys({});
      }
    });
  };

  return (
    <section className="panel section-gap border border-slate-200 shadow-sm rounded-xl p-5 bg-white">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Sliders className="w-4 h-4" />
            </span>
            <p className="card-label m-0 text-xs font-bold tracking-wider text-blue-700">
              FEATURE TOGGLES & PRE-RELEASE TESTING
            </p>
          </div>
          <h2 className="text-xl font-extrabold text-navy mt-1 mb-1">
            Turn features On or Off for testing
          </h2>
          <p className="text-xs text-muted max-w-2xl m-0 leading-relaxed">
            Flip any toggle switch to test unreleased or experimental capabilities before making them official.
            Enabled features immediately become active for your testing session across navigation and server routes.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {activeCount} Active / In Test
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500 font-medium">{disabledCount} Disabled</span>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedbackMessage && (
        <div
          role="alert"
          className={`mt-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between gap-2 transition-all ${
            feedbackMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-60 hover:opacity-100 px-1 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Action Presets */}
      {isAdmin && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Quick Test Presets:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                handleBatchToggle(
                  ["driver_referrals", "application_system", "new_onboarding", "ai_document_check", "ai_assistant"],
                  true,
                  "v0.5 & v0.6 Test Suite (Referrals & AI)"
                )
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Turn ON v0.5 & v0.6 (Referrals & AI)
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                handleBatchToggle(
                  ["new_maintenance", "parts_inventory", "emergency_bike_support", "service_requests"],
                  true,
                  "v0.3 Operations Suite"
                )
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Turn ON v0.3 Operations
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const nonCoreKeys = allEntries
                  .map(([k]) => k)
                  .filter((k) => k !== "core_platform" && !k.startsWith("new_maintenance") && !k.startsWith("parts_inventory"));
                handleBatchToggle(nonCoreKeys, false, "experimental flags");
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-slate-300 font-medium text-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
              Reset Experimental to OFF
            </button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search features by name, version or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          )}
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              filterTab === "all" ? "bg-white text-navy shadow-2xs" : "hover:text-navy"
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active")}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              filterTab === "active" ? "bg-white text-emerald-700 shadow-2xs" : "hover:text-emerald-700"
            }`}
          >
            ON ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("disabled")}
            className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
              filterTab === "disabled" ? "bg-white text-slate-800 shadow-2xs" : "hover:text-slate-800"
            }`}
          >
            OFF ({disabledCount})
          </button>
        </div>

        {/* Version dropdown */}
        <select
          value={versionFilter}
          onChange={(e) => setVersionFilter(e.target.value)}
          className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Releases</option>
          <option value="v0.1">v0.1 Core Foundation</option>
          <option value="v0.2">v0.2 Payments Engine</option>
          <option value="v0.3">v0.3 Operations & Parts</option>
          <option value="v0.4">v0.4 Intelligence & Docs</option>
          <option value="v0.5">v0.5 Driver Referrals</option>
          <option value="v0.6">v0.6 Applications & AI</option>
          <option value="v0.7">v0.7 Parts AI</option>
          <option value="v0.8">v0.8 Integrations</option>
          <option value="v0.9">v0.9 Notifications</option>
        </select>
      </div>

      {/* Grid of Toggle Cards */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredFeatures.map(([key, item]) => {
          const isEnabled = flagsState[key] ?? false;
          const isKeyPending = pendingKeys[key] || false;
          const isCore = key === "core_platform";
          const links = FEATURE_LINKS[key];
          const category = getFeatureCategory(item.release);

          return (
            <div
              key={key}
              className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                isEnabled
                  ? "bg-emerald-50/20 border-emerald-200 hover:border-emerald-300 shadow-2xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div>
                {/* Card Top: Version tag & Category */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {item.release}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {category}
                  </span>
                </div>

                {/* Feature Title */}
                <h3 className="text-sm font-bold text-navy flex items-center gap-1.5 m-0 mb-1">
                  {item.name}
                  {isCore && (
                    <span title="Core platform is always enabled">
                      <Lock className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </h3>

                {/* Description */}
                <p className="text-xs text-muted m-0 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Card Footer: Quick Test Link & Toggle Switch */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Direct test navigation button if enabled */}
                <div>
                  {isEnabled && links?.managementHref ? (
                    <Link
                      href={links.managementHref}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Test Feature <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : isEnabled && links?.driverHref ? (
                    <Link
                      href={links.driverHref}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                    >
                      Test (Driver) <ExternalLink className="w-3 h-3" />
                    </Link>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isEnabled ? "Feature active" : "Feature locked"}
                    </span>
                  )}
                </div>

                {/* Interactive Toggle Switch */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold select-none ${
                      isEnabled ? "text-emerald-700" : "text-slate-400"
                    }`}
                  >
                    {isEnabled ? "ON" : "OFF"}
                  </span>

                  {isCore ? (
                    <div
                      title="Core platform cannot be disabled"
                      className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full bg-emerald-600 p-0.5 opacity-80"
                    >
                      <span className="translate-x-5 inline-block h-5 w-5 transform rounded-full bg-white shadow-sm" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isEnabled}
                      disabled={!isAdmin || isKeyPending}
                      onClick={() => handleToggle(key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        isEnabled ? "bg-emerald-600" : "bg-slate-300"
                      } ${(!isAdmin || isKeyPending) ? "opacity-60 cursor-wait" : ""}`}
                      title={`Turn ${isEnabled ? "OFF" : "ON"} ${item.name}`}
                    >
                      <span className="sr-only">Toggle {item.name}</span>
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isEnabled ? "translate-x-5" : "translate-x-0.5"
                        } mt-0.5`}
                      />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredFeatures.length === 0 && (
        <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-4">
          <p className="text-sm font-semibold text-slate-700 m-0">No matching features found</p>
          <p className="text-xs text-muted mt-1 mb-3">
            Try adjusting your search query or reset the filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setFilterTab("all");
              setVersionFilter("all");
            }}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </section>
  );
}
