import { db } from "../config/db";

export interface ReplayRunRow {
  id: number;
  trace_id: string;
  target_base_url: string;
  environment: string | null;
  status_code: number | null;
  duration_ms: number | null;
  result: string | null;
  created_at: number;
}

export function insertReplayRun(
  trace_id: string,
  target_base_url: string,
  status_code: number,
  duration_ms: number,
  result: string,
  created_at: number
): boolean {
  try {
    const sql = `
      INSERT INTO replay_runs
      (trace_id, target_base_url, status_code, duration_ms, result, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(trace_id, target_base_url, status_code, duration_ms, result, created_at);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

export function getReplaysByTraceId(traceId: string): ReplayRunRow[] {
  return db
    .prepare("SELECT * FROM replay_runs WHERE trace_id = ? ORDER BY created_at DESC")
    .all(traceId) as ReplayRunRow[];
}

export function getAllReplays(limit = 100): ReplayRunRow[] {
  // Hide orphaned replays where parent trace was TTL-deleted (pre-cascade DBs)
  return db
    .prepare("SELECT r.* FROM replay_runs r INNER JOIN traces t ON r.trace_id = t.trace_id ORDER BY r.created_at DESC LIMIT ?")
    .all(limit) as ReplayRunRow[];
}

export function getReplayById(id: number): ReplayRunRow | undefined {
  return db.prepare("SELECT * FROM replay_runs WHERE id = ?").get(id) as ReplayRunRow | undefined;
}







