import { db } from "../config/db";
import crypto from 'crypto';

function generateuuid(): string {
  return `TB_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
}

export function checkInstanceExists(instanceId: string): boolean {
  const row = db.prepare('SELECT * FROM instances WHERE instance_id = ?').get(instanceId);
  return !!row;
}

export function generateTraceId(): string {
  return  "ts_"+ generateuuid();
}

export function insertTrace(
  traceId: string,
  instanceId: string,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  environment: string,
  createdAt: number,
  expiresAt: number
): boolean {
  try {
    const sql = `
      INSERT INTO traces 
      (trace_id, instance_id, method, path, status_code, duration_ms, environment, created_at, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      traceId, instanceId, method, path, statusCode, durationMs, environment, createdAt, expiresAt
    );
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
}