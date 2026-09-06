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

// Method badge with earthy colors matching warm theme
function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  let color: string;
  let bg: string;
  let border: string;

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
      border = "var(--border)";
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
    default:
      color = "var(--text-secondary)";
      bg = "var(--bg-surface-2)";
      border = "var(--border)";
  }

  return (
    <span
      className="inline-flex px-[6px] py-[2px] rounded-[3px] text-[10px] font-bold tracking-[0.06em]"
      style={{ color, background: bg, border: `1px solid ${border}` }}
    >
      {m}
    </span>
  );
}

// Stat card with warm, clean editorial aesthetic
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
    accent === "green" ? "var(--green)" :
    accent === "red"   ? "var(--red)" :
    accent === "amber" ? "var(--amber)" :
    "var(--accent)";

  return (
    <div
      className="rounded-[8px] flex-1 min-w-[140px] p-4 relative overflow-hidden"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderTop: `2px solid ${topBorderColor}`,
        boxShadow: "var(--shadow-card)",
        animationDelay: `${delay}ms`,
      }}
    >
      <div
        className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-1.5"
        style={{ color: "var(--text-dim)" }}
      >
        {label}
      </div>
      <div
        className="text-[26px] font-bold leading-none stat-number"
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
  const [traces, setTraces] = useState<Trace[]>([]);
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
    setLoading(true);
    getTraces({ instanceId, apiBaseUrl })
      .then((res) => {
        if (!cancelled) {
          setTraces(res.traces ?? []);
          setError(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId, apiBaseUrl]);

  const filtered = useMemo(() => {
    let out = [...traces];
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
  }, [traces, q, methodFilter, statusFilter, sortKey, sortDir]);

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
      <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--accent)" }}>
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  }

  const methods = useMemo(() => {
    const s = new Set(traces.map((t) => t.method.toUpperCase()));
    return Array.from(s).sort();
  }, [traces]);

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
    borderRadius: "6px",
    fontSize: "13px",
    height: "32px",
    outline: "none",
    transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "Traces" }]} />

      {/* Page title + action */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <h1
          className="text-[24px] font-bold tracking-[-0.02em] leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          Traces
        </h1>
        <button
          onClick={() => window.location.reload()}
          className="text-[13px] px-3.5 py-1.5 rounded-[6px] font-semibold transition-all duration-150"
          style={{
            background: "var(--accent)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            boxShadow: "var(--shadow-sm)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--accent)";
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Summary Stat Cards ─────────────────────────────────────────── */}
      {!loading && !error && traces.length > 0 && (
        <div className="flex gap-3 mb-5 flex-wrap">
          <StatCard
            label="Total Traces"
            value={total.toLocaleString()}
            sub={`across ${traces.length} ingested`}
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
            label="Avg Duration"
            value={`${summary.avg}ms`}
            sub="across filtered traces"
            accent={summary.avg > 500 ? "red" : summary.avg > 200 ? "amber" : "green"}
            delay={160}
          />
        </div>
      )}

      {/* ── Main Panel ─────────────────────────────────────────────────── */}
      <Panel>
        {/* Filter bar */}
        <div
          className="p-3 flex flex-wrap gap-2 items-center"
          style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-surface)" }}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 flex-1 min-w-[220px] relative">
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none"
              className="absolute left-2.5 pointer-events-none"
              style={{ color: "var(--text-dim)" }}
            >
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by trace ID or path…"
              className="w-full pl-8 pr-3"
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
            className="px-2"
            style={inputStyle}
          >
            <option value="all">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Status select */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2"
            style={inputStyle}
          >
            <option value="all">All statuses</option>
            <option value="2xx">2xx Success</option>
            <option value="4xx">4xx Client error</option>
            <option value="5xx">5xx Server error</option>
          </select>

          {/* Clear filters */}
          {(q || methodFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setQ("");
                setMethodFilter("all");
                setStatusFilter("all");
              }}
              className="text-[12px] px-2 font-medium transition-colors duration-150"
              style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--accent)";
              }}
            >
              ✕ Clear
            </button>
          )}

          <span className="text-[12px] sm:ml-auto" style={{ color: "var(--text-dim)" }}>
            {total} result{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ── Table / States ─────────────────────────────────────────── */}
        {loading ? (
          <div className="p-0">
            <SkeletonTable rows={8} />
          </div>
        ) : error ? (
          <div className="p-4">
            <ErrorState
              title="Unable to load traces"
              description="We couldn't reach the collector. Check that it's running and the instance header is accepted."
              detail={error}
              action={
                <button
                  onClick={() => window.location.reload()}
                  className="px-3.5 py-1.5 rounded-[5px] text-[13px] font-semibold transition-all duration-150"
                  style={{
                    background: "var(--red-bg)",
                    border: "1px solid var(--red-border)",
                    color: "var(--red)",
                    cursor: "pointer",
                  }}
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : total === 0 && traces.length === 0 ? (
          <EmptyState
            icon={<IconEmptyTraces />}
            title="No traces yet — send your first one"
            description="Instrument your app with the SDK, or send a raw HTTP trace directly to the collector at http://localhost:4000."
            action={
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-1.5 rounded-[5px] text-[13px] font-semibold transition-all duration-150"
                style={{
                  background: "var(--accent)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "var(--shadow-sm)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--accent)";
                }}
              >
                ↻ Refresh
              </button>
            }
          >
            {/* Example curl block */}
            <div
              className="text-left max-w-[640px] w-full mx-auto rounded-[8px] p-4 overflow-auto mt-2"
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="text-[10px] tracking-[0.08em] uppercase mb-2 font-semibold" style={{ color: "var(--text-dim)" }}>
                Quick start — send a trace via curl
              </div>
              <pre
                className="text-[12px] leading-[20px] whitespace-pre-wrap break-all"
                style={{ fontFamily: "JetBrains Mono, monospace", color: "var(--accent-text)" }}
              >{`curl -X POST http://localhost:4000/traces \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: ${instanceId}" \\
  -H "x-instance-secret: <your-secret>" \\
  -d '{
    "method": "GET",
    "path": "/api/users",
    "status_code": 200,
    "duration_ms": 42,
    "environment": "development"
  }' `}</pre>
            </div>
            <div className="text-[12px] mt-4" style={{ color: "var(--text-dim)" }}>
              Or ingest via your SDK — then click Refresh.{" "}
              <span className="font-mono font-medium" style={{ color: "var(--text-secondary)" }}>GET /traces</span> returns{" "}
              <span className="font-mono font-medium" style={{ color: "var(--text-secondary)" }}>{`{ traces: [...] }`}</span>.
            </div>
          </EmptyState>
        ) : total === 0 ? (
          <EmptyState
            icon={<IconNoResults />}
            title="No matching traces"
            description="Nothing matches your current filters. Try broadening the search or clearing filters."
            action={
              <button
                onClick={() => {
                  setQ("");
                  setMethodFilter("all");
                  setStatusFilter("all");
                }}
                className="px-4 py-1.5 rounded-[5px] text-[13px] font-medium transition-all duration-150"
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
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
                        { key: "path", label: "Trace ID / Path", sortable: true },
                        { key: "method", label: "Method", sortable: true },
                        { key: null, label: "Path", sortable: false },
                        { key: "status_code", label: "Status", sortable: true },
                        { key: "duration_ms", label: "Duration", sortable: true },
                        { key: null, label: "Environment", sortable: false },
                        { key: "created_at", label: "Created", sortable: true },
                      ] as { key: SortKey | null; label: string; sortable: boolean }[]
                    ).map(({ key, label, sortable }) => (
                      <th
                        key={label}
                        className="px-3 py-2 text-left text-[10px] font-bold tracking-[0.08em] uppercase whitespace-nowrap"
                        style={{ color: "var(--text-dim)" }}
                      >
                        {sortable && key ? (
                          <button
                            onClick={() => toggleSort(key)}
                            className="flex items-center gap-1.5 transition-colors duration-150"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: sortKey === key ? "var(--text-primary)" : "var(--text-dim)",
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
                <tbody>
                  {paged.map((t, idx) => (
                    <tr
                      key={t.trace_id}
                      onClick={() => navigate(`/traces/${encodeURIComponent(t.trace_id)}`)}
                      className="cursor-pointer transition-colors duration-120"
                      style={{
                        borderBottom: idx < paged.length - 1 ? "1px solid var(--border-dim)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-surface-2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {/* Trace ID */}
                      <td className="px-3 py-[9px] whitespace-nowrap max-w-[180px] truncate">
                        <span
                          className="font-mono text-[12px] font-semibold"
                          style={{ color: "var(--accent-text)" }}
                          title={t.trace_id}
                        >
                          {t.trace_id.slice(0, 8)}…
                          <span style={{ opacity: 0.6 }}>{t.trace_id.slice(-4)}</span>
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-3 py-[9px] whitespace-nowrap">
                        <MethodBadge method={t.method} />
                      </td>

                      {/* Path */}
                      <td
                        className="px-3 py-[9px] font-mono text-[12px] max-w-[260px] truncate"
                        style={{ color: "var(--text-secondary)" }}
                        title={t.path}
                      >
                        {t.path}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-[9px] whitespace-nowrap">
                        <StatusBadge code={t.status_code} />
                      </td>

                      {/* Duration */}
                      <td
                        className="px-3 py-[9px] whitespace-nowrap font-mono text-[12px]"
                        style={{
                          color:
                            t.duration_ms > 500
                              ? "var(--red)"
                              : t.duration_ms > 200
                              ? "var(--amber)"
                              : "var(--text-secondary)",
                        }}
                      >
                        {t.duration_ms} ms
                      </td>

                      {/* Environment */}
                      <td className="px-3 py-[9px] whitespace-nowrap">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded-[3px] font-medium"
                          style={{
                            color: "var(--text-dim)",
                            background: "var(--bg-surface-2)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {t.environment}
                        </span>
                      </td>

                      {/* Created */}
                      <td
                        className="px-3 py-[9px] whitespace-nowrap text-[12px]"
                        style={{ color: "var(--text-dim)" }}
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
              className="px-3"
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
