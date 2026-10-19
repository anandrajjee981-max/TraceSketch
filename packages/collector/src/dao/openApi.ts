import { db } from "../config/db";
import crypto from 'crypto';

function inferType(value: unknown): string {
  if (value === null || value === undefined) return "string";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "object") return "object";
  return "string";
}

function buildSchema(value: unknown): any {
  const type = inferType(value);
  const schema: any = { type };
  if (type === "object" && value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    schema.properties = {};
    for (const [k, v] of Object.entries(obj)) {
      schema.properties[k] = buildSchema(v);
    }
    schema.required = Object.keys(obj);
  }
  if (type === "array" && Array.isArray(value) && value.length > 0) {
    schema.items = buildSchema(value[0]);
  }
  return schema;
}

export function generateOpenApiSpecFromTrace({
  traceId,
  method,
  path,
  status_code,
  request_body,
  query_params,
  request_headers,
  response_body,
  response_headers,
  repo,
}: {
  traceId: string;
  method: string;
  path: string;
  status_code?: number;
  request_body?: unknown;
  query_params?: unknown;
  request_headers?: unknown;
  response_body?: unknown;
  response_headers?: unknown;
  repo?: string | null;
}): any {
  const operationId = `op_${traceId}`;
  const parameters: any[] = [];

  if (query_params && typeof query_params === "object" && !Array.isArray(query_params)) {
    for (const [k, v] of Object.entries(query_params as Record<string, unknown>)) {
      parameters.push({
        name: k,
        in: "query",
        required: false,
        schema: buildSchema(v),
      });
    }
  }

  const requestBody: any = {};
  if (request_body !== undefined && request_body !== null) {
    requestBody.content = {
      "application/json": {
        schema: buildSchema(request_body),
      },
    };
  }

  const responses: any = {};
  const statusKey = String(status_code ?? 200);
  responses[statusKey] = {
    description: "Successful response",
    content: {
      "application/json": {
        schema: response_body !== undefined && response_body !== null
          ? buildSchema(response_body)
          : { type: "string" },
      },
    },
  };

  const spec = {
    openapi: "3.0.1",
    info: {
      title: `TraceSketch API - ${repo ?? "unknown"}`,
      version: "1.0.0",
      description: `Auto-generated from trace ${traceId}`,
    },
    servers: [{ url: "/" }],
    paths: {
      [path]: {
        [method.toLowerCase()]: {
          operationId,
          summary: `${method.toUpperCase()} ${path}`,
          parameters,
          ...(Object.keys(requestBody).length > 0 ? { requestBody } : {}),
          responses,
        },
      },
    },
  };
  return spec;
}

export function getOpenApiDocByRepo(repo: string | null) {
  try {
    // `IS` (not `=`) so a NULL repo matches NULL — `= NULL` never matches in SQL.
    return db.prepare('SELECT * FROM OPENAPI_DOCS WHERE repo IS ?').get(repo ?? null);
  } catch (err) {
    console.error('[traceSketch] failed to get openapi doc by repo', err);
    return null;
  }
}

// Merge a freshly generated single-operation spec into the stored spec for a
// repo. The repo is the unique key (like a hash-map key): every repo keeps
// exactly one doc, and its `paths` accumulate each method/path captured for
// that repo. Re-capturing the same method+path overwrites just that operation.
function mergeOperationIntoSpec(existingRaw: string | null, incoming: any, method: string, path: string): any {
  let existing: any = null;
  if (existingRaw) {
    try {
      existing = JSON.parse(existingRaw);
    } catch {
      existing = null;
    }
  }
  if (!existing || typeof existing !== "object") {
    return incoming;
  }

  const spec: any = existing;
  spec.openapi = spec.openapi || incoming.openapi;
  spec.info = { ...(incoming.info || {}), ...(spec.info || {}) };
  spec.servers = spec.servers || incoming.servers;

  const incomingOp = incoming.paths?.[path]?.[method];
  if (!incomingOp) return spec;

  spec.paths = spec.paths && typeof spec.paths === "object" ? spec.paths : {};
  const existingPath = spec.paths[path] && typeof spec.paths[path] === "object" ? spec.paths[path] : {};
  existingPath[method] = incomingOp;
  spec.paths[path] = existingPath;

  return spec;
}

