import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const TRACEBOX_DIR = path.join(os.homedir(), '.tracesketch');
const DB_PATH = path.join(TRACEBOX_DIR, 'tracesketch.db');

// Ensure ~/.tracesketch/ folder exists
if (!fs.existsSync(TRACEBOX_DIR)) {
  fs.mkdirSync(TRACEBOX_DIR, { recursive: true });
}

export const db: any = new Database(DB_PATH);

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

export function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      instance_id TEXT UNIQUE NOT NULL,
      secret_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS traces ( 
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT UNIQUE NOT NULL,
      instance_id TEXT NOT NULL,
      method TEXT NOT NULL,
      path TEXT NOT NULL,
      status_code INTEGER,
      duration_ms INTEGER,
      environment TEXT,
      created_at INTEGER NOT NULL,
      request_body TEXT,
      query_params TEXT,
      request_headers TEXT,  
      expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS trace_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trace_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      service TEXT,
      operation TEXT,
      duration_ms INTEGER,
      metadata TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
    );
CREATE TABLE IF NOT EXISTS replay_runs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  target_base_url TEXT NOT NULL,   
  environment TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  result TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS regression_tests (
id INTEGER PRIMARY KEY AUTOINCREMENT,
source_trace_id TEXT NOT NULL,
name TEXT NOT NULL,
expected_status INTEGER,
expected_schema TEXT ,
created_at INTEGER NOT NULL,
FOREIGN KEY (source_trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE

)




  `);

  const regressionColumns = db
    .pragma('table_info(regression_tests)')
    .map((column: { name: string }) => column.name);
  const requiredRegressionColumns = [
    'id',
    'source_trace_id',
    'name',
    'expected_status',
    'expected_schema',
    'created_at',
  ];

  if (!requiredRegressionColumns.every((column) => regressionColumns.includes(column))) {
    db.exec('ALTER TABLE regression_tests RENAME TO regression_tests_legacy');
    db.exec(`
      CREATE TABLE regression_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_trace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        expected_status INTEGER,
        expected_schema TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
      )
    `);
  }

  // purge orphans left from pre-FK DBs where CASCADE never ran (existing users)
  try {
    db.exec(`
      DELETE FROM trace_events WHERE trace_id NOT IN (SELECT trace_id FROM traces);
      DELETE FROM replay_runs WHERE trace_id NOT IN (SELECT trace_id FROM traces);
      DELETE FROM regression_tests WHERE source_trace_id NOT IN (SELECT trace_id FROM traces);
    `);
  } catch {}
}