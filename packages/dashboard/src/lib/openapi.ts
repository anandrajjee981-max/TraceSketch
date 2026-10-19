import { load as parseYaml } from "js-yaml";

/* ═══════════════════════════════════════════════════════════════════════════
   OpenAPI 3.x model + pure helpers.

   Everything here is parse/derive only — no DOM, no I/O, no React. The
   interactive docs page and its components stay thin because all the shape
   handling (resolving $ref, walking schemas, building examples) lives here.

   The specs this project ships are generated from captured traces, so they are
   deliberately minimal (no tags, no components, inline schemas). Every helper
   therefore tolerates missing pieces instead of assuming a full document.
   ═══════════════════════════════════════════════════════════════════════════ */

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head" | "trace";

export const HTTP_METHODS: HttpMethod[] = ["get", "post", "put", "patch", "delete", "options", "head", "trace"];

const METHOD_KEYS = new Set<string>(HTTP_METHODS);

export interface OpenApiInfo {
  title?: string;
  version?: string;
  description?: string;
  termsOfService?: string;
  [key: string]: unknown;
}

export interface OpenApiSchema {
  $ref?: string;
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  properties?: Record<string, OpenApiSchema>;
  items?: OpenApiSchema;
  required?: string[];
  enum?: unknown[];
  default?: unknown;
  example?: unknown;
  examples?: Record<string, unknown>;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  allOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  additionalProperties?: boolean | OpenApiSchema;
  [key: string]: unknown;
}

export interface OpenApiMediaType {
  schema?: OpenApiSchema;
  example?: unknown;
  examples?: Record<string, { value?: unknown; summary?: string }>;
}

export interface OpenApiParameter {
  name?: string;
  in?: string;
  required?: boolean;
  description?: string;
  deprecated?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
  content?: Record<string, OpenApiMediaType>;
  [key: string]: unknown;
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiResponseObject {
  description?: string;
  content?: Record<string, OpenApiMediaType>;
  headers?: Record<string, unknown>;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Array<OpenApiParameter | { $ref?: string }>;
  requestBody?: OpenApiRequestBody | { $ref?: string };
  responses?: Record<string, OpenApiResponseObject | { $ref?: string }>;
  security?: Array<Record<string, string[]>>;
  deprecated?: boolean;
  [key: string]: unknown;
}

export interface OpenApiSecurityScheme {
  type?: string;
  scheme?: string;
  name?: string;
  in?: string;
  bearerFormat?: string;
  description?: string;
  flows?: {
    authorizationCode?: OpenApiOAuthFlow;
    implicit?: OpenApiOAuthFlow;
    password?: OpenApiOAuthFlow;
    clientCredentials?: OpenApiOAuthFlow;
  };
  openIdConnectUrl?: string;
  [key: string]: unknown;
}

export interface OpenApiOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
}

export interface OpenApiServer {
  url?: string;
  description?: string;
  variables?: Record<string, { default?: string; enum?: string[]; description?: string }>;
}

type PathItemEntry = OpenApiOperation | OpenApiParameter[] | unknown;

export interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info?: OpenApiInfo;
  servers?: OpenApiServer[];
  paths?: Record<string, Record<string, PathItemEntry>>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
    securitySchemes?: Record<string, OpenApiSecurityScheme>;
    [key: string]: unknown;
  };
  security?: Array<Record<string, string[]>>;
  tags?: Array<{ name?: string; description?: string }>;
  [key: string]: unknown;
}

/* ─── Parsing ───────────────────────────────────────────────────────────── */

export interface ParsedSpec {
  spec: OpenApiSpec | null;
  error: string | null;
}

function looksLikeSpec(value: unknown): value is OpenApiSpec {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.openapi === "string" || typeof obj.swagger === "string" || typeof obj.paths === "object";
}

/**
 * Parse spec text. JSON is attempted first (that is what the collector stores);
 * YAML is the fallback so a spec the user pastes or uploads still loads. The
 * result is validated enough to reject arbitrary JSON that is not a spec.
 */
