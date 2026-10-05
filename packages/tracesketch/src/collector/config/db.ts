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
expected_schema TEXT,
created_at INTEGER NOT NULL,
FOREIGN KEY (source_trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
);

-- Durable archive of relay activity. Deliberately has no TTL: the relay's own
-- MongoDB expires groups and messages after 6h, so this table is the only place
-- a shared trace or replay result survives long-term.
CREATE TABLE IF NOT EXISTS group_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_code TEXT NOT NULL,
  instance_id TEXT NOT NULL,
  entry_type TEXT NOT NULL,
  trace_id TEXT,
  data TEXT,
  saved_at INTEGER NOT NULL,
  -- The relay's Mongo _id for the message this row mirrors. Lets the browser
  -- and the collector's socket client both write the same message without
  -- producing two rows. NULL for rows written before this column existed;
  -- SQLite permits many NULLs under a UNIQUE index, so they never collide.
  source_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_group_history_group ON group_history(group_code, saved_at);
CREATE INDEX IF NOT EXISTS idx_group_history_instance ON group_history(instance_id);

-- Which groups this machine is currently a member of, so the collector can hold
-- a relay socket for each one with no browser tab open.
--
-- session_id pins the exact relay session (its Mongo _id). A 4-character code is
-- recycled, so a stored session_id is how the archiver detects that a code now
-- belongs to a different session and stops recording it.
CREATE TABLE IF NOT EXISTS group_membership (
  group_code TEXT PRIMARY KEY,
  session_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

  `);

  // Migrations for databases created before source_id / group_membership existed.
  // CREATE TABLE IF NOT EXISTS above is a no-op on an existing table, so new
  // columns have to be added explicitly or older installs never get them.
  const groupHistoryColumns = db
    .pragma('table_info(group_history)')
    .map((column: { name: string }) => column.name);

  if (!groupHistoryColumns.includes('source_id')) {
    db.exec('ALTER TABLE group_history ADD COLUMN source_id TEXT');
    console.log('Migrated group_history: added source_id column');
  }

  // Unique so the second writer of a given relay message loses the insert
  // instead of duplicating it. Created after the column exists, otherwise this
  // would throw on a database that predates it.
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_group_history_source
      ON group_history(source_id);
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
    try {
      // if legacy already exists from previous broken migration, drop it first
      db.exec('DROP TABLE IF EXISTS regression_tests_legacy');
      db.exec('ALTER TABLE regression_tests RENAME TO regression_tests_legacy');
    } catch {}
    db.exec(`
      CREATE TABLE IF NOT EXISTS regression_tests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_trace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        expected_status INTEGER,
        expected_schema TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (source_trace_id) REFERENCES traces(trace_id) ON DELETE CASCADE
      )
    `);
    // migrate any existing valid rows from legacy (if legacy had correct shape)
    try {
      const legacyCols = db.pragma('table_info(regression_tests_legacy)').map((c: { name: string }) => c.name);
      if (requiredRegressionColumns.every((c) => legacyCols.includes(c))) {
        db.exec(`INSERT INTO regression_tests (id, source_trace_id, name, expected_status, expected_schema, created_at)
                 SELECT id, source_trace_id, name, expected_status, expected_schema, created_at FROM regression_tests_legacy`);
      }
    } catch {}
  }
  // cleanup broken legacy table if it has invalid schema (no types)
  try {
    const legacy = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='regression_tests_legacy'").get() as { sql: string } | undefined;
    if (legacy && !legacy.sql.includes('TEXT')) {
      db.exec('DROP TABLE IF EXISTS regression_tests_legacy');
    }
  } catch {}

  // purge orphans left from pre-FK DBs where CASCADE never ran (existing users)
  try {
    db.exec(`
      DELETE FROM trace_events WHERE trace_id NOT IN (SELECT trace_id FROM traces);
      DELETE FROM replay_runs WHERE trace_id NOT IN (SELECT trace_id FROM traces);
      DELETE FROM regression_tests WHERE source_trace_id NOT IN (SELECT trace_id FROM traces);
    `);
  } catch {}
}