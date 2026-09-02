import express from "express";
import { db, initSchema } from "./config/db";
import { getOrCreateInstance } from './service/instance.service';

initSchema();
const instance = getOrCreateInstance();


console.log(`traceSketch instance ready: ${instance.instance_id}`);

const app = express();
const PORT = 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Collector listening on port ${PORT}`);
});