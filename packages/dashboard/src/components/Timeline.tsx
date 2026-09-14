import { useState } from "react";
import type { TraceEvent } from "../types";

function formatMs(ms: number) {
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  return `${ms} ms`;
}

function eventBadge(eventType: string) {
  const type = eventType.toLowerCase();
  if (type === "http") {
    return { color: "var(--blue)", bg: "var(--blue-bg)", border: "var(--blue-border)", label: "HTTP" };
  }
  if (type === "db") {
    return { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)", label: "DB" };
  }
  if (type === "cache") {
    return { color: "var(--accent-text)", bg: "var(--accent-light)", border: "var(--border-accent)", label: "CACHE" };
  }
  if (type === "external") {
    return { color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)", label: "EXTERNAL" };
  }
  if (type === "queue") {
    return { color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)", label: "QUEUE" };
  }
  return { color: "var(--text-secondary)", bg: "var(--bg-surface-2)", border: "var(--border)", label: type.toUpperCase() };
}

function barGradient(eventType: string) {
  const type = eventType.toLowerCase();
  if (type === "http") return "linear-gradient(90deg, #0284C7 0%, #38BDF8 100%)";
  if (type === "db") return "linear-gradient(90deg, #059669 0%, #10B981 100%)";
  if (type === "cache") return "linear-gradient(90deg, #6C47FF 0%, #8B5CF6 100%)";
  if (type === "external") return "linear-gradient(90deg, #E11D48 0%, #F43F5E 100%)";
  if (type === "queue") return "linear-gradient(90deg, #D97706 0%, #F59E0B 100%)";
  return "linear-gradient(90deg, #475569 0%, #64748B 100%)";
}

export function Timeline({ events }: { events: TraceEvent[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (!events.length) {
    return (
      <div
        className="text-[13px] py-10 text-center rounded-[10px]"
        style={{
          color: "var(--text-dim)",
          border: "1px dashed var(--border)",
          background: "var(--bg-surface)",
        }}
      >
        <div className="text-[20px] mb-2">⏱️</div>
        <div>No waterfall events recorded for this trace yet.</div>
        <div className="text-[11px] text-slate-500 mt-1">Use SDK spans or simulator to populate DB, Cache, and HTTP events.</div>
      </div>
    );
  }

  const sorted = [...events].sort((a, b) => a.created_at - b.created_at);
  const start = Math.min(...sorted.map((e) => e.created_at));
  const ends = sorted.map((e) => e.created_at + e.duration_ms);
  const totalEnd = Math.max(...ends, start + 1);
  const totalSpan = totalEnd - start || 1;

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => ({
    label: `${Math.round((totalSpan * i) / tickCount)} ms`,
    left: (i / tickCount) * 100,
  }));

  return (
    <div
      className="rounded-[10px] overflow-hidden transition-shadow"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--bg-surface-2)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-white">Timeline Waterfall</span>
          <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#6C47FF]/20 text-[#C4B5FD] border border-[#6C47FF]/30">
            {events.length} spans
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Total latency: <strong className="text-white">{totalSpan} ms</strong>
        </span>
      </div>

      {/* Ruler */}
      <div
        className="relative h-[24px] mx-0"
        style={{
          borderBottom: "1px solid var(--border-dim)",
          background: "rgba(10, 13, 20, 0.6)",
        }}
      >
        <div className="absolute inset-0 flex">
          {ticks.map((t) => (
            <div key={t.label} className="absolute top-0 bottom-0 flex flex-col items-start" style={{ left: `${t.left}%` }}>
              <div className="w-px h-[6px] bg-[var(--border)]" />
              <span className="text-[10px] font-mono ml-1 leading-none text-slate-400">
                {t.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Spans */}
      <div className="divide-y divide-[var(--border-dim)]">
        {sorted.map((ev, idx) => {
          const offsetMs = ev.created_at - start;
          const leftPct = (offsetMs / totalSpan) * 100;
          const widthPct = Math.max((ev.duration_ms / totalSpan) * 100, 1.2);
          const badge = eventBadge(ev.event_type);
          const isExpanded = expandedId === ev.id;

          return (
            <div
              key={ev.id || idx}
              className="transition-colors hover:bg-white/[0.02]"
            >
              <div
                className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : ev.id)}
              >
                {/* Event Type Badge & Service Name */}
                <div className="w-[230px] shrink-0 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono"
                      style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[13px] font-medium text-white truncate" title={ev.service}>
                      {ev.service}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate" title={ev.operation}>
                    {ev.operation}
                  </div>
                </div>

                {/* Waterfall Bar Canvas */}
                <div
                  className="flex-1 relative h-[22px] rounded-[5px] overflow-hidden"
                  style={{
                    background: "rgba(10, 13, 20, 0.4)",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  {/* Grid tick marks */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {ticks.map((t) => (
                      <div
                        key={t.label}
                        className="absolute top-0 bottom-0 w-px bg-white/[0.04]"
                        style={{ left: `${t.left}%` }}
                      />
                    ))}
                  </div>

                  {/* Span bar */}
                  <div
                    className="absolute top-[2px] bottom-[2px] rounded-[3px] flex items-center px-2 transition-all duration-200 hover:brightness-110 shadow-sm"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      background: barGradient(ev.event_type),
                      minWidth: "4px",
                    }}
                    title={`${ev.service}/${ev.operation} — ${formatMs(ev.duration_ms)} @ +${offsetMs}ms`}
                  >
                    {widthPct > 10 && (
                      <span className="text-[10px] text-white font-mono font-semibold truncate drop-shadow-sm">
                        {formatMs(ev.duration_ms)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Duration right label */}
                <div className="w-[76px] shrink-0 text-right text-[12px] font-mono font-semibold text-white">
                  {formatMs(ev.duration_ms)}
                </div>
              </div>

              {/* Expanded metadata drawer */}
              {isExpanded && ev.metadata && (
                <div className="px-4 pb-3 pt-1 bg-[#0D101A] border-t border-[var(--border-dim)] text-xs font-mono">
                  <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1 font-semibold">
                    Span Metadata & Diagnostics
                  </div>
                  <pre className="p-2.5 rounded-[6px] bg-[#07090F] border border-[var(--border-dim)] text-slate-300 overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(ev.metadata), null, 2);
                      } catch {
                        return ev.metadata;
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
