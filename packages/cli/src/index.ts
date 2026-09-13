#!/usr/bin/env node

// sketch CLI — quick API testing tool
// Usage:
//   sketch post /api/payment 5000                  → http://localhost:5000/api/payment
//   sketch post /api/payment http://anan.com        → http://anan.com/api/payment
//   sketch post /api/payment 5000 --body '{"a":1}'  → with JSON body

const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('Usage: sketch <method> <path> <port-or-url> [--body \'{"key":"value"}\']');
  process.exit(1);
}

const method = args[0].toUpperCase();
const path = args[1];
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

// Parse optional --body flag
function getBodyArg(args: string[]): string | undefined {
  const idx = args.indexOf('--body');
  if (idx === -1) return undefined;
  return args[idx + 1];
}

async function run() {
  const baseUrl = resolveBaseUrl(target);
  const fullUrl = baseUrl + path;
  const bodyArg = getBodyArg(args);

  console.log(`→ ${method} ${fullUrl}`);

  const startTime = Date.now();

  try {
    const response = await fetch(fullUrl, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: bodyArg && method !== 'GET' ? bodyArg : undefined
    });

    const duration = Date.now() - startTime;
    const contentType = response.headers.get('content-type') || '';
    const data = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    console.log(`← ${response.status} (${duration}ms)`);
    console.log(JSON.stringify(data, null, 2));

    // Bonus: if the target app has traceSketch SDK installed and
    // exposes a response header with the trace id, surface it here.
    const traceId = response.headers.get('x-tracesketch-id');
    if (traceId) {
      console.log(`\n📍 Traced: ${traceId}`);
    }
  } catch (err) {
    console.error(`✗ Request failed:`, (err as Error).message);
    process.exit(1);
  }
}

run();