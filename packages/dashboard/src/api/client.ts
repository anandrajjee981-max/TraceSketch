import type { TracesResponse, TraceResponse, TimelineResponse, ReplaysResponse, ReplayResult, RegressionsResponse, RegressionRunResult } from "../types";

// Base is read at runtime: VITE_COLLECTOR_URL="" -> use relative via Vite proxy; else absolute.
function getApiBase(): string {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  const configuredBase = env?.VITE_COLLECTOR_URL;
  const defaultBase = env?.PROD ? "http://localhost:4000" : "";
  return (configuredBase ?? defaultBase).replace(/\/$/, "");
}

// Relay server base URL — separate Express + Socket.io + MongoDB backend.
// Override via VITE_RELAY_URL env var; defaults to https://tracesketch.onrender.com for prod.
export function getRelayBase(): string {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  const RELAY_BASE_URL = env?.VITE_RELAY_URL ?? "https://tracesketch.onrender.com";
  return RELAY_BASE_URL.replace(/\/$/, "");
}

function getInstanceId(): string {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  return env?.VITE_INSTANCE_ID ?? "inst_placeholder_12345";
}

function getInstanceSecret(): string {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  return env?.VITE_INSTANCE_SECRET ?? "secret_placeholder_12345";
}

function apiUrl(path: string, baseOverride?: string): string {
  const base = baseOverride !== undefined ? baseOverride.replace(/\/$/, "") : getApiBase();
  return base ? `${base}${path}` : path;
}

function headers(instanceId?: string, instanceSecret?: string): HeadersInit {
  const id = instanceId ?? getInstanceId();
  const secret = instanceSecret ?? getInstanceSecret();
  return {
    "Content-Type": "application/json",
    "x-instance-id": id,
    "x-instance-secret": secret,
  };
}

