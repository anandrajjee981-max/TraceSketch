import { Request,Response } from "express";
import { getTrace } from "../dao/trace.dao";
import { getRegressionsByTraceId, insertregression ,getRegressionById} from "../dao/regression.dao";


export async function postregression(req: Request, res: Response) {
  try {
    const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId;

    const trace = getTrace(traceId);
    if (!trace) {
      return res.status(404).json({ message: "trace not found" });
    }
    const { name, expected_status, expected_schema } = req.body as {
      name?: unknown;
      expected_status?: unknown;
      expected_schema?: string | null;
    };
    const source_trace_id = traceId;

    // Validation — give precise 400 instead of silent 500
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "name is required (non-empty string)" });
    }
    const expectedStatusNum = Number(expected_status);
    if (!Number.isFinite(expectedStatusNum) || expectedStatusNum < 100 || expectedStatusNum > 599) {
      return res.status(400).json({ message: "expected_status must be a valid HTTP status (100-599)" });
    }
    const cleanName = name.trim();

    const ok = insertregression(source_trace_id, cleanName, expectedStatusNum, expected_schema ?? null);
    if (!ok) {
      return res.status(500).json({
        message: "regression not submitted — DB insert failed, check server logs",
      });
    }
    // Return created row for immediate UI use
    const created = getRegressionsByTraceId(source_trace_id)[0] ?? null;
    return res.status(200).json({
      message: "regression test submitted successfully",
      regression: created,
    });
  } catch (err) {
    console.error("[postregression]", err);
    return res.status(500).json({
      message: "internal server error",
    });
  }
}

export async function getregression(req:Request,res:Response){
try{
const sourceTraceId = Array.isArray(req.params.traceId)
  ? req.params.traceId[0]
  : req.params.traceId;

const trace = getTrace(sourceTraceId);
if (!trace) {
  return res.status(404).json({ message: "trace not found" });
}

const regressions = getRegressionsByTraceId(sourceTraceId);
return res.status(200).json({ message: "regressions found", regressions });
}
catch(err){
console.error(err);
return res.status(500).json({ message: "internal server error" });
}

}

function buildReplayHeaders(rawHeaders: Record<string, unknown>): Record<string, string> {
  const hopByHop = new Set([
    "host",
    "connection",
    "keep-alive",
    "proxy-connection",
    "transfer-encoding",
    "content-length",
    "te",
    "trailer",
    "upgrade",
    "x-instance-id",
    "x-instance-secret",
  ]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawHeaders)) {
    if (hopByHop.has(k.toLowerCase())) continue;
    if (v == null) continue;
    out[k] = Array.isArray(v) ? v.join(", ") : String(v);
  }
  // ensure json content-type when we send a body
  if (!out["content-type"] && !out["Content-Type"]) {
    out["content-type"] = "application/json";
  }
  return out;
}

function buildFullUrl(targetBaseUrl: string, path: string, queryParamsRaw?: string): string {
  const base = targetBaseUrl.replace(/\/$/, "");
  // path may be /api/payment without query; query_params is stored as JSON string
  let url = base + path;
  if (queryParamsRaw) {
    try {
      const qp = JSON.parse(queryParamsRaw);
      if (qp && typeof qp === "object" && Object.keys(qp).length > 0) {
        const qs = new URLSearchParams(qp as Record<string, string>).toString();
        url += (url.includes("?") ? "&" : "?") + qs;
      }
    } catch {
      // ignore parse error
    }
  }
  return url;
}

export async function ReplayRegression(req:Request,res:Response){
  try{
const sourceTraceId = Array.isArray(req.params.traceId)
  ? req.params.traceId[0]
  : req.params.traceId;

const regressionId = Array.isArray(req.params.regressionId)
?req.params.regressionId[0]
:req.params.regressionId;
const trace = await getTrace(sourceTraceId)
if(!trace){
  return res.status(404).json({
    message:"trace not found"
  })
}
const {method, path, request_body, request_headers, query_params} = trace as any
const { target_base_url } = req.body as { target_base_url?: string };
if (!target_base_url) {
  return res.status(400).json({ message: "target_base_url is required" });
}

const regression = getRegressionById(regressionId)
if(!regression){
    return res.status(404).json({
    message:"regression not found"
  })
}
const {expected_status } = regression as any ;
let fullUrl: string;
try {
  fullUrl = buildFullUrl(target_base_url, path, query_params);
  const parsed = new URL(fullUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return res.status(400).json({ message: "target_base_url must use http or https" });
  }
} catch {
  return res.status(400).json({ message: `Invalid target URL: ${target_base_url + path}` });
}
    const rawHeaders = request_headers ? JSON.parse(request_headers) : {};
    const parsedBody = request_body ? JSON.parse(request_body) : null;
    const headers = buildReplayHeaders(rawHeaders as Record<string, unknown>);

    const hasBody = method !== 'GET' && method !== 'HEAD' && parsedBody != null && !(typeof parsedBody === 'object' && Object.keys(parsedBody).length === 0);
    const body = hasBody ? JSON.stringify(parsedBody) : undefined;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    let fetchResponse: globalThis.Response;
    try {
      fetchResponse = await fetch(fullUrl, {
        method: method,
        headers,
        body,
        signal: controller.signal,
      } as RequestInit);
    } catch (fetchErr) {
      clearTimeout(timeout);
      const cause = (fetchErr as Error & { cause?: { code?: string } })?.cause;
      if ((fetchErr as Error).name === "AbortError") {
        return res.status(408).json({ message: `Request to ${fullUrl} timed out after 7s. Is the target server running?`, expected_status, actual_status: 408 });
      }
      if (cause?.code === "ECONNREFUSED") {
        return res.status(502).json({ message: `Could not connect to ${target_base_url}. Make sure the target server is running (test app default is http://localhost:6001).`, expected_status, actual_status: 502 });
      }
      throw fetchErr;
    } finally {
      clearTimeout(timeout);
    }
    const actual_status = fetchResponse!.status;
    const passed = actual_status === expected_status;
    // Always 200 with passed flag; keep message for backwards compat. Old dashboard treats 404+body as valid too.
    return res.status(200).json({
      message: passed ? "passed regression" : "failed regression",
      expected_status,
      actual_status,
      passed,
    });

  }
  catch(err){
    console.error("[ReplayRegression]", err);
    res.status(500).json({
      message:"internal server error"
    })
  }
}