export function parseSpec(content: string): ParsedSpec {
  const text = content.trim();
  if (!text) return { spec: null, error: "The document is empty." };

  if (text.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(text);
      if (!looksLikeSpec(parsed)) return { spec: null, error: "JSON is valid but does not look like an OpenAPI document." };
      return { spec: parsed, error: null };
    } catch (e) {
      return { spec: null, error: e instanceof Error ? e.message : "Invalid JSON." };
    }
  }

  try {
    const parsed: unknown = parseYaml(text);
    if (!looksLikeSpec(parsed)) return { spec: null, error: "YAML is valid but does not look like an OpenAPI document." };
    return { spec: parsed, error: null };
  } catch (e) {
    return { spec: null, error: e instanceof Error ? e.message : "Could not parse the document as JSON or YAML." };
  }
}

/* ─── $ref resolution (local pointers only) ─────────────────────────────── */

function decodePointer(segment: string): string {
  return segment.replace(/~1/g, "/").replace(/~0/g, "~");
}

/** Resolve a local `#/...` JSON pointer. Remote refs are intentionally not fetched. */
export function resolveRef<T = unknown>(spec: OpenApiSpec, ref: string): T | null {
  if (!ref.startsWith("#/")) return null;
  let node: unknown = spec;
  for (const raw of ref.slice(2).split("/")) {
    const key = decodePointer(raw);
    if (node == null || typeof node !== "object") return null;
    node = (node as Record<string, unknown>)[key];
    if (node === undefined) return null;
  }
  return node as T;
}

/** Follow `$ref` chains (depth-limited) so callers get a concrete schema. */
export function derefSchema(spec: OpenApiSpec, schema: OpenApiSchema | undefined, depth = 0): OpenApiSchema | undefined {
  if (!schema || depth > 12) return schema;
  if (schema.$ref) {
    const target = resolveRef<OpenApiSchema>(spec, schema.$ref);
    if (target) return derefSchema(spec, target, depth + 1);
  }
  return schema;
}

const MAX_EXAMPLE_DEPTH = 6;

/** Human-readable type label for a schema, preferring the $ref name. */
export function schemaTypeLabel(spec: OpenApiSpec, schema: OpenApiSchema | undefined): string {
  if (!schema) return "any";
  if (schema.$ref) return schema.$ref.split("/").pop() ?? "object";
  const resolved = derefSchema(spec, schema);
  if (!resolved) return "any";
  if (resolved.type === "array") return `${schemaTypeLabel(spec, resolved.items)}[]`;
  if (resolved.oneOf?.length) return resolved.oneOf.map((s) => schemaTypeLabel(spec, s)).join(" | ");
  if (resolved.anyOf?.length) return resolved.anyOf.map((s) => schemaTypeLabel(spec, s)).join(" | ");
  if (resolved.allOf?.length) return resolved.allOf.map((s) => schemaTypeLabel(spec, s)).join(" & ");
  return resolved.type ?? (resolved.properties ? "object" : "any");
}

/* ─── Example synthesis ─────────────────────────────────────────────────── */

const FORMAT_SAMPLES: Record<string, string> = {
  "date-time": new Date(0).toISOString(),
  date: "1970-01-01",
  time: "00:00:00",
  email: "user@example.com",
  uuid: "00000000-0000-0000-0000-000000000000",
  uri: "https://example.com",
  url: "https://example.com",
  hostname: "example.com",
  ipv4: "127.0.0.1",
  ipv6: "::1",
  password: "string",
  byte: "c3RyaW5n",
  binary: "string",
};

/**
 * Best-effort example value for a schema. Used to pre-fill the request body
 * editor and to show a representative response. This is a *hint*, never a
 * substitute for a real response — the docs page states that explicitly.
 */
