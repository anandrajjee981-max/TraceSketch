import type { ReactNode } from "react";

/**
 * Legacy surface wrapper. Kept for existing call sites — new code should
 * prefer `Card`/`CardHeader`/`CardBody` from `ui.tsx`, which are built on
 * the same `.ts-card` token.
 */
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
      className={`ts-card ${hoverShadow ? "ts-card-interactive" : ""} ${glow ? "glow-violet-sm" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
