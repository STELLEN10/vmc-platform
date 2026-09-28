"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { VmcAiIcon } from "./vmc-ai-icon";

type Message = {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
};

export function VmcAiAssistant({
  driverName = "Rider",
  bikeInfo = "",
  role = "driver",
}: {
  driverName?: string;
  bikeInfo?: string;
  role?: string;
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isEmergencyPage = pathname.includes("emergency");
  const isPaymentsPage = pathname.includes("payments");
  const isMaintenancePage = pathname.includes("maintenance");

  // Initial greeting based on context
  const getInitialMessage = (): Message => {
    let initialText = `Hello ${driverName}. I am your VMC AI Fleet Assistant. How can I assist you with your Hero motorcycle today?`;
    if (isEmergencyPage) {
      initialText = `EMERGENCY DISPATCH MODE ACTIVE\n\nHello ${driverName}. If you are stranded or had an accident, rider safety is top priority.\n\nUse the quick templates below to prepare your incident details or ask me to guide you through emergency roadside dispatch.`;
    } else if (isPaymentsPage) {
      initialText = `PAYMENTS & BILLING ASSISTANT\n\nHello ${driverName}. Need help drafting a quotation, understanding your weekly rental invoice, or verifying payment receipts? Select a template below or type your inquiry.`;
    } else if (isMaintenancePage) {
      initialText = `MAINTENANCE & WORKSHOP DESK\n\nHello ${driverName}. I can assist you with diagnosing faults, tyre wear, oil service intervals, or logging maintenance requests for your ${bikeInfo || "Hero motorcycle"}.`;
    }

    return {
      id: "init",
      sender: "assistant",
      text: initialText,
      timestamp: "Now",
    };
  };

  const [messages, setMessages] = useState<Message[]>([getInitialMessage()]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const quickTemplates = isEmergencyPage
    ? [
        { label: "🚨 Road Breakdown", prompt: "I have a mechanical breakdown on the road. Please give me the emergency dispatch template." },
        { label: "💥 Accident / Collision", prompt: "I was involved in an accident. Give me the urgent accident safety protocol and details template." },
        { label: "⚡ Flat Tyre / Puncture", prompt: "I have a punctured tyre while out on deliveries. How do I request roadside assistance?" },
        { label: "📋 Emergency Steps", prompt: "What are the exact steps to submit an emergency report on this screen?" },
      ]
    : isPaymentsPage
    ? [
        { label: "📄 Draft Weekly Invoice", prompt: "Create a formal weekly motorcycle rental invoice template for a Hero Eco 150." },
        { label: "📋 Repair Quotation", prompt: "Draft a formal parts and maintenance quotation template with VAT." },
        { label: "🧾 Payment Proof Info", prompt: "What are the banking details and requirements for payment verification?" },
      ]
    : [
        { label: "🚨 Urgent Breakdown", prompt: "Can you create an emergency breakdown request for me? The bike stopped running while delivering." },
        { label: "🔧 Service Schedule", prompt: "When is my Hero Eco 150 regular service due, and what is inspected?" },
        { label: "📄 Invoice / Receipt", prompt: "How do I get an official invoice or PDF receipt for my payments?" },
      ];

  async function handleSend(textToSend?: string) {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      sender: "user",
      text: messageContent,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/vmc-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: messageContent,
          context: {
            pathname,
            role,
            driverName,
            bikeInfo,
          },
        }),
      });

      const data = await res.json();
      const rawText = data?.text || "I was unable to complete this request. Please contact VMC dispatch.";
      const cleanReply = stripMarkdownStars(rawText);

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: cleanReply,
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          text: "VMC AI response error. If this is an urgent roadside emergency, please contact 112 or call VMC dispatch directly.",
          timestamp: "Just now",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function stripMarkdownStars(str: string): string {
    return str
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/_{2,}/g, "")
      .replace(/^#+\s+/gm, "")
      .trim();
  }

  return (
    <>
      {/* Floating Trigger Button on Bottom-Right */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {/* Contextual notification badge when closed on emergency page */}
        {!isOpen && isEmergencyPage && (
          <div className="bg-red-600 text-white text-[11px] font-bold py-1 px-3 rounded-full shadow-lg animate-bounce border border-red-400 flex items-center gap-1.5 cursor-pointer" onClick={() => setIsOpen(true)}>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            Emergency AI Assistant Ready
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl transition-all duration-200 cursor-pointer border ${
            isOpen
              ? "bg-slate-900 text-white border-slate-700 hover:bg-slate-800"
              : isEmergencyPage
              ? "bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white border-red-400 hover:scale-105 ring-4 ring-red-500/20"
              : "bg-gradient-to-r from-[#081726] via-[#0d2b45] to-[#081726] text-white border-sky-500/40 hover:scale-105 ring-4 ring-sky-500/20"
          }`}
          aria-label={isOpen ? "Close VMC AI Assistant" : "Open VMC AI Assistant"}
          aria-expanded={isOpen}
        >
          <VmcAiIcon size={26} glow />
          <span className="font-bold text-xs tracking-wide">
            {isOpen ? "Close Assistant" : "VMC AI"}
          </span>
          {!isOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Floating Modal / Panel */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[80vh] h-[580px] bg-paper border border-line rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 bg-gradient-to-r from-[#061326] via-[#0a233f] to-[#061326] text-white flex items-center justify-between border-b border-sky-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-1 rounded-lg bg-sky-950/80 border border-sky-400/30">
                <VmcAiIcon size={28} glow />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white m-0 tracking-tight">VMC AI Assistant</h3>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 font-semibold px-1.5 py-0.5 rounded border border-sky-400/30">
                    Fleet Ops
                  </span>
                </div>
                <p className="text-[11px] text-sky-200/80 m-0">
                  {isEmergencyPage
                    ? "🚨 Emergency Roadside Protocol Mode"
                    : isPaymentsPage
                    ? "💳 Invoicing & Billing Assistant"
                    : "🏍️ 24/7 Fleet & Rider Operational Support"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-lg leading-none"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Quick Action Template Bar */}
          <div className="px-3 py-2 bg-paper/80 border-b border-line overflow-x-auto flex gap-1.5 scrollbar-none">
            {quickTemplates.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(t.prompt)}
                disabled={loading}
                className="whitespace-nowrap text-[11px] font-semibold py-1 px-2.5 rounded-full bg-navy/5 hover:bg-navy/10 text-foreground border border-line hover:border-sky-400 transition-colors cursor-pointer flex-shrink-0"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-surface/50 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[90%] p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap ${
                    msg.sender === "user"
                      ? "bg-sky-600 text-white rounded-br-none shadow-sm"
                      : "bg-paper border border-line text-foreground rounded-bl-none shadow-sm font-sans"
                  }`}
                >
                  {/* Clean text renderer without any markdown stars */}
                  <div className="text-xs leading-relaxed">{msg.text}</div>
                </div>

                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-muted">
                  <span>{msg.timestamp}</span>
                  {msg.sender === "assistant" && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.text, msg.id)}
                      className="text-action hover:underline cursor-pointer"
                    >
                      {copiedId === msg.id ? "✓ Copied" : "Copy Template"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-paper border border-line rounded-xl w-fit">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] text-muted font-medium ml-1">VMC AI is generating clean response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-paper border-t border-line flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isEmergencyPage ? "Describe emergency or ask for dispatch template..." : "Ask VMC AI (e.g. Can you create an emergency for me?)..."}
              className="flex-1 px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-surface text-foreground"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-3.5 py-2 rounded-lg bg-navy text-white text-xs font-semibold hover:bg-navy/90 transition-colors disabled:opacity-40 cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
