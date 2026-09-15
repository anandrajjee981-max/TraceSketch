import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTraces } from "../api/client";
import type { Trace } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { Pagination } from "../components/Pagination";
import { SkeletonTable } from "../components/Skeleton";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Panel } from "../components/Panel";
import { EmptyState, ErrorState, IconEmptyTraces, IconNoResults } from "../components/EmptyState";
import { useConfig } from "../context/ConfigContext";
import { useTraceSimulator } from "../context/TraceSimulatorContext";

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

// Method badge matching cyber tech theme
function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  let color = "var(--text-secondary)";
  let bg = "var(--bg-surface-2)";
  let border = "var(--border)";

  switch (m) {
    case "GET":
      color = "var(--green)";
      bg = "var(--green-bg)";
      border = "var(--green-border)";
      break;
    case "POST":
      color = "var(--blue)";
      bg = "var(--blue-bg)";
      border = "var(--blue-border)";
      break;
    case "PUT":
      color = "var(--accent-text)";
      bg = "var(--accent-light)";
      border = "var(--border-accent)";
      break;
    case "PATCH":
      color = "var(--amber)";
      bg = "var(--amber-bg)";
      border = "var(--amber-border)";
      break;
    case "DELETE":
      color = "var(--red)";
      bg = "var(--red-bg)";
      border = "var(--red-border)";
      break;
  }

  return (
    <span
      className="inline-flex px-[7px] py-[2px] rounded-[4px] text-[10px] font-bold font-mono tracking-[0.06em]"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {m}
    </span>
  );
}

