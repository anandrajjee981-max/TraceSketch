#!/usr/bin/env node

// sketch CLI — quick API testing tool
// Usage:
//   sketch post /api/payment 5000                  → http://localhost:5000/api/payment
//   sketch post /api/payment http://anan.com        → http://anan.com/api/payment
//   sketch post /api/payment 5000 --body '{"a":1}'  → with JSON body
import fs from 'fs';
import path from 'path';
import os from 'os';
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: sketch <method> <path> <port-or-url> [--body \'{"key":"value"}\']');
  process.exit(1);
}

const method = args[0].toUpperCase();
const routePath = args[1];
const target = args[2];

// Figure out if target is a port number or a full URL
function resolveBaseUrl(target: string): string {
  const isPureNumber = /^\d+$/.test(target);
  if (isPureNumber) {
    return `http://localhost:${target}`;
  }
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return target;
  }
  // fallback: assume it's a hostname without protocol
  return `http://${target}`;
}
function getInstanceCredentials(): { instance_id: string; secret: string } | null {
  const instanceFile = path.join(os.homedir(), '.tracesketch', 'config', 'instance.json');
  if (!fs.existsSync(instanceFile)) return null;
  const raw = fs.readFileSync(instanceFile, 'utf-8');
  return JSON.parse(raw);
}
// Parse optional --body flag
function getBodyArg(args: string[]): string | undefined {
  const idx = args.indexOf('--body');
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function run() {
  const baseUrl = resolveBaseUrl(target);
  const fullUrl = baseUrl + routePath;
  const bodyArg = getBodyArg(args);

  console.log(`→ ${method} ${fullUrl}`);

  const startTime = Date.now();

  let response: Response | null = null;
  let responseStatus = 0;
  let responseData: unknown = null;
  let duration = 0;

  try {

    response = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-tracesketch-cli': 'true',
      },
      body: bodyArg && method !== 'GET' ? bodyArg : undefined
    });

    duration = Date.now() - startTime;
    responseStatus = response.status;
    const contentType = response.headers.get('content-type') || '';
    responseData = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    console.log(`← ${responseStatus} (${duration}ms)`);
    console.log(JSON.stringify(responseData, null, 2));

    // Bonus: if the target app has traceSketch SDK installed and
    // exposes a response header with the trace id, surface it here.
    const traceId = response.headers.get('x-tracesketch-id');
    if (traceId) {
      console.log(`\n📍 Traced: ${traceId}`);
    }
  } catch (err) {
    duration = Date.now() - startTime;
    const e = err as Error & { cause?: { code?: string; message?: string } };
    const causeMsg = e.cause?.message || e.cause?.code || '';
    const detail = causeMsg ? `${e.message} (${causeMsg})` : e.message;
    console.error(`✗ Request failed: ${detail}`);
    if (e.cause?.code === 'ECONNREFUSED' || detail.includes('ECONNREFUSED')) {
      console.error(`  → Could not connect to ${fullUrl}. Is your app running on ${baseUrl}?`);
      console.error(`  Tip: start your app (e.g. node server.js) or try: sketch ${method.toLowerCase()} ${routePath} http://localhost:6001 --body '{\"test\":1}' if using packages/sdk/test.app.ts`);
    }
    // still try to record a trace for failed request so dashboard updates
    responseStatus = 0;
    try { responseData = (err as Error).message; } catch { responseData = String(err); }
  }

  // --- Always record trace to local collector so dashboard updates,
  // even when the target app has no traceSketch SDK installed ---
  await recordToCollector({
    method,
    routePath,
    statusCode: responseStatus || 502,
    duration,
    bodyArg,
    fullUrl,
  });
}

async function recordToCollector(opts: {
  method: string;
  routePath: string;
  statusCode: number;
  duration: number;
  bodyArg?: string;
  fullUrl: string;
}) {
  const creds = getInstanceCredentials();
  if (!creds) {
    console.warn('[sketch] No instance credentials found at ~/.tracesketch/config/instance.json — run `npx tracesketch start` once to create it. Skipping collector trace.');
    return;
  }

  // Extract query params from routePath if present
  let pathOnly = opts.routePath;
  let queryParams: Record<string, string> = {};
  try {
    const url = new URL(opts.fullUrl);
    url.searchParams.forEach((v, k) => { queryParams[k] = v; });
    pathOnly = url.pathname;
    // also include query from routePath string itself if it had ?
    if (opts.routePath.includes('?')) {
      pathOnly = opts.routePath.split('?')[0];
    }
  } catch {
    if (opts.routePath.includes('?')) {
      pathOnly = opts.routePath.split('?')[0];
      const qs = opts.routePath.split('?')[1];
      try { new URLSearchParams(qs).forEach((v, k) => { queryParams[k] = v; }); } catch {}
    }
  }

  let parsedBody: unknown = undefined;
  if (opts.bodyArg) {
    try { parsedBody = JSON.parse(opts.bodyArg); } catch { parsedBody = opts.bodyArg; }
  } else {
    parsedBody = {};
  }

  const collectorUrl = process.env.COLLECTOR_URL || process.env.TRACESKETCH_COLLECTOR_URL || 'http://localhost:4000';

  try {
    const res = await fetch(`${collectorUrl.replace(/\/$/, '')}/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-instance-id': creds.instance_id,
        'x-instance-secret': creds.secret,
      },
      body: JSON.stringify({
        method: opts.method,
        path: pathOnly,
        status_code: opts.statusCode,
        duration: opts.duration,
        environment: 'cli',
        request_headers: { 'content-type': 'application/json', 'user-agent': 'sketch-cli' },
        request_body: parsedBody,
        query_params: queryParams,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`[sketch] collector responded ${res.status}: ${text} — trace not saved`);
    } else {
      const json = await res.json().catch(() => null) as { trace_id?: string } | null;
      if (json?.trace_id) {
        console.log(`✓ Trace saved: ${json.trace_id} (view at http://localhost:8470)`);
      } else {
        console.log('✓ Trace saved to collector');
      }
    }
  } catch (err) {
    console.warn(`[sketch] could not reach collector at ${collectorUrl}/traces — is \`npx tracesketch start\` running? ${(err as Error).message}`);
  }
}

run();