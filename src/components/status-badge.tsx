type StatusBadgeProps = {
  children: string;
  tone?: "blue" | "green" | "slate" | "red";
};

export function StatusBadge({ children, tone = "slate" }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${tone}`}>{children}</span>;
}
