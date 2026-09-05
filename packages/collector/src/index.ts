import express from "express";
import { db, initSchema } from "./config/db";
import { getOrCreateInstance } from './service/instance.service';
import tracerouter from './routes/trace.routes';
import eventsRouter from './routes/events.routes';

initSchema();
const instance = getOrCreateInstance();


console.log(`traceSketch instance ready: ${instance.instance_id}`);

const app = express();
app.use(express.json())
const PORT = 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use('/traces', tracerouter);
app.use('/traces', eventsRouter);

app.listen(PORT, () => {
  console.log(`Collector listening on port ${PORT}`);
});