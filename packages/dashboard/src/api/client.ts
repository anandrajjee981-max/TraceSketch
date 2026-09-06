import type { TracesResponse, TraceResponse, TimelineResponse } from "../types";

// Base is read at runtime: VITE_COLLECTOR_URL="" -> use relative via Vite proxy; else absolute.
function getApiBase(): string {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  return (env?.VITE_COLLECTOR_URL ?? "").replace(/\/$/, "");
}

function getInstanceId(): string {
  const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
  return env?.VITE_INSTANCE_ID ?? "inst_placeholder_12345";
}

function apiUrl(path: string, baseOverride?: string): string {
  const base = baseOverride !== undefined ? baseOverride.replace(/\/$/, "") : getApiBase();
  return base ? `${base}${path}` : path;
}

function headers(instanceId?: string): HeadersInit {
  const id = instanceId ?? getInstanceId();
  return {
    "Content-Type": "application/json",
    "x-instance-id": id,
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

// For ConfigContext fallback — fetch instance_id
export async function fetchInstanceId(apiBaseUrl?: string): Promise<string> {
  const url = apiUrl("/instance", apiBaseUrl);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { instance_id: string };
  return data.instance_id;
}
