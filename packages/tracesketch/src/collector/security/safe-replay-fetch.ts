import { validateUrl } from "./url-validator";
import { resolveAndValidate } from "./ip-validator";

export const DEFAULT_REPLAY_TIMEOUT_MS = 7000;

export type SafeReplayFailureReason =
  | "invalid_url"
  | "private_target"
  | "timeout"
  | "connection_refused"
  | "bad_port"
  | "error";

export type SafeReplayFetchResult =
  | { ok: true; response: globalThis.Response; durationMs: number }
  | { ok: false; reason: SafeReplayFailureReason; error?: unknown };

export interface SafeReplayFetchOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export async function safeReplayFetch(
  options: SafeReplayFetchOptions
): Promise<SafeReplayFetchResult> {
  const { url, method = "GET", headers, body, timeoutMs = DEFAULT_REPLAY_TIMEOUT_MS } = options;

  if (!validateUrl(url)) {
    return { ok: false, reason: "invalid_url" };
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return { ok: false, reason: "invalid_url" };
  }

  const allowed = await resolveAndValidate(hostname);
  if (!allowed) {
    return { ok: false, reason: "private_target" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const response = await fetch(options.url, {
      method: options.method ?? "GET",
      headers: options.headers,
      body: options.body,
      signal: controller.signal,
      redirect: "manual",
    } as RequestInit);
    return { ok: true, response, durationMs: Date.now() - startTime };
  } catch (err) {
    const cause = (err as Error & { cause?: { code?: string; message?: string } }).cause;
    if ((err as Error).name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    if (cause?.code === "ECONNREFUSED") {
      return { ok: false, reason: "connection_refused" };
    }
    if (cause?.message === "bad port") {
      return { ok: false, reason: "bad_port" };
    }
    return { ok: false, reason: "error", error: err };
  } finally {
    clearTimeout(timeout);
  }
}
