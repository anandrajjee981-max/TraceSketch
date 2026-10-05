interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // compact window: show up to 5 page numbers centered on current
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const adjStart = Math.max(1, end - 4);
  for (let i = adjStart; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between py-1 text-[12px]">
      <span className="ts-numeric" style={{ color: "var(--text-dim)" }}>
        {total === 0
          ? "No results"
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="px-2.5 py-1 ts-input !w-auto !h-[28px] !py-0 ts-numeric disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {pages.map((p) => {
          const active = p === page;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={active ? "page" : undefined}
              className="min-w-[28px] h-[28px] px-2 ts-numeric ts-pop"
              style={
                active
                  ? {
                      background: "var(--accent)",
                      border: "1px solid var(--accent)",
                      color: "var(--on-accent)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                      boxShadow: "0 0 14px -3px var(--accent-glow)",
                    }
                  : {
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-secondary)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 500,
                      transition: "border-color 120ms, color 120ms",
                    }
              }
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="px-2.5 py-1 ts-input !w-auto !h-[28px] !py-0 ts-numeric disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}
