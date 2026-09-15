import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllReplays } from "../api/client";
import type { ReplayRun } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Panel } from "../components/Panel";
import { StatusBadge } from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";
import { ErrorState } from "../components/EmptyState";
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
      const replaysRes = await getAllReplays({ instanceId, apiBaseUrl, limit: 100 });

      const fetchedReplays =
        Array.isArray(replaysRes.replays)
          ? replaysRes.replays
          : [];

      setReplays(fetchedReplays);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReplays([]);
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

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-[26px] font-extrabold tracking-[-0.02em] leading-none mb-1 text-white flex items-center gap-3"
          >
            <span>Replay History</span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#6C47FF]/20 text-[#C4B5FD] border border-[#6C47FF]/30 font-medium">
              Local Engine
            </span>
          </h1>
          <p className="text-[12px] text-slate-400">
            Audit log of replayed HTTP traces and saved regression tests. Click any row to inspect the source trace.
          </p>
        </div>

        <button
          onClick={fetchAll}
          className="text-[12px] px-3.5 py-1.5 rounded-[7px] font-semibold transition-all duration-150 flex items-center gap-1.5"
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 0 15px rgba(108,71,255,0.4)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--accent-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--accent)")}
        >
          <span>↻</span>
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Replays Table ──────────────────────────────────────────── */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className="text-[11px] font-bold font-mono tracking-[0.08em] uppercase"
          style={{ color: "var(--text-dim)" }}
        >
          Replays
        </span>
        <span
          className="text-[11px] font-mono px-1.5 py-0.5 rounded-[4px]"
          style={{ background: "var(--bg-surface-2)", color: "var(--accent-text)", border: "1px solid var(--border-dim)" }}
        >
          {replays.length}
        </span>
      </div>
      <Panel>
        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <div className="p-4">
            <ErrorState
              title="Unable to load replays"
              description="We couldn't reach the collector for replay history."
              detail={error}
              action={
                <button
                  onClick={fetchAll}
                  className="px-3.5 py-1.5 rounded-[6px] text-[13px] font-semibold bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/30 cursor-pointer"
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : replays.length === 0 ? (
          <div
            className="px-4 py-8 text-center text-[13px]"
            style={{ color: "var(--text-dim)" }}
          >
            No replays executed yet. Open a trace and click{" "}
            <span style={{ color: "var(--accent-text)" }}>Replay Request</span> to test your server.
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)" }}>
                  {["Trace ID", "Target Base URL", "Replay Status", "Latency", "Result", "Executed"].map((h) => (
                    <th
                      key={h}
                      className="px-3.5 py-2.5 text-left text-[10px] font-bold font-mono tracking-[0.08em] uppercase whitespace-nowrap text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-dim)]">
                {replays.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/traces/${encodeURIComponent(r.trace_id)}`)}
                    className="cursor-pointer transition-colors duration-120 hover:bg-white/[0.04] group"
                  >
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      <span
                        className="font-mono text-[12px] font-semibold text-[#A78BFA] group-hover:text-white transition-colors"
                        title={r.trace_id}
                      >
                        {r.trace_id.slice(0, 10)}…
                      </span>
                    </td>
                    <td
                      className="px-3.5 py-3 font-mono text-[12px] max-w-[220px] truncate text-slate-300"
                      title={r.target_base_url}
                    >
                      {r.target_base_url}
                    </td>
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {r.status_code != null ? (
                        <StatusBadge code={r.status_code} />
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                    <td
                      className="px-3.5 py-3 whitespace-nowrap font-mono text-[12px] text-slate-200"
                    >
                      {r.duration_ms != null ? `${r.duration_ms} ms` : "—"}
                    </td>
                    <td className="px-3.5 py-3">
                      <span
                        className="inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold uppercase"
                        style={{
                          background:
                            r.result === "completed"
                              ? "var(--green-bg)"
                              : r.result === "failed"
                              ? "var(--red-bg)"
                              : "var(--bg-surface-2)",
                          border: `1px solid ${
                            r.result === "completed"
                              ? "var(--green-border)"
                              : r.result === "failed"
                              ? "var(--red-border)"
                              : "var(--border-dim)"
                          }`,
                          color:
                            r.result === "completed"
                              ? "var(--green)"
                              : r.result === "failed"
                              ? "var(--red)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {r.result ?? "—"}
                      </span>
                    </td>
                    <td
                      className="px-3.5 py-3 whitespace-nowrap text-[12px] text-slate-400 font-mono"
                      title={new Date(r.created_at > 1e12 ? r.created_at : r.created_at * 1000).toLocaleString()}
                    >
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
