export function SkeletonRow() {
  return (
    <div
      className="flex gap-3 py-[11px] px-3"
      style={{ borderBottom: "1px solid var(--border-dim)" }}
    >
      <div className="h-[13px] rounded w-[120px] skeleton-shimmer" />
      <div className="h-[13px] rounded w-[50px] skeleton-shimmer" />
      <div className="h-[13px] rounded flex-1 skeleton-shimmer" />
      <div className="h-[13px] rounded w-[44px] skeleton-shimmer" />
      <div className="h-[13px] rounded w-[55px] skeleton-shimmer" />
      <div className="h-[13px] rounded w-[60px] skeleton-shimmer" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ borderTop: "1px solid var(--border-dim)" }}>
      <div className="h-[36px] skeleton-shimmer" style={{ borderBottom: "1px solid var(--border-dim)" }} />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

export function SkeletonDetail() {
  return (
    <div className="space-y-4">
      <div className="h-[28px] rounded w-[300px] skeleton-shimmer" />
      <div
        className="h-[160px] rounded-[8px] skeleton-shimmer"
        style={{ border: "1px solid var(--border)" }}
      />
      <div
        className="rounded-[8px] overflow-hidden"
        style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}
      >
        <div className="h-[36px] skeleton-shimmer" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[36px] skeleton-shimmer" style={{ borderTop: "1px solid var(--border-dim)" }} />
        ))}
      </div>
    </div>
  );
}
