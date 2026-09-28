export const FEATURE_CATALOG = {
  core_platform: { name: "Core platform", release: "v0.1.0", description: "Authentication, roles, onboarding and secure application shells." },
  new_payment_engine: { name: "New payment engine", release: "v0.2.0-beta.1", description: "Weekly schedules and payment state." },
  historical_payments: { name: "Historical payments", release: "v0.2.0-beta.1", description: "Historic and adjusted payment records." },
  payment_proof_upload: { name: "Payment proof upload", release: "v0.2.0-beta.1", description: "Private proof submission." },
  payment_verification: { name: "Payment verification", release: "v0.2.0-beta.1", description: "Management payment review." },
  new_maintenance: { name: "Maintenance", release: "v0.3.0-beta.1", description: "Issue reports and repair workflow." },
  parts_inventory: { name: "Parts inventory", release: "v0.3.0-beta.1", description: "Parts and stock movement." },
  emergency_bike_support: { name: "Emergency support", release: "v0.3.0-beta.1", description: "Emergency motorcycle support." },
  service_requests: { name: "Service requests", release: "v0.3.0-beta.1", description: "Scheduled and requested bike service bookings." },
  notification_system: { name: "Notifications", release: "v0.4.0-beta.1", description: "Internal notification delivery." },
  payment_reminders: { name: "Payment reminders", release: "v0.4.0-beta.1", description: "Scheduled payment reminders." },
  operations_analytics: { name: "Operations analytics", release: "v0.4.0-beta.1", description: "Fleet, driver, maintenance and financial analytics." },
  management_documents: { name: "Documents center", release: "v0.4.0-beta.1", description: "Centralized document vault and evidence manager." },
  global_activity_audit: { name: "Audit & activity", release: "v0.4.0-beta.1", description: "Unified operational event log and audit trail." },
  driver_referrals: { name: "Driver referrals", release: "v0.5.0-beta.1", description: "Referrals and R250 reward workflow." },
  application_system: { name: "Applications", release: "v0.6.0-beta.1", description: "Applications, documents and human review." },
  new_onboarding: { name: "Extended onboarding", release: "v0.6.0-beta.1", description: "Expanded onboarding experience." },
  ai_document_check: { name: "AI document check", release: "v0.6.0-beta.1", description: "Human-reviewed AI document pre-check." },
  ai_assistant: { name: "VMC AI assistant", release: "v0.6.0-beta.1", description: "Groq-powered VMC assistant with controlled operational tools." },
  ai_parts_assistant: { name: "AI parts assistant", release: "v0.7.0-beta.1", description: "Database-grounded parts lookup." },
  invoice_integration: { name: "Invoice integration", release: "v0.8.0-beta.1", description: "Official invoice provider adapter." },
  mpg_integration: { name: "MPG integration", release: "v0.8.0-beta.1", description: "Official MPG provider adapter." },
  whatsapp_notifications: { name: "WhatsApp notifications", release: "v0.9.0-beta.1", description: "Configured WhatsApp provider." },
  email_notifications: { name: "Email notifications", release: "v0.9.0-beta.1", description: "Configured email provider." },
  sms_notifications: { name: "SMS notifications", release: "v0.9.0-beta.1", description: "Configured SMS provider." },
  push_notifications: { name: "Push notifications", release: "v0.9.0-beta.1", description: "Configured push provider." },
} as const;

export type FeatureKey = keyof typeof FEATURE_CATALOG;

export function isFeatureKey(value: string): value is FeatureKey {
  return value in FEATURE_CATALOG;
}
