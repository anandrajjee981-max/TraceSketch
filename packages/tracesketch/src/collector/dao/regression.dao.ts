import { db } from "../config/db";

export function insertregression(
  source_trace_id: string,
  name: string,
  expected_status: number,
  expected_schema: string | null | undefined
): boolean {
  try {
    const sql = `
      INSERT INTO regression_tests 
      (source_trace_id, name, expected_status, expected_schema, created_at)
      VALUES (?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(
      source_trace_id,
      name,
      expected_status,
      expected_schema ?? null,
      Date.now()
    );
    return true;
  } catch (err) {
    console.error("[insertregression]", err);
    return false;
  }
}

export function getRegressionsByTraceId(sourceTraceId: string) {
  return db
    .prepare("SELECT * FROM regression_tests WHERE source_trace_id = ? ORDER BY created_at DESC")
    .all(sourceTraceId);
}

export function getRegressionById(id: string) {
  return db
    .prepare("SELECT * FROM regression_tests WHERE id = ?")
    .get(id);
}

export function getAllRegressions(limit = 100) {
  return db
    .prepare("SELECT * FROM regression_tests ORDER BY created_at DESC LIMIT ?")
    .all(limit);
}
