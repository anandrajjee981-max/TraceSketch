import { getTrace } from "../dao/trace.dao";
import { getAllReplays, getReplaysByTraceId, insertReplayRun } from "../dao/replay.dao";
import { Request, Response } from "express";
import { stripUnsafeHeaders } from "../utils/headers";

export async function replayTrace(req: Request, res: Response) {
  const targetBaseUrl = typeof req.body?.target_base_url === "string"
    ? req.body.target_base_url.trim()
    : "";

  try {
    const traceId = Array.isArray(req.params.traceId)
      ? req.params.traceId[0]
      : req.params.traceId;
    if (!targetBaseUrl) {
      return res.status(400).json({ message: "target_base_url is required" });
    }

    const trace = getTrace(traceId);

    if (!trace) {
      return res.status(404).json({ message: "trace not found" });
    }

    const { method, path, request_body, request_headers, query_params, trace_id } = trace as any;

    const rawHeaders = request_headers ? JSON.parse(request_headers) : {};
    stripUnsafeHeaders(rawHeaders as Record<string, any>);
    const parsedBody = request_body ? JSON.parse(request_body) : null;

    // strip hop-by-hop / host headers that cause 408/timeout on target
    const hopByHop = new Set(["host","connection","keep-alive","proxy-connection","transfer-encoding","content-length","te","trailer","upgrade","x-instance-id","x-instance-secret"]);
    const headers: Record<string,string> = {};
    for (const [k,v] of Object.entries(rawHeaders as Record<string, unknown>)) {
      if (hopByHop.has(k.toLowerCase())) continue;
      if (v == null) continue;
      headers[k] = Array.isArray(v) ? v.join(", ") : String(v);
    }
    if (!headers["content-type"] && !headers["Content-Type"]) headers["content-type"] = "application/json";

    // build full URL with query params if present
    let fullUrl = targetBaseUrl.replace(/\/$/, "") + path;
    if (query_params) {
      try {
        const qp = JSON.parse(query_params);
        if (qp && typeof qp === "object" && Object.keys(qp).length > 0) {
          const qs = new URLSearchParams(qp as Record<string,string>).toString();
          fullUrl += (fullUrl.includes("?") ? "&" : "?") + qs;
        }
      } catch {}
    }
    try {
      const parsedUrl = new URL(fullUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).json({ message: "target_base_url must use http or https" });
      }
    } catch {
      return res.status(400).json({ message: `Invalid target URL: ${fullUrl}` });
    }

    const hasBody = method !== 'GET' && method !== 'HEAD' && parsedBody != null && !(typeof parsedBody === 'object' && Object.keys(parsedBody).length === 0);
    const body = hasBody ? JSON.stringify(parsedBody) : undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    const startTime = Date.now();

    let response: globalThis.Response;
    try {
      response = await fetch(fullUrl, {
        method: method,
        headers,
        body,
        signal: controller.signal,
      } as RequestInit);
    } catch (fetchErr) {
      clearTimeout(timeout);
      if ((fetchErr as Error).name === "AbortError") {
        try { insertReplayRun(trace_id, targetBaseUrl, 408, Date.now() - startTime, "timeout", Date.now()); } catch {}
        return res.status(408).json({ message: `Request to ${fullUrl} timed out after 7s. Is the target server running?` });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }

    const durationMs = Date.now() - startTime;
    const responseStatus = response.status;

    const saved = insertReplayRun(
      trace_id,
      targetBaseUrl,
      responseStatus,
      durationMs,
      "completed",
      Date.now()
    );

    if (!saved) {
      return res.status(500).json({ message: "Replay ran but failed to save result" });
    }

    res.status(200).json({
      message: "replay completed",
      original: {
        status_code: (trace as any).status_code,
        duration_ms: (trace as any).duration_ms
      },
      replay: {
        status_code: responseStatus,
        duration_ms: durationMs
      }
    });

  } catch (err) {
    console.error(err);
    // Try to persist failed attempt if we can identify the trace
    try {
      const tid = (req.params.traceId as string) ?? "unknown";
      insertReplayRun(tid, targetBaseUrl, 0, 0, "failed", Date.now());
    } catch {
      // ignore
    }
    const cause = err instanceof Error && "cause" in err
      ? (err as Error & { cause?: { code?: string; message?: string } }).cause
      : undefined;
    if (cause?.message === "bad port") {
      return res.status(400).json({ message: "Invalid target URL port. Use a valid HTTP port; the test app uses http://localhost:6001." });
    }
    if (cause?.code === "ECONNREFUSED") {
      return res.status(502).json({ message: `Could not connect to ${targetBaseUrl}. Make sure the target server is running (test app default is http://localhost:6001).` });
    }
    if ((err as Error).name === "AbortError") {
      return res.status(408).json({ message: `Request to ${targetBaseUrl} timed out after 7s.` });
    }
    res.status(500).json({ message: "internal server error" });
  }
}

export async function listReplaysForTrace(req: Request, res: Response) {
  try {
    const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId;
    const trace = getTrace(traceId);
    if (!trace) return res.status(404).json({ message: "trace not found" });
    const replays = getReplaysByTraceId(traceId);
    res.status(200).json({ message: "replays found", replays });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}

export async function listAllReplays(req: Request, res: Response) {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const replays = getAllReplays(Number.isFinite(limit) ? limit : 50);
    res.status(200).json({ message: "replays found", replays });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}


