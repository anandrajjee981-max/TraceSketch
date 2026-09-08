import { Request, Response } from "express";
import { checkInstanceExists, generateTraceId, insertTrace,getTrace,getallTrace, checkhashsecret } from "../dao/trace.dao";
import {redactSensitiveData} from '../utils/redact'

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

       const { path, method, status_code, duration, environment, request_body, query_params, request_headers } = req.body;

    // Redact sensitive data from headers, body, and queryParams
    const redactedHeaders = redactSensitiveData(request_headers);
    const redactedBody = redactSensitiveData(request_body);
    const redactedQueryParams = redactSensitiveData(query_params);
       const headersJson = JSON.stringify(redactedHeaders ? redactedHeaders : {});
   const bodyJson = JSON.stringify(redactedBody ? redactedBody : {});
   const queryJson = JSON.stringify(redactedQueryParams ? redactedQueryParams : {});

    if (!path || !method) {
      return res.status(400).json({ message: "method and path are required" });
    }

    const traceId = generateTraceId();
    const createdAt = Date.now();
    const expiresAt = createdAt + 86400000; // 24 hours
   

 const success = insertTrace(
  traceId,
  instanceId,
  method,
  path,
  status_code,
  duration,
  environment ?? "local",
  bodyJson,       // request_body
  queryJson,      // query_params
  headersJson,    // request_headers
  createdAt,
  expiresAt
);

    if (!success) {
      return res.status(500).json({ message: "Failed to save trace" });
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
const traces = getallTrace();
res.status(200).json({ message: "traces found", traces: traces });
  }
  catch(err){
    res.status(500).json({ message: "internal server error" });
  }
}

