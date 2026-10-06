import { useCallback, useRef, useState } from "react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { StatusBadge } from "../components/StatusBadge";
import { Badge, PageHeader } from "../components/ui";
import { recordConsoleTrace } from "../api/client";
import { useConfig } from "../context/ConfigContext";

// ─── Types ──────────────────────────────────────────────────────────────────

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * The `sketch` CLI uppercases whatever method you hand it and does no
 * validation — the only method it treats specially is GET, which suppresses
 * the request body. The collector's own CORS allowlist is the de facto set of
 * methods that can actually complete a round trip, so the picker mirrors that
 * set plus PATCH.
 */
const METHODS: Method[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

/** The CLI sends a body for every method except GET. */
function methodTakesBody(method: Method): boolean {
  return method !== "GET";
}

/**
 * In the form the body editor is only offered where it does something.
 *
 * DELETE is absent because it carries nothing, and PATCH is present because a
 * partial update without a body is meaningless.
 */
function methodShowsBodyEditor(method: Method): boolean {
  return method === "POST" || method === "PUT" || method === "PATCH";
}

interface HistoryEntry {
  id: number;
  method: Method;
  path: string;
  target: string;
  body: string;
  /** null when the request never reached the server. */
  status: number | null;
  failed: boolean;
}

type Result =
  | { phase: "pending"; method: Method; fullUrl: string }
  | { phase: "done"; method: Method; fullUrl: string; status: number; duration: number; body: string; trace?: TraceSave }
  | { phase: "error"; method: Method; fullUrl: string; duration: number; message: string; connectionFailed: boolean; trace?: TraceSave };

/** Outcome of persisting the request to the collector, surfaced in the panel. */
type TraceSave = { ok: true; traceId?: string } | { ok: false; message: string };

const HISTORY_LIMIT = 10;

// ─── Target resolution — mirrors packages/cli/src/index.ts ──────────────────

/**
 * Port-vs-URL auto-detection, copied from the CLI's resolveBaseUrl so this page
 * resolves targets exactly the way `sketch` does. Deliberately *not* a `new URL`
 * parse: the CLI never normalises a trailing slash, never inserts a missing
 * slash, and never upgrades http→https, so neither do we.
 */
function resolveBaseUrl(target: string): string {
  const isPureNumber = /^\d+$/.test(target);
  if (isPureNumber) {
    return `http://localhost:${target}`;
  }
  if (target.startsWith("http://") || target.startsWith("https://")) {
    return target;
  }
  return `http://${target}`;
}

/** Same plain concatenation the CLI uses for `baseUrl + routePath`. */
function resolveFullUrl(target: string, path: string): string {
  return resolveBaseUrl(target) + path;
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Origin of the user's own local collector.
 *
 * `apiBaseUrl` is empty in dev (the dashboard talks to the collector through
 * the Vite proxy), so fall back to the CLI's own collector default. Comparing
 * origins is what decides whether instance credentials get attached.
 */
function collectorOrigin(apiBaseUrl: string): string {
  return originOf(apiBaseUrl) ?? "http://localhost:4000";
}

// ─── Presentation helpers ───────────────────────────────────────────────────

const METHOD_TONE: Record<Method, string> = {
  GET: "var(--cyan-text)",
  POST: "var(--accent-text)",
  PUT: "var(--amber-text)",
  PATCH: "var(--blue-text)",
  DELETE: "var(--red-text)",
};

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "var(--green)";
  if (status >= 300 && status < 400) return "var(--blue)";
  if (status >= 400 && status < 500) return "var(--amber)";
  return "var(--red)";
}

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15" strokeLinecap="round" />
    </svg>
  );
}

