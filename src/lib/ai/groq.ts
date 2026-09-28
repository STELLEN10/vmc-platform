import "server-only";

const DEFAULT_MODEL = "openai/gpt-oss-20b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: GroqToolCall[];
};

export type GroqToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type GroqToolDefinition = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string | null; tool_calls?: GroqToolCall[] } }>;
  error?: { message?: string };
};

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY?.trim());
}

export async function callGroq(params: { messages: GroqMessage[]; tools?: GroqToolDefinition[] }) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("VMC AI is not configured yet. Add GROQ_API_KEY to the Vercel environment.");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL,
      messages: params.messages,
      tools: params.tools,
      tool_choice: params.tools?.length ? "auto" : undefined,
      parallel_tool_calls: false,
      temperature: 0.2,
      max_completion_tokens: 900,
    }),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as GroqResponse | null;
  if (!response.ok) {
    const message = payload?.error?.message || `Groq request failed with HTTP ${response.status}.`;
    if (response.status === 429) throw new Error("VMC AI is temporarily rate-limited. Please wait a moment and try again.");
    throw new Error(message);
  }

  const message = payload?.choices?.[0]?.message;
  if (!message) throw new Error("VMC AI returned an empty response.");
  return { content: message.content ?? "", toolCalls: message.tool_calls ?? [] };
}