export function sampleFromSchema(spec: OpenApiSpec, schema: OpenApiSchema | undefined, depth = 0): unknown {
  if (!schema || depth > MAX_EXAMPLE_DEPTH) return null;

  if (schema.example !== undefined) return schema.example;
  if (schema.examples && typeof schema.examples === "object") {
    const first = Object.values(schema.examples)[0];
    if (first !== undefined) return first;
  }
  if (schema.default !== undefined) return schema.default;

  if (schema.$ref) {
    const resolved = derefSchema(spec, schema);
    if (resolved && resolved !== schema) return sampleFromSchema(spec, resolved, depth + 1);
  }

  if (schema.enum?.length) return schema.enum[0];
  if (schema.oneOf?.length) return sampleFromSchema(spec, schema.oneOf[0], depth + 1);
  if (schema.anyOf?.length) return sampleFromSchema(spec, schema.anyOf[0], depth + 1);
  if (schema.allOf?.length) {
    const merged: Record<string, unknown> = {};
    for (const part of schema.allOf) {
      const value = sampleFromSchema(spec, part, depth + 1);
      if (value && typeof value === "object" && !Array.isArray(value)) Object.assign(merged, value);
    }
    return merged;
  }

  switch (schema.type) {
    case "object":
    case undefined: {
      if (!schema.properties) return schema.type === "object" ? {} : null;
      const out: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(schema.properties)) {
        out[key] = sampleFromSchema(spec, child, depth + 1);
      }
      return out;
    }
    case "array":
      return [sampleFromSchema(spec, schema.items, depth + 1)];
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return true;
    case "string":
      return schema.format ? FORMAT_SAMPLES[schema.format] ?? "string" : "string";
    default:
      return null;
  }
}

/** Example body for the first (json-preferred) media type of a content map. */
export function exampleForContent(spec: OpenApiSpec, content: Record<string, OpenApiMediaType> | undefined): unknown {
  if (!content) return undefined;
  const entry = pickContentType(content);
  if (!entry) return undefined;
  const media = content[entry];
  if (media.example !== undefined) return media.example;
  if (media.examples) {
    const first = Object.values(media.examples)[0];
    if (first && typeof first === "object" && "value" in first) return (first as { value?: unknown }).value;
  }
  return sampleFromSchema(spec, media.schema);
}

/** Prefer application/json, then any +json, then the first declared type. */
export function pickContentType(content: Record<string, OpenApiMediaType>): string | null {
  const keys = Object.keys(content);
  if (keys.length === 0) return null;
  const json = keys.find((k) => k.split(";")[0].trim() === "application/json");
  if (json) return json;
  const anyJson = keys.find((k) => k.includes("json"));
  if (anyJson) return anyJson;
  return keys[0];
}

/* ─── Collection ────────────────────────────────────────────────────────── */

export interface Endpoint {
  method: HttpMethod;
  path: string;
  operation: OpenApiOperation;
  /** Tag names, defaulting to "default" so grouping never yields an empty key. */
  tags: string[];
  operationId: string;
}

const RESERVED_PATH_ITEM_KEYS = new Set(["parameters", "$ref", "summary", "description", "servers"]);

export function collectEndpoints(spec: OpenApiSpec): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const paths = spec.paths ?? {};
  for (const [path, item] of Object.entries(paths)) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    for (const [key, value] of Object.entries(item)) {
      const lower = key.toLowerCase();
      if (RESERVED_PATH_ITEM_KEYS.has(lower) || !METHOD_KEYS.has(lower)) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const operation = value as OpenApiOperation;
      endpoints.push({
        method: lower as HttpMethod,
        path,
        operation,
        tags: operation.tags?.length ? operation.tags : ["default"],
        operationId: operation.operationId ?? `${lower}${path}`,
      });
    }
  }
  return endpoints;
}

export function groupEndpointsByTag(endpoints: Endpoint[]): Array<{ tag: string; endpoints: Endpoint[] }> {
  const map = new Map<string, Endpoint[]>();
  for (const ep of endpoints) {
    for (const tag of ep.tags) {
      const list = map.get(tag) ?? [];
      list.push(ep);
      map.set(tag, list);
    }
  }
  return [...map.entries()]
    .map(([tag, list]) => ({ tag, endpoints: list }))
    .sort((a, b) => (a.tag === "default" ? 1 : b.tag === "default" ? -1 : a.tag.localeCompare(b.tag)));
}

export interface SchemaEntry {
  name: string;
  schema: OpenApiSchema;
}

export function collectSchemas(spec: OpenApiSpec): SchemaEntry[] {
  const schemas = spec.components?.schemas ?? {};
  return Object.entries(schemas).map(([name, schema]) => ({ name, schema }));
}

