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

const app = express();

// ---- CORS: allow Vite dashboard (5173) + common local ports + any localhost ----
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
      return cb(null, true);
    },
    allowedHeaders: ["Content-Type", "x-instance-id", "x-instance-secret"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: false,
  })
);
app.use(express.json());

let cachedInstance: { instance_id: string } | null = null;

app.get("/health", (_req, res) => {
  if (cachedInstance) {
    res.json({ status: "ok", instance_id: cachedInstance.instance_id });
  } else {
    res.json({ status: "ok" });
  }
});

app.get("/instance", (_req, res) => {
  if (cachedInstance) {
    res.json({ instance_id: cachedInstance.instance_id });
  } else {
    res.status(500).json({ message: "instance not initialized" });
  }
});

app.use("/traces", replayrouter);
app.use("/traces", tracerouter);
app.use("/traces", eventsRouter);
app.use("/traces", regressionrouter);

export function startCollector() {
  initSchema();
  const instance = getOrCreateInstance();
  cachedInstance = instance;
  console.log(`traceSketch instance ready: ${instance.instance_id}`);

  const PORT = Number(process.env.PORT ?? 4000);

  cron.schedule('0 */2 * * *', () => {
    console.log('Running hourly trace cleanup task...');
    const count = cleanExpiredTraces();
    console.log(`Cleanup finished: Removed ${count} expired records.`);
  });

  app.listen(PORT, () => {
    console.log(`Collector listening on http://localhost:${PORT}`);
  });

  return app;
}
