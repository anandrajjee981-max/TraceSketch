import { Request, Response } from "express";

/**
 * Credentials handed to the locally-served dashboard.
 *
 * The secret is never baked into the dashboard bundle (that would ship it to
 * every `npm install`). Instead the dashboard asks the running collector for it
 * once, in memory, at load time.
 */
let credentials: { instanceId: string; secret: string } | null = null;

export function setDashboardInstance(instance: { instance_id: string; secret: string }): void {
  credentials = { instanceId: instance.instance_id, secret: instance.secret };
}

// The dashboard is only ever served from the collector's own static handler on
// port 8470, so only those two exact origins may read the session.
const ALLOWED_ORIGINS = new Set(["http://localhost:8470", "http://127.0.0.1:8470"]);

// The collector API itself runs on loopback:4000. Pinning Host blocks DNS
// rebinding, where an attacker's hostname resolves to 127.0.0.1 but keeps its
// own Host/Origin.
const ALLOWED_HOSTS = new Set(["localhost:4000", "127.0.0.1:4000"]);

/**
 * Reject with 403. Deliberately sets NO Access-Control-Allow-Origin: a browser
 * on any origin (allowed or not) must not be able to read this response body.
 * `Vary: Origin` is still set so caches keep responses separate per origin.
 */
function reject(res: Response): void {
  res.setHeader("Vary", "Origin");
  res.status(403).json({ message: "forbidden" });
}

/**
 * GET /dashboard-session
 *
 * Returns `{ instanceId, secret }` for the local instance, gated by three
 * independent checks. Registered BEFORE the app-wide permissive CORS middleware
 * (see index.ts) so that middleware never attaches `Access-Control-Allow-Origin`
 * to this response.
 */
export function dashboardSession(req: Request, res: Response): void {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const secFetchSite = req.headers["sec-fetch-site"];

  // 1. An exact dashboard Origin is required AND must be present. no-cors
  //    <script>/<img> probes send no Origin, so this also blocks them.
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return reject(res);

  // 2. Host must be the collector's own loopback authority (DNS-rebinding guard).
  if (!host || !ALLOWED_HOSTS.has(host)) return reject(res);

  // 3. If the browser told us where the request came from, it must not be
  //    cross-site. An absent header is allowed (older browsers).
  if (secFetchSite !== undefined && secFetchSite !== "same-site" && secFetchSite !== "same-origin") {
    return reject(res);
  }

  if (!credentials) {
    res.status(500).json({ message: "instance not initialized" });
    return;
  }

  // This route owns its CORS: allow only the matched origin (never "*").
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(credentials);
}
