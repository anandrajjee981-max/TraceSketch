import { db } from "../config/db";
import crypto from 'crypto';


export function checktraceidExists(traceId: string): boolean {
  const row = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(traceId);
  return !!row;
}
export function insertTraceEvent(
  traceId: string,
  eventType: string,
    service: string,
    operation: string,
    durationMs: number,
    metadata: string,
    createdAt: number
): boolean {
  try {
    const sql = `INSERT INTO trace_events (trace_id, event_type, service, operation, duration_ms, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const stmt = db.prepare(sql);
    stmt.run(traceId, eventType, service, operation, durationMs, metadata, createdAt);
    return true;
  } catch (error) {
    console.error("Error inserting trace event:", error);
    return false;
  }
}  

export function getEventDurations(traceId: string): any[] {
    const sql = `SELECT duration_ms FROM trace_events WHERE trace_id = ?`;
    const stmt = db.prepare(sql);
    const rows = stmt.all(traceId);
    return rows.map(row => row.duration_ms);
  } 

  export function getTraceEvents(traceId: string): any[] {
    const sql = `SELECT * FROM trace_events WHERE trace_id = ?`;
    const stmt = db.prepare(sql);
    const rows = stmt.all(traceId);
    return rows;
  }
  






