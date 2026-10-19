import { Request, Response } from "express";
import { checkInstanceExists, generateTraceId, insertTrace, getTrace, getAllTraces, checkhashsecret } from "../dao/trace.dao";
import { saveOpenApiDocFromTrace } from "../dao/openApi";
import {redactSensitiveData} from '../utils/redact'

// The SDK serializes the response body before sending it, so parse it back to
// redact any sensitive values, then re-serialize for storage. Non-JSON bodies
// are stored verbatim.
function serializeResponseBody(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'string') {
    try {
      return JSON.stringify(redactSensitiveData(JSON.parse(value)));
    } catch {
      return value;
    }
  }
  return JSON.stringify(redactSensitiveData(value));
}

export async function createTrace(req: Request, res: Response) {
  try {
    const instanceId = req.headers['x-instance-id'] as string;
    const instanceSecret = req.headers['x-instance-secret'] as string;

    if (!instanceId || !instanceSecret) {
      return res.status(400).json({ message: "x-instance-id and x-instance-secret headers are required" });
    }

    const instanceExists = checkInstanceExists(instanceId);
    if (!instanceExists) {
      return res.status(404).json({ message: "Unknown instance" });
    }
   
    const secretValid = checkhashsecret(instanceId, instanceSecret);
    if (!secretValid) {
      return res.status(401).json({ message: "Invalid instance secret" });
    }

       const { path, method, status_code, duration, environment, repo, request_body, query_params, request_headers, response_body, response_headers, response_truncated, response_size } = req.body;
       if (response_size > 100000) { // 100kb limit
        return res.status(400).json({ message: "response_size exceeds the limit of 100kb" });
       }

    // Redact sensitive data from headers, body, and queryParams
    const redactedHeaders = redactSensitiveData(request_headers);
    const redactedBody = redactSensitiveData(request_body);
    const redactedQueryParams = redactSensitiveData(query_params);
       const headersJson = JSON.stringify(redactedHeaders ? redactedHeaders : {});
   const bodyJson = JSON.stringify(redactedBody ? redactedBody : {});
   const queryJson = JSON.stringify(redactedQueryParams ? redactedQueryParams : {});

    // Response side stays serialized; only redact when it is valid JSON.
    const responseBodyJson = serializeResponseBody(response_body);
    const responseHeadersJson = response_headers ? JSON.stringify(redactSensitiveData(response_headers)) : null;
    const responseTruncatedValue = response_truncated ? 1 : 0;
    // Backfill from the stored body so hand-crafted/old-SDK payloads that omit
    // response_size don't end up as NULL when we actually have the body.
    const responseSizeValue =
      typeof response_size === 'number'
        ? response_size
        : responseBodyJson != null
          ? Buffer.byteLength(responseBodyJson, 'utf8')
          : null;

    if (!path || !method) {
      return res.status(400).json({ message: "method and path are required" });
    }

    const traceId = generateTraceId();
    const createdAt = Date.now();
    const expiresAt = createdAt + 86400000; // 24 hours
   

 const success = insertTrace(
  traceId,
  instanceId,
  repo ?? null,
  method,
  path,
  status_code,
  duration,
  environment ?? "local",
  bodyJson,       // request_body
  queryJson,      // query_params
  headersJson,    // request_headers
  createdAt,
  expiresAt,
  responseBodyJson,      // response_body
  responseHeadersJson,   // response_headers
  responseTruncatedValue, // response_truncated
  responseSizeValue      // response_size
);

    if (!success) {
      return res.status(500).json({ message: "Failed to save trace" });
    }

    // Auto-generate and save an OpenAPI doc from the captured trace. Best effort:
    // a failure here must never reject an otherwise-saved trace.
    try {
      let responseBodyObj: unknown = null;
      if (responseBodyJson) {
        try {
          responseBodyObj = JSON.parse(responseBodyJson);
        } catch {
          responseBodyObj = responseBodyJson;
        }
      }
      saveOpenApiDocFromTrace({
        traceId,
        instanceId,
        repo,
        method,
        path,
        status_code,
        request_body: redactedBody,
        query_params: redactedQueryParams,
        request_headers: redactedHeaders,
        response_body: responseBodyObj,
        response_headers: responseHeadersJson ? JSON.parse(responseHeadersJson) : undefined,
      });
    } catch (err) {
      console.error('[traceSketch] openapi doc generation failed (non-fatal)', err);
    }

    res.status(200).json({ message: "trace created successfully", trace_id: traceId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}

export async function gettrace(req: Request, res: Response) {
  try {
    const traceId = Array.isArray(req.params.traceId) ? req.params.traceId[0] : req.params.traceId;
    const trace = getTrace(traceId);
    if (!trace) {
      return res.status(404).json({ message: "trace not found" });
    }
    res.status(200).json({ message: "trace found", trace: trace });
  } catch (err) {
    res.status(500).json({ message: "internal server error" });
  }
}


export async function getalltrace(req :Request,res:Response){
  try{
const traces = getAllTraces();
res.status(200).json({ message: "traces found", traces: traces });
  }
  catch(err){
    res.status(500).json({ message: "internal server error" });
  }
}

