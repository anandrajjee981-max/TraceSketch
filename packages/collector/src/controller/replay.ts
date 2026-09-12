import { getTrace } from "../dao/trace.dao";
import { getAllReplays, getReplaysByTraceId, insertReplayRun } from "../dao/replay.dao";
import { Request, Response } from "express";

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

    const { method, path, request_body, request_headers, trace_id } = trace as any;

    const parsedHeaders = request_headers ? JSON.parse(request_headers) : {};
    const parsedBody = request_body ? JSON.parse(request_body) : {};

    const fullUrl = targetBaseUrl + path;
    try {
      const parsedUrl = new URL(fullUrl);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return res.status(400).json({ message: "target_base_url must use http or https" });
      }
    } catch {
      return res.status(400).json({ message: `Invalid target URL: ${fullUrl}` });
    }

    const startTime = Date.now();

    const response = await fetch(fullUrl, {
      method: method,
      headers: parsedHeaders,
      body: method !== 'GET' ? JSON.stringify(parsedBody) : undefined
    });

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
      return res.status(502).json({ message: `Could not connect to ${targetBaseUrl}. Make sure the target server is running.` });
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