export function collectSecuritySchemes(spec: OpenApiSpec): Array<{ name: string; scheme: OpenApiSecurityScheme }> {
  const schemes = spec.components?.securitySchemes ?? {};
  return Object.entries(schemes).map(([name, scheme]) => ({ name, scheme }));
}

/** Operation-level security wins over the document default, per the spec. */
export function effectiveSecurity(spec: OpenApiSpec, operation: OpenApiOperation): Array<Record<string, string[]>> {
  return operation.security ?? spec.security ?? [];
}

/** Merge path-item level parameters (which may be $refs) with the operation's. */
export function effectiveParameters(spec: OpenApiSpec, endpoint: Endpoint): OpenApiParameter[] {
  const pathItem = spec.paths?.[endpoint.path];
  const pathLevel = Array.isArray(pathItem?.parameters) ? (pathItem?.parameters as OpenApiParameter[]) : [];
  const opLevel = endpoint.operation.parameters ?? [];
  const out: OpenApiParameter[] = [];
  const seen = new Set<string>();
  for (const raw of [...pathLevel, ...opLevel]) {
    const param = raw && typeof raw === "object" && "$ref" in raw
      ? resolveRef<OpenApiParameter>(spec, (raw as { $ref: string }).$ref)
      : (raw as OpenApiParameter);
    if (!param) continue;
    const key = `${param.in ?? ""}:${param.name ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(param);
  }
  return out;
}

/** Parameters grouped for the request editors, in a stable order. */
export function groupParameters(spec: OpenApiSpec, endpoint: Endpoint) {
  const groups: { path: OpenApiParameter[]; query: OpenApiParameter[]; header: OpenApiParameter[]; cookie: OpenApiParameter[] } = {
    path: [],
    query: [],
    header: [],
    cookie: [],
  };
  for (const param of effectiveParameters(spec, endpoint)) {
    switch (param.in) {
      case "path":
        groups.path.push(param);
        break;
      case "query":
        groups.query.push(param);
        break;
      case "header":
        groups.header.push(param);
        break;
      case "cookie":
        groups.cookie.push(param);
        break;
      default:
        break;
    }
  }
  return groups;
}

/* ─── Presentation ──────────────────────────────────────────────────────── */

export type MethodTone = { fg: string; bg: string; border: string };

/**
 * Color-coded method palette, using the dashboard's own theme tokens so it
 * adapts to light/dark automatically: GET blue, POST green, PUT/PATCH amber
 * (orange), DELETE red, everything else neutral.
 */
export function methodTone(method: string): MethodTone {
  switch (method.toLowerCase()) {
    case "get":
      return { fg: "var(--blue-text)", bg: "var(--blue-bg)", border: "var(--blue-border)" };
    case "post":
      return { fg: "var(--green-text)", bg: "var(--green-bg)", border: "var(--green-border)" };
    case "put":
    case "patch":
      return { fg: "var(--amber-text)", bg: "var(--amber-bg)", border: "var(--amber-border)" };
    case "delete":
      return { fg: "var(--red-text)", bg: "var(--red-bg)", border: "var(--red-border)" };
    default:
      return { fg: "var(--text-secondary)", bg: "var(--bg-surface-2)", border: "var(--border)" };
  }
}

export function statusTone(code: number): MethodTone {
  if (code >= 200 && code < 300) return { fg: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" };
  if (code >= 300 && code < 400) return { fg: "var(--blue)", bg: "var(--blue-bg)", border: "var(--blue-border)" };
  if (code >= 400 && code < 500) return { fg: "var(--amber)", bg: "var(--amber-bg)", border: "var(--amber-border)" };
  if (code >= 500) return { fg: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)" };
  return { fg: "var(--text-dim)", bg: "var(--bg-surface-2)", border: "var(--border)" };
}

/** Server list with the OpenAPI default of "/" when none are declared. */
export function serverUrls(spec: OpenApiSpec): string[] {
  const urls = (spec.servers ?? []).map((s) => s.url).filter((u): u is string => typeof u === "string" && u.length > 0);
  return urls.length ? urls : ["/"];
}

/** Join a server base with a path, tolerant of trailing/leading slashes. */
export function joinUrl(base: string, path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (!base || base === "/") return path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
