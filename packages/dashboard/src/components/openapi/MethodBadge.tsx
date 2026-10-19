import { methodTone } from "../../lib/openapi";

/* HTTP method pill. Color comes from the shared palette so GET/POST/PUT/DELETE
   stay consistent across the endpoint list, the try-it-out panel and history. */
export function MethodBadge({ method, size = "md" }: { method: string; size?: "sm" | "md" | "lg" }) {
  const tone = methodTone(method);
  const sizing =
    size === "lg"
      ? "text-[12px] px-3 py-1 min-w-[76px]"
      : size === "sm"
        ? "text-[10px] px-2 py-0.5 min-w-[52px]"
        : "text-[11px] px-2.5 py-1 min-w-[64px]";

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[6px] font-mono font-bold uppercase tracking-[0.06em] select-none shrink-0 ${sizing}`}
      style={{ color: tone.fg, background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      {method.toUpperCase()}
    </span>
  );
}
