import { useMemo, useState } from "react";
import { MethodBadge } from "./MethodBadge";
import { SchemaTree } from "./SchemaTree";
import { StatusBadge } from "../StatusBadge";
import { CodeBlock, CopyButton } from "../ui";
import type { Endpoint, OpenApiParameter, OpenApiRequestBody, OpenApiResponseObject, OpenApiSpec } from "../../lib/openapi";
import {
  effectiveSecurity,
  exampleForContent,
  groupParameters,
  joinUrl,
  pickContentType,
  schemaTypeLabel,
} from "../../lib/openapi";

/* ═══════════════════════════════════════════════════════════════════════════
   One endpoint card: collapsed summary -> expanded docs -> "Try it out".

   The request is executed with the browser's own fetch against the URL the
   user configures. Nothing is faked: a response only appears after a real
   round trip, and a failure (network, CORS, non-2xx) is rendered as itself.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface RequestHistoryEntry {
  id: number;
  method: string;
  url: string;
  status: number | null;
  duration: number;
  at: number;
  ok: boolean;
}

type TryResult =
  | {
      phase: "done";
      status: number;
      ok: boolean;
      duration: number;
      bodyText: string;
      headers: Array<[string, string]>;
      size: number;
      contentType: string;
    }
  | { phase: "error"; message: string; duration: number; connectionFailed: boolean };

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-200"
      style={{ transform: open ? "rotate(90deg)" : "none" }}
    >
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="60" strokeDashoffset="15" strokeLinecap="round" />
    </svg>
  );
}

function RequiredTag() {
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[4px] shrink-0"
      style={{ color: "var(--red-text)", background: "var(--red-bg)", border: "1px solid var(--red-border)" }}
    >
      required
    </span>
  );
}

/** Serialize a JS value into the body editor: pretty JSON, or raw text. */
function toBodyText(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/** Narrow a possibly-$ref requestBody to an inline one. */
function asRequestBody(value: unknown): OpenApiRequestBody | undefined {
  return value && typeof value === "object" && !("$ref" in value) ? (value as OpenApiRequestBody) : undefined;
}

/** Narrow a possibly-$ref response to an inline one. */
function asResponseObject(value: unknown): OpenApiResponseObject | null {
  return value && typeof value === "object" && !("$ref" in value) ? (value as OpenApiResponseObject) : null;
}

interface Props {
  spec: OpenApiSpec;
  endpoint: Endpoint;
  serverUrl: string;
  /** Header provider applied to the outgoing request (auth + local instance creds). */
  headerProvider: (url: string) => Record<string, string>;
  /** Query-string auth (e.g. apiKey in query), merged into the URL. */
  queryProvider: (url: string) => Record<string, string>;
  onRecord: (entry: Omit<RequestHistoryEntry, "id">) => void;
  /** Set by the sidebar index: opens the card when this endpoint is jumped to. */
  autoExpand?: boolean;
}

export function EndpointCard({ spec, endpoint, serverUrl, headerProvider, queryProvider, onRecord, autoExpand }: Props) {
  const op = endpoint.operation;
  // Expansion is derived: the sidebar index can force a card open, but a manual
  // toggle always wins once the user interacts with this card.
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(null);
  const expanded = expandedOverride ?? Boolean(autoExpand);
  const [trying, setTrying] = useState(false);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("");
  const [bodyTouched, setBodyTouched] = useState(false);
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<TryResult | null>(null);

  const groups = useMemo(() => groupParameters(spec, endpoint), [spec, endpoint]);
  const allParams = useMemo(() => [...groups.path, ...groups.query, ...groups.header, ...groups.cookie], [groups]);

  const requestBody = asRequestBody(op.requestBody);
  const bodyContent = requestBody?.content;
  const bodyContentType = bodyContent ? pickContentType(bodyContent) : null;
  const bodyExample = useMemo(
    () => (bodyContent ? exampleForContent(spec, bodyContent) : undefined),
    [spec, bodyContent],
  );
  const bodySchema = bodyContent && bodyContentType ? bodyContent[bodyContentType]?.schema : undefined;

  // The editor starts from the derived example; once the user types, we stop
  // overwriting their input (bodyTouched).
  const effectiveBody = bodyTouched ? bodyText : toBodyText(bodyExample);

  const responses = useMemo(() => Object.entries(op.responses ?? {}), [op.responses]);
  const security = effectiveSecurity(spec, op);
  const securityNames = security.flatMap((req) => Object.keys(req));

  function paramKey(p: OpenApiParameter): string {
    return `${p.in ?? ""}:${p.name ?? ""}`;
  }

  function setParam(p: OpenApiParameter, value: string) {
    setParamValues((prev) => ({ ...prev, [paramKey(p)]: value }));
  }

  function buildUrl(): { url: string; missing: string[] } {
    const missing: string[] = [];
    let path = endpoint.path;
    for (const p of groups.path) {
      const raw = paramValues[paramKey(p)] ?? "";
      if (!raw) {
        if (p.required) missing.push(p.name ?? "param");
        continue;
      }
      path = path.replace(new RegExp(`\\{${p.name}\\}`, "g"), encodeURIComponent(raw));
    }
    const qs = new URLSearchParams();
    for (const p of groups.query) {
      const raw = paramValues[paramKey(p)] ?? "";
      if (raw !== "") qs.set(p.name ?? "", raw);
    }
    const authQuery = new URLSearchParams(queryProvider(joinUrl(serverUrl, path)));
    authQuery.forEach((value, key) => {
      if (!qs.has(key)) qs.set(key, value);
    });
    const finalQuery = qs.toString();
    return { url: joinUrl(serverUrl, finalQuery ? `${path}?${finalQuery}` : path), missing };
  }

  async function handleExecute() {
    setBodyError(null);

    const takesBody = !["get", "head"].includes(endpoint.method);
    const body = takesBody ? effectiveBody.trim() : "";
    if (body && (bodyContentType ?? "").includes("json")) {
      try {
        JSON.parse(body);
      } catch (e) {
        setBodyError(e instanceof Error ? e.message : "Invalid JSON");
        return;
      }
    }

    const { url, missing } = buildUrl();
    if (missing.length) {
      setBodyError(`Missing required path parameter${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
      return;
    }

    const headers: Record<string, string> = {};
    for (const p of groups.header) {
      const raw = paramValues[paramKey(p)] ?? "";
      if (raw !== "") headers[p.name ?? ""] = raw;
    }
    if (body) headers["Content-Type"] = bodyContentType ?? "application/json";
    Object.assign(headers, headerProvider(url));

    setSending(true);
    setResult(null);
    const start = Date.now();
    try {
      const res = await fetch(url, { method: endpoint.method.toUpperCase(), headers, body: body || undefined });
      const duration = Date.now() - start;
      const raw = await res.text();
      const contentType = res.headers.get("content-type") ?? "";
      let output = raw;
      if (contentType.includes("json")) {
        try {
          output = JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          output = raw;
        }
      }
      const headerPairs: Array<[string, string]> = [];
      res.headers.forEach((value, key) => headerPairs.push([key, value]));
      setResult({
        phase: "done",
        status: res.status,
        ok: res.ok,
        duration,
        bodyText: output,
        headers: headerPairs,
        size: new Blob([raw]).size,
        contentType,
      });
      onRecord({ method: endpoint.method, url, status: res.status, duration, at: Date.now(), ok: res.ok });
    } catch (e) {
      const duration = Date.now() - start;
      setResult({
        phase: "error",
        message: e instanceof Error ? e.message : String(e),
        duration,
        connectionFailed: e instanceof TypeError,
      });
      onRecord({ method: endpoint.method, url, status: null, duration, at: Date.now(), ok: false });
    } finally {
      setSending(false);
    }
  }

  function handleFormat() {
    try {
      setBodyText(JSON.stringify(JSON.parse(effectiveBody), null, 2));
      setBodyTouched(true);
      setBodyError(null);
    } catch (e) {
      setBodyError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  const urlPreview = useMemo(() => {
    let path = endpoint.path;
    for (const p of groups.path) {
      const raw = paramValues[paramKey(p)] ?? "";
      path = path.replace(new RegExp(`\\{${p.name}\\}`, "g"), raw ? encodeURIComponent(raw) : `{${p.name}}`);
    }
    return joinUrl(serverUrl, path);
  }, [endpoint.path, groups.path, paramValues, serverUrl]);

  return (
    <div className="ts-card overflow-hidden">
      {/* ── Summary row ── */}
      <button
        type="button"
        onClick={() => setExpandedOverride(!expanded)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
        aria-expanded={expanded}
      >
        <span style={{ color: "var(--text-dim)" }}>
          <Chevron open={expanded} />
        </span>
        <MethodBadge method={endpoint.method} />
        <span className="ts-mono text-[12.5px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
          {endpoint.path}
        </span>
        {op.deprecated && (
          <span className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[4px]" style={{ color: "var(--amber-text)", background: "var(--amber-bg)", border: "1px solid var(--amber-border)" }}>
            deprecated
          </span>
        )}
        {securityNames.length > 0 && (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px]" style={{ color: "var(--text-dim)" }} title={`Requires: ${securityNames.join(", ")}`}>
            <IconLock />
            {securityNames.join(", ")}
          </span>
        )}
        <span className="ml-auto text-[11.5px] truncate max-w-[46%] hidden md:block" style={{ color: "var(--text-dim)" }}>
          {op.summary ?? op.operationId ?? ""}
        </span>
      </button>

      {expanded && (
        <div className="border-t" style={{ borderColor: "var(--border-dim)" }}>
          {/* ── Description ── */}
          <div className="px-4 py-3 space-y-2">
            {op.summary && (
              <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
                {op.summary}
              </div>
            )}
            {op.description && (
              <p className="text-[12.5px] leading-[19px] whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {op.description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton value={urlPreview} className="btn-ghost !py-1 !px-2 !text-[11px]" copiedLabel="Copied">
                Copy URL
              </CopyButton>
              {op.operationId && <span className="ts-overline" style={{ color: "var(--text-dim)" }}>id: {op.operationId}</span>}
            </div>
          </div>

          {/* ── Parameters ── */}
          {allParams.length > 0 && (
            <div className="px-4 pb-3">
              <div className="ts-overline mb-2">Parameters</div>
              <div className="rounded-[8px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                {allParams.map((p) => (
                  <div
                    key={paramKey(p)}
                    className="border-t first:border-t-0 px-3 py-2 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3"
                    style={{ borderColor: "var(--border-dim)" }}
                  >
                    <div className="flex items-center gap-2 sm:w-[210px] shrink-0">
                      <span className="ts-mono text-[12px] font-semibold" style={{ color: "var(--text-primary)" }}>
                        {p.name}
                      </span>
                      {p.required && <RequiredTag />}
                    </div>
                    <span className="ts-mono text-[10.5px] uppercase shrink-0 sm:w-[70px]" style={{ color: "var(--text-dim)" }}>
                      {p.in}
                    </span>
                    <span className="ts-mono text-[11px] shrink-0 sm:w-[130px]" style={{ color: "var(--accent-text)" }}>
                      {schemaTypeLabel(spec, p.schema)}
                    </span>
                    {p.description && (
                      <span className="text-[11.5px] leading-[17px]" style={{ color: "var(--text-secondary)" }}>
                        {p.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Request body ── */}
          {bodyContent && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="ts-overline">Request body</span>
                {requestBody?.required && <RequiredTag />}
                {bodyContentType && (
                  <span className="ts-mono text-[10.5px] px-1.5 py-0.5 rounded-[4px]" style={{ color: "var(--text-secondary)", background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                    {bodyContentType}
                  </span>
                )}
                <CopyButton value={toBodyText(bodyExample)} className="btn-ghost !py-1 !px-2 !text-[11px]" copiedLabel="Copied">
                  Copy example
                </CopyButton>
              </div>
              <SchemaTree spec={spec} schema={bodySchema} label="Body" defaultOpen={false} />
            </div>
          )}

          {/* ── Responses ── */}
          {responses.length > 0 && (
            <div className="px-4 pb-3 space-y-2">
              <div className="ts-overline">Responses</div>
              {responses.map(([code, resp]) => {
                const obj = asResponseObject(resp);
                const content = obj?.content;
                const ctype = content ? pickContentType(content) : null;
                return (
                  <div key={code} className="rounded-[8px] overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2 px-3 py-2" style={{ background: "var(--bg-surface-2)" }}>
                      <StatusBadge code={Number(code) || 0} />
                      <span className="text-[12px]" style={{ color: "var(--text-secondary)" }}>
                        {obj?.description ?? ""}
                      </span>
                      {ctype && (
                        <span className="ts-mono text-[10.5px] ml-auto" style={{ color: "var(--text-dim)" }}>
                          {ctype}
                        </span>
                      )}
                    </div>
                    {ctype && content && (
                      <div className="p-2.5">
                        <SchemaTree spec={spec} schema={content[ctype]?.schema} defaultOpen={false} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Try it out ── */}
          <div className="px-4 pb-4 pt-1">
            {!trying ? (
              <button type="button" onClick={() => setTrying(true)} className="btn-primary text-[12px]">
                Try it out
              </button>
            ) : (
              <div className="rounded-[8px] p-3 space-y-3" style={{ border: "1px solid var(--border-accent)", background: "var(--accent-light)" }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="ts-overline" style={{ color: "var(--accent-text)" }}>Try it out</span>
                  <button
                    type="button"
                    onClick={() => {
                      setTrying(false);
                      setResult(null);
                      setBodyError(null);
                    }}
                    className="btn-ghost !py-1 !px-2 !text-[11px]"
                  >
                    Close
                  </button>
                </div>

                <div className="ts-mono text-[11px] break-all rounded-[6px] px-2.5 py-2" style={{ color: "var(--text-secondary)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                  {urlPreview}
                </div>

                {allParams.length > 0 && (
                  <div className="space-y-2">
                    {allParams.map((p) => (
                      <div key={paramKey(p)} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1.5 sm:gap-3 sm:items-center">
                        <label className="flex items-center gap-1.5 min-w-0">
                          <span className="ts-mono text-[11.5px] truncate" style={{ color: "var(--text-primary)" }}>
                            {p.name}
                          </span>
                          <span className="ts-mono text-[9.5px] uppercase" style={{ color: "var(--text-dim)" }}>
                            {p.in}
                          </span>
                          {p.required && <RequiredTag />}
                        </label>
                        <input
                          className="ts-input ts-input-mono !text-[11.5px]"
                          value={paramValues[paramKey(p)] ?? ""}
                          placeholder={p.example !== undefined ? String(p.example) : schemaTypeLabel(spec, p.schema)}
                          onChange={(e) => setParam(p, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {bodyContent && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="ts-label !mb-0">Request body{bodyContentType ? ` · ${bodyContentType}` : ""}</span>
                      <button type="button" onClick={handleFormat} className="btn-ghost !py-1 !px-2 !text-[11px]">
                        Format JSON
                      </button>
                    </div>
                    <textarea
                      className="ts-textarea ts-input-mono !text-[11.5px] min-h-[150px]"
                      value={effectiveBody}
                      spellCheck={false}
                      onChange={(e) => {
                        setBodyTouched(true);
                        setBodyText(e.target.value);
                      }}
                    />
                  </div>
                )}

                {bodyError && (
                  <div className="text-[11.5px] rounded-[6px] px-2.5 py-2" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--red-border)" }}>
                    {bodyError}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleExecute} disabled={sending} className="btn-primary text-[12px] inline-flex items-center gap-2">
                    {sending ? <Spinner /> : null}
                    {sending ? "Sending…" : "Execute"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setParamValues({});
                      setBodyTouched(false);
                      setBodyText("");
                      setResult(null);
                      setBodyError(null);
                    }}
                    className="btn-secondary text-[12px]"
                  >
                    Reset
                  </button>
                </div>

                {/* ── Response ── */}
                {result && result.phase === "done" && (
                  <div className="space-y-2">
                    <div className="flex items-center flex-wrap gap-2">
                      <StatusBadge code={result.status} />
                      <span className="ts-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
                        {result.duration} ms
                      </span>
                      <span className="ts-mono text-[11px]" style={{ color: "var(--text-dim)" }}>
                        {result.size} B
                      </span>
                      {result.contentType && (
                        <span className="ts-mono text-[10.5px]" style={{ color: "var(--text-dim)" }}>
                          {result.contentType}
                        </span>
                      )}
                    </div>
                    {result.headers.length > 0 && (
                      <details className="rounded-[6px]" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
                        <summary className="cursor-pointer px-2.5 py-1.5 text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                          Response headers ({result.headers.length})
                        </summary>
                        <div className="px-2.5 py-2 space-y-1">
                          {result.headers.map(([k, v]) => (
                            <div key={k} className="ts-mono text-[11px] break-all">
                              <span style={{ color: "var(--accent-text)" }}>{k}</span>
                              <span style={{ color: "var(--text-dim)" }}>: </span>
                              <span style={{ color: "var(--text-secondary)" }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    <CodeBlock code={result.bodyText || "(empty response body)"} label="Response body" maxHeight="420px" />
                  </div>
                )}

                {result && result.phase === "error" && (
                  <div className="rounded-[6px] px-3 py-2 space-y-1" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--red-border)" }}>
                    <div className="text-[12px] font-semibold">
                      Request failed after {result.duration} ms
                    </div>
                    <div className="ts-mono text-[11px] break-all">{result.message}</div>
                    {result.connectionFailed && (
                      <div className="text-[11px] leading-[17px]" style={{ color: "var(--red-text)" }}>
                        The browser blocked or could not reach the target. Check that the server is running, the URL is
                        correct, and that it sends CORS headers allowing this origin, method and any custom headers.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
