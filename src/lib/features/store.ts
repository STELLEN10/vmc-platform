import "server-only";

import fs from "node:fs";
import path from "node:path";
import { FEATURE_CATALOG, type FeatureKey, isFeatureKey } from "./catalog";

const STORE_PATH = path.join(process.cwd(), "data", "feature-flags-state.json");

// Default state for all features
const DEFAULT_FEATURE_STATE: Record<FeatureKey, boolean> = {
  core_platform: true,
  new_payment_engine: true,
  historical_payments: true,
  payment_proof_upload: true,
  payment_verification: true,
  new_maintenance: true,
  parts_inventory: true,
  emergency_bike_support: true,
  service_requests: true,
  notification_system: true,
  payment_reminders: true,
  operations_analytics: true,
  management_documents: true,
  global_activity_audit: true,
  driver_referrals: true,
  application_system: true,
  new_onboarding: true,
  ai_document_check: true,
  ai_assistant: true,
  ai_parts_assistant: true,
  invoice_integration: true,
  mpg_integration: true,
  whatsapp_notifications: false,
  email_notifications: true,
  sms_notifications: false,
  push_notifications: false,
};

let cachedFlags: Record<string, boolean> | null = null;

function loadFlagsFromDisk(): Record<string, boolean> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const content = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        return { ...DEFAULT_FEATURE_STATE, ...parsed };
      }
    }
  } catch (err) {
    console.error("Error reading feature flags from disk:", err);
  }
  return { ...DEFAULT_FEATURE_STATE };
}

function saveFlagsToDisk(flags: Record<string, boolean>): void {
  try {
    const dir = path.dirname(STORE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(flags, null, 2), "utf-8");
    cachedFlags = flags;
  } catch (err) {
    console.error("Error saving feature flags to disk:", err);
  }
}

/** Get all current feature flag states */
export function getAllFeatureFlagsState(): Record<string, boolean> {
  if (!cachedFlags) {
    cachedFlags = loadFlagsFromDisk();
  }
  return { ...cachedFlags };
}

/** Check if a single feature key is currently enabled */
export function isFeatureFlagEnabled(key: FeatureKey): boolean {
  if (key === "core_platform") return true;
  const flags = getAllFeatureFlagsState();
  return flags[key] ?? DEFAULT_FEATURE_STATE[key] ?? false;
}

/** Set an individual feature flag */
export function setFeatureFlagState(key: FeatureKey, enabled: boolean): Record<string, boolean> {
  const current = getAllFeatureFlagsState();
  if (key === "core_platform") {
    current[key] = true;
  } else {
    current[key] = enabled;
  }
  saveFlagsToDisk(current);
  return current;
}

/** Bulk set feature flags */
export function bulkSetFeatureFlagsState(updates: Partial<Record<FeatureKey, boolean>>): Record<string, boolean> {
  const current = getAllFeatureFlagsState();
  for (const [k, v] of Object.entries(updates)) {
    if (isFeatureKey(k) && typeof v === "boolean") {
      if (k === "core_platform") {
        current[k] = true;
      } else {
        current[k] = v;
      }
    }
  }
  saveFlagsToDisk(current);
  return current;
}
