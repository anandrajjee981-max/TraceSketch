import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
  hoverShadow = true,
}: {
  children: ReactNode;
  className?: string;
  hoverShadow?: boolean;
}) {
  return (
    <div
      className={`rounded-[8px] overflow-hidden transition-shadow duration-150 ${hoverShadow ? "hover:shadow-[0_2px_10px_rgba(44,24,16,0.10)]" : ""} ${className}`}
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
