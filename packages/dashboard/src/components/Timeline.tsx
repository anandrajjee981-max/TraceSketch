import type { TraceEvent } from "../types";

function formatMs(ms: number) {
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  return `${ms} ms`;
}

function barColor(eventType: string, index: number) {
  const palette: Record<string, string> = {
    http: "var(--blue)",
    db: "var(--green)",
    cache: "var(--accent)",
    queue: "var(--amber)",
    external: "var(--red)",
  };
  if (palette[eventType.toLowerCase()]) return palette[eventType.toLowerCase()];
  const fallback = [
    "var(--blue)",
    "var(--green)",
    "var(--accent)",
    "var(--amber)",
    "var(--red)",
  ];
  return fallback[index % fallback.length];
}

export function Timeline({ events }: { events: TraceEvent[] }) {
  if (!events.length) {
    return (
      <div
        className="text-[13px] py-6 text-center rounded-[8px]"
        style={{
          color: "var(--text-dim)",
          border: "1px dashed var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        No events for this trace.
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => a.created_at - b.created_at);
  const start = Math.min(...sorted.map((e) => e.created_at));
  // total span: from first start to last end
  const ends = sorted.map((e) => e.created_at + e.duration_ms);
  const totalEnd = Math.max(...ends, start + 1);
  const totalSpan = totalEnd - start || 1;

  // scale ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => ({
    label: `${Math.round((totalSpan * i) / tickCount)} ms`,
    left: (i / tickCount) * 100,
  }));

  return (
    <div
      className="rounded-[8px] overflow-hidden transition-shadow"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="px-3.5 py-2.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
          Timeline Waterfall
        </span>
        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
          Total span: {totalSpan} ms • {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ruler */}
      <div
        className="relative h-[22px] mx-0"
        style={{
          borderBottom: "1px solid var(--border-dim)",
          background: "var(--bg-surface-2)",
        }}
      >
        <div className="absolute inset-0 flex">
          {ticks.map((t) => (
            <div key={t.label} className="absolute top-0 bottom-0 flex flex-col items-start" style={{ left: `${t.left}%` }}>
              <div className="w-px h-[6px]" style={{ background: "var(--border)" }} />
              <span className="text-[10px] ml-1 leading-none" style={{ color: "var(--text-dim)" }}>
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div>
        {sorted.map((ev, idx) => {
          const offsetMs = ev.created_at - start;
          const leftPct = (offsetMs / totalSpan) * 100;
          const widthPct = Math.max((ev.duration_ms / totalSpan) * 100, 0.8);
          return (
            <div
              key={ev.id}
              className="flex items-center gap-3 px-3 py-[7px] transition-colors"
              style={{
                borderBottom: idx < sorted.length - 1 ? "1px solid var(--border-dim)" : "none",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "var(--bg-surface-2)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = "transparent";
              }}
            >
              <div className="w-[220px] shrink-0 min-w-0">
                <div
                  className="text-[13px] font-medium truncate"
                  style={{ color: "var(--text-primary)" }}
                  title={`${ev.service} — ${ev.operation}`}
                >
                  {ev.service} <span style={{ color: "var(--text-dim)" }}>/</span> {ev.operation}
                </div>
                <div className="text-[11px] truncate" style={{ color: "var(--text-dim)" }}>
                  {ev.event_type}
                </div>
              </div>
              <div
                className="flex-1 relative h-[20px] rounded-[4px] overflow-hidden"
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-dim)",
                }}
              >
                {/* gridlines */}
                <div className="absolute inset-0 flex">
                  {ticks.map((t) => (
                    <div
                      key={t.label}
                      className="absolute top-0 bottom-0 w-px"
                      style={{ left: `${t.left}%`, background: "var(--border-dim)" }}
                    />
                  ))}
                </div>
                <div
                  className="absolute top-[2px] bottom-[2px] rounded-[3px] flex items-center px-1.5"
                  style={{
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    background: barColor(ev.event_type, idx),
                    minWidth: ev.duration_ms > 0 ? "3px" : "0",
                  }}
                  title={`${ev.service}/${ev.operation} — ${formatMs(ev.duration_ms)} @ +${offsetMs}ms`}
                >
                  {widthPct > 12 && (
                    <span className="text-[10px] text-white font-medium truncate">
                      {formatMs(ev.duration_ms)}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="w-[72px] shrink-0 text-right text-[12px] font-mono font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {formatMs(ev.duration_ms)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
