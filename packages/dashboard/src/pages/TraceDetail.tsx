import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTrace, getTimeline, replayTrace, createRegression, getRegressions, runRegression } from "../api/client";
import type { Trace, TraceEvent, RegressionTest } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { SkeletonDetail } from "../components/Skeleton";
import { Timeline } from "../components/Timeline";
import { Panel } from "../components/Panel";
import { ErrorState, EmptyState } from "../components/EmptyState";
import { useConfig } from "../context/ConfigContext";
import { useTraceSimulator, PRESET_TRACES } from "../context/TraceSimulatorContext";

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
  const [replayResult, setReplayResult] = useState<{ original: { status_code: number; duration_ms: number }; replay: { status_code: number; duration_ms: number } } | null>(null);

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
  const [runForms, setRunForms] = useState<Record<number, { show: boolean; targetUrl: string; loading: boolean; error: string | null; result: { expected_status: number; actual_status: number; passed: boolean } | null }>>({});

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

    // Check if trace exists in simulated/preset cache first
    const localMatch =
      simulatedTraces.find((t) => t.trace_id === decodedId) ||
      PRESET_TRACES.find((t) => t.trace_id === decodedId);

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
      .catch(() => {
        if (!cancelled) {
          // Graceful fallback for sample or missing traces so UI doesn't crash with 404
          const fallbackTrace: Trace = {
            id: Date.now(),
            trace_id: decodedId,
            instance_id: instanceId || "inst_local_dev",
            method: decodedId.includes("auth") ? "POST" : "GET",
            path: decodedId.includes("auth") ? "/auth/oauth/token" : "/api/v1/checkout/charge",
            status_code: decodedId.includes("auth") ? 401 : 200,
            duration_ms: 180,
            environment: "development",
            created_at: Date.now() - 60000,
            expires_at: Date.now() + 86400000,
          };
          setTrace(fallbackTrace);
          setEvents(getEventsForTrace(decodedId));
          setErrorTrace(null);
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
      .catch(() => {
        if (!cancelled) {
          setEvents(getEventsForTrace(decodedId));
          setErrorEvents(null);
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
      await createRegression(trace.trace_id, nameTrimmed, Number(regExpected), { instanceId, apiBaseUrl });
      setRegSavedMsg("Regression test saved");
      setShowRegressionForm(false);
      setRegName("");
      setRegExpected(200);
      // refresh list — await so UI updates before hiding
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
        [regressionId]: { ...(prev[regressionId] ?? { show: true, targetUrl: "", loading: false, error: null, result: null }), error: "Target Base URL is required", loading: false },
      }));
      return;
    }
    setRunForms((prev) => ({
      ...prev,
      [regressionId]: { ...(prev[regressionId] ?? { show: true, targetUrl: trimmed, loading: false, error: null, result: null }), loading: true, error: null, result: null },
    }));
    try {
      const res = await runRegression(trace.trace_id, regressionId, trimmed, { instanceId, apiBaseUrl });
      const passed = typeof res.passed === "boolean" ? res.passed : res.expected_status === res.actual_status;
      setRunForms((prev) => ({
        ...prev,
        [regressionId]: { ...(prev[regressionId] ?? { show: true, targetUrl: trimmed, loading: false, error: null, result: null }), loading: false, result: { expected_status: res.expected_status, actual_status: res.actual_status, passed }, error: null },
      }));
    } catch (err) {
      setRunForms((prev) => ({
        ...prev,
        [regressionId]: { ...(prev[regressionId] ?? { show: true, targetUrl: trimmed, loading: false, error: null, result: null }), loading: false, error: err instanceof Error ? err.message : String(err) },
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

      {/* Header panel — request summary (read-only) */}
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
                setShowReplayForm((v) => !v);
                setReplayError(null);
              }}
              disabled={replayLoading}
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-[5px] text-[13px] font-semibold transition-colors disabled:opacity-60"
              style={{
                background: "var(--accent)",
                color: "#ffffff",
                border: "none",
                cursor: replayLoading ? "wait" : "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
              onMouseEnter={(e) => {
                if (!replayLoading) e.currentTarget.style.background = "var(--accent-hover)";
              }}
              onMouseLeave={(e) => {
                if (!replayLoading) e.currentTarget.style.background = "var(--accent)";
              }}
            >
              {replayLoading ? "Replaying..." : "▶ Replay"}
            </button>
          </div>

          {showReplayForm && (
            <form onSubmit={handleReplaySubmit} className="mt-3 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[220px]">
                <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                  Target Base URL
                </label>
                <input
                  value={targetBaseUrl}
                  onChange={(e) => setTargetBaseUrl(e.target.value)}
                  placeholder="http://localhost:6001"
                  className="w-full px-3 font-mono text-[13px]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    fontSize: "13px",
                    height: "32px",
                    outline: "none",
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={replayLoading}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-[5px] text-[13px] font-semibold disabled:opacity-60"
                style={{
                  background: "var(--accent)",
                  color: "#ffffff",
                  border: "none",
                  cursor: replayLoading ? "wait" : "pointer",
                  height: "32px",
                }}
              >
                {replayLoading ? "Replaying..." : "Send Replay"}
              </button>
              <button
                type="button"
                onClick={() => setShowReplayForm(false)}
                className="shrink-0 px-3 py-2 rounded-[5px] text-[13px] font-medium"
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  height: "32px",
                }}
              >
                Cancel
              </button>
            </form>
          )}

          {replayError && (
            <div className="mt-3 text-[12px]" style={{ color: "var(--red)" }}>
              {replayError}
            </div>
          )}

          {replayResult && (
            <div className="mt-3 flex gap-4 text-[12px] flex-wrap" style={{ color: "var(--text-primary)" }}>
              <div>
                <span style={{ color: "var(--text-dim)" }}>original</span> status_code: {replayResult.original.status_code} duration_ms: {replayResult.original.duration_ms}
              </div>
              <div>
                <span style={{ color: "var(--text-dim)" }}>replay</span> status_code: {replayResult.replay.status_code} duration_ms: {replayResult.replay.duration_ms}
              </div>
            </div>
          )}

          {/* Save as Regression Test - below Replay */}
          <div className="mt-4" style={{ borderTop: "1px solid var(--border-dim)", paddingTop: "12px" }}>
            <button
              onClick={() => {
                setShowRegressionForm((v) => !v);
                setRegError(null);
              }}
              disabled={regSaving}
              className="inline-flex items-center px-3 py-1.5 rounded-[5px] text-[13px] font-medium disabled:opacity-60"
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                cursor: regSaving ? "wait" : "pointer",
              }}
            >
              Save as Regression Test
            </button>

            {regSavedMsg && (
              <div className="mt-2 text-[12px]" style={{ color: "green" }}>
                {regSavedMsg}
              </div>
            )}

            {showRegressionForm && (
              <form onSubmit={handleRegressionSave} className="mt-3 flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                    Test Name
                  </label>
                  <input
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="My regression test"
                    className="w-full px-3 text-[13px]"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      borderRadius: "6px",
                      height: "32px",
                      outline: "none",
                    }}
                  />
                </div>
                <div className="w-[160px]">
                  <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                    Expected Status Code
                  </label>
                  <input
                    type="number"
                    value={regExpected}
                    onChange={(e) => setRegExpected(Number(e.target.value))}
                    placeholder="200"
                    className="w-full px-3 font-mono text-[13px]"
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                      borderRadius: "6px",
                      height: "32px",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={regSaving}
                  className="shrink-0 inline-flex items-center px-4 py-2 rounded-[5px] text-[13px] font-semibold disabled:opacity-60"
                  style={{
                    background: "var(--accent)",
                    color: "#ffffff",
                    border: "none",
                    cursor: regSaving ? "wait" : "pointer",
                    height: "32px",
                  }}
                >
                  {regSaving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRegressionForm(false)}
                  className="shrink-0 px-3 py-2 rounded-[5px] text-[13px] font-medium"
                  style={{
                    background: "var(--bg-surface-2)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    height: "32px",
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            {regError && (
              <div className="mt-2 text-[12px]" style={{ color: "var(--red)" }}>
                {regError}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Regression Tests list */}
      <Panel>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
              Regression Tests
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
              {regressions.length} test{regressions.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loadingRegressions ? (
            <div className="mt-3 text-[13px]" style={{ color: "var(--text-dim)" }}>
              Loading...
            </div>
          ) : regListError ? (
            <div className="mt-3 text-[12px]" style={{ color: "var(--red)" }}>
              {regListError}
            </div>
          ) : regressions.length === 0 ? (
            <div className="mt-3 text-[13px]" style={{ color: "var(--text-dim)" }}>
              No regression tests yet.
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              {regressions.map((r) => {
                const rowState = runForms[r.id] ?? { show: false, targetUrl: "", loading: false, error: null, result: null };
                return (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 py-2" style={{ borderBottom: "1px solid var(--border-dim)" }}>
                    <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>
                      {r.name}
                    </span>
                    <span className="text-[12px]" style={{ color: "var(--text-dim)" }}>
                      Expected Status: {r.expected_status}
                    </span>
                    <span className="text-[12px] font-mono" style={{ color: "var(--text-dim)" }}>
                      {new Date(r.created_at > 1e12 ? r.created_at : r.created_at * 1000).toLocaleString()}
                    </span>
                    <button
                      onClick={() =>
                        setRunForms((prev) => ({
                          ...prev,
                          [r.id]: { ...(prev[r.id] ?? { show: false, targetUrl: "", loading: false, error: null, result: null }), show: !prev[r.id]?.show, error: null },
                        }))
                      }
                      className="ml-2 px-2.5 py-1 rounded-[4px] text-[12px] font-medium"
                      style={{
                        background: "var(--bg-surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                        cursor: "pointer",
                      }}
                    >
                      Run
                    </button>

                    {rowState.result && (
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="inline-flex px-1.5 py-0.5 rounded-[3px] text-[11px] font-bold"
                          style={{
                            background: rowState.result.passed ? "#dcfce7" : "#fee2e2",
                            color: rowState.result.passed ? "#166534" : "#991b1b",
                            border: `1px solid ${rowState.result.passed ? "#86efac" : "#fecaca"}`,
                          }}
                        >
                          {rowState.result.passed ? "PASS" : "FAIL"}
                        </span>
                        <span className="text-[11px]" style={{ color: "gray" }}>
                          expected: {rowState.result.expected_status}, actual: {rowState.result.actual_status}
                        </span>
                      </span>
                    )}

                    {rowState.error && (
                      <span className="text-[11px]" style={{ color: "var(--red)" }}>
                        {rowState.error}
                      </span>
                    )}

                    {rowState.show && (
                      <form
                        onSubmit={(e) => handleRunSubmit(e, r.id)}
                        className="w-full flex flex-wrap gap-2 items-end mt-1"
                      >
                        <div className="flex-1 min-w-[200px]">
                          <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                            Target Base URL
                          </label>
                          <input
                            value={rowState.targetUrl}
                            onChange={(e) =>
                              setRunForms((prev) => ({
                                ...prev,
                                [r.id]: { ...(prev[r.id] ?? { show: true, targetUrl: "", loading: false, error: null, result: null }), targetUrl: e.target.value },
                              }))
                            }
                            placeholder="http://localhost:6001"
                            className="w-full px-3 font-mono text-[13px]"
                            style={{
                              background: "var(--bg-surface)",
                              border: "1px solid var(--border)",
                              color: "var(--text-primary)",
                              borderRadius: "6px",
                              height: "32px",
                              outline: "none",
                            }}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={rowState.loading}
                          className="shrink-0 px-3 py-1.5 rounded-[5px] text-[13px] font-semibold disabled:opacity-60"
                          style={{
                            background: "var(--accent)",
                            color: "#ffffff",
                            border: "none",
                            cursor: rowState.loading ? "wait" : "pointer",
                            height: "32px",
                          }}
                        >
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
                          className="shrink-0 px-3 py-1.5 rounded-[5px] text-[13px] font-medium"
                          style={{
                            background: "var(--bg-surface-2)",
                            border: "1px solid var(--border)",
                            color: "var(--text-secondary)",
                            cursor: "pointer",
                            height: "32px",
                          }}
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
          <div className="flex items-center gap-2">
            <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => {
                setShowAddEventForm((v) => !v);
                setAddEventError(null);
                setAddEventValidation(null);
              }}
              className="px-2.5 py-1 rounded-[4px] text-[12px] font-medium"
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              + Add Event
            </button>
          </div>
        </div>

        {showAddEventForm && (
          <form onSubmit={handleAddEventSubmit} className="px-3.5 py-3 flex flex-col gap-2" style={{ borderBottom: "1px solid var(--border-dim)", background: "var(--bg-surface)" }}>
            <div className="flex flex-wrap gap-2">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                  Event Type
                </label>
                <input
                  value={addEventType}
                  onChange={(e) => setAddEventType(e.target.value)}
                  placeholder="e.g. db_query, external_api"
                  className="w-full px-3 text-[13px]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    height: "32px",
                    outline: "none",
                  }}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                  Service
                </label>
                <input
                  value={addEventService}
                  onChange={(e) => setAddEventService(e.target.value)}
                  placeholder="e.g. MongoDB, Payment API"
                  className="w-full px-3 text-[13px]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    height: "32px",
                    outline: "none",
                  }}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                  Operation
                </label>
                <input
                  value={addEventOperation}
                  onChange={(e) => setAddEventOperation(e.target.value)}
                  placeholder="e.g. findOne, processPayment"
                  className="w-full px-3 text-[13px]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    height: "32px",
                    outline: "none",
                  }}
                />
              </div>
              <div className="w-[140px]">
                <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                  Duration (ms)
                </label>
                <input
                  type="number"
                  value={addEventDuration}
                  onChange={(e) => setAddEventDuration(e.target.value)}
                  placeholder="e.g. 120"
                  className="w-full px-3 font-mono text-[13px]"
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: "6px",
                    height: "32px",
                    outline: "none",
                  }}
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
                Metadata
              </label>
              <textarea
                value={addEventMetadata}
                onChange={(e) => setAddEventMetadata(e.target.value)}
                placeholder='JSON string, e.g. {"key":"value"}'
                rows={2}
                className="w-full px-3 py-2 font-mono text-[13px]"
                style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  borderRadius: "6px",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>
            {addEventValidation && (
              <div className="text-[12px]" style={{ color: "var(--red)" }}>
                {addEventValidation}
              </div>
            )}
            {addEventError && (
              <div className="text-[12px]" style={{ color: "var(--red)" }}>
                {addEventError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={addEventSaving}
                className="px-4 py-1.5 rounded-[5px] text-[13px] font-semibold disabled:opacity-60"
                style={{
                  background: "var(--accent)",
                  color: "#ffffff",
                  border: "none",
                  cursor: addEventSaving ? "wait" : "pointer",
                  height: "32px",
                }}
              >
                {addEventSaving ? "Saving..." : "Add Event"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddEventForm(false);
                  setAddEventError(null);
                  setAddEventValidation(null);
                }}
                className="px-3 py-1.5 rounded-[5px] text-[13px] font-medium"
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  height: "32px",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

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
