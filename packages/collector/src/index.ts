import express from "express";
import cors from "cors";
import { initSchema } from "./config/db";
import { getOrCreateInstance } from "./service/instance.service";
import tracerouter from "./routes/trace.routes";
import replayrouter from "./routes/replay.route";
import eventsRouter from "./routes/events.routes";
import regressionrouter from "./routes/regression.route";
import cron from 'node-cron';
import { cleanExpiredTraces } from "./dao/trace.dao";
import path from 'path';

const app = express();

// ---- CORS: allow Vite dashboard (5173) + common local ports + any localhost ----
// Use permissive localhost matching so regression save never fails due to CORS in dev
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      try {
        const u = new URL(origin);
        if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1") {
          return cb(null, true);
        }
      } catch {}
      // allow all origins in dev (Vite proxy may send varied ports)
      return cb(null, true);
    },
    allowedHeaders: ["Content-Type", "x-instance-id", "x-instance-secret"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  })
);
app.use(express.json());

initSchema();
const instance = getOrCreateInstance();
console.log(`traceSketch instance ready: ${instance.instance_id}`);

const PORT = Number(process.env.PORT ?? 4000);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", instance_id: instance.instance_id });
});

// Expose instance_id to dashboard (never expose secret)
app.get("/instance", (_req, res) => {
  res.json({ instance_id: instance.instance_id });
});

app.use("/traces", replayrouter);
app.use("/traces", tracerouter);
app.use("/traces", eventsRouter);
app.use("/traces",regressionrouter)

cron.schedule('0 */2 * * *', () => {
  console.log('Running hourly trace cleanup task...');
  const count = cleanExpiredTraces();
  console.log(`Cleanup finished: Removed ${count} expired records.`);
});

app.use(express.static(path.join(__dirname, '../../dashboard/dist')));

// Client-side routing support (React Router jaisa kuch use ho raha ho toh)
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../../dashboard/dist/index.html'));
});

app.listen(8470, () => {
  console.log('Dashboard available at http://localhost:8470');
});

app.listen(PORT, () => {
  console.log(`Collector listening on http://localhost:${PORT}`);
});
