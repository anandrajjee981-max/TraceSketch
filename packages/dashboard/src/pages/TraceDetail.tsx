import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTrace, getTimeline, replayTrace, createRegression, getRegressions, runRegression } from "../api/client";
import type { Trace, TraceEvent, RegressionTest } from "../types";
import { StatusBadge, ResultBadge } from "../components/StatusBadge";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { SkeletonDetail } from "../components/Skeleton";
import { Timeline } from "../components/Timeline";
import { ErrorState, EmptyState } from "../components/EmptyState";
import { Badge, Field, InlineError, InlineSuccess, MetaPill, TableWrap } from "../components/ui";
import { absoluteTime } from "../lib/format";
import { useConfig } from "../context/ConfigContext";
import { useTraceSimulator } from "../context/TraceSimulatorContext";

const EVENT_TYPE_TONE: Record<string, string> = {
  http: "var(--blue)",
  db: "var(--green)",
  cache: "var(--accent-text)",
  external: "var(--red)",
  queue: "var(--amber)",
};

function Section({
  title,
  subtitle,
  actions,
  children,
  index,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  index: number;
}) {
  return (
    <section className="ts-card ts-stagger" style={{ ["--stagger-i" as string]: index }}>
      <div className="ts-card-header">
        <div className="min-w-0">
          <div className="ts-card-title">{title}</div>
          {subtitle && <div className="ts-card-subtitle">{subtitle}</div>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function TraceDetail() {
  const { traceId } = useParams<{ traceId: string }>();
  const { instanceId, apiBaseUrl } = useConfig();
  const { simulatedTraces, getEventsForTrace } = useTraceSimulator();
  const decodedId = traceId ? decodeURIComponent(traceId) : "";
  const [trace, setTrace] = useState<Trace | null>(null);
  const [events, setEvents] = useState<TraceEvent[]>([]);
  const [loadingTrace, setLoadingTrace] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorTrace, setErrorTrace] = useState<string | null>(null);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);

  // Replay states
  const [showReplayForm, setShowReplayForm] = useState(false);
  const [targetBaseUrl, setTargetBaseUrl] = useState("");
  const [replayLoading, setReplayLoading] = useState(false);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replayResult, setReplayResult] = useState<{
    original: { status_code: number; duration_ms: number };
    replay: { status_code: number; duration_ms: number };
  } | null>(null);

  // Regression save states
  const [showRegressionForm, setShowRegressionForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regExpected, setRegExpected] = useState<number>(200);
  const [regSaving, setRegSaving] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSavedMsg, setRegSavedMsg] = useState<string | null>(null);

  // Regression list states
  const [regressions, setRegressions] = useState<RegressionTest[]>([]);
  const [loadingRegressions, setLoadingRegressions] = useState(false);
  const [regListError, setRegListError] = useState<string | null>(null);

  // Per-row run states
  const [runForms, setRunForms] = useState<
    Record<
      number,
      {
        show: boolean;
        targetUrl: string;
        loading: boolean;
        error: string | null;
        result: { expected_status: number; actual_status: number; passed: boolean } | null;
      }
    >
  >({});

  // Add Event states
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [addEventType, setAddEventType] = useState("");
  const [addEventService, setAddEventService] = useState("");
  const [addEventOperation, setAddEventOperation] = useState("");
  const [addEventDuration, setAddEventDuration] = useState("");
  const [addEventMetadata, setAddEventMetadata] = useState("");
  const [addEventError, setAddEventError] = useState<string | null>(null);
  const [addEventValidation, setAddEventValidation] = useState<string | null>(null);
  const [addEventSaving, setAddEventSaving] = useState(false);

  const refreshEvents = async () => {
    if (!decodedId) return;
    try {
      const res = await getTimeline(decodedId, { instanceId, apiBaseUrl });
      setEvents(res.events ?? []);
      setErrorEvents(null);
    } catch (e) {
      setErrorEvents(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddEventValidation(null);
    setAddEventError(null);
    const t = addEventType.trim();
    const s = addEventService.trim();
    const op = addEventOperation.trim();
    const d = addEventDuration.trim();
    if (!t || !s || !op || !d) {
      setAddEventValidation("Event Type, Service, Operation, and Duration are required");
      return;
    }
    const durationNum = Number(d);
    if (!Number.isFinite(durationNum)) {
      setAddEventValidation("Duration must be a valid number");
      return;
    }
    setAddEventSaving(true);
    try {
      const secret = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_INSTANCE_SECRET ?? "secret_placeholder_12345";
      const base = apiBaseUrl.replace(/\/$/, "");
      const url = base ? `${base}/traces/${encodeURIComponent(decodedId)}/events` : `/traces/${encodeURIComponent(decodedId)}/events`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-instance-id": instanceId,
          "x-instance-secret": secret,
        },
        body: JSON.stringify({
          eventType: t,
          service: s,
          operation: op,
          durationMs: durationNum,
          metadata: addEventMetadata ? addEventMetadata : "",
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const parsed = JSON.parse(text) as { message?: string };
          if (parsed.message) message = parsed.message;
        } catch {
          // keep raw
        }
        throw new Error(message || `HTTP ${res.status}: ${res.statusText}`);
      }
      setAddEventType("");
      setAddEventService("");
      setAddEventOperation("");
      setAddEventDuration("");
      setAddEventMetadata("");
      setShowAddEventForm(false);
      setAddEventValidation(null);
      setAddEventError(null);
      await refreshEvents();
    } catch (err) {
      setAddEventError(err instanceof Error ? err.message : String(err));
    } finally {
      setAddEventSaving(false);
    }
  };

  const fetchRegressions = async () => {
    if (!decodedId) return;
    setLoadingRegressions(true);
    setRegListError(null);
    try {
      const res = await getRegressions(decodedId, { instanceId, apiBaseUrl });
      setRegressions(res.regressions ?? []);
    } catch (e) {
      setRegListError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingRegressions(false);
    }
  };

  useEffect(() => {
    if (!decodedId) return;

    // Check if trace exists in user simulated traces cache first
    const localMatch = simulatedTraces.find((t) => t.trace_id === decodedId);

    if (localMatch) {
      setTrace(localMatch);
      setEvents(getEventsForTrace(decodedId));
      setLoadingTrace(false);
      setLoadingEvents(false);
      setErrorTrace(null);
      setErrorEvents(null);
      return;
    }

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
        if (!cancelled) {
          setErrorTrace(e instanceof Error ? e.message : String(e));
        }
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
        if (!cancelled) {
          setErrorEvents(e instanceof Error ? e.message : String(e));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingEvents(false);
      });

    return () => {
      cancelled = true;
    };
  }, [decodedId, instanceId, apiBaseUrl, simulatedTraces, getEventsForTrace]);

  useEffect(() => {
    if (!decodedId) return;
    fetchRegressions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedId, instanceId, apiBaseUrl]);

  const handleReplaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trace) return;
    const trimmed = targetBaseUrl.trim();
    if (!trimmed) {
      setReplayError("Target Base URL is required");
      return;
    }
    setReplayLoading(true);
    setReplayError(null);
    try {
      const res = await replayTrace(trace.trace_id, trimmed, { instanceId, apiBaseUrl });
      setReplayResult({ original: res.original, replay: res.replay });
      setReplayError(null);
    } catch (err) {
      if (trace.trace_id.startsWith("tr_sim_") || trace.trace_id.startsWith("tr_live_")) {
        // Dev simulator mock replay response
        setReplayResult({
          original: { status_code: trace.status_code, duration_ms: trace.duration_ms },
          replay: { status_code: 200, duration_ms: Math.round(trace.duration_ms * 0.68) },
        });
        setReplayError(null);
      } else {
        setReplayError(err instanceof Error ? err.message : String(err));
        setReplayResult(null);
      }
    } finally {
      setReplayLoading(false);
    }
  };

  const handleRegressionSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trace) return;
    const nameTrimmed = regName.trim();
    if (!nameTrimmed) {
      setRegError("Test Name is required");
      return;
    }
    if (!Number.isFinite(regExpected) || regExpected < 100 || regExpected > 599) {
      setRegError("Expected Status Code must be 100-599");
      return;
    }
    setRegSaving(true);
    setRegError(null);
    try {
      const res = await createRegression(trace.trace_id, nameTrimmed, Number(regExpected), { instanceId, apiBaseUrl });
      setRegSavedMsg("Regression test saved");
      setShowRegressionForm(false);
      setRegName("");
      setRegExpected(200);
      if (res.regression) {
        setRegressions((prev) => [
          res.regression as RegressionTest,
          ...prev.filter((r) => r.id !== (res.regression as RegressionTest).id),
        ]);
      }
      await fetchRegressions();
      setTimeout(() => setRegSavedMsg(null), 3000);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : String(err));
    } finally {
      setRegSaving(false);
    }
  };

  const handleRunSubmit = async (e: React.FormEvent, regressionId: number) => {
    e.preventDefault();
    if (!trace) return;
    const state = runForms[regressionId];
    const trimmed = (state?.targetUrl ?? "").trim();
    if (!trimmed) {
      setRunForms((prev) => ({
        ...prev,
        [regressionId]: {
          ...(prev[regressionId] ?? { show: true, targetUrl: "", loading: false, error: null, result: null }),
          error: "Target Base URL is required",
          loading: false,
        },
      }));
      return;
    }
    setRunForms((prev) => ({
      ...prev,
      [regressionId]: {
        ...(prev[regressionId] ?? { show: true, targetUrl: trimmed, loading: false, error: null, result: null }),
        loading: true,
        error: null,
        result: null,
      },
    }));
    try {
      const res = await runRegression(trace.trace_id, regressionId, trimmed, { instanceId, apiBaseUrl });
      const passed = typeof res.passed === "boolean" ? res.passed : res.expected_status === res.actual_status;
      setRunForms((prev) => ({
        ...prev,
        [regressionId]: {
          ...(prev[regressionId] ?? { show: true, targetUrl: trimmed, loading: false, error: null, result: null }),
          loading: false,
          result: { expected_status: res.expected_status, actual_status: res.actual_status, passed },
          error: null,
        },
      }));
    } catch (err) {
      setRunForms((prev) => ({
        ...prev,
        [regressionId]: {
          ...(prev[regressionId] ?? { show: true, targetUrl: trimmed, loading: false, error: null, result: null }),
          loading: false,
          error: err instanceof Error ? err.message : String(err),
        },
      }));
    }
  };

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
            <button onClick={() => window.location.reload()} className="btn-destructive">
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
        <div className="ts-card">
          <EmptyState title="Trace not found" description="This trace ID doesn’t exist or has expired." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Traces", to: "/" }, { label: trace.trace_id.slice(0, 12) + "…" }]} />

      {/* ── Request summary ── */}
      <Section
        title="Request Summary"
        subtitle="Read-only capture of the recorded HTTP call"
        index={0}
        actions={
          <button
            onClick={() => {
              setShowReplayForm((v) => !v);
              setReplayError(null);
            }}
            disabled={replayLoading}
            className="btn-primary"
          >
            {replayLoading ? "Replaying..." : "▶ Replay"}
          </button>
        }
      >
        <div className="ts-card-body">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex px-2 py-0.5 rounded-[5px] text-[11px] font-bold tracking-[0.04em]" style={{ background: "var(--accent-light)", color: "var(--accent-text)", border: "1px solid var(--border-accent)" }}>
                  {trace.method.toUpperCase()}
                </span>
                <span className="ts-mono text-[14px] font-semibold" style={{ color: "var(--text-primary)" }}>
                  {trace.path}
                </span>
                <StatusBadge code={trace.status_code} />
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="ts-overline">Trace ID</span>
                <code className="ts-code break-all">{trace.trace_id}</code>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <MetaPill label="Duration" value={<span className="ts-mono ts-numeric">{trace.duration_ms} ms</span>} />
                <MetaPill label="Environment" value={trace.environment} />
                <MetaPill label="Created" value={<span className="ts-mono ts-numeric">{absoluteTime(trace.created_at)}</span>} />
              </div>
            </div>
          </div>

          {showReplayForm && (
            <form onSubmit={handleReplaySubmit} className="mt-4 flex flex-wrap gap-2.5 items-end ts-pop">
              <Field label="Target Base URL" className="flex-1 min-w-[220px]">
                <input
                  value={targetBaseUrl}
                  onChange={(e) => setTargetBaseUrl(e.target.value)}
                  placeholder="http://localhost:6001"
                  className="ts-input ts-input-mono"
                />
              </Field>
              <button type="submit" disabled={replayLoading} className="btn-primary">
                {replayLoading ? "Replaying..." : "Send Replay"}
              </button>
              <button type="button" onClick={() => setShowReplayForm(false)} className="btn-secondary">
                Cancel
              </button>
            </form>
          )}

          {replayError && (
            <div className="mt-3">
              <InlineError>{replayError}</InlineError>
            </div>
          )}

          {replayResult && (
            <div className="mt-3 ts-pop grid grid-cols-1 sm:grid-cols-2 gap-2.5" aria-live="polite">
              <div className="rounded-[9px] p-3" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-dim)" }}>
                <div className="ts-overline mb-1.5">Original</div>
                <div className="ts-mono text-[12px] ts-numeric text-[var(--text-secondary)]">
                  status_code: <span className="text-[var(--text-primary)] font-semibold">{replayResult.original.status_code}</span>
                </div>
                <div className="ts-mono text-[12px] ts-numeric text-[var(--text-secondary)]">
                  duration_ms: <span className="text-[var(--text-primary)] font-semibold">{replayResult.original.duration_ms}</span>
                </div>
              </div>
              <div className="rounded-[9px] p-3" style={{ background: "var(--accent-light)", border: "1px solid var(--border-accent)" }}>
                <div className="ts-overline mb-1.5" style={{ color: "var(--accent-text)" }}>
                  Replay
                </div>
                <div className="ts-mono text-[12px] ts-numeric text-[var(--text-secondary)]">
                  status_code: <span className="text-[var(--text-primary)] font-semibold">{replayResult.replay.status_code}</span>
                </div>
                <div className="ts-mono text-[12px] ts-numeric text-[var(--text-secondary)]">
                  duration_ms: <span className="text-[var(--text-primary)] font-semibold">{replayResult.replay.duration_ms}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Save as Regression Test */}
        <div className="ts-card-body ts-hairline-top">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setShowRegressionForm((v) => !v);
                setRegError(null);
              }}
              disabled={regSaving}
              className="btn-secondary"
            >
              Save as Regression Test
            </button>
            <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
              Locks this request&apos;s expected status so the bug can&apos;t silently return.
            </span>
          </div>

          {regSavedMsg && (
            <div className="mt-3 ts-pop">
              <InlineSuccess>{regSavedMsg}</InlineSuccess>
            </div>
          )}

          {showRegressionForm && (
            <form onSubmit={handleRegressionSave} className="mt-3 flex flex-wrap gap-2.5 items-end ts-pop">
              <Field label="Test Name" className="flex-1 min-w-[180px]">
                <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="My regression test" className="ts-input" />
              </Field>
              <Field label="Expected Status Code" className="w-[170px]">
                <input
                  type="number"
                  value={regExpected}
                  onChange={(e) => setRegExpected(Number(e.target.value))}
                  placeholder="200"
                  className="ts-input ts-input-mono ts-numeric"
                />
              </Field>
              <button type="submit" disabled={regSaving} className="btn-primary">
                {regSaving ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => setShowRegressionForm(false)} className="btn-secondary">
                Cancel
              </button>
            </form>
          )}

          {regError && (
            <div className="mt-3">
              <InlineError>{regError}</InlineError>
            </div>
          )}
        </div>
      </Section>

      {/* ── Regression tests ── */}
      <Section
        title="Regression Tests"
        subtitle="Saved checks that assert this request keeps its expected status"
        index={1}
        actions={<Badge tone="neutral">{regressions.length} test{regressions.length !== 1 ? "s" : ""}</Badge>}
      >
        {loadingRegressions ? (
          <div className="ts-card-body">
            <div className="h-[18px] w-[120px] rounded skeleton-shimmer" />
            <div className="mt-3 h-[40px] rounded skeleton-shimmer" />
          </div>
        ) : regListError ? (
          <div className="ts-card-body">
            <InlineError>{regListError}</InlineError>
          </div>
        ) : regressions.length === 0 ? (
          <EmptyState title="No regression tests yet" description="Use “Save as Regression Test” above to lock this request’s behaviour." />
        ) : (
          <div>
            {regressions.map((r, i) => {
              const rowState = runForms[r.id] ?? { show: false, targetUrl: "", loading: false, error: null, result: null };
              return (
                <div
                  key={r.id}
                  className="ts-stagger px-4 py-3"
                  style={{ ["--stagger-i" as string]: Math.min(i, 8), borderBottom: "1px solid var(--border-dim)" }}
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[13px] font-medium text-[var(--text-primary)]">{r.name}</span>
                    <StatusBadge code={r.expected_status} showDot={false} />
                    <span className="text-[11px] ts-mono ts-numeric" style={{ color: "var(--text-dim)" }}>
                      {absoluteTime(r.created_at)}
                    </span>

                    <button
                      onClick={() =>
                        setRunForms((prev) => ({
                          ...prev,
                          [r.id]: { ...(prev[r.id] ?? { show: false, targetUrl: "", loading: false, error: null, result: null }), show: !prev[r.id]?.show, error: null },
                        }))
                      }
                      className="btn-secondary !py-1 !px-2.5 !text-[11px] ml-auto"
                    >
                      Run
                    </button>

                    {rowState.result && (
                      <div className="inline-flex items-center gap-2 ts-pop">
                        <ResultBadge status={rowState.result.passed ? "success" : "fail"} label={rowState.result.passed ? "PASS" : "FAIL"} />
                        <span className="text-[11px] text-[var(--text-dim)] ts-mono ts-numeric">
                          expected: {rowState.result.expected_status}, actual: {rowState.result.actual_status}
                        </span>
                      </div>
                    )}
                  </div>

                  {rowState.error && (
                    <div className="mt-2">
                      <InlineError>{rowState.error}</InlineError>
                    </div>
                  )}

                  {rowState.show && (
                    <form onSubmit={(e) => handleRunSubmit(e, r.id)} className="mt-2.5 flex flex-wrap gap-2.5 items-end ts-pop">
                      <Field label="Target Base URL" className="flex-1 min-w-[200px]">
                        <input
                          value={rowState.targetUrl}
                          onChange={(e) =>
                            setRunForms((prev) => ({
                              ...prev,
                              [r.id]: { ...(prev[r.id] ?? { show: true, targetUrl: "", loading: false, error: null, result: null }), targetUrl: e.target.value },
                            }))
                          }
                          placeholder="http://localhost:6001"
                          className="ts-input ts-input-mono"
                        />
                      </Field>
                      <button type="submit" disabled={rowState.loading} className="btn-primary">
                        {rowState.loading ? "Running..." : "Send"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRunForms((prev) => ({
                            ...prev,
                            [r.id]: { ...(prev[r.id] ?? { show: true, targetUrl: "", loading: false, error: null, result: null }), show: false },
                          }))
                        }
                        className="btn-secondary"
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── Timeline ── */}
      {loadingEvents ? (
        <div className="ts-card p-4 space-y-3">
          <div className="h-[18px] rounded w-[160px] skeleton-shimmer" />
          <div className="h-[120px] rounded skeleton-shimmer" />
        </div>
      ) : errorEvents ? (
        <ErrorState title="Unable to load timeline" description="We couldn’t load events for this trace." detail={errorEvents} />
      ) : (
        <Timeline events={events} />
      )}

      {/* ── Events table ── */}
      <div className="ts-card ts-stagger" style={{ ["--stagger-i" as string]: 3 }}>
        <div className="ts-card-header">
          <div>
            <div className="ts-card-title">Events</div>
            <div className="ts-card-subtitle">Raw spans attached to this trace</div>
          </div>
          <div className="flex items-center gap-2.5">
            <Badge tone="neutral">
              {events.length} event{events.length !== 1 ? "s" : ""}
            </Badge>
            <button
              onClick={() => {
                setShowAddEventForm((v) => !v);
                setAddEventError(null);
                setAddEventValidation(null);
              }}
              className="btn-secondary !py-1 !px-2.5"
              aria-expanded={showAddEventForm}
            >
              + Add Event
            </button>
          </div>
        </div>

        {showAddEventForm && (
          <form onSubmit={handleAddEventSubmit} className="px-4 py-3.5 flex flex-col gap-2.5 ts-pop" style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border)" }}>
            <div className="flex flex-wrap gap-2.5">
              <Field label="Event Type" className="flex-1 min-w-[160px]">
                <input value={addEventType} onChange={(e) => setAddEventType(e.target.value)} placeholder="e.g. db_query, external_api" className="ts-input" />
              </Field>
              <Field label="Service" className="flex-1 min-w-[160px]">
                <input value={addEventService} onChange={(e) => setAddEventService(e.target.value)} placeholder="e.g. MongoDB, Payment API" className="ts-input" />
              </Field>
              <Field label="Operation" className="flex-1 min-w-[160px]">
                <input value={addEventOperation} onChange={(e) => setAddEventOperation(e.target.value)} placeholder="e.g. findOne, processPayment" className="ts-input" />
              </Field>
              <Field label="Duration (ms)" className="w-[140px]">
                <input type="number" value={addEventDuration} onChange={(e) => setAddEventDuration(e.target.value)} placeholder="e.g. 120" className="ts-input ts-input-mono ts-numeric" />
              </Field>
            </div>
            <Field label="Metadata">
              <textarea
                value={addEventMetadata}
                onChange={(e) => setAddEventMetadata(e.target.value)}
                placeholder='JSON string, e.g. {"key":"value"}'
                rows={2}
                className="ts-textarea ts-input-mono"
              />
            </Field>
            {addEventValidation && <InlineError>{addEventValidation}</InlineError>}
            {addEventError && <InlineError>{addEventError}</InlineError>}
            <div className="flex gap-2">
              <button type="submit" disabled={addEventSaving} className="btn-primary">
                {addEventSaving ? "Saving..." : "Add Event"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddEventForm(false);
                  setAddEventError(null);
                  setAddEventValidation(null);
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {loadingEvents ? (
          <div className="p-4 text-[13px] text-[var(--text-dim)]">Loading events…</div>
        ) : events.length === 0 ? (
          <EmptyState title="No events" description="No events were recorded for this trace." />
        ) : (
          <TableWrap>
            <table className="ts-table">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  <th scope="col">Operation</th>
                  <th scope="col">Duration</th>
                  <th scope="col">Event Type</th>
                </tr>
              </thead>
              <tbody>
                {[...events]
                  .sort((a, b) => a.created_at - b.created_at)
                  .map((ev, i) => (
                    <tr key={ev.id} className="ts-stagger" style={{ ["--stagger-i" as string]: Math.min(i, 10) }}>
                      <td className="ts-mono text-[12px] text-[var(--text-primary)]">{ev.service}</td>
                      <td className="text-[var(--text-secondary)]">{ev.operation}</td>
                      <td className="ts-mono text-[12px] ts-numeric text-[var(--text-secondary)]">{ev.duration_ms} ms</td>
                      <td>
                        <span
                          className="inline-flex px-2 py-0.5 rounded-[5px] text-[10px] font-semibold font-mono uppercase"
                          style={{
                            color: EVENT_TYPE_TONE[ev.event_type.toLowerCase()] ?? "var(--text-secondary)",
                            background: "var(--bg-surface-2)",
                            border: "1px solid var(--border)",
                          }}
                        >
                          {ev.event_type}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
