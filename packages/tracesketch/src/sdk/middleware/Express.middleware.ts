import { Request, Response ,NextFunction} from "express";
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface TraceSketchOptions {
  docs?: {
    repo?: string;
  };
}

const INSTANCE_FILE = path.join(os.homedir(), '.tracesketch', 'config', 'instance.json');

function getInstanceCredentials() {
  try {
    if (!fs.existsSync(INSTANCE_FILE)) {
      console.warn(`[traceSketch] instance file not found at ${INSTANCE_FILE}`);
      return null;
    }
    const raw = fs.readFileSync(INSTANCE_FILE, 'utf-8');
    return JSON.parse(raw) as { instance_id: string; secret: string };
  } catch (err) {
    console.error('[traceSketch] failed to read instance credentials', err);
    return null;
  }
}
const MAX_RESPONSE_CAPTURE = 100000; // 100kb, matches collector's limit

export function expressmiddleware(options: TraceSketchOptions = {}) {
  const repo = options?.docs?.repo || 'unknown';

  return function middleware(req:Request,res:Response,next:NextFunction){
    if (req.headers['x-tracesketch-cli'] === 'true') {
      next();
      return;
    }

    // STEP 1: Request shuru hote hi note karo
    const startTime = Date.now();

    // STEP 1b: Capture the outgoing response so the finish handler can report it.
    // res.locals is only ever populated here, so wrap the two commit points
    // (res.json -> res.send internally, and res.send for plain payloads).
    let responseCaptured = false;
    const captureResponse = (payload: unknown) => {
      if (responseCaptured) return;
      responseCaptured = true;
      try {
        let serialized: string;
        if (typeof payload === 'string') {
          serialized = payload;
        } else if (Buffer.isBuffer(payload)) {
          serialized = payload.toString('utf8');
        } else if (payload === undefined || payload === null) {
          serialized = '';
        } else {
          serialized = JSON.stringify(payload);
        }

        // Cap by bytes (not chars) so multibyte responses never exceed the
        // collector's 100kb limit and get the whole trace rejected.
        let buf = Buffer.from(serialized, 'utf8');
        if (buf.length > MAX_RESPONSE_CAPTURE) {
          buf = buf.subarray(0, MAX_RESPONSE_CAPTURE);
          res.locals.responseTruncated = true;
        } else {
          res.locals.responseTruncated = false;
        }

        let stored = buf.toString('utf8');
        // Cutting a multibyte char at the byte boundary can re-expand when the
        // replacement char is re-encoded, so trim until the string fits.
        while (Buffer.byteLength(stored, 'utf8') > MAX_RESPONSE_CAPTURE) {
          stored = stored.slice(0, -1);
        }
        res.locals.responseBody = stored;
        res.locals.responseSize = Buffer.byteLength(stored, 'utf8');
      } catch (err) {
        res.locals.responseBody = undefined;
        res.locals.responseSize = undefined;
        res.locals.responseTruncated = undefined;
      }
    };

    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    (res as any).json = (payload?: unknown) => {
      captureResponse(payload);
      return originalJson(payload as any);
    };
    (res as any).send = (payload?: unknown) => {
      captureResponse(payload);
      return originalSend(payload as any);
    };

    res.on('finish', () => {
      try {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        const creds = getInstanceCredentials();
        if (!creds) return;

        fetch('http://localhost:4000/traces', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-instance-id': creds.instance_id,
            'x-instance-secret': creds.secret
          },
          body: JSON.stringify({
            method: req.method,
            path: req.path,
            status_code: statusCode,
            duration: duration,
            repo: repo,
            environment: "local",
            request_headers: req.headers,
      request_body: req.body,
      query_params: req.query,
      response_body: res.locals.responseBody,
      response_headers: res.getHeaders(),
      response_truncated: res.locals.responseTruncated,
      response_size: res.locals.responseSize
          })
        }).then(async (r) => {
          if (!r.ok) {
            const body = await r.text().catch(() => '');
            console.error(`[traceSketch] collector responded ${r.status}: ${body}`);
          }
        }).catch((err) => {
          console.error('[traceSketch] failed to send trace', err);
        });
      } catch (err) {
        console.error('[traceSketch] unexpected error in finish handler', err);
      }
    })

    res.on('close', () => {
      // fallback if finish not emitted (e.g. client aborted)
      if (!res.writableFinished) {
        // same logic could be duplicated, but we keep finish as primary
      }
    });

    next();
  };
}



