import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { getInstanceSecret } from "../../api/client";
import { Badge } from "../ui";
import { DocsSidebar, type DocsEndpointGroup } from "./DocsSidebar";
import { EndpointCard, type RequestHistoryEntry } from "./EndpointCard";
import { MethodBadge } from "./MethodBadge";
import { SchemaTree } from "./SchemaTree";
import { absoluteTime } from "../../lib/format";
import type { Endpoint, OpenApiSecurityScheme, OpenApiSpec } from "../../lib/openapi";
import {
  collectEndpoints,
  collectSchemas,
  collectSecuritySchemes,
  effectiveSecurity,
  serverUrls,
} from "../../lib/openapi";

/* ═══════════════════════════════════════════════════════════════════════════
   Interactive OpenAPI explorer.

   Owns all *session* state (server URL, entered credentials, search, request
   history). The parent mounts this with a `key` per document, so switching
   specs remounts and resets cleanly instead of syncing state in an effect.
   Auth values live in memory only and are never written to storage.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Security helpers ─── */

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Origin of the user's own collector — the only target that gets instance creds. */
function collectorOrigin(apiBaseUrl: string): string {
  return originOf(apiBaseUrl) ?? "http://localhost:4000";
}

/** Turn a scheme + entered value into headers/query params. */
function applySecurity(
  scheme: OpenApiSecurityScheme,
  value: string,
): { headers: Record<string, string>; query: Record<string, string> } {
  const headers: Record<string, string> = {};
  const query: Record<string, string> = {};
  if (!value.trim()) return { headers, query };
  const type = (scheme.type ?? "").toLowerCase();
  if (type === "http") {
    const s = (scheme.scheme ?? "").toLowerCase();
    headers["Authorization"] = s === "bearer" ? `Bearer ${value}` : s === "basic" ? `Basic ${value}` : value;
  } else if (type === "apikey") {
    const name = scheme.name ?? "api_key";
    if ((scheme.in ?? "header").toLowerCase() === "query") query[name] = value;
    else headers[name] = value;
  } else if (type === "oauth2" || type === "openidconnect") {
    headers["Authorization"] = `Bearer ${value}`;
  } else if (type === "mutualtls") {
    // mTLS is negotiated by the browser at the TLS layer; nothing to inject.
  }
  return { headers, query };
}

interface IndexedEndpoint extends Endpoint {
  index: number;
}

function matchesQuery(e: IndexedEndpoint, q: string): boolean {
  if (!q) return true;
  return (
    e.path.toLowerCase().includes(q) ||
    e.method.includes(q) ||
    (e.operation.summary ?? "").toLowerCase().includes(q) ||
    e.operationId.toLowerCase().includes(q) ||
    e.tags.some((t) => t.toLowerCase().includes(q))
  );
}

/* ─── Section: Overview ─── */

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] px-3 py-2" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
      <div className="text-[18px] font-bold ts-numeric" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="ts-overline">{label}</div>
    </div>
  );
}

