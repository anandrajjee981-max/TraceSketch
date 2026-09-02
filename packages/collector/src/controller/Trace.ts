import { Request, Response } from "express";
import { checkInstanceExists, generateTraceId, insertTrace } from "../dao/trace.dao";

export async function createTrace(req: Request, res: Response) {
  try {
    const instanceId = req.headers['x-instance-id'] as string;

    if (!instanceId) {
      return res.status(400).json({ message: "x-instance-id header is required" });
    }

    const instanceExists = checkInstanceExists(instanceId);
    if (!instanceExists) {
      return res.status(404).json({ message: "Unknown instance" });
    }

    const { path, method, status_code, duration, environment } = req.body;

    if (!path || !method) {
      return res.status(400).json({ message: "method and path are required" });
    }

    const traceId = generateTraceId();
    const createdAt = Date.now();
    const expiresAt = createdAt + 86400000; // 24 hours

    const success = insertTrace(
      traceId,
      instanceId,
      method,
      path,
      status_code,
      duration,
      environment ?? "local",
      createdAt,
      expiresAt
    );

    if (!success) {
      return res.status(500).json({ message: "Failed to save trace" });
    }

    res.status(200).json({ message: "trace created successfully", trace_id: traceId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "internal server error" });
  }
}