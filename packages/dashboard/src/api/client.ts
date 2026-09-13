import type { TracesResponse, TraceResponse, TimelineResponse, ReplaysResponse, ReplayResult, RegressionsResponse, RegressionRunResult } from "../types";

// Base is read at runtime: VITE_COLLECTOR_URL="" -> use relative via Vite proxy; else absolute.
function getApiBase(): string {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  return (env?.VITE_COLLECTOR_URL ?? "").replace(/\/$/, "");
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
