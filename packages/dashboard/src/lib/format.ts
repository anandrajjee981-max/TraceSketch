/* Date helpers. Kept out of components/ui.tsx so that module only exports
   components (react-refresh/only-export-components). */

/** Traces may carry either epoch seconds, epoch millis, or an ISO string. */
function toMillis(createdAt: number | string): number {
  if (typeof createdAt === "string") return new Date(createdAt).getTime();
  if (createdAt > 1e12) return createdAt;
  if (createdAt > 1e10) return createdAt;
  return createdAt * 1000;
}

export function relativeTime(createdAt: number | string): string {
  const diff = Date.now() - toMillis(createdAt);
  if (diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function absoluteTime(createdAt: number | string): string {
  return new Date(toMillis(createdAt)).toLocaleString();
}