/** One line of terminal output. */
function TermLine({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <div className="whitespace-pre-wrap break-all leading-[21px]" style={color ? { color } : undefined}>
      {children}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function Cli() {
  const { instanceId, apiBaseUrl } = useConfig();

  const [method, setMethod] = useState<Method>("GET");
  const [path, setPath] = useState("");
  const [target, setTarget] = useState("");
  const [body, setBody] = useState("");

  const [bodyError, setBodyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const seq = useRef(0);

  /** Instance secret from the same env source every other feature reads. */
  const instanceSecret =
    (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_INSTANCE_SECRET ??
    "secret_placeholder_12345";

  // Live preview of what the CLI would print on its `→` line. Uses the same
  // resolver, so what you see here is exactly what gets called.
  const baseUrl = resolveBaseUrl(target);
  const fullUrl = resolveFullUrl(target, path);
  const targetsCollector = originOf(baseUrl) === collectorOrigin(apiBaseUrl);

  const pushHistory = useCallback((entry: Omit<HistoryEntry, "id">) => {
    seq.current += 1;
    const id = seq.current;
    setHistory((prev) => [{ ...entry, id }, ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  /**
   * Persist this request to the collector so it lands on the Traces page, then
   * fold the outcome back into the response panel.
   *
   * Fire-and-forget by design: the panel has already rendered the response, and
   * a collector that is down must not turn a successful request into a failed
   * one. The result is attached to the panel instead, so the user can still see
   * whether the trace was saved.
   *
   * Runs on the success and failure paths alike, mirroring the CLI.
   */
  const saveTrace = useCallback(
    async (statusCode: number, duration: number, sentBody: string | undefined) => {
      const outcome = await recordConsoleTrace(
        {
          method,
          routePath: path,
          fullUrl: resolveFullUrl(target, path),
          // Status 0 means the request never reached a server. The CLI coerces
          // it to 502 so the row is visible in the Traces table rather than
          // looking like an empty state.
          statusCode: statusCode || 502,
          duration,
          body: sentBody,
        },
        { instanceId, apiBaseUrl },
      );

      setResult((prev) => {
        if (!prev || prev.phase === "pending") return prev;
        return { ...prev, trace: outcome };
      });
    },
    [method, path, target, instanceId, apiBaseUrl],
  );

  function handleFormat() {
    try {
      setBody(JSON.stringify(JSON.parse(body), null, 2));
      setBodyError(null);
    } catch (e) {
      setBodyError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  async function handleSend() {
    // ── Validate before anything leaves the browser ──
    // No blocking alert: the failure lands inline under the textarea, which is
    // the whole reason this form exists instead of a shell-quoted --body.
    if (methodTakesBody(method) && body.trim() && methodShowsBodyEditor(method)) {
      try {
        JSON.parse(body);
      } catch (e) {
        setBodyError(e instanceof Error ? e.message : "Invalid JSON");
        return;
      }
    }
    setBodyError(null);

    const resolved = resolveFullUrl(target, path);
    setResult({ phase: "pending", method, fullUrl: resolved });
    setSending(true);

    // Header strategy. The CLI unconditionally sets Content-Type and stamps every
    // request with x-tracesketch-cli. Content-Type is only sent alongside an
    // actual body here: on a bodyless GET it is meaningless, and omitting it
    // keeps the request "simple" so it skips CORS preflight entirely and works
    // against a CORS-locked app.
    //
    // x-tracesketch-cli IS sent. It tells an instrumented app's SDK to skip
    // recording, because this page now records the trace itself via
    // recordConsoleTrace() — exactly the division of labour the CLI relies on
    // (packages/cli/src/index.ts:67 and :105). Without it, an app running the
    // SDK would record the request AND this page would record it, producing a
    // duplicate row on the Traces page.
    //
    // Cost of that fidelity: the header is absent from the collector's
    // Allow-Headers list, so a cross-origin target that does not already permit
    // it will fail preflight. That is inherent to browser-sent requests; the
    // error panel spells out the CORS requirement when it happens.
    const sendBody = methodTakesBody(method) && body.trim() ? body : undefined;
    const headers: Record<string, string> = {
      "x-tracesketch-cli": "true",
    };
    if (sendBody !== undefined) {
      headers["Content-Type"] = "application/json";
    }
    // Instance credentials are only for the user's OWN collector. Their own app
    // on some other port gets exactly what the CLI would send it.
    if (originOf(resolveBaseUrl(target)) === collectorOrigin(apiBaseUrl)) {
      headers["x-instance-id"] = instanceId;
      headers["x-instance-secret"] = instanceSecret;
    }

    const start = Date.now();
    try {
      const res = await fetch(resolved, {
        method,
        headers,
        body: sendBody,
      });
      const duration = Date.now() - start;

      // Read as text first, then parse. res.json() throws on a malformed body
      // that was still labelled application/json, which would have reported a
      // response that actually arrived as a failure.
      const raw = await res.text();
      const contentType = res.headers.get("content-type") || "";
      let output = raw;
      if (contentType.includes("application/json")) {
        try {
          output = JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          output = raw;
        }
      }

      setResult({ phase: "done", method, fullUrl: resolved, status: res.status, duration, body: output });
      pushHistory({ method, path, target, body, status: res.status, failed: !res.ok });
      // Record after the response panel is already showing, so saving a trace
      // never delays the output the user is waiting on.
      void saveTrace(res.status, duration, sendBody);
    } catch (e) {
      const duration = Date.now() - start;
      // The browser hides the underlying cause behind an opaque TypeError, so a
      // failed fetch is the one case we can confidently call a connection
      // failure — which is what the CLI's ECONNREFUSED hints are for.
      const connectionFailed = e instanceof TypeError;
      setResult({
        phase: "error",
        method,
        fullUrl: resolved,
        duration,
        message: e instanceof Error ? e.message : String(e),
        connectionFailed,
      });
      pushHistory({ method, path, target, body, status: null, failed: true });
      // A connection that never landed is still worth a trace — that is the
      // whole reason the CLI records on the failure path too. Status 0 is
      // coerced to 502, matching it.
      void saveTrace(0, duration, sendBody);
    } finally {
      setSending(false);
    }
  }

  function replayEntry(entry: HistoryEntry) {
    setMethod(entry.method);
    setPath(entry.path);
    setTarget(entry.target);
    setBody(entry.body);
    setBodyError(null);
  }

  const showBodyEditor = methodShowsBodyEditor(method);

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "CLI" }]} />

      <PageHeader
        title="CLI"
        description="Send a request to any endpoint without touching a shell. Same method, path and target resolution as the sketch CLI — with proper form fields instead of quote-escaped JSON."
        badge={<Badge>Local</Badge>}
      />

      <div className="max-w-[900px] space-y-4">
        {/* ── Request builder ── */}
        <section className="ts-card ts-stagger">
          <div className="ts-card-header">
            <div>
              <div className="ts-card-title">Request</div>
              <div className="ts-card-subtitle">The same three arguments sketch takes: method, path and target.</div>
            </div>
          </div>

          <div className="ts-card-body space-y-4">
            {/* Method */}
            <div>
              <span className="ts-label">Method</span>
              <div className="ts-segmented" role="radiogroup" aria-label="HTTP method">
                {METHODS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="radio"
                    aria-checked={method === m}
                    onClick={() => {
                      setMethod(m);
                      setBodyError(null);
                    }}
                    className="ts-segment"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Path */}
              <div>
                <label className="ts-label" htmlFor="cli-path">
                  Path
                </label>
                <input
                  id="cli-path"
                  type="text"
                  className="ts-input ts-input-mono"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/payment"
                  spellCheck={false}
                  autoComplete="off"
                />
              </div>

              {/* Target */}
              <div>
                <label className="ts-label" htmlFor="cli-target">
                  Target
                </label>
                <input
                  id="cli-target"
                  type="text"
                  className="ts-input ts-input-mono"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="5000"
                  spellCheck={false}
                  autoComplete="off"
                />
                <p className="text-[11px] leading-[16px] mt-1.5 text-[var(--text-dim)]">
                  Enter just a port number to target localhost, or a full URL to target a remote server
                </p>
              </div>
            </div>

            {/* Body */}
            {showBodyEditor && (
              <div className="ts-stagger" style={{ ["--stagger-i" as string]: 1 }}>
                <div className="flex items-center justify-between gap-3">
                  <label className="ts-label" htmlFor="cli-body">
                    Body (JSON)
                  </label>
                  <button type="button" onClick={handleFormat} className="btn-ghost !py-1 !px-2 !text-[11px] mb-1.5">
                    Format JSON
                  </button>
                </div>
                <textarea
                  id="cli-body"
                  className="ts-textarea ts-mono text-[12px]"
                  rows={7}
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    if (bodyError) setBodyError(null);
                  }}
                  placeholder={'{\n  "amount": 5000,\n  "currency": "USD"\n}'}
                  spellCheck={false}
                />
                {bodyError && (
                  <p role="alert" className="text-[11px] ts-mono mt-1.5 break-all" style={{ color: "var(--red)" }}>
                    Invalid JSON: {bodyError}
                  </p>
                )}
              </div>
            )}

            {/* Resolved URL preview + send */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 pt-3.5"
              style={{ borderTop: "1px solid var(--border-dim)" }}
            >
              <p className="ts-mono text-[11.5px] break-all min-w-0" style={{ color: "var(--text-dim)" }}>
                <span style={{ color: "var(--accent-text)" }}>→ {method}</span> {fullUrl}
                {targetsCollector && (
                  <span className="ml-2" style={{ color: "var(--green)" }}>
                    · instance credentials attached
                  </span>
                )}
              </p>
              <button type="button" onClick={handleSend} disabled={sending} className="btn-primary shrink-0">
                {sending ? (
                  <>
                    <Spinner />
                    Sending…
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 8h10.5M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ── Response ── */}
        <section className="ts-card ts-stagger" style={{ ["--stagger-i" as string]: 1 }}>
          <div className="ts-card-header">
            <div>
              <div className="ts-card-title">Response</div>
              <div className="ts-card-subtitle">Resolved URL, status and timing, then the body.</div>
            </div>
            {result?.phase === "done" && <StatusBadge code={result.status} />}
          </div>
          <div className="ts-card-body">
            {!result ? (
              <div className="ts-mono text-[12px]" style={{ color: "var(--text-dim)" }}>
                <p className="leading-[21px]">No request sent yet.</p>
                <p className="leading-[21px]">
                  Try <span style={{ color: "var(--accent-text)" }}>POST /api/payment 5000</span> against your local app.
                </p>
              </div>
            ) : (
              <div
                className="rounded-[10px] overflow-hidden"
                style={{ background: "var(--bg-page)", border: "1px solid var(--border)" }}
              >
                <div className="ts-mono text-[12px] px-4 py-3">
                  {/* Request line */}
                  <TermLine color="var(--accent-text)">
                    {"→ " + result.method + " " + result.fullUrl}
                  </TermLine>

                  {/* Response / error line */}
                  {result.phase === "pending" && (
                    <TermLine color="var(--text-dim)">{"← waiting for response…"}</TermLine>
                  )}

                  {result.phase === "done" && (
                    <>
                      <TermLine color={statusColor(result.status)}>
                        {"← " + result.status + " (" + result.duration + "ms)"}
                      </TermLine>
                      {result.status < 200 || result.status >= 300 ? (
                        <TermLine color="var(--red)">{"✗ Request failed with status " + result.status}</TermLine>
                      ) : null}
                    </>
                  )}

                  {result.phase === "error" && (
                    <>
                      <TermLine color="var(--red)">{"✗ Request failed: " + result.message}</TermLine>
                      {result.connectionFailed && (
                        <>
                          <TermLine color="var(--text-secondary)">
                            {"  → Could not connect to " + result.fullUrl + ". Is your app running on " + baseUrl + "?"}
                          </TermLine>
                          <TermLine color="var(--text-dim)">
                            {"  Tip: the browser still enforces CORS — your app must allow this origin."}
                          </TermLine>
                        </>
                      )}
                    </>
                  )}

{/* Trace save outcome — the CLI's "✓ Trace saved" line. Narrowed off the
                      pending phase, which has no trace field yet. */}
                  {result.phase !== "pending" &&
                    result.trace &&
                    (result.trace.ok ? (
                      <TermLine color="var(--green)">
                        {"✓ Trace saved" + (result.trace.traceId ? `: ${result.trace.traceId} — view it on the Traces page` : " to collector")}
                      </TermLine>
                    ) : (
                      <>
                        <TermLine color="var(--amber)">{"! Trace not saved — " + result.trace.message}</TermLine>
                        <TermLine color="var(--text-dim)">{"  The request above still ran; only its trace is missing."}</TermLine>
                      </>
                    ))}

                  {/* Body */}
                  {result.phase === "done" && (
                    <div
                      className="mt-2.5 pt-2.5 whitespace-pre-wrap break-all leading-[20px]"
                      style={{ borderTop: "1px solid var(--border-dim)", color: "var(--text-secondary)" }}
                    >
                      {result.body || "(empty body)"}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── History ── */}
        <section className="ts-card ts-stagger" style={{ ["--stagger-i" as string]: 2 }}>
          <div className="ts-card-header">
            <div>
              <div className="ts-card-title">Recent requests</div>
              <div className="ts-card-subtitle">
                Last {HISTORY_LIMIT} from this session. Click one to load it back into the form.
              </div>
            </div>
            <Badge tone="neutral">
              <span className="ts-numeric">{history.length}</span>
            </Badge>
          </div>

          <div className="ts-card-body">
            {history.length === 0 ? (
              <p className="text-[12px]" style={{ color: "var(--text-dim)" }}>
                Nothing sent yet.
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {history.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => replayEntry(entry)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-left transition-colors duration-150 hover:bg-[var(--bg-surface-2)]"
                    style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
                    title="Load this request back into the form"
                  >
                    <span className="ts-mono text-[11px] font-bold w-[52px] shrink-0" style={{ color: METHOD_TONE[entry.method] }}>
                      {entry.method}
                    </span>
                    <span className="ts-mono text-[12px] truncate flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>
                      {entry.path}
                      <span style={{ color: "var(--text-dim)" }}> · {entry.target}</span>
                    </span>
                    {entry.status !== null ? (
                      <StatusBadge code={entry.status} showDot={false} />
                    ) : (
                      <span className="ts-mono text-[11px] shrink-0" style={{ color: "var(--red)" }}>
                        failed
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}