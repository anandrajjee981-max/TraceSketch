import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getTraces } from "../api/client";
import type { Trace } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { Pagination } from "../components/Pagination";
import { SkeletonTable } from "../components/Skeleton";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EmptyState, ErrorState, IconEmptyTraces, IconNoResults } from "../components/EmptyState";
import {
  Badge,
  CodeBlock,
  PageHeader,
  SearchInput,
  StatCard,
  TableWrap,
  SortableTh,
} from "../components/ui";
import { absoluteTime, relativeTime } from "../lib/format";
import { useConfig } from "../context/ConfigContext";
import { useTraceSimulator } from "../context/TraceSimulatorContext";

const METHOD_TONE: Record<string, { color: string; bg: string; border: string }> = {
  GET: { color: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" },
  POST: { color: "var(--blue)", bg: "var(--blue-bg)", border: "var(--blue-border)" },
  PUT: { color: "var(--accent-text)", bg: "var(--accent-light)", border: "var(--border-accent)" },
  PATCH: { color: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)" },
  DELETE: { color: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)" },
};

function MethodBadge({ method }: { method: string }) {
  const m = method.toUpperCase();
  const tone = METHOD_TONE[m] ?? { color: "var(--text-secondary)", bg: "var(--bg-surface-2)", border: "var(--border)" };
  return (
    <span
      className="inline-flex px-[7px] py-[2px] rounded-[5px] text-[10px] font-bold font-mono tracking-[0.06em]"
      style={{ color: tone.color, background: tone.bg, border: `1px solid ${tone.border}` }}
    >
      {m}
    </span>
  );
}

function latencyColor(durationMs: number) {
  if (durationMs > 500) return "var(--red)";
  if (durationMs > 200) return "var(--amber)";
  return "var(--blue)";
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

  // Tracks ids already rendered so freshly-polled traces can flash once
  // instead of the whole table re-animating on every 3s poll.
  const seenIds = useRef<Set<string> | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function fetchTraces(isPoll = false) {
      if (!isPoll) setLoading(true);
      try {
        const res = await getTraces({ instanceId, apiBaseUrl });
        if (!cancelled) {
          const next = res.traces ?? [];
          setApiTraces(next);
          setError(null);

          if (seenIds.current) {
            const fresh = new Set(next.filter((t) => !seenIds.current!.has(t.trace_id)).map((t) => t.trace_id));
            if (fresh.size > 0) {
              setFreshIds(fresh);
              if (flashTimer.current) clearTimeout(flashTimer.current);
              flashTimer.current = setTimeout(() => setFreshIds(new Set()), 1800);
            }
          }
          seenIds.current = new Set(next.map((t) => t.trace_id));
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
    const onVis = () => {
      if (document.visibilityState === "visible") fetchTraces(true);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
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

  // Changing a filter must snap back to page one. Done in the change handlers
  // rather than an effect so filtering never causes a double render.
  function updateQ(next: string) {
    setQ(next);
    setPage(1);
  }
  function updateMethod(next: string) {
    setMethodFilter(next);
    setPage(1);
  }
  function updateStatus(next: string) {
    setStatusFilter(next);
    setPage(1);
  }
  function resetFilters() {
    setQ("");
    setMethodFilter("all");
    setStatusFilter("all");
    setPage(1);
  }

  const total = filtered.length;
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created_at" || key === "duration_ms" || key === "status_code" ? "desc" : "asc");
    }
  }

  const methods = useMemo(() => Array.from(new Set(allTraces.map((t) => t.method.toUpperCase()))).sort(), [allTraces]);

  const summary = useMemo(() => {
    const errCount = filtered.filter((t) => t.status_code >= 400).length;
    const avg = filtered.length ? Math.round(filtered.reduce((a, t) => a + t.duration_ms, 0) / filtered.length) : 0;
    const errRate = filtered.length ? Math.round((errCount / filtered.length) * 100) : 0;
    return { errCount, avg, errRate };
  }, [filtered]);

  const filtersActive = Boolean(q) || methodFilter !== "all" || statusFilter !== "all";

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "Traces" }]} />

      <PageHeader
        title="Traces Explorer"
        description="Real-time recorded HTTP requests with microsecond span waterfalls and replay capabilities."
        badge={
          <Badge>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--live)] animate-ping" aria-hidden="true" />
            Live Feed
          </Badge>
        }
        actions={
          <>
            <button onClick={() => simulateTrace("checkout-500")} className="btn-secondary">
              <span aria-hidden="true">⚡</span>
              <span>Simulate Bug</span>
            </button>
            <button onClick={() => window.location.reload()} className="btn-primary">
              <span aria-hidden="true">↻</span>
              <span>Refresh</span>
            </button>
          </>
        }
      />

      {/* ── Featured capabilities ──────── */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          className="p-3.5 rounded-[10px] flex items-center justify-between gap-3 ts-stagger ts-card-interactive"
          style={{ ["--stagger-i" as string]: 1, background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">Relay — Real-Time Pair Debugging</span>
              <Badge>Live</Badge>
            </div>
            <p className="text-[12px] text-[var(--text-dim)] leading-snug">
              Two developers, a shared group code, live chat plus shared trace context in real time.
            </p>
          </div>
          <Link to="/relay" className="btn-secondary shrink-0 no-underline whitespace-nowrap">
            Open Relay →
          </Link>
        </div>

        <div
          className="p-3.5 rounded-[10px] flex items-center justify-between gap-3 ts-stagger"
          style={{ ["--stagger-i" as string]: 2, background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">OpenAPI Documentation Generator</span>
              <span className="ts-chip" style={{ color: "var(--amber-text)", background: "var(--amber-bg)", border: "1px solid var(--amber-border)" }}>
                Coming Soon
              </span>
            </div>
            <p className="text-[12px] text-[var(--text-dim)] leading-snug">
              Observes captured traces to automatically generate OpenAPI/Swagger specs with zero manual writing.
            </p>
          </div>
          <span className="text-[11px] shrink-0 font-medium px-2 py-1 rounded ts-chip-neutral">Upcoming</span>
        </div>
      </div> */}

    
      {allTraces.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <StatCard label="Total Captured" value={total.toLocaleString()} sub={`across ${allTraces.length} recorded`} index={0} />
          <StatCard
            label="Error Rate"
            value={`${summary.errRate}%`}
            sub={`${summary.errCount} error${summary.errCount !== 1 ? "s" : ""}`}
            accent={summary.errRate > 10 ? "red" : summary.errRate > 0 ? "amber" : "green"}
            index={1}
          />
          <StatCard
            label="Avg Latency"
            value={`${summary.avg}ms`}
            sub="across active filtered traces"
            accent={summary.avg > 500 ? "red" : summary.avg > 200 ? "amber" : "green"}
            index={2}
          />
        </div>
      )}

      {/* ── Main panel ──────── */}
      <div className="ts-card">
        <div className="ts-toolbar">
          <SearchInput value={q} onChange={updateQ} placeholder="Filter by trace ID or route (e.g. /api/checkout)…" />

          <select
            value={methodFilter}
            onChange={(e) => updateMethod(e.target.value)}
            aria-label="Filter by HTTP method"
            className="ts-select !w-auto min-w-[124px]"
          >
            <option value="all">All methods</option>
            {methods.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => updateStatus(e.target.value)}
            aria-label="Filter by status code"
            className="ts-select !w-auto min-w-[140px]"
          >
            <option value="all">All statuses</option>
            <option value="2xx">2xx Success</option>
            <option value="4xx">4xx Client Error</option>
            <option value="5xx">5xx Server Error</option>
          </select>

          {filtersActive && (
            <button
              onClick={resetFilters}
              className="btn-ghost"
            >
              ✕ Clear
            </button>
          )}

          <span className="text-[12px] sm:ml-auto ts-numeric" style={{ color: "var(--text-secondary)" }}>
            {total} trace{total !== 1 ? "s" : ""}
          </span>
        </div>

        {loading && allTraces.length === 0 ? (
          <SkeletonTable rows={8} />
        ) : error && allTraces.length === 0 ? (
          <div className="p-4">
            <ErrorState
              title="Unable to connect to local collector"
              description="The collector server is not responding at http://localhost:4000. Start it via `npx @tracesketch/cli start`, or test the dashboard right now using the simulator."
              detail={error}
              action={
                <button onClick={() => simulateTrace("checkout-500")} className="btn-primary">
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
                <button onClick={() => simulateTrace("checkout-500")} className="btn-primary">
                  ⚡ Simulate Sample Trace
                </button>
                <button onClick={() => window.location.reload()} className="btn-secondary">
                  ↻ Refresh
                </button>
              </div>
            }
          >
            <div className="max-w-[640px] w-full mx-auto mt-3">
              <CodeBlock
                label="Quick start — send a trace via curl"
                code={`curl -X POST http://localhost:4000/traces \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: ${instanceId}" \\
  -H "x-instance-secret: <your-secret>" \\
  -d '{
    "method": "POST",
    "path": "/api/checkout",
    "status_code": 500,
    "duration_ms": 342,
    "environment": "development"
  }'`}
              />
            </div>
          </EmptyState>
        ) : total === 0 ? (
          <EmptyState
            icon={<IconNoResults />}
            title="No matching traces"
            description="Nothing matches your current filters. Try broadening the search query or clearing filters."
            action={
              <button
                onClick={resetFilters}
                className="btn-secondary"
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <TableWrap>
              <table className="ts-table ts-table-clickable">
                <thead>
                  <tr>
                    <SortableTh label="Trace ID" column="path" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                    <SortableTh label="Method" column="method" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                    <th scope="col">Path</th>
                    <SortableTh label="Status" column="status_code" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                    <SortableTh label="Duration" column="duration_ms" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                    <th scope="col">Environment</th>
                    <SortableTh label="Recorded" column="created_at" activeKey={sortKey} dir={sortDir} onToggle={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {paged.map((t, i) => (
                    <tr
                      key={t.trace_id}
                      onClick={() => navigate(`/traces/${encodeURIComponent(t.trace_id)}`)}
                      className={`group ts-stagger ${freshIds.has(t.trace_id) ? "ts-flash" : ""}`}
                      style={{ ["--stagger-i" as string]: Math.min(i, 10) }}
                    >
                      <td className="whitespace-nowrap max-w-[180px]">
                        <span className="ts-mono text-[12px] font-semibold ts-truncate inline-block max-w-[170px] align-bottom transition-colors group-hover:text-[var(--text-primary)] text-[var(--accent-text)]" title={t.trace_id}>
                          {t.trace_id.slice(0, 10)}…
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <MethodBadge method={t.method} />
                      </td>
                      <td className="ts-mono text-[12px] font-medium max-w-[280px] truncate text-[var(--text-secondary)]" title={t.path}>
                        {t.path}
                      </td>
                      <td className="whitespace-nowrap">
                        <StatusBadge code={t.status_code} />
                      </td>
                      <td
                        className="whitespace-nowrap ts-mono text-[12px] font-semibold ts-numeric"
                        style={{ color: latencyColor(t.duration_ms) }}
                      >
                        {t.duration_ms} ms
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="ts-code">{t.environment}</span>
                      </td>
                      <td className="whitespace-nowrap text-[12px] text-[var(--text-dim)] ts-mono ts-numeric" title={absoluteTime(t.created_at)}>
                        {relativeTime(t.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>

            <div className="ts-toolbar-footer">
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
