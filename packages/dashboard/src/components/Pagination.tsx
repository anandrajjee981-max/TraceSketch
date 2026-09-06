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

  const btnBase: React.CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    color: "var(--text-secondary)",
    borderRadius: "5px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    fontSize: "12px",
    fontWeight: 500,
  };

  return (
    <div className="flex items-center justify-between py-2.5 text-[12px]">
      <span style={{ color: "var(--text-dim)" }}>
        {total === 0
          ? "No results"
          : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          className="px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          style={btnBase}
          onMouseEnter={(e) => {
            if (canPrev) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
        >
          Previous
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="min-w-[28px] h-[28px] px-2 flex items-center justify-center"
            style={
              p === page
                ? {
                    background: "var(--accent)",
                    border: "1px solid var(--accent)",
                    color: "#ffffff",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }
                : btnBase
            }
            onMouseEnter={(e) => {
              if (p !== page) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (p !== page) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
              }
            }}
          >
            {p}
          </button>
        ))}
        <button
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          className="px-2.5 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
          style={btnBase}
          onMouseEnter={(e) => {
            if (canNext) {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
