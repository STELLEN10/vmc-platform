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
  UserCheck,
  Trash2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { FEATURE_CATALOG, type FeatureKey, isDriverFeatureKey } from "@/lib/features/catalog";
import { toggleFeatureFlag, bulkSetFeatureFlags, assignBetaTester, removeBetaTester } from "./actions";

export type FlagData = {
  key: string;
  enabled: boolean;
  driverEnabled: boolean;
  description?: string | null;
};

export type BetaAssignmentData = {
  id: string;
  featureKey: string;
  profileId?: string | null;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
  createdAt: string;
};

interface FeatureToggleBoardProps {
  initialFlags: FlagData[];
  assignments?: BetaAssignmentData[];
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
  notification_system: { label: "Notifications", managementHref: "/management/notifications", driverHref: "/driver/notifications" },
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
  assignments = [],
  isAdmin,
}: FeatureToggleBoardProps) {
  // Keep management access and driver access separate.
  const initialMap: Record<string, { management: boolean; driver: boolean }> = {};
  for (const flag of initialFlags) {
    initialMap[flag.key] = {
      management: flag.enabled,
      driver: flag.driverEnabled ?? flag.enabled,
    };
  }
  initialMap.core_platform = { management: true, driver: true };

  const [flagsState, setFlagsState] =
    useState<Record<string, { management: boolean; driver: boolean }>>(initialMap);
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "disabled">("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"toggles" | "beta_testing">("toggles");
  const [isPending, startTransition] = useTransition();

  // Beta testing assignments state
  const [betaList, setBetaList] = useState<BetaAssignmentData[]>(assignments);

  const allEntries = Object.entries(FEATURE_CATALOG) as [FeatureKey, { name: string; release: string; description: string }][];

  const getVisibleState = (key: FeatureKey) => {
    const state = flagsState[key] ?? { management: false, driver: false };
    return isDriverFeatureKey(key) ? state.driver : state.management;
  };

  const totalCount = allEntries.length;
  const activeCount = allEntries.filter(([k]) => getVisibleState(k)).length;
  const disabledCount = totalCount - activeCount;

  // Filter features based on search, status tab, and version category
  const filteredFeatures = allEntries.filter(([key, item]) => {
    const isEnabled = getVisibleState(key);
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

    const scope = isDriverFeatureKey(key) ? "driver" : "management";
    const currentState = flagsState[key]?.[scope] ?? false;
    const nextState = !currentState;

    setFlagsState((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? { management: false, driver: false }),
        [scope]: nextState,
      },
    }));
    setPendingKeys((prev) => ({ ...prev, [key]: true }));
    setFeedbackMessage(null);

    startTransition(async () => {
      try {
        const result = await toggleFeatureFlag(key, nextState, scope);
        if (result && !result.success) {
          // Revert optimistic update
          setFlagsState((prev) => ({
            ...prev,
            [key]: {
              ...(prev[key] ?? { management: false, driver: false }),
              [scope]: currentState,
            },
          }));
          setFeedbackMessage({ type: "error", text: result.error || `Could not toggle ${FEATURE_CATALOG[key].name}` });
        } else {
          setFeedbackMessage({
            type: "success",
            text: `${FEATURE_CATALOG[key].name} (${FEATURE_CATALOG[key].release}) is now ${
              nextState ? "ON (Active for testing)" : "OFF (Completely canceled & hidden from app)"
            }.`,
          });
        }
      } catch (err: unknown) {
        setFlagsState((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] ?? { management: false, driver: false }),
            [scope]: currentState,
          },
        }));
        setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to toggle feature." });
      } finally {
        setPendingKeys((prev) => ({ ...prev, [key]: false }));
      }
    });
  };

  const handleBatchToggle = (keys: string[], targetState: boolean, label: string) => {
    if (!isAdmin) return;
    const previous = { ...flagsState };
    const optimistic: Record<string, { management: boolean; driver: boolean }> = { ...flagsState };
    const markPending: Record<string, boolean> = { ...pendingKeys };

    for (const k of keys) {
      if (k === "core_platform" && !targetState) continue;
      const scope = isDriverFeatureKey(k as FeatureKey) ? "driver" : "management";
      optimistic[k] = {
        ...(previous[k] ?? { management: false, driver: false }),
        [scope]: targetState,
      };
      markPending[k] = true;
    }

    setFlagsState(optimistic);
    setPendingKeys(markPending);
    setFeedbackMessage(null);

    startTransition(async () => {
      try {
        const result = await bulkSetFeatureFlags(keys, targetState);
        if (result && !result.success) throw new Error(result.error || "Batch feature update failed.");
        setFeedbackMessage({
          type: "success",
          text: `Successfully ${targetState ? "turned ON" : "turned OFF"} ${label}. Changes applied across entire app.`,
        });
      } catch (err: unknown) {
        setFlagsState(previous);
        setFeedbackMessage({ type: "error", text: err instanceof Error ? err.message : "Failed batch operation." });
      } finally {
        setPendingKeys({});
      }
    });
  };

  const handleRemoveTester = (assignmentId: string) => {
    if (!isAdmin) return;
    startTransition(async () => {
      try {
        const res = await removeBetaTester(assignmentId);
        if (res && res.error) {
          setFeedbackMessage({ type: "error", text: res.error });
        } else {
          setBetaList((prev) => prev.filter((a) => a.id !== assignmentId));
          setFeedbackMessage({ type: "success", text: "Testing account access removed." });
        }
      } catch (e: unknown) {
        setFeedbackMessage({ type: "error", text: e instanceof Error ? e.message : "Failed to remove tester." });
      }
    });
  };

  return (
    <section className="panel section-gap border border-slate-200 shadow-sm rounded-xl p-5 bg-white">
      {/* Top Header */}
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
            Control Feature Access
          </h2>
          <p className="text-xs text-muted max-w-2xl m-0 leading-relaxed">
            Driver-facing features have a Driver Access switch. Turning it OFF removes the feature from the driver app while management keeps its operational access. Management-only switches control management availability.
          </p>
        </div>

        {/* View Mode Tabs & Counter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveSubTab("toggles")}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeSubTab === "toggles" ? "bg-white text-navy shadow-2xs font-bold" : "hover:text-navy"
              }`}
            >
              Feature Switches ({activeCount}/{totalCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("beta_testing")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeSubTab === "beta_testing" ? "bg-white text-blue-700 shadow-2xs font-bold" : "hover:text-navy"
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              Testing Accounts ({betaList.length})
            </button>
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

      {/* Subtab 1: Feature Switches */}
      {activeSubTab === "toggles" && (
        <>
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
                      ["new_maintenance", "parts_inventory", "emergency_bike_support", "service_requests"],
                      true,
                      "v0.3 Operations Suite (Maintenance & Parts)"
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Turn ON v0.3 Operations Suite
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    handleBatchToggle(
                      ["driver_referrals", "application_system", "new_onboarding", "ai_document_check", "ai_assistant"],
                      true,
                      "Referrals & AI Suite"
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-slate-100 border border-slate-300 font-medium text-slate-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Turn ON Referrals & AI Suite
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const nonCoreKeys = allEntries
                      .map(([k]) => k)
                      .filter((k) => k !== "core_platform");
                    handleBatchToggle(nonCoreKeys, false, "all non-core features");
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white hover:bg-rose-50 border border-slate-300 font-medium text-rose-700 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-500" />
                  Turn OFF All Features (Safe Reset)
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
              <option value="v0.1">v0.1 Foundation</option>
              <option value="v0.2">v0.2 Payments Engine</option>
              <option value="v0.3">v0.3 Operations & Parts</option>
              <option value="v0.4">v0.4 Intelligence & Audit</option>
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
              const featureAssignments = betaList.filter((a) => a.featureKey === key);

              return (
                <div
                  key={key}
                  className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                    isEnabled
                      ? "bg-emerald-50/20 border-emerald-200 hover:border-emerald-300 shadow-2xs"
                      : "bg-white border-slate-200 hover:border-slate-300 opacity-90"
                  }`}
                >
                  <div>
                    {/* Card Top: Sequential Version Tag & Category */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {item.release}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {featureAssignments.length > 0 && (
                          <span
                            title={`Restricted to ${featureAssignments.length} designated testing accounts`}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {featureAssignments.length} tester{featureAssignments.length > 1 ? "s" : ""}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold text-slate-500">
                          {category}
                        </span>
                      </div>
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
                      {managementEnabled && links?.managementHref ? (
                        <Link
                          href={links.managementHref}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Test Feature <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : driverEnabled && links?.driverHref ? (
                        <Link
                          href={links.driverHref}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                        >
                          Test (Driver) <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">
                          {isEnabled ? "Feature active" : "Canceled / Off"}
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
        </>
      )}

      {/* Subtab 2: Beta Access / Testing Accounts */}
      {activeSubTab === "beta_testing" && (
        <div className="mt-4 space-y-6">
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200">
            <div className="flex items-start gap-3">
              <span className="p-2 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-navy m-0">
                  Pre-Release Testing on Your Testing Account
                </h3>
                <p className="text-xs text-slate-600 m-0 mt-1 leading-relaxed">
                  Assign your personal testing email or role to test experimental features in isolated mode.
                  When testing accounts are assigned to a feature, only those designated accounts have access; other users and drivers will not see or experience the feature until you are ready to open it to everyone.
                </p>
              </div>
            </div>
          </div>

          {/* Assignment Form */}
          {isAdmin && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
              <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-600" />
                Add Testing Account to a Feature
              </h4>
              <form action={assignBetaTester} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Select Feature
                  </label>
                  <select
                    name="key"
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allEntries
                      .filter(([k]) => k !== "core_platform")
                      .map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.release} — {item.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Testing Account Email (e.g. your login)
                  </label>
                  <input
                    name="email"
                    type="email"
                    placeholder="officialstellen@gmail.com"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Leave blank if choosing a testing role below
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Or Assign By Role
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="role"
                      defaultValue=""
                      className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Specific email only</option>
                      <option value="admin">All Administrators</option>
                      <option value="staff">All Operations Staff</option>
                      <option value="driver">All Test Drivers</option>
                    </select>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      Assign Tester
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Active Testing Assignments Table */}
          <div>
            <h4 className="text-xs font-bold text-navy uppercase tracking-wider mb-2">
              Configured Testing Accounts ({betaList.length})
            </h4>

            {betaList.length === 0 ? (
              <div className="text-center py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-500">
                No specific testing accounts assigned yet. When a feature switch is ON, it is openly available for testing by administrators. Assign an account above if you want to test with a specific driver or staff login.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                      <th className="p-3">Feature & Version</th>
                      <th className="p-3">Tester Account / Role</th>
                      <th className="p-3">Assigned Date</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {betaList.map((assignment) => {
                      const item = FEATURE_CATALOG[assignment.featureKey as FeatureKey];
                      return (
                        <tr key={assignment.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-3">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 mr-1.5 border border-slate-200">
                              {item?.release || assignment.featureKey}
                            </span>
                            <strong className="text-slate-800">{item?.name || assignment.featureKey}</strong>
                          </td>
                          <td className="p-3">
                            {assignment.email ? (
                              <span className="font-semibold text-blue-700">{assignment.email}</span>
                            ) : assignment.role ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                                Role: {assignment.role}
                              </span>
                            ) : (
                              <span className="text-slate-400">Profile #{assignment.profileId?.slice(0, 8)}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500">
                            {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString("en-ZA") : "Active"}
                          </td>
                          <td className="p-3 text-right">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTester(assignment.id)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                Remove
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
