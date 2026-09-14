import { db } from "../config/db";
import crypto from 'crypto';

function generateuuid(): string {
  return `TS_${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
}

export function checkInstanceExists(instanceId: string): boolean {
  const row = db.prepare('SELECT * FROM instances WHERE instance_id = ?').get(instanceId);
  return !!row;
}
export function checkhashsecret(instanceId: string, rawSecret: string): boolean {
  const hashedInput = crypto.createHash('sha256').update(rawSecret).digest('hex');
  const row = db.prepare('SELECT * FROM instances WHERE instance_id = ? AND secret_hash = ?').get(instanceId, hashedInput);
  return !!row;
}

export function generateTraceId(): string {
  return   generateuuid();
}



export function insertTrace(
  traceId: string,
  instanceId: string,
  method: string,
  path: string,
  statusCode: number,
  durationMs: number,
  environment: string,
  body: string,
  queryParams: string,
  headers: string,
  createdAt: number,
  expiresAt: number
): boolean {
  try {
 
    const sql = `
      INSERT INTO traces 
      (trace_id, instance_id, method, path, status_code, duration_ms, environment, request_body, query_params, request_headers, created_at, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      traceId, instanceId, method, path, statusCode, durationMs, environment, body, queryParams, headers, createdAt, expiresAt
    );
    return true; 
  } catch (err) {
    console.error(err);
    return false;
  }
}

// Helper function to check and delete a single trace if expired
export function dropTrace(trace_id: string): boolean {
  const record = db.prepare('SELECT expires_at FROM traces WHERE trace_id = ?').get(trace_id) as { expires_at: number } | undefined;

  if (record && record.expires_at < Date.now()) {
    db.prepare('DELETE FROM traces WHERE trace_id = ?').run(trace_id);
    return true; // Trace was expired and deleted
  }

  return false; // Trace was not expired (or didn't exist)
}

// Single trace retrieval: checks expiry and deletes if expired
export function getTrace(trace_id: string) {
  const isExpired = dropTrace(trace_id);
  if (isExpired) {
    return null; // Return null since it was expired and deleted
  }

  return db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(trace_id);
}

// Bulk retrieval: clears all expired traces first, then returns valid ones
export function getAllTraces() {
  // Clean up all expired traces in one query
  db.prepare('DELETE FROM traces WHERE expires_at < ?').run(Date.now());

  return db.prepare('SELECT * FROM traces').all();
}

export function cleanExpiredTraces(): number {
  const info = db.prepare('DELETE FROM traces WHERE expires_at < ?').run(Date.now());
  return info.changes; // Output status kitne records delete hue
}