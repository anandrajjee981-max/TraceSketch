const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const DB_PATH = path.join(os.homedir(), '.tracesketch', 'tracesketch.db');
console.log('DB_PATH', DB_PATH);
const db = new Database(DB_PATH);
try {
  const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', JSON.stringify(tables, null, 2));
  // check regression_tests schema via pragma
  const cols = db.prepare("PRAGMA table_info(regression_tests)").all();
  console.log('regression_tests cols:', cols);
  const traces = db.prepare("SELECT trace_id, method, path, created_at FROM traces LIMIT 5").all();
  console.log('traces sample:', traces);
  const regs = db.prepare("SELECT * FROM regression_tests LIMIT 5").all();
  console.log('regs sample:', regs);
  // try insert dummy
  const traceId = traces[0]?.trace_id;
  if (traceId) {
    console.log('trying insert for trace', traceId);
    const stmt = db.prepare("INSERT INTO regression_tests (source_trace_id, name, expected_status, expected_schema, created_at) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run(traceId, 'test_manual', 200, null, Date.now());
    console.log('insert ok', info);
    console.log('after insert regs:', db.prepare("SELECT * FROM regression_tests WHERE source_trace_id=?").all(traceId));
    // cleanup
    db.prepare("DELETE FROM regression_tests WHERE name='test_manual'").run();
  } else {
    console.log('no traces found, creating dummy trace');
    // insert dummy trace
    const now = Date.now();
    db.prepare("INSERT INTO traces (trace_id, instance_id, method, path, status_code, duration_ms, environment, request_body, query_params, request_headers, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run('TS_DUMMY123', 'inst_test', 'GET', '/api/test', 200, 100, 'local', '{}', '{}', '{}', now, now+86400000);
    console.log('dummy trace inserted');
    const stmt = db.prepare("INSERT INTO regression_tests (source_trace_id, name, expected_status, expected_schema, created_at) VALUES (?, ?, ?, ?, ?)");
    const info = stmt.run('TS_DUMMY123', 'test_manual', 200, null, Date.now());
    console.log('insert ok for dummy', info);
    db.prepare("DELETE FROM regression_tests WHERE source_trace_id='TS_DUMMY123'").run();
    db.prepare("DELETE FROM traces WHERE trace_id='TS_DUMMY123'").run();
  }
} catch(e) {
  console.error('error', e.message, e.stack);
}
