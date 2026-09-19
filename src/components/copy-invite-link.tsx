"use client";

import { useState } from "react";

export function CopyInviteLink({ link, email }: { link: string; email?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  }

  return (
    <div
      style={{
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "0.5rem",
        padding: "1rem",
        margin: "1rem 0",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <p style={{ margin: 0, fontWeight: 700, color: "#166534", fontSize: "0.9rem" }}>
          Invitation Generated {email ? `for ${email}` : ""}
        </p>
        <span style={{ fontSize: "0.8rem", color: "#15803d", fontWeight: 600 }}>Active link</span>
      </div>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#374151" }}>
        An email was sent. If the recipient does not receive it, you can directly copy this setup link and share it securely:
      </p>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          readOnly
          value={link}
          style={{
            flex: 1,
            fontSize: "0.82rem",
            padding: "0.45rem 0.65rem",
            background: "#fff",
            border: "1px solid #cbd5e1",
            borderRadius: "0.35rem",
            fontFamily: "monospace",
          }}
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          type="button"
          onClick={handleCopy}
          className="button button--primary"
          style={{ padding: "0.45rem 0.9rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
      </div>
    </div>
  );
}
