import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  hoverShadow = true,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  hoverShadow?: boolean;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-[10px] overflow-hidden transition-all duration-200 ${
        hoverShadow ? "hover:border-[var(--border-accent)] hover:shadow-[0_4px_24px_rgba(108,71,255,0.18)]" : ""
      } ${glow ? "glow-violet-sm" : ""} ${className}`}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {children}
    </div>
  );
}
