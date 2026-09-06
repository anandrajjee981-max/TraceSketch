import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTrace, getTimeline } from "../api/client";
import type { Trace, TraceEvent } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { SkeletonDetail } from "../components/Skeleton";
import { Timeline } from "../components/Timeline";
import { Panel } from "../components/Panel";
import { ErrorState, EmptyState } from "../components/EmptyState";
import { useConfig } from "../context/ConfigContext";

export function TraceDetail() {
  const { traceId } = useParams<{ traceId: string }>();
  const { instanceId, apiBaseUrl } = useConfig();
  const decodedId = traceId ? decodeURIComponent(traceId) : "";
  const [trace, setTrace] = useState<Trace | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [loadingTrace, setLoadingTrace] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorTrace, setErrorTrace] = useState<string | null>(null);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [replayToast, setReplayToast] = useState(false);

  useEffect(() => {
    if (!decodedId) return;
    let cancelled = false;
    setLoadingTrace(true);
    getTrace(decodedId, { instanceId, apiBaseUrl })
      .then((res) => {
        if (!cancelled) {
          setTrace(res.trace);
          setErrorTrace(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setErrorTrace(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingTrace(false);
      });

    setLoadingEvents(true);
    getTimeline(decodedId, { instanceId, apiBaseUrl })
      .then((res) => {
        if (!cancelled) {
          setEvents(res.events ?? []);
          setErrorEvents(null);
        }
      })
      .catch((e) => {
        if (!cancelled) setErrorEvents(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [decodedId, instanceId, apiBaseUrl]);

  if (loadingTrace) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Traces", to: "/" }, { label: decodedId.slice(0, 12) + "…" }]} />
        <SkeletonDetail />
      </div>
    );
  }

  if (errorTrace) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Traces", to: "/" }, { label: decodedId.slice(0, 12) + "…" }]} />
        <ErrorState
          title="Unable to load trace"
          description="We couldn’t retrieve this trace from the collector."
          detail={errorTrace}
          action={
            <button
              onClick={() => window.location.reload()}
              className="px-3.5 py-1.5 rounded-[5px] text-[13px] font-semibold"
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
    );
  }

  if (!trace) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Traces", to: "/" }, { label: decodedId.slice(0, 12) + "…" }]} />
        <Panel>
          <EmptyState title="Trace not found" description="This trace ID doesn’t exist or has expired." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Traces", to: "/" }, { label: trace.trace_id.slice(0, 12) + "…" }]} />

      {/* Header panel */}
      <Panel>
        <div className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span
                  className="inline-flex px-2 py-0.5 rounded-[4px] text-[11px] font-bold tracking-[0.04em]"
                  style={{
                    background: "var(--accent-light)",
                    color: "var(--accent-text)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {trace.method.toUpperCase()}
                </span>
                <span className="font-mono text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {trace.path}
                </span>
                <StatusBadge code={trace.status_code} />
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "var(--text-dim)" }}>
                  Trace ID
                </span>
                <code
                  className="text-[12px] font-mono px-2 py-0.5 rounded-[4px] break-all"
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-dim)",
                    color: "var(--accent-text)",
                  }}
                >
                  {trace.trace_id}
                </code>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px]"
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  <span style={{ color: "var(--text-dim)" }}>Duration</span>
                  <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                    {trace.duration_ms} ms
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px]"
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  <span style={{ color: "var(--text-dim)" }}>Environment</span>
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {trace.environment}
                  </span>
                </span>
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px]"
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border-dim)",
                  }}
                >
                  <span style={{ color: "var(--text-dim)" }}>Created</span>
                  <span className="font-mono" style={{ color: "var(--text-primary)" }}>
                    {new Date(trace.created_at > 1e12 ? trace.created_at : trace.created_at * 1000).toLocaleString()}
                  </span>
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setReplayToast(true);
                setTimeout(() => setReplayToast(false), 2500);
              }}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-[5px] text-[13px] font-semibold transition-colors"
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
              ▶ Replay
            </button>
          </div>

          {replayToast && (
            <div
              className="mt-3 text-[12px] rounded-[5px] px-3 py-2 font-medium"
              style={{
                background: "var(--green-bg)",
                border: "1px solid var(--green-border)",
                color: "var(--green)",
              }}
            >
              Replay is coming soon — this is a placeholder.
            </div>
          )}
        </div>
      </Panel>

      {/* Timeline */}
      {loadingEvents ? (
        <Panel>
          <div className="p-4 space-y-3">
            <div className="h-[18px] rounded w-[160px] skeleton-shimmer" />
            <div className="h-[120px] rounded skeleton-shimmer" />
          </div>
        </Panel>
      ) : errorEvents ? (
        <ErrorState title="Unable to load timeline" description="We couldn’t load events for this trace." detail={errorEvents} />
      ) : (
        <Timeline events={events} />
      )}

      {/* Events table */}
      <Panel hoverShadow={false} className="overflow-hidden">
        <div
          className="px-3.5 py-2.5 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--border-dim)" }}
        >
          <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Events
          </span>
          <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            {events.length} event{events.length !== 1 ? "s" : ""}
          </span>
        </div>

        {loadingEvents ? (
          <div className="p-4 text-[13px]" style={{ color: "var(--text-dim)" }}>
            Loading events…
          </div>
        ) : events.length === 0 ? (
          <div className="p-0">
            <EmptyState title="No events" description="No events were recorded for this trace." />
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr
                  className="text-left text-[10px] font-bold tracking-[0.08em] uppercase"
                  style={{
                    background: "var(--bg-surface-2)",
                    borderBottom: "1px solid var(--border)",
                    color: "var(--text-dim)",
                  }}
                >
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Operation</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Event Type</th>
                </tr>
              </thead>
              <tbody>
                {[...events]
                  .sort((a, b) => a.created_at - b.created_at)
                  .map((ev, idx) => (
                    <tr
                      key={ev.id}
                      className="transition-colors"
                      style={{
                        borderBottom: idx < events.length - 1 ? "1px solid var(--border-dim)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-surface-2)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td className="px-3 py-[9px] font-mono text-[12px]" style={{ color: "var(--text-primary)" }}>
                        {ev.service}
                      </td>
                      <td className="px-3 py-[9px]" style={{ color: "var(--text-secondary)" }}>
                        {ev.operation}
                      </td>
                      <td className="px-3 py-[9px] font-mono text-[12px]" style={{ color: "var(--text-primary)" }}>
                        {ev.duration_ms} ms
                      </td>
                      <td className="px-3 py-[9px]">
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded-[3px] text-[11px] font-medium"
                          style={{
                            background: "var(--bg-surface-2)",
                            border: "1px solid var(--border-dim)",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {ev.event_type}
                        </span>
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
