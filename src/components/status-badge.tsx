import type { ReactNode } from "react";

type StatusBadgeProps = {
  children: ReactNode;
  tone?: "blue" | "green" | "slate" | "red" | "amber" | "neutral";
};

export function StatusBadge({ children, tone = "slate" }: StatusBadgeProps) {
  const resolvedTone = tone === "neutral" ? "slate" : tone;
  return <span className={`status-badge status-badge--${resolvedTone}`}>{children}</span>;
}

