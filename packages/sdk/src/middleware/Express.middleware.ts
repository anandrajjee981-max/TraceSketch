import { Request, Response ,NextFunction} from "express";
import fs from 'fs';
import path from 'path';
import os from 'os';

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
export function expressmiddleware(req:Request,res:Response,next:NextFunction){
    if (req.headers['x-tracesketch-cli'] === 'true') {
      next();
      return;
    }

    // STEP 1: Request shuru hote hi note karo
    const startTime = Date.now();

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
            request_headers: req.headers,
      request_body: req.body,
      query_params: req.query
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
}



