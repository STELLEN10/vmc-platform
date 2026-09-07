import type {
  AiProviderAdapter,
  IntegrationStatus,
  InvoiceSystemAdapter,
  MessagingAdapter,
  MpgAdapter,
} from "./types";

function notConnected(name: string): Promise<IntegrationStatus> {
  return Promise.resolve({
    name,
    state: "not_connected",
    detail: "No approved provider connection or credentials have been configured.",
  });
}

export const unconfiguredInvoiceSystem: InvoiceSystemAdapter = {
  getStatus: () => notConnected("Invoice system"),
};

export const unconfiguredMpg: MpgAdapter = {
  getStatus: () => notConnected("MPG"),
};

export const unconfiguredMessaging: MessagingAdapter = {
  getStatus: () => notConnected("Messaging"),
};

export const unconfiguredAiProvider: AiProviderAdapter = {
  getStatus: () => notConnected("AI provider"),
};
