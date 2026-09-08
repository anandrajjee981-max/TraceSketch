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
      created_at INTEGER NOT NULL
    );
CREATE TABLE IF NOT EXISTS replay_runs(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trace_id TEXT NOT NULL,
  target_base_url TEXT NOT NULL,   
  environment TEXT,
  status_code INTEGER,
  duration_ms INTEGER,
  result TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS regression_tests (
id INTEGER PRIMARY KEY AUTOINCREMENT,
source_trace_id TEXT NOT NULL,
name TEXT NOT NULL,
expected_status INTEGER,
expected_schema TEXT NOT NULL,
created_at INTEGER NOT NULL

)




  `);
}