async function fetchJson<T>(url: string, instanceId?: string): Promise<T> {
  const res = await fetch(url, { headers: headers(instanceId) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// Low-level helpers that accept explicit instanceId + base (used by pages via useConfig)
export function getTraces(opts?: { instanceId?: string; apiBaseUrl?: string }): Promise<TracesResponse> {
  return fetchJson<TracesResponse>(apiUrl("/traces", opts?.apiBaseUrl), opts?.instanceId);
}

export function getTrace(traceId: string, opts?: { instanceId?: string; apiBaseUrl?: string }): Promise<TraceResponse> {
  return fetchJson<TraceResponse>(apiUrl(`/traces/${encodeURIComponent(traceId)}`, opts?.apiBaseUrl), opts?.instanceId);
}

export function getTimeline(traceId: string, opts?: { instanceId?: string; apiBaseUrl?: string }): Promise<TimelineResponse> {
  return fetchJson<TimelineResponse>(apiUrl(`/traces/${encodeURIComponent(traceId)}/timeline`, opts?.apiBaseUrl), opts?.instanceId);
}

// ---- Replay ----
export async function replayTrace(
  traceId: string,
  targetBaseUrl: string,
  opts?: { instanceId?: string; instanceSecret?: string; apiBaseUrl?: string }
): Promise<ReplayResult> {
  const effectiveBase = opts?.apiBaseUrl !== undefined ? opts.apiBaseUrl : getApiBase();
  const url = apiUrl(`/traces/${encodeURIComponent(traceId)}/replay`, effectiveBase);
  const res = await fetch(url, {
    method: "POST",
    headers: headers(opts?.instanceId, opts?.instanceSecret),
    body: JSON.stringify({ target_base_url: targetBaseUrl }),
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) message = parsed.message;
    } catch {
      // keep raw text
    }
    throw new Error(message || `HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<ReplayResult>;
}

export function getReplaysForTrace(
  traceId: string,
  opts?: { instanceId?: string; apiBaseUrl?: string }
): Promise<ReplaysResponse> {
  return fetchJson<ReplaysResponse>(apiUrl(`/traces/${encodeURIComponent(traceId)}/replays`, opts?.apiBaseUrl), opts?.instanceId);
}

export function getAllReplays(opts?: { instanceId?: string; apiBaseUrl?: string; limit?: number }): Promise<ReplaysResponse> {
  const q = opts?.limit ? `?limit=${opts.limit}` : "";
  return fetchJson<ReplaysResponse>(apiUrl(`/traces/replays${q}`, opts?.apiBaseUrl), opts?.instanceId);
}

export function getAllRegressions(opts?: { instanceId?: string; apiBaseUrl?: string; limit?: number }): Promise<RegressionsResponse> {
  const q = opts?.limit ? `?limit=${opts.limit}` : "";
  return fetchJson<RegressionsResponse>(apiUrl(`/traces/regressions${q}`, opts?.apiBaseUrl), opts?.instanceId);
}


// ---- Regression Tests ----
export async function createRegression(
  traceId: string,
  name: string,
  expectedStatus: number,
  opts?: { instanceId?: string; instanceSecret?: string; apiBaseUrl?: string }
): Promise<{ message: string; regression?: unknown }> {
  const effectiveBase = opts?.apiBaseUrl !== undefined ? opts.apiBaseUrl : getApiBase();
  const url = apiUrl(`/traces/${encodeURIComponent(traceId)}/regression`, effectiveBase);
  const res = await fetch(url, {
    method: "POST",
    headers: headers(opts?.instanceId, opts?.instanceSecret),
    body: JSON.stringify({ name, expected_status: expectedStatus }),
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
  return res.json() as Promise<{ message: string; regression?: unknown }>;
}

export async function getRegressions(
  traceId: string,
  opts?: { instanceId?: string; instanceSecret?: string; apiBaseUrl?: string }
): Promise<RegressionsResponse> {
  const effectiveBase = opts?.apiBaseUrl !== undefined ? opts.apiBaseUrl : getApiBase();
  const url = apiUrl(`/traces/${encodeURIComponent(traceId)}/regression`, effectiveBase);
  const res = await fetch(url, {
    headers: headers(opts?.instanceId, opts?.instanceSecret),
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
  return res.json() as Promise<RegressionsResponse>;
}

export async function runRegression(
  traceId: string,
  regressionId: string | number,
  targetBaseUrl: string,
  opts?: { instanceId?: string; instanceSecret?: string; apiBaseUrl?: string }
): Promise<RegressionRunResult> {
  const effectiveBase = opts?.apiBaseUrl !== undefined ? opts.apiBaseUrl : getApiBase();
  const url = apiUrl(`/traces/${encodeURIComponent(traceId)}/regression/${encodeURIComponent(String(regressionId))}/run`, effectiveBase);
  const res = await fetch(url, {
    method: "POST",
    headers: headers(opts?.instanceId, opts?.instanceSecret),
    body: JSON.stringify({ target_base_url: targetBaseUrl }),
  });
  const text = await res.text();
  let data: RegressionRunResult | null = null;
  try {
    data = JSON.parse(text) as RegressionRunResult;
  } catch {
    // not json
  }
  // Collector returns expected/actual for PASS(200), FAIL(legacy 404), and error stubs (408/502). Treat any with those fields as success.
  if (data && typeof data.expected_status !== "undefined" && typeof data.actual_status !== "undefined") {
    return data;
  }
  if (!res.ok) {
    let message = text;
    if (data && (data as { message?: string }).message) message = (data as { message?: string }).message!;
    throw new Error(message || `HTTP ${res.status}: ${res.statusText}`);
  }
  if (!data) throw new Error(text || `HTTP ${res.status}`);
  return data;
}

// For ConfigContext fallback — fetch instance_id
export async function fetchInstanceId(apiBaseUrl?: string): Promise<string> {
  const url = apiUrl("/instance", apiBaseUrl);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { instance_id: string };
  return data.instance_id;
}

// ---- Group History ----
//
// Source of truth is the RELAY's shared `group_history` collection, not the
// collector. The collector's copy is per-machine SQLite: a share written by a
// peer's browser lands on that peer's disk and is invisible to everyone else.
// The relay is a single shared store both peers write to and read from.

/**
 * A single persisted history row. Field names are snake_case because that is
 * the wire shape the relay emits (kept identical to the collector's columns so
 * the two stores stay interchangeable).
 */
export interface GroupHistoryRow {
  id: string | number;
  group_code: string;
  instance_id: string;
  entry_type: string;
  trace_id: string | null;
  data: string | null;
  /** Epoch milliseconds. */
  saved_at: number;
}

export interface GroupHistoryResponse {
  group_code: string;
  count: number;
  entries: GroupHistoryRow[];
}

/**
 * Read persisted group history from the relay. `types` maps to the server-side
 * `?types=` allowlist filter.
 */
export async function getGroupHistory(
  groupCode: string,
  opts?: { types?: string[]; relayBaseUrl?: string }
): Promise<GroupHistoryResponse> {
  const q = opts?.types?.length ? `?types=${encodeURIComponent(opts.types.join(","))}` : "";
  const base = opts?.relayBaseUrl ?? getRelayBase();
  const url = `${base}/group/${encodeURIComponent(groupCode)}/history${q}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<GroupHistoryResponse>;
}

/** Summary of one group this instance has previously taken part in. */
export interface GroupSummary {
  group_code: string;
  /** Epoch milliseconds. */
  last_activity: number;
  my_entries: number;
  share_entries: number;
  total_entries: number;
}

export interface GroupListResponse {
  instance_id: string;
  count: number;
  groups: GroupSummary[];
}

/**
 * Every group this instance has joined, most recently active first.
 *
 * Unlike the live feed (which the relay expires after 6h), this history has no
 * TTL, so previously joined sessions stay reachable from the navbar archive.
 */
export async function listMyGroups(opts?: {
  instanceId?: string;
  relayBaseUrl?: string;
}): Promise<GroupListResponse> {
  const base = opts?.relayBaseUrl ?? getRelayBase();
  const id = opts?.instanceId ?? getInstanceId();
  const res = await fetch(`${base}/history/groups?instance_id=${encodeURIComponent(id)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<GroupListResponse>;
}

// ---- Collector mirror (best effort) ----
//
// The collector keeps a per-machine copy of history for local inspection. It is
// explicitly NOT the source of truth and never gates the UI: these calls log
// and swallow failures so a local-only collector can never break the relay feed.

/**
 * Delete an archived group's history from both the relay and this machine's
 * local copy.
 *
 * Both are cleared on purpose. The navbar list and the archive view both read
 * from the relay, so deleting only the local copy would leave the entry in the
 * list and still render from the relay — the button would look broken. The
 * local copy is dropped best-effort: the relay is the copy that is actually
 * visible, so a collector hiccup must not fail the whole action.
 */
export async function deleteGroupHistory(
  groupCode: string,
  opts: { instanceId?: string; apiBaseUrl?: string; relayBaseUrl?: string }
): Promise<{ ok: boolean; deleted: number; message?: string }> {
  const instanceId = opts.instanceId ?? getInstanceId();
  const base = opts.relayBaseUrl ?? getRelayBase();

  const res = await fetch(`${base}/group/${encodeURIComponent(groupCode)}/history`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    deleted?: number;
    message?: string;
  };

  if (!res.ok) {
    return { ok: false, deleted: 0, message: data.message ?? `HTTP ${res.status}` };
  }

  try {
    await fetch(apiUrl(`/groups/history/${encodeURIComponent(groupCode)}`, opts.apiBaseUrl), {
      method: "DELETE",
      headers: headers(instanceId),
    });
  } catch (err) {
    console.warn(`[history] local copy for ${groupCode} not cleared:`, err);
  }

  return { ok: true, deleted: data.deleted ?? 0, message: data.message };
}

/**
 * Tell the local collector whether this machine is currently in a group.
 *
 * The collector cannot observe a browser joining a relay session on its own, so
 * this is the only way it learns to hold a relay socket for the group. It
 * persists the membership, which is what lets the collector's archiver pick the
 * group back up after a restart without any tab being open.
 */
export async function setGroupMembership(
  groupCode: string,
  active: boolean,
  opts?: { instanceId?: string; apiBaseUrl?: string }
): Promise<void> {
  try {
    const url = apiUrl("/groups/membership", opts?.apiBaseUrl);
    const res = await fetch(url, {
      method: "POST",
      headers: headers(opts?.instanceId),
      body: JSON.stringify({ group_code: groupCode, active }),
    });
    if (!res.ok) {
      console.warn(`[membership] collector rejected ${groupCode} active=${active}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`[membership] collector unreachable for ${groupCode}:`, err);
  }
}

/**
 * Mirror one entry into the collector's local group_history.
 *
 * Never throws, but no longer fails silently either: a non-2xx is logged with
 * its status, because an unchecked `fetch` here previously discarded 404s and
 * connection refusals alike and made a dead collector impossible to diagnose.
 *
 * `source_id` is the relay's message id. The collector's own relay socket
 * archives the same broadcast, and the unique index on source_id makes whichever
 * writer gets there second a no-op instead of a duplicate row.
 */
export async function recordGroupHistory(
  payload: {
    group_code: string;
    instance_id: string;
    entry_type: string;
    trace_id?: string | null;
    data?: string | null;
    source_id?: string | null;
  },
  opts?: { instanceId?: string; apiBaseUrl?: string }
): Promise<void> {
  try {
    const url = apiUrl("/groups/data", opts?.apiBaseUrl);
    const res = await fetch(url, {
      method: "POST",
      headers: headers(opts?.instanceId),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(
        `[history] collector mirror rejected ${payload.entry_type} for ${payload.group_code}: HTTP ${res.status}`
      );
    }
  } catch (err) {
    console.warn(`[history] collector mirror unreachable for ${payload.group_code}:`, err);
  }
}

/**
 * Record that this instance entered a group.
 *
 * The relay is the real target: its shared history collection is what
 * listMyGroups() reads, so skipping this leaves the navbar archive permanently
 * empty. The collector gets a best-effort copy for local inspection.
 *
 * Never throws — neither call may break the relay page. Failures are logged
 * rather than swallowed, because an unchecked fetch here previously discarded
 * 404s and connection refusals alike.
 */
export async function markGroupJoined(
  groupCode: string,
  opts?: { instanceId?: string; apiBaseUrl?: string; relayBaseUrl?: string }
): Promise<void> {
  const instanceId = opts?.instanceId ?? getInstanceId();

  // Relay first — this is the copy that matters.
  try {
    const base = opts?.relayBaseUrl ?? getRelayBase();
    const res = await fetch(`${base}/group/${encodeURIComponent(groupCode)}/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId }),
    });
    if (!res.ok) {
      console.warn(`[history] relay rejected join marker for ${groupCode}: HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn(`[history] relay unreachable for join marker ${groupCode}:`, err);
  }

  // Collector mirror.
  try {
    const url = apiUrl("/groups/history", opts?.apiBaseUrl);
    const res = await fetch(url, {
      method: "POST",
      headers: headers(instanceId),
      body: JSON.stringify({
        group_code: groupCode,
        instance_id: instanceId,
        entry_type: "joined",
      }),
    });
    if (!res.ok) {
      console.warn(`[history] collector mirror rejected join marker for ${groupCode}: HTTP ${res.status}`);
    }
} catch (err) {
    console.warn(`[history] collector mirror unreachable for join marker ${groupCode}:`, err);
  }
}

/* ---- Console (sketch CLI equivalent) ---- */

/**
 * Split a requested path into the bare path and its query params.
 *
 * Mirrors the CLI's recordToCollector splitting (packages/cli/src/index.ts:129-146)
 * including its quirk: when the caller's path carries a "?", that string wins
 * over the parsed URL pathname, because a target given as a bare host can put a
 * different prefix in front of the same query string.
 */
function splitPathAndQuery(routePath: string, fullUrl: string): {
  pathOnly: string;
  queryParams: Record<string, string>;
} {
  let pathOnly = routePath;
  const queryParams: Record<string, string> = {};

  try {
    const url = new URL(fullUrl);
    url.searchParams.forEach((v, k) => {
      queryParams[k] = v;
    });
    pathOnly = url.pathname;
    if (routePath.includes("?")) {
      pathOnly = routePath.split("?")[0];
    }
  } catch {
    if (routePath.includes("?")) {
      pathOnly = routePath.split("?")[0];
      const qs = routePath.split("?")[1];
      try {
        new URLSearchParams(qs).forEach((v, k) => {
          queryParams[k] = v;
        });
      } catch {
        // unparseable query string — record the path alone
      }
    }
  }

  return { pathOnly, queryParams };
}

/**
 * Persist a trace for a request sent from the Console page.
 *
 * This is the browser equivalent of the CLI's recordToCollector step. Without
 * it, requests only reach the Traces page when the target app happens to run
 * the traceSketch SDK — a Console aimed at a plain app, or at a failed
 * connection, would leave no trace at all.
 *
 * Runs on both the success and failure paths, exactly like the CLI, so a
 * connection refusal still shows up (coerced to 502, which is what the CLI
 * records). Never throws: a dead collector must not take down the response
 * panel, so failures come back as a message for the panel to render.
 *
 * Goes through apiUrl() rather than a hardcoded localhost:4000, which means dev
 * uses the same-origin Vite proxy and needs no CORS preflight for this call.
 */
export async function recordConsoleTrace(
  payload: {
    method: string;
    routePath: string;
    fullUrl: string;
    statusCode: number;
    duration: number;
    body?: string;
  },
  opts?: { instanceId?: string; apiBaseUrl?: string }
): Promise<{ ok: true; traceId?: string } | { ok: false; message: string }> {
  const { pathOnly, queryParams } = splitPathAndQuery(payload.routePath, payload.fullUrl);

  // Mirrors the CLI: a body is parsed into JSON when it can be, kept as a raw
  // string when it can't, and an absent body becomes {} rather than null.
  let parsedBody: unknown;
  if (payload.body) {
    try {
      parsedBody = JSON.parse(payload.body);
    } catch {
      parsedBody = payload.body;
    }
  } else {
    parsedBody = {};
  }

  try {
    const res = await fetch(apiUrl("/traces", opts?.apiBaseUrl), {
      method: "POST",
      headers: headers(opts?.instanceId),
      body: JSON.stringify({
        method: payload.method,
        path: pathOnly,
        status_code: payload.statusCode,
        duration: payload.duration,
        // Same environment label the CLI stamps, so Console-sent traces are
        // indistinguishable from real CLI ones in the Traces filter.
        environment: "cli",
        request_headers: { "content-type": "application/json", "user-agent": "sketch-cli" },
        request_body: parsedBody,
        query_params: queryParams,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: `collector responded ${res.status}: ${text || res.statusText} — trace not saved` };
    }

    const json = (await res.json().catch(() => null)) as { trace_id?: string } | null;
    return { ok: true, traceId: json?.trace_id };
  } catch (err) {
    return { ok: false, message: `could not reach collector — is \`npx tracesketch start\` running? ${err instanceof Error ? err.message : String(err)}` };
  }
}
