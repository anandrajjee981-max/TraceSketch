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
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "http://localhost:4000",
      "http://localhost:5000",
    ],
    allowedHeaders: ["Content-Type", "x-instance-id", "x-instance-secret"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
app.listen(PORT, () => {
  console.log(`Collector listening on http://localhost:${PORT}`);
});
