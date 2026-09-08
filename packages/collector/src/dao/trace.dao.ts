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

export function getTrace(traceid:string){
const res = db.prepare('SELECT * FROM traces WHERE trace_id = ?').get(traceid)
return res 
}

export function getallTrace(){
  const res = db.prepare('SELECT * FROM traces').all()
  return res 
}