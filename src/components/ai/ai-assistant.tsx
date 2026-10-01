"use client";

import { useState } from "react";
import { Send, Sparkles, UserRound } from "lucide-react";
import { VmcAiMark } from "@/components/ai/vmc-ai-mark";

type ChatMessage = { role: "user" | "assistant"; content: string };

function cleanInlineMarkdown(text: string): string {
  return text
    .replaceAll("**", "")
    .replaceAll("__", "")
    .replaceAll("`", "")
    .replaceAll("*", "")
    .replace(/(^|\\s)_([^_\\n]+)_(?=\\s|$)/g, "$1$2")
    .replace(/(^|\\s)_([^_\\n]+)_(?=\\s|$)/g, "$1$2")
    .trim();
}

function isTableSeparator(line: string): boolean {
  const cells = line.trim().replace(/^\\|/, "").replace(/\\|$/, "").split("|");
  return cells.length > 0 && cells.every((cell) => /^\\s*:?-{3,}:?\\s*$/.test(cell));
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\\|/, "").replace(/\\|$/, "").split("|").map((cell) => cleanInlineMarkdown(cell));
}

function AssistantMessage({ content }: { content: string }) {
  const lines = content.replace(/\\r\\n/g, "\\n").split("\\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i += 1; continue; }

    if (line.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[i]));
        i += 1;
      }
      blocks.push(
        <div key={key++} className="my-3 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full border-collapse text-left text-xs sm:text-sm">
            <thead className="hidden bg-neutral-50 sm:table-header-group"><tr>
              {headers.map((header, index) => <th key={index} className="border-b border-neutral-200 px-3 py-2 font-bold text-neutral-700">{header}</th>)}
            </tr></thead>
            <tbody className="block sm:table-row-group">
              {rows.map((row, rowIndex) => <tr key={rowIndex} className="block border-b border-neutral-100 p-2 last:border-b-0 sm:table-row sm:p-0">
                {headers.map((_, columnIndex) => <td key={columnIndex} data-label={headers[columnIndex]} className="block px-2 py-1.5 align-top text-neutral-700 before:mr-2 before:font-semibold before:text-neutral-500 before:content-[attr(data-label)] sm:table-cell sm:px-3 sm:py-2 sm:before:content-none">{row[columnIndex] ?? "—"}</td>)}
              </tr>)}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    const headingMatch = line.match(/^#{1,4}\\s+(.+)$/);
    const boldHeading = line.match(/^\\*\\*([^*]+)\\*\\*:?$/);
    if (headingMatch || boldHeading) {
      blocks.push(<p key={key++} className="mb-2 mt-3 text-sm font-extrabold text-neutral-900 first:mt-0">{cleanInlineMarkdown((headingMatch || boldHeading)![1])}</p>);
      i += 1; continue;
    }

    if (/^[-*]\\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\\s+/.test(lines[i].trim())) {
        items.push(cleanInlineMarkdown(lines[i].trim().replace(/^[-*]\\s+/, "")));
        i += 1;
      }
      blocks.push(<ul key={key++} className="my-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>);
      continue;
    }

    blocks.push(<p key={key++} className="my-2 text-sm leading-6 text-neutral-800">{cleanInlineMarkdown(line)}</p>);
    i += 1;
  }

  return <div>{blocks}</div>;
}

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
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/10"><VmcAiMark className="h-7 w-7" accent={role === "management" ? "#57b9ec" : "#ff6a70"} /></div>
          <div>
            <h2 className="text-xl font-bold">Ask VMC AI</h2>
            <p className="mt-1 text-sm text-white/70">
              Ask questions in plain language. VMC AI checks live platform data through secure, role-limited tools.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void sendMessage(suggestion)}
              disabled={isSending}
              className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15 disabled:opacity-50"
            >
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />{suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="panel mt-4">
        <div className="min-h-72 max-h-[58dvh] space-y-3 overflow-y-auto pr-1 sm:min-h-56 sm:max-h-[55vh]">
          {messages.length === 0 ? (
            <div className="grid min-h-48 place-items-center text-center">
              <div>
                <VmcAiMark className="mx-auto h-10 w-10 text-neutral-300" accent="#db1e2a" />
                <p className="mt-3 text-sm font-semibold text-ink">Your VMC AI conversation starts here.</p>
                <p className="mt-1 text-xs text-muted">Try one of the prompts above.</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={index} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <VmcAiMark className="mt-1 h-5 w-5 shrink-0" accent={role === "management" ? "#57b9ec" : "#ff6a70"} />}
                <div className={`min-w-0 max-w-[94%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 sm:max-w-[88%] ${message.role === "user" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"}`}>
                  {message.role === "assistant" ? <AssistantMessage content={message.content} /> : message.content}
                </div>
                {message.role === "user" && <UserRound className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />}
              </div>
            ))
          )}
          {isSending && <p className="text-xs text-muted">VMC AI is checking the platform…</p>}
        </div>

        <form
          className="sticky bottom-0 z-10 mt-4 flex gap-2 border-t border-line bg-paper/95 pt-4 backdrop-blur"
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
            className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 py-3 text-[16px] text-ink sm:text-sm outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Message VMC AI"
          />
          <button type="submit" disabled={!input.trim() || isSending} className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}