// Stat card with glowing cyber top border and animations
function StatCard({
  label,
  value,
  sub,
  accent = "accent",
  delay = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "accent" | "green" | "red" | "amber";
  delay?: number;
}) {
  const topBorderColor =
    accent === "green"
      ? "var(--green)"
      : accent === "red"
      ? "var(--red)"
      : accent === "amber"
      ? "var(--amber)"
      : "var(--accent)";

  const glowShadow =
    accent === "green"
      ? "0 0 15px rgba(16, 185, 129, 0.15)"
      : accent === "red"
      ? "0 0 15px rgba(244, 63, 94, 0.15)"
      : accent === "amber"
      ? "0 0 15px rgba(245, 158, 11, 0.15)"
      : "0 0 15px rgba(108, 71, 255, 0.2)";

  return (
    <div
      className="card-geometric flex-1 min-w-[160px] p-4 relative overflow-hidden stat-card-hover"
      style={{
        background: "var(--bg-surface)",
        border: `1px solid ${topBorderColor}30`,
        borderTop: `3px solid ${topBorderColor}`,
        boxShadow: `var(--shadow-card), ${glowShadow}`,
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="text-[11px] font-semibold tracking-[0.08em] uppercase font-mono mb-1.5"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </div>
      <div
        className="text-[26px] font-extrabold tracking-tight stat-number"
        style={{
          color: "var(--text-primary)",
          animationDelay: `${delay + 100}ms`,
        }}
      >
        {value}
      </div>
      {sub && (
        <div className="text-[11px] mt-1.5" style={{ color: "var(--text-dim)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

type SortKey = "created_at" | "duration_ms" | "status_code" | "method" | "path";
type SortDir = "asc" | "desc";

export function TracesList() {
  const navigate = useNavigate();
  const { instanceId, apiBaseUrl } = useConfig();
  const { simulatedTraces, simulateTrace } = useTraceSimulator();
  const [apiTraces, setApiTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchTraces(isPoll = false) {
      if (!isPoll) setLoading(true);
      try {
        const res = await getTraces({ instanceId, apiBaseUrl });
        if (!cancelled) {
          setApiTraces(res.traces ?? []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled && !isPoll) setLoading(false);
      }
    }

    fetchTraces(false);
    // Poll every 3s so sketch CLI traces appear without manual refresh
    interval = setInterval(() => fetchTraces(true), 3000);
    // Also refetch when tab becomes visible
    const onVis = () => { if (document.visibilityState === 'visible') fetchTraces(true); };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [instanceId, apiBaseUrl]);

  // Combined traces: API traces + simulated traces (avoiding duplicates by trace_id)
  const allTraces = useMemo(() => {
    const map = new Map<string, Trace>();
    apiTraces.forEach((t) => map.set(t.trace_id, t));
    simulatedTraces.forEach((t) => {
      if (!map.has(t.trace_id)) map.set(t.trace_id, t);
    });
    return Array.from(map.values());
  }, [apiTraces, simulatedTraces]);

  const filtered = useMemo(() => {
    let out = [...allTraces];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      out = out.filter((t) => t.trace_id.toLowerCase().includes(needle) || t.path.toLowerCase().includes(needle));
    }
    if (methodFilter !== "all") out = out.filter((t) => t.method.toUpperCase() === methodFilter);
    if (statusFilter !== "all") {
      if (statusFilter === "2xx") out = out.filter((t) => t.status_code >= 200 && t.status_code < 300);
      else if (statusFilter === "4xx") out = out.filter((t) => t.status_code >= 400 && t.status_code < 500);
      else if (statusFilter === "5xx") out = out.filter((t) => t.status_code >= 500);
      else out = out.filter((t) => String(t.status_code) === statusFilter);
    }
    out.sort((a, b) => {
      let va: string | number = (a as unknown as Record<string, string | number>)[sortKey];
      let vb: string | number = (b as unknown as Record<string, string | number>)[sortKey];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return out;
  }, [allTraces, q, methodFilter, statusFilter, sortKey, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [q, methodFilter, statusFilter]);

  const total = filtered.length;
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created_at" || key === "duration_ms" || key === "status_code" ? "desc" : "asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key)
      return <span style={{ color: "var(--text-dim)", fontSize: "10px" }}>↕</span>;
    return (
      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent-text)" }}>
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  }

  const methods = useMemo(() => {
    const s = new Set(allTraces.map((t) => t.method.toUpperCase()));
    return Array.from(s).sort();
  }, [allTraces]);

  const summary = useMemo(() => {
    const errCount = filtered.filter((t) => t.status_code >= 400).length;
    const avg = filtered.length ? Math.round(filtered.reduce((a, t) => a + t.duration_ms, 0) / filtered.length) : 0;
    const errRate = filtered.length ? Math.round((errCount / filtered.length) * 100) : 0;
    return { errCount, avg, errRate };
  }, [filtered]);

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: "8px",
    fontSize: "13px",
    height: "36px",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "Traces" }]} />

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1
            className="text-[26px] font-extrabold tracking-[-0.02em] leading-none mb-1 text-white flex items-center gap-3"
          >
            <span className="heading-geo">Traces Explorer</span>
            <span className="badge-angular badge-angular-accent ml-1">
              Live Feed
            </span>
          </h1>
          <p className="text-[12px] text-slate-400">
            Real-time recorded HTTP requests with microsecond span waterfalls and replay capabilities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick simulator button */}
          <button
            onClick={() => simulateTrace("checkout-500")}
            className="text-[12px] px-3 py-1.5 rounded-[7px] font-semibold transition-all flex items-center gap-1.5 text-white bg-[#1E253A] hover:bg-[#6C47FF] border border-[#262E44] hover:border-[#6C47FF] cursor-pointer"
          >
            <span className="text-[#F59E0B]">⚡</span>
            <span>Simulate Bug</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={() => window.location.reload()}
            className="text-[12px] px-3.5 py-1.5 rounded-[7px] font-semibold transition-all duration-150 flex items-center gap-1.5"
            style={{
              background: "var(--accent)",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 0 15px rgba(108,71,255,0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--accent-hover)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--accent)";
            }}
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Summary Stat Cards ─────────────────────────────────────────── */}
      {allTraces.length > 0 && (
        <div className="flex gap-3 mb-6 flex-wrap">
          <StatCard
            label="Total Captured"
            value={total.toLocaleString()}
            sub={`across ${allTraces.length} recorded`}
            accent="accent"
            delay={0}
          />
          <StatCard
            label="Error Rate"
            value={`${summary.errRate}%`}
            sub={`${summary.errCount} error${summary.errCount !== 1 ? "s" : ""}`}
            accent={summary.errRate > 10 ? "red" : summary.errRate > 0 ? "amber" : "green"}
            delay={80}
          />
          <StatCard
            label="Avg Latency"
            value={`${summary.avg}ms`}
            sub="across active filtered traces"
            accent={summary.avg > 500 ? "red" : summary.avg > 200 ? "amber" : "green"}
            delay={160}
          />
        </div>
      )}

      {/* ── Main Panel ─────────────────────────────────────────────────── */}
      <Panel>
        {/* Filter bar */}
        <div
          className="p-3 flex flex-wrap gap-2.5 items-center"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 flex-1 min-w-[220px] relative">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="absolute left-3 pointer-events-none text-slate-400"
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by trace ID or route (e.g. /api/checkout)…"
              className="w-full pl-9 pr-3 text-white placeholder-slate-500 font-mono"
              style={inputStyle}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-light)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Method select */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 text-slate-300 font-mono"
            style={inputStyle}
          >
            <option value="all">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 text-slate-300 font-mono"
            style={inputStyle}
          >
            <option value="all">All statuses</option>
            <option value="2xx">2xx Success</option>
            <option value="4xx">4xx Client Error</option>
            <option value="5xx">5xx Server Error</option>
          </select>

          {/* Clear filters */}
          {(q || methodFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setQ("");
                setMethodFilter("all");
                setStatusFilter("all");
              }}
              className="text-[12px] px-2.5 py-1 rounded-[6px] font-medium transition-colors duration-150 text-[#A78BFA] hover:bg-[#6C47FF]/20"
            >
              ✕ Clear
            </button>
          )}

          <span className="text-[12px] sm:ml-auto font-mono text-slate-400">
            {total} trace{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table / States ─────────────────────────────────────────── */}
        {loading && allTraces.length === 0 ? (
          <div className="p-0">
            <SkeletonTable rows={8} />
          </div>
        ) : error && allTraces.length === 0 ? (
          <div className="p-4">
            <ErrorState
              title="Unable to connect to local collector"
              description="The collector server is not responding at http://localhost:4000. Start it via `npx @tracesketch/cli start`, or test the dashboard right now using the simulator."
              detail={error}
              action={
                <button
                  onClick={() => simulateTrace("checkout-500")}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-semibold text-white bg-[#6C47FF] hover:bg-[#7D5BFF] cursor-pointer"
                >
                  ⚡ Load Simulated Traces
                </button>
              }
            />
          </div>
        ) : total === 0 && allTraces.length === 0 ? (
          <EmptyState
            icon={<IconEmptyTraces />}
            title="No traces yet — send your first one"
            description="Instrument your backend with the TraceSketch SDK, or click 'Simulate Sample Trace' below to immediately test the flight recorder."
            action={
              <div className="flex items-center gap-3">
                <button
                  onClick={() => simulateTrace("checkout-500")}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-semibold transition-all text-white bg-[#6C47FF] hover:bg-[#7D5BFF] shadow-[0_0_20px_rgba(108,71,255,0.4)] cursor-pointer"
                >
                  ⚡ Simulate Sample Trace
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-[8px] text-[13px] font-medium transition-all text-slate-300 bg-[#161B2B] hover:bg-[#1E253A] border border-[#262E44] cursor-pointer"
                >
                  ↻ Refresh
                </button>
              </div>
            }
          >
            {/* Quickstart curl snippet */}
            <div
              className="text-left max-w-[640px] w-full mx-auto rounded-[10px] p-4 overflow-auto mt-3"
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="text-[10px] tracking-[0.08em] uppercase mb-2 font-mono font-semibold"
                style={{ color: "var(--accent-text)" }}
              >
                Quick start — send a trace via curl
              </div>
              <pre
                className="text-[12px] leading-[20px] whitespace-pre-wrap break-all font-mono"
                style={{ color: "#E2E8F0" }}
              >{`curl -X POST http://localhost:4000/traces \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: ${instanceId}" \\
  -H "x-instance-secret: <your-secret>" \\
  -d '{
    "method": "POST",
    "path": "/api/checkout",
    "status_code": 500,
    "duration_ms": 342,
    "environment": "development"
  }' `}</pre>
            </div>
          </EmptyState>
        ) : total === 0 ? (
          <EmptyState
            icon={<IconNoResults />}
            title="No matching traces"
            description="Nothing matches your current filters. Try broadening the search query or clearing filters."
            action={
              <button
                onClick={() => {
                  setQ("");
                  setMethodFilter("all");
                  setStatusFilter("all");
                }}
                className="px-4 py-1.5 rounded-[6px] text-[13px] font-medium transition-all duration-150 bg-[#161B2B] hover:bg-[#1E253A] border border-[#262E44] text-slate-200 cursor-pointer"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <div className="overflow-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-surface-2)",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {(
                      [
                        { key: "path", label: "Trace ID", sortable: true },
                        { key: "method", label: "Method", sortable: true },
                        { key: null, label: "Path", sortable: false },
                        { key: "status_code", label: "Status", sortable: true },
                        { key: "duration_ms", label: "Duration", sortable: true },
                        { key: null, label: "Environment", sortable: false },
                        { key: "created_at", label: "Recorded", sortable: true },
                      ] as { key: SortKey | null; label: string; sortable: boolean }[]
                    ).map(({ key, label, sortable }) => (
                      <th
                        key={label}
                        className="px-3.5 py-2.5 text-left text-[10px] font-bold font-mono tracking-[0.08em] uppercase whitespace-nowrap text-slate-400"
                      >
                        {sortable && key ? (
                          <button
                            onClick={() => toggleSort(key)}
                            className="flex items-center gap-1.5 transition-colors duration-150 hover:text-white"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: sortKey === key ? "white" : "inherit",
                              font: "inherit",
                              letterSpacing: "inherit",
                              textTransform: "inherit",
                              padding: 0,
                            }}
                          >
                            {label} {sortIndicator(key)}
                          </button>
                        ) : (
                          label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-dim)]">
                  {paged.map((t) => (
                    <tr
                      key={t.trace_id}
                      onClick={() => navigate(`/traces/${encodeURIComponent(t.trace_id)}`)}
                      className="cursor-pointer transition-colors duration-120 hover:bg-white/[0.04] group"
                    >
                      {/* Trace ID */}
                      <td className="px-3.5 py-3 whitespace-nowrap max-w-[180px] truncate">
                        <span
                          className="font-mono text-[12px] font-semibold text-[#A78BFA] group-hover:text-white transition-colors"
                          title={t.trace_id}
                        >
                          {t.trace_id.slice(0, 10)}…
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <MethodBadge method={t.method} />
                      </td>

                      {/* Path */}
                      <td
                        className="px-3.5 py-3 font-mono text-[12px] font-medium text-slate-200 max-w-[280px] truncate group-hover:text-white transition-colors"
                        title={t.path}
                      >
                        {t.path}
                      </td>

                      {/* Status */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <StatusBadge code={t.status_code} />
                      </td>

                      {/* Duration */}
                      <td
                        className="px-3.5 py-3 whitespace-nowrap font-mono text-[12px] font-semibold"
                        style={{
                          color:
                            t.duration_ms > 500
                              ? "var(--red)"
                              : t.duration_ms > 200
                              ? "var(--amber)"
                              : "#38BDF8",
                        }}
                      >
                        {t.duration_ms} ms
                      </td>

                      {/* Environment */}
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] font-medium bg-[#161B2B] border border-[#262E44] text-slate-400">
                          {t.environment}
                        </span>
                      </td>

                      {/* Created */}
                      <td
                        className="px-3.5 py-3 whitespace-nowrap text-[12px] text-slate-400 font-mono"
                        title={new Date(t.created_at > 1e12 ? t.created_at : t.created_at * 1000).toLocaleString()}
                      >
                        {relativeTime(t.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              className="px-3 py-1"
              style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface-2)" }}
            >
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