export function updateOpenApiDocContent(id: string, content: string): boolean {
  try {
    db.prepare('UPDATE OPENAPI_DOCS SET content = ? WHERE id = ?').run(content, id);
    return true;
  } catch (err) {
    console.error('[traceSketch] failed to update openapi doc', err);
    return false;
  }
}

export function deleteOpenApiDoc(id: string): boolean {
  try {
    const info = db.prepare('DELETE FROM OPENAPI_DOCS WHERE id = ?').run(id);
    return info.changes > 0;
  } catch (err) {
    console.error('[traceSketch] failed to delete openapi doc', err);
    return false;
  }
}

// Upsert keyed on repo: one doc per repo. A second call for an existing repo
// updates that doc in place instead of inserting a duplicate.
export function saveOpenApiDoc(
  name: string,
  version: string,
  base_url: string,
  content: string,
  repo?: string | null
): boolean {
  try {
    const key = repo ?? null;
    const existing = getOpenApiDocByRepo(key);
    if (existing) {
      db.prepare(
        'UPDATE OPENAPI_DOCS SET name = ?, version = ?, base_url = ?, content = ? WHERE id = ?'
      ).run(name, version, base_url, content, existing.id);
      return true;
    }
    const id = crypto.randomUUID().replace(/-/g, '').toUpperCase();
    const createdAt = Date.now();
    const sql = `
      INSERT INTO OPENAPI_DOCS (id, name, version, base_url, repo, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.prepare(sql).run(id, name, version, base_url, key, content, createdAt);
    return true;
  } catch (err) {
    console.error('[traceSketch] failed to save openapi doc:', err);
    return false;
  }
}

export function saveOpenApiDocFromTrace({
  traceId,
  instanceId,
  repo,
  method,
  path,
  status_code,
  request_body,
  query_params,
  request_headers,
  response_body,
  response_headers,
}: {
  traceId: string;
  instanceId: string;
  repo?: string | null;
  method: string;
  path: string;
  status_code?: number;
  request_body?: unknown;
  query_params?: unknown;
  request_headers?: unknown;
  response_body?: unknown;
  response_headers?: unknown;
}): boolean {
  try {
    const key = repo ?? null;
    const spec = generateOpenApiSpecFromTrace({
      traceId,
      method,
      path,
      status_code,
      request_body,
      query_params,
      request_headers,
      response_body,
      response_headers,
      repo: key,
    });

    const existing = getOpenApiDocByRepo(key);
    if (existing) {
      const merged = mergeOperationIntoSpec(existing.content, spec, method.toLowerCase(), path);
      return updateOpenApiDocContent(existing.id, JSON.stringify(merged, null, 2));
    }

    const content = JSON.stringify(spec, null, 2);
    const name = key ?? "unknown";
    return saveOpenApiDoc(name, "1.0.0", "/", content, key);
  } catch (err) {
    console.error('[traceSketch] failed to save openapi doc from trace', err);
    return false;
  }
}

export function getOpenApiDocById(id: string) {
  try {
    return db.prepare('SELECT * FROM OPENAPI_DOCS WHERE id = ?').get(id);
  } catch (err) {
    console.error('[traceSketch] failed to get openapi doc', err);
    return null;
  }
}

export function getOpenApiDocsByRepo(repo: string) {
  try {
    return db.prepare('SELECT * FROM OPENAPI_DOCS WHERE repo = ?').all(repo);
  } catch (err) {
    console.error('[traceSketch] failed to get openapi docs by repo', err);
    return [];
  }
}

export function getAllOpenApiDocs() {
  try {
    return db.prepare('SELECT * FROM OPENAPI_DOCS').all();
  } catch (err) {
    console.error('[traceSketch] failed to get openapi docs', err);
    return [];
  }
}

export function saveTraceRepo(traceId: string, repo: string | null): boolean {
  try {
    db.prepare('UPDATE traces SET repo = ? WHERE trace_id = ?').run(repo ?? null, traceId);
    return true;
  } catch (err) {
    console.error('[traceSketch] failed to save trace repo', err);
    return false;
  }
}

export function getTraceRepo(traceId: string): string | null {
  try {
    const row = db.prepare('SELECT repo FROM traces WHERE trace_id = ?').get(traceId) as { repo: string | null } | undefined;
    return row ? row.repo : null;
  } catch (err) {
    console.error('[traceSketch] failed to get trace repo', err);
    return null;
  }
}
