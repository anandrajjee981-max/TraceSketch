import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllReplays } from "../api/client";
import type { ReplayRun } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useConfig } from "../context/ConfigContext";

function relativeTime(createdAt: number): string {
  const ms = createdAt > 1e12 ? createdAt : createdAt > 1e10 ? createdAt : createdAt * 1000;
  const diff = Date.now() - ms;
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

export function ReplaysList() {
  const navigate = useNavigate();
  const { instanceId, apiBaseUrl } = useConfig();
  const [replays, setReplays] = useState<ReplayRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAllReplays({ instanceId, apiBaseUrl, limit: 100 });
      setReplays(res.replays ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, apiBaseUrl]);

  return (
    <div>
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "Replays" }]} />

      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.02em] leading-none" style={{ color: "var(--text-primary)" }}>
            Replays
          </h1>
          <p className="text-[12px] mt-1.5" style={{ color: "var(--text-dim)" }}>
            Recent replay runs across all traces. Click a trace ID to view and replay again.
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="text-[13px] px-3.5 py-1.5 rounded-[6px] font-semibold transition-colors"
          style={{ background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
        >
          ↻ Refresh
        </button>
      </div>

      <Panel>
        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <div className="p-4">
            <ErrorState
              title="Unable to load replays"
              description="We couldn’t reach the collector for replay history."
              detail={error}
              action={
                <button
                  onClick={fetchAll}
                  className="px-3.5 py-1.5 rounded-[5px] text-[13px] font-semibold"
                  style={{ background: "var(--red-bg)", border: "1px solid var(--red-border)", color: "var(--red)", cursor: "pointer" }}
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : replays.length === 0 ? (
          <EmptyState
            title="No replays yet"
            description="Replay a trace from its detail page — every run is recorded here for verification and regression tracking."
          />
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)" }}>
                  {["Trace", "Target", "Status", "Duration", "Result", "When"].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[10px] font-bold tracking-[0.08em] uppercase whitespace-nowrap"
                      style={{ color: "var(--text-dim)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {replays.map((r, idx) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/traces/${encodeURIComponent(r.trace_id)}`)}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: idx < replays.length - 1 ? "1px solid var(--border-dim)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-3 py-[9px] whitespace-nowrap">
                      <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--accent-text)" }} title={r.trace_id}>
                        {r.trace_id.slice(0, 8)}…<span style={{ opacity: 0.6 }}>{r.trace_id.slice(-4)}</span>
                      </span>
                    </td>
                    <td className="px-3 py-[9px] font-mono text-[12px] max-w-[220px] truncate" style={{ color: "var(--text-secondary)" }} title={r.target_base_url}>
                      {r.target_base_url}
                    </td>
                    <td className="px-3 py-[9px] whitespace-nowrap">
                      {r.status_code != null ? <StatusBadge code={r.status_code} /> : <span style={{ color: "var(--text-dim)" }}>—</span>}
                    </td>
                    <td className="px-3 py-[9px] whitespace-nowrap font-mono text-[12px]" style={{ color: "var(--text-secondary)" }}>
                      {r.duration_ms != null ? `${r.duration_ms} ms` : "—"}
                    </td>
                    <td className="px-3 py-[9px]">
                      <span
                        className="inline-flex px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium capitalize"
                        style={{
                          background: r.result === "completed" ? "var(--green-bg)" : r.result === "failed" ? "var(--red-bg)" : "var(--bg-surface-2)",
                          border: `1px solid ${r.result === "completed" ? "var(--green-border)" : r.result === "failed" ? "var(--red-border)" : "var(--border-dim)"}`,
                          color: r.result === "completed" ? "var(--green)" : r.result === "failed" ? "var(--red)" : "var(--text-secondary)",
                        }}
                      >
                        {r.result ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-[9px] whitespace-nowrap text-[12px]" style={{ color: "var(--text-dim)" }} title={new Date(r.created_at > 1e12 ? r.created_at : r.created_at * 1000).toLocaleString()}>
                      {relativeTime(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