function OverviewSection({ spec, endpoints, baseUrl }: { spec: OpenApiSpec; endpoints: IndexedEndpoint[]; baseUrl: string }) {
  const methodCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of endpoints) counts.set(e.method, (counts.get(e.method) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [endpoints]);

  return (
    <section data-doc-section="overview" id="ov" className="space-y-3 scroll-mt-4">
      <div className="ts-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
            {spec.info?.title ?? "Untitled API"}
          </h2>
          <Badge tone="neutral">v{spec.info?.version ?? "1.0.0"}</Badge>
          <Badge tone="accent">{spec.openapi ?? spec.swagger ?? "OpenAPI"}</Badge>
        </div>
        {spec.info?.description && (
          <p className="text-[13px] leading-[20px] whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {spec.info.description}
          </p>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatTile label="Endpoints" value={String(endpoints.length)} />
          <StatTile label="Tags" value={String(new Set(endpoints.flatMap((e) => e.tags)).size)} />
          <StatTile label="Schemas" value={String(collectSchemas(spec).length)} />
          <StatTile label="Security" value={String(collectSecuritySchemes(spec).length)} />
        </div>
      </div>

      <div className="ts-card p-4 space-y-2">
        <div className="ts-overline">Base URL</div>
        <div className="ts-mono text-[12px] break-all" style={{ color: "var(--text-secondary)" }}>
          {baseUrl}
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {methodCounts.map(([method, count]) => (
            <span key={method} className="inline-flex items-center gap-1.5">
              <MethodBadge method={method} size="sm" />
              <span className="ts-mono text-[11px]" style={{ color: "var(--text-dim)" }}>
                ×{count}
              </span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Section: Schemas ─── */

function SchemasSection({ spec }: { spec: OpenApiSpec }) {
  const schemas = useMemo(() => collectSchemas(spec), [spec]);
  return (
    <section data-doc-section="schemas" id="schemas" className="space-y-3 scroll-mt-4">
      <SectionHeading title="Schemas & Models" subtitle="Reusable components declared under components.schemas." />
      {schemas.length === 0 ? (
        <InlineNote>
          This document declares no <code className="ts-mono">components.schemas</code>. Specs generated from captured
          traces inline their schemas per operation, so inspect the request/response bodies on each endpoint instead.
        </InlineNote>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {schemas.map(({ name, schema }) => (
            <div key={name} id={`schema-${name}`} className="scroll-mt-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="ts-mono text-[12.5px] font-bold" style={{ color: "var(--text-primary)" }}>
                  {name}
                </span>
              </div>
              <SchemaTree spec={spec} schema={schema} label={name} defaultOpen />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Section: Authentication ─── */

function AuthSection({
  spec,
  values,
  onChange,
}: {
  spec: OpenApiSpec;
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}) {
  const schemes = useMemo(() => collectSecuritySchemes(spec), [spec]);
  const globalSecurity = spec.security ?? [];

  return (
    <section data-doc-section="auth" id="auth" className="space-y-3 scroll-mt-4">
      <SectionHeading
        title="Authentication"
        subtitle="Credentials apply to Try-it-out requests from this session only — they are never stored or sent anywhere else."
      />

      {globalSecurity.length > 0 && (
        <div className="ts-card p-3">
          <div className="ts-overline mb-1">Document-level requirement</div>
          <div className="ts-mono text-[11.5px]" style={{ color: "var(--text-secondary)" }}>
            {globalSecurity.map((req) => Object.keys(req).join(" + ")).join("  |  ")}
          </div>
        </div>
      )}

      {schemes.length === 0 ? (
        <InlineNote>
          This document declares no <code className="ts-mono">components.securitySchemes</code>. Auth values you enter
          here are held in memory for this page only; nothing is persisted.
        </InlineNote>
      ) : (
        <div className="space-y-3">
          {schemes.map(({ name, scheme }) => {
            const type = (scheme.type ?? "").toLowerCase();
            const isApiKey = type === "apikey";
            const isHttp = type === "http";
            const isOAuth = type === "oauth2" || type === "openidconnect";
            const label = isApiKey
              ? `API key${scheme.in ? ` (${scheme.in}: ${scheme.name ?? ""})` : ""}`
              : isHttp
                ? `HTTP ${scheme.scheme ?? ""}${scheme.bearerFormat ? ` · ${scheme.bearerFormat}` : ""}`
                : isOAuth
                  ? "OAuth 2.0 access token"
                  : scheme.type ?? "scheme";
            return (
              <div key={name} className="ts-card p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="ts-mono text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>
                    {name}
                  </span>
                  <Badge tone="neutral">{label}</Badge>
                </div>
                {scheme.description && (
                  <p className="text-[12px] leading-[18px]" style={{ color: "var(--text-secondary)" }}>
                    {scheme.description}
                  </p>
                )}
                {scheme.flows &&
                  Object.entries(scheme.flows).map(([flowName, flow]) =>
                    flow ? (
                      <div key={flowName} className="rounded-[8px] px-3 py-2 space-y-0.5" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                        <div className="ts-overline">{flowName}</div>
                        {flow.authorizationUrl && <div className="ts-mono text-[11px] break-all" style={{ color: "var(--text-secondary)" }}>authorize: {flow.authorizationUrl}</div>}
                        {flow.tokenUrl && <div className="ts-mono text-[11px] break-all" style={{ color: "var(--text-secondary)" }}>token: {flow.tokenUrl}</div>}
                        {flow.scopes && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Object.keys(flow.scopes).map((scope) => (
                              <span key={scope} className="ts-mono text-[10.5px] px-1.5 py-0.5 rounded-[4px]" style={{ color: "var(--text-dim)", background: "var(--bg-surface)", border: "1px solid var(--border)" }}>
                                {scope}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null,
                  )}
                {type !== "mutualtls" && (
                  <label className="block">
                    <span className="ts-label">
                      {isHttp && (scheme.scheme ?? "").toLowerCase() === "basic"
                        ? "Base64 of user:password"
                        : isHttp
                          ? "Token"
                          : isOAuth
                            ? "Access token"
                            : "Key value"}
                    </span>
                    <input
                      className="ts-input ts-input-mono !text-[12px]"
                      type="password"
                      autoComplete="off"
                      placeholder="value…"
                      value={values[name] ?? ""}
                      onChange={(e) => onChange(name, e.target.value)}
                    />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h2>
      {subtitle && (
        <p className="text-[12px] leading-[18px] mt-0.5" style={{ color: "var(--text-dim)" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

function InlineNote({ children }: { children: ReactNode }) {
  return (
    <div className="text-[12.5px] leading-[19px] rounded-[8px] px-3.5 py-3" style={{ color: "var(--text-secondary)", background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
      {children}
    </div>
  );
}

/* ─── Interactive explorer ─── */

export function InteractiveDocs({
  spec,
  apiBaseUrl,
  instanceId,
}: {
  spec: OpenApiSpec;
  apiBaseUrl: string;
  instanceId: string;
}) {
  const [query, setQuery] = useState("");
  const [serverUrl, setServerUrl] = useState(() => {
    const first = serverUrls(spec)[0];
    return /^https?:\/\//i.test(first) ? first : apiBaseUrl || "http://localhost:4000";
  });
  const [authValues, setAuthValues] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<RequestHistoryEntry[]>([]);
  const [activeSection, setActiveSection] = useState("overview");
  const [focusedEndpoint, setFocusedEndpoint] = useState<number | null>(null);

  const contentRef = useRef<HTMLDivElement | null>(null);
  const historySeq = useRef(0);

  const endpoints = useMemo<IndexedEndpoint[]>(
    () => collectEndpoints(spec).map((e, index) => ({ ...e, index })),
    [spec],
  );

  const visibleEndpoints = useMemo(() => {
    const q = query.trim().toLowerCase();
    return endpoints.filter((e) => matchesQuery(e, q));
  }, [endpoints, query]);

  const navGroups = useMemo<DocsEndpointGroup[]>(() => {
    const map = new Map<string, DocsEndpointGroup>();
    for (const e of visibleEndpoints) {
      for (const tag of e.tags) {
        const group = map.get(tag) ?? { tag, endpoints: [] };
        group.endpoints.push({ index: e.index, method: e.method, path: e.path, summary: e.operation.summary });
        map.set(tag, group);
      }
    }
    return [...map.values()].sort((a, b) =>
      a.tag === "default" ? 1 : b.tag === "default" ? -1 : a.tag.localeCompare(b.tag),
    );
  }, [visibleEndpoints]);

  const schemeMap = useMemo(() => {
    const map: Record<string, OpenApiSecurityScheme> = {};
    for (const { name, scheme } of collectSecuritySchemes(spec)) map[name] = scheme;
    return map;
  }, [spec]);

  const activeServers = useMemo(() => serverUrls(spec).filter((u) => /^https?:\/\//i.test(u)), [spec]);

  // Scroll-spy over the sections. setActiveSection runs from the observer
  // callback (an external event), not synchronously in the effect body.
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-doc-section]"));
    if (sections.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.getAttribute("data-doc-section") ?? "overview");
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 1] },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [visibleEndpoints.length]);

  useEffect(() => {
    if (focusedEndpoint == null) return;
    const el = document.getElementById(`ep-${focusedEndpoint}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusedEndpoint]);

  function recordHistory(entry: Omit<RequestHistoryEntry, "id">) {
    historySeq.current += 1;
    const id = historySeq.current;
    setHistory((prev) => [{ ...entry, id }, ...prev].slice(0, 25));
  }

  /** Headers for one endpoint: its security schemes + local collector creds. */
  function headersFor(endpoint: Endpoint, url: string): Record<string, string> {
    const headers: Record<string, string> = {};
    for (const req of effectiveSecurity(spec, endpoint.operation)) {
      const name = Object.keys(req)[0];
      const scheme = name ? schemeMap[name] : undefined;
      if (!name || !scheme) continue;
      Object.assign(headers, applySecurity(scheme, authValues[name] ?? "").headers);
    }
    if (originOf(url) === collectorOrigin(apiBaseUrl)) {
      if (instanceId) headers["x-instance-id"] = instanceId;
      const secret = getInstanceSecret();
      if (secret) headers["x-instance-secret"] = secret;
    }
    return headers;
  }

  function queryAuthFor(endpoint: Endpoint): Record<string, string> {
    const query: Record<string, string> = {};
    for (const req of effectiveSecurity(spec, endpoint.operation)) {
      const name = Object.keys(req)[0];
      const scheme = name ? schemeMap[name] : undefined;
      if (!name || !scheme) continue;
      Object.assign(query, applySecurity(scheme, authValues[name] ?? "").query);
    }
    return query;
  }

  return (
    <div ref={contentRef} className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 items-start">
      <DocsSidebar
        navItems={[
          { id: "overview", label: "Overview" },
          { id: "endpoints", label: "API Endpoints", count: visibleEndpoints.length },
          { id: "schemas", label: "Schemas", count: collectSchemas(spec).length },
          { id: "auth", label: "Authentication", count: Object.keys(schemeMap).length },
        ]}
        activeId={activeSection}
        onNavigate={(id) => {
          setActiveSection(id);
          const el = contentRef.current?.querySelector<HTMLElement>(`[data-doc-section="${id}"]`);
          el?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        query={query}
        onQuery={setQuery}
        groups={navGroups}
        onEndpoint={setFocusedEndpoint}
      />

      <div className="space-y-5 min-w-0">
        <OverviewSection spec={spec} endpoints={endpoints} baseUrl={serverUrl} />

        <section data-doc-section="endpoints" id="ep" className="space-y-3 scroll-mt-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <SectionHeading title="API Endpoints" subtitle={`${visibleEndpoints.length} of ${endpoints.length} shown`} />
            <label className="flex items-center gap-2">
              <span className="ts-overline">Server</span>
              <input
                className="ts-input ts-input-mono !text-[11.5px] w-[280px] max-w-full"
                list="openapi-server-options"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                aria-label="API server base URL"
              />
              <datalist id="openapi-server-options">
                {activeServers.map((u) => (
                  <option key={u} value={u} />
                ))}
                <option value="http://localhost:4000" />
              </datalist>
            </label>
          </div>

          {visibleEndpoints.length === 0 ? (
            <InlineNote>No endpoints match “{query}”.</InlineNote>
          ) : (
            <div className="space-y-2">
              {visibleEndpoints.map((e) => (
                <div key={`${e.method}-${e.path}-${e.index}`} id={`ep-${e.index}`} className="scroll-mt-4">
                  <EndpointCard
                    spec={spec}
                    endpoint={e}
                    serverUrl={serverUrl}
                    headerProvider={(url) => headersFor(e, url)}
                    queryProvider={() => queryAuthFor(e)}
                    onRecord={recordHistory}
                    autoExpand={focusedEndpoint === e.index}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        <SchemasSection spec={spec} />

        <AuthSection
          spec={spec}
          values={authValues}
          onChange={(name, value) => setAuthValues((prev) => ({ ...prev, [name]: value }))}
        />

        {/* ── Request history ── */}
        <section data-doc-section="history" id="history" className="space-y-3 scroll-mt-4">
          <div className="flex items-end justify-between gap-3">
            <SectionHeading title="Request history" subtitle="Session-only. Auth headers are never recorded." />
            {history.length > 0 && (
              <button type="button" onClick={() => setHistory([])} className="btn-ghost !py-1 !px-2 !text-[11px]">
                Clear history
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <InlineNote>No requests yet. Use “Try it out” on an endpoint to run a request.</InlineNote>
          ) : (
            <div className="ts-card overflow-hidden">
              {history.map((h) => {
                let displayUrl = h.url;
                try {
                  const u = new URL(h.url);
                  displayUrl = u.pathname + u.search;
                } catch {
                  // relative URL — show as-is
                }
                return (
                  <div key={h.id} className="flex items-center gap-3 px-3 py-2 border-t first:border-t-0" style={{ borderColor: "var(--border-dim)" }}>
                    <MethodBadge method={h.method} size="sm" />
                    <span className="ts-mono text-[11.5px] truncate flex-1" style={{ color: "var(--text-secondary)" }} title={h.url}>
                      {displayUrl}
                    </span>
                    <span className="ts-mono text-[11px]" style={{ color: "var(--text-dim)" }}>
                      {h.duration} ms
                    </span>
                    <span className="ts-mono text-[11px] font-semibold" style={{ color: h.status == null ? "var(--text-dim)" : h.ok ? "var(--green)" : "var(--red)" }}>
                      {h.status ?? "ERR"}
                    </span>
                    <span className="ts-mono text-[10.5px] hidden sm:inline" style={{ color: "var(--text-dim)" }}>
                      {absoluteTime(h.at)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
