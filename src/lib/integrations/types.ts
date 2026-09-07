/**
 * Server-only integration contracts. Implementations are deliberately absent
 * until VMC has an approved provider, credentials and data-processing terms.
 */
export type IntegrationConnectionState = "not_connected" | "configured" | "unavailable";

export type IntegrationStatus = {
  name: string;
  state: IntegrationConnectionState;
  detail: string;
};

export type InvoiceSystemAdapter = {
  getStatus(): Promise<IntegrationStatus>;
};

export type MpgAdapter = {
  getStatus(): Promise<IntegrationStatus>;
};

export type MessagingAdapter = {
  getStatus(): Promise<IntegrationStatus>;
};

export type AiProviderAdapter = {
  getStatus(): Promise<IntegrationStatus>;
};
