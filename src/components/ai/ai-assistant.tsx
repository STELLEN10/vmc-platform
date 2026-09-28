"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, UserRound } from "lucide-react";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AiAssistant({
  role,
  suggestions,
}: {
  role: "driver" | "management";
  suggestions: string[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function sendMessage(text: string) {
    const value = text.trim();
    if (!value || isSending) return;

    const next = [...messages, { role: "user" as const, content: value }];
    setMessages(next);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!response.ok) {
        setMessages((current) => [...current, { role: "assistant", content: payload.error || "VMC AI could not process that request." }]);
        return;
      }

      setMessages((current) => [...current, { role: "assistant", content: payload.message || "I don't have an answer for that yet." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "I couldn't connect to VMC AI. Check your connection and try again." }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="ai-assistant">
      <section className="panel panel--dark">
        <p className="eyebrow eyebrow--light">VMC AI</p>
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-white/10 p-2.5"><Bot className="h-5 w-5" /></div>
          <div>
            <h2 className="text-xl font-bold">Ask VMC AI</h2>
            <p className="mt-1 text-sm text-white/70">
              Ask questions in plain language. VMC AI checks live platform data through secure, role-limited tools.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void sendMessage(suggestion)}
              disabled={isSending}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />{suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="panel mt-4">
        <div className="max-h-[55vh] min-h-56 space-y-3 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="grid min-h-48 place-items-center text-center">
              <div>
                <Bot className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-3 text-sm font-semibold text-ink">Your VMC AI conversation starts here.</p>
                <p className="mt-1 text-xs text-muted">Try one of the prompts above.</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <Bot className="mt-1 h-4 w-4 shrink-0 text-red-600" />}
                <div className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.role === "user" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"}`}>
                  {message.content}
                </div>
                {message.role === "user" && <UserRound className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />}
              </div>
            ))
          )}
          {isSending && <p className="text-xs text-muted">VMC AI is checking the platform…</p>}
        </div>

        <form
          className="mt-4 flex gap-2 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={role === "driver" ? "Ask about your bike, payments or parts…" : "Ask about the fleet, operations or inventory…"}
            maxLength={4000}
            className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Message VMC AI"
          />
          <button type="submit" disabled={!input.trim() || isSending} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-neutral-900 text-white disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
