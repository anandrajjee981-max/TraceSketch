import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { deleteOpenApiDoc, getOpenApiDocs } from "../api/client";
import type { OpenApiDoc } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { Badge, CodeBlock, MetaPill } from "../components/ui";
import { InteractiveDocs } from "../components/openapi/InteractiveDocs";
import { absoluteTime } from "../lib/format";
import { useConfig } from "../context/ConfigContext";
import type { OpenApiSpec } from "../lib/openapi";
import { parseSpec } from "../lib/openapi";

/* ═══════════════════════════════════════════════════════════════════════════
   OpenAPI Docs.

   Two views over the same document:
     • Interactive — a Swagger-style explorer with Try-it-out.
     • Code        — the raw spec (JSON/YAML).

   Download always emits the specification itself (never the UI). The spec is
   loaded from the collector, or imported from a URL / local file.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ─── Simple YAML serializer (no dependency) ─── */
function toYaml(value: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (value === null || value === undefined) return `${pad}null`;
  if (typeof value === "boolean" || typeof value === "number") return `${pad}${String(value)}`;
  if (typeof value === "string") {
    if (/^[a-zA-Z0-9_:./-]+$/.test(value)) return `${pad}${value}`;
    return `${pad}"${value.replace(/"/g, '\\"')}"`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${pad}[]`;
    return value
      .map((v) => {
        const child = toYaml(v, indent + 1);
        if (!child.includes("\n")) return `${pad}- ${child.trimStart()}`;
        return `${pad}- ${child}`;
      })
      .join("\n");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return `${pad}{}`;
    return entries
      .map(([k, v]) => {
        const child = toYaml(v, indent + 1);
        if (!child.includes("\n")) return `${pad}${k}: ${child.trimStart()}`;
        return `${pad}${k}:\n${child}`;
      })
      .join("\n");
  }
  return `${pad}${String(value)}`;
}

/* ─── Icons ─── */
function IconExpand() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9V5a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4h4a1 1 0 0 1 1 1v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 15v4a1 1 0 0 1-1 1h-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20H5a1 1 0 0 1-1-1v-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCollapse() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 4v4a1 1 0 0 1-1 1H4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 4v4a1 1 0 0 0 1 1h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 20v-4a1 1 0 0 1 1-1h4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 20v-4a1 1 0 0 0-1-1H4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 7l.9 11.2A2 2 0 0 0 9.4 20h5.2a2 2 0 0 0 2-1.8L17.5 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v5M14 11v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 8.5L12 4l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Code-view doc list item ─── */

function DocListItem({
  doc,
  selectedId,
  onSelect,
}: {
  doc: OpenApiDoc;
  selectedId: string | null;
  onSelect: (doc: OpenApiDoc) => void;
}) {
  const isSelected = selectedId === doc.id;
  return (
    <button
      onClick={() => onSelect(doc)}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[8px] border transition-all duration-150 hover:bg-[var(--bg-surface-2)] ${
        isSelected ? "border-[var(--accent)] bg-[var(--accent-light)]" : "border-[var(--border)]"
      }`}
    >
      <div className="min-w-0 flex items-center gap-2">
        <div className="h-3 w-3 rounded-full shrink-0" style={{ background: isSelected ? "var(--accent)" : "var(--border-dim)" }} />
        <div className="min-w-0 text-left">
          <div className="ts-mono text-[12px] font-medium text-[var(--text-primary)] truncate" title={doc.name}>
            {doc.name}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="ts-overline text-[9px] text-[var(--text-dim)]">repo</span>
            <span className="ts-mono text-[10px] text-[var(--text-secondary)] truncate max-w-[140px]" title={doc.repo ?? "—"}>
              {doc.repo ?? "—"}
            </span>
            <span className="ts-overline text-[9px] text-[var(--text-dim)]">v{doc.version}</span>
          </div>
        </div>
      </div>
      <span className="ts-mono text-[11px] text-[var(--text-dim)] truncate max-w-[120px]" title={absoluteTime(doc.created_at)}>
        {absoluteTime(doc.created_at)}
      </span>
    </button>
  );
}

/* ─── Page ─── */

export function OpenApiDocs() {
  const { instanceId, apiBaseUrl } = useConfig();
  const [docs, setDocs] = useState<OpenApiDoc[]>([]);
  const [selected, setSelected] = useState<OpenApiDoc | null>(null);
  const [filterRepo, setFilterRepo] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"interactive" | "code">("interactive");
  const [format, setFormat] = useState<"json" | "yaml">("json");
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState<{ name: string; spec: OpenApiSpec } | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Load the document list. The async worker is declared inside the effect so
  // its setState calls are not run synchronously in the effect body.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getOpenApiDocs({ instanceId, apiBaseUrl, repo: filterRepo });
        if (cancelled) return;
        setDocs(res.docs ?? []);
        setSelected((prev) => prev ?? res.docs?.[0] ?? null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [instanceId, apiBaseUrl, filterRepo]);

  const uniqueRepos = useMemo(() => [...new Set(docs.map((d) => d.repo).filter(Boolean))] as string[], [docs]);

  const parsed = useMemo(() => {
    if (imported) return { spec: imported.spec, error: null as string | null };
    if (!selected) return { spec: null, error: null as string | null };
    return parseSpec(selected.content);
  }, [imported, selected]);

  const spec = parsed.spec;

  const displayText = useMemo(() => {
    if (imported) return format === "json" ? JSON.stringify(imported.spec, null, 2) : toYaml(imported.spec);
    if (!selected) return "";
    if (format === "json") {
      try {
        return JSON.stringify(JSON.parse(selected.content), null, 2);
      } catch {
        return selected.content;
      }
    }
    if (parsed.spec) return toYaml(parsed.spec);
    return selected.content;
  }, [selected, format, parsed.spec, imported]);

  /** Select a collector document, clearing any pending delete confirmation. */
  function selectDoc(doc: OpenApiDoc | null) {
    setSelected(doc);
    setConfirmingDelete(false);
  }

  function handleDownload() {
    if (!displayText) return;
    const ext = format === "json" ? "json" : "yaml";
    const mime = format === "json" ? "application/json" : "application/yaml";
    const blob = new Blob([displayText], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = imported ? imported.name : selected?.name ?? "openapi";
    a.download = `${base.replace(/[^a-zA-Z0-9_-]/g, "_")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteOpenApiDoc(selected.id, { instanceId, apiBaseUrl });
      const remaining = docs.filter((d) => d.id !== selected.id);
      setDocs(remaining);
      selectDoc(remaining[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  function loadImportFromText(text: string, name: string) {
    const result = parseSpec(text);
    if (!result.spec) {
      setImportError(result.error ?? "Could not parse the document.");
      return;
    }
    setImported({ name, spec: result.spec });
    setImportError(null);
    setImportOpen(false);
    setView("interactive");
  }

  async function handleImportUrl() {
    const url = importUrl.trim();
    if (!url) return;
    setImportError(null);
    try {
      const res = await fetch(url, { headers: { Accept: "application/json, application/yaml, text/yaml, */*" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const text = await res.text();
      const name = url.split("/").pop()?.replace(/\.(json|ya?ml)$/i, "") || "imported-spec";
      loadImportFromText(text, name);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  }

  function handleImportFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      loadImportFromText(text, file.name.replace(/\.(json|ya?ml)$/i, ""));
    };
    reader.onerror = () => setImportError("Could not read the file.");
    reader.readAsText(file);
  }

  if (loading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "OpenAPI", to: "/openapi" }]} />
        <div className="ts-card p-8">
          <div className="h-[18px] rounded w-[120px] skeleton-shimmer" />
          <div className="mt-3 h-[40px] rounded skeleton-shimmer" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "OpenAPI", to: "/openapi" }]} />
        <ErrorState title="Unable to load OpenAPI docs" description="We couldn’t retrieve OpenAPI docs from the collector." detail={error} />
      </div>
    );
  }

  const hasContent = Boolean(spec);
  const docKey = imported ? `imported:${imported.name}` : selected?.id ?? "none";

  const codeViewer = (
    <div className={`ts-card min-w-0 ${expanded ? "flex flex-col flex-1 min-h-0 rounded-none" : ""}`}>
      <div className="ts-card-header flex items-center justify-between gap-3 flex-wrap px-4 py-3 shrink-0">
        <div className="min-w-0">
          <div className="ts-card-title truncate">{imported ? imported.name : selected?.name ?? "Select a document"}</div>
          <div className="ts-card-subtitle truncate">
            {selected && !imported && <span className="ts-mono text-[11px] text-[var(--text-secondary)]">{selected.name}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected && confirmingDelete ? (
            <>
              <span className="text-[11px] font-semibold" style={{ color: "var(--red-text)" }}>
                Delete this spec?
              </span>
              <button onClick={() => setConfirmingDelete(false)} disabled={deleting} className="px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium btn-secondary">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-semibold btn-destructive">
                <IconTrash />
                <span>{deleting ? "Deleting…" : "Delete"}</span>
              </button>
            </>
          ) : (
            <>
              {selected && !imported && (
                <>
                  <MetaPill label="repo" value={<span className="ts-mono text-[10px]">{selected.repo ?? "—"}</span>} />
                  <MetaPill label="version" value={<span className="ts-mono text-[10px]">{selected.version}</span>} />
                </>
              )}
              {selected && !imported && (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="flex items-center justify-center h-[32px] w-[32px] shrink-0 !p-0 rounded-[7px] btn-secondary"
                  style={{ color: "var(--red-text)" }}
                  title="Delete document"
                  aria-label="Delete document"
                >
                  <IconTrash />
                </button>
              )}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center justify-center h-[32px] w-[32px] shrink-0 !p-0 rounded-[7px] btn-secondary"
                style={{ color: "var(--accent-text)" }}
                title={expanded ? "Exit full screen" : "Expand to full screen"}
                aria-label={expanded ? "Exit full screen" : "Expand to full screen"}
              >
                {expanded ? <IconCollapse /> : <IconExpand />}
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`ts-card-body p-0 ${expanded ? "flex-1 min-h-0" : ""}`}>
        {spec ? (
          <div className={`p-3 ${expanded ? "h-full min-h-0" : ""}`}>
            <CodeBlock code={displayText} label={format === "json" ? "application/json" : "application/yaml"} maxHeight={expanded ? "100%" : "min(70vh, 720px)"} />
          </div>
        ) : (
          <div className="p-8 text-center">
            <EmptyState title="Select a document" description="Click a doc on the left to view its OpenAPI spec." />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "OpenAPI", to: "/openapi" }]} />

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] leading-none">OpenAPI Docs</div>
          <div className="ts-overline mt-1">Browse specs and test endpoints against a live server</div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="ts-segmented" role="radiogroup" aria-label="View mode">
            <button role="radio" aria-checked={view === "interactive"} onClick={() => setView("interactive")} className="ts-segment">
              Interactive
            </button>
            <button role="radio" aria-checked={view === "code"} onClick={() => setView("code")} className="ts-segment">
              Code
            </button>
          </div>

          <div className="ts-segmented" role="radiogroup" aria-label="Download format">
            <button role="radio" aria-checked={format === "json"} onClick={() => setFormat("json")} className="ts-segment">
              JSON
            </button>
            <button role="radio" aria-checked={format === "yaml"} onClick={() => setFormat("yaml")} className="ts-segment">
              YAML
            </button>
          </div>

          <button onClick={() => setImportOpen((v) => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-medium btn-secondary">
            <IconUpload />
            <span>Import spec</span>
          </button>

          <button onClick={handleDownload} disabled={!hasContent} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-medium btn-primary">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 8V4L8 0L12 4V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <span>Download {format.toUpperCase()}</span>
          </button>
        </div>
      </div>

      {/* ── Import panel ── */}
      {importOpen && (
        <div className="ts-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
                Import an OpenAPI spec
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--text-dim)" }}>
                Load a JSON or YAML document from a URL or a local file.
              </p>
            </div>
            <button onClick={() => setImportOpen(false)} className="btn-ghost !py-1 !px-2 !text-[11px]">
              Close
            </button>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[240px]">
              <span className="ts-label">Specification URL</span>
              <input
                className="ts-input ts-input-mono !text-[12px]"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://example.com/openapi.json"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleImportUrl();
                }}
              />
            </label>
            <button onClick={() => void handleImportUrl()} className="btn-primary text-[12px]">
              Load URL
            </button>
            <label className="btn-secondary text-[12px] cursor-pointer">
              Choose file…
              <input
                type="file"
                accept=".json,.yaml,.yml,application/json,text/yaml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {importError && (
            <div className="text-[11.5px] rounded-[6px] px-2.5 py-2" style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--red-border)" }}>
              {importError}
            </div>
          )}
          <p className="text-[11px] leading-[17px]" style={{ color: "var(--text-dim)" }}>
            Remote URLs must allow cross-origin reads (CORS). Credentials entered for a remote spec are not saved.
          </p>
        </div>
      )}

      {imported && (
        <div className="flex items-center gap-2 text-[12px] rounded-[8px] px-3 py-2" style={{ color: "var(--accent-text)", background: "var(--accent-light)", border: "1px solid var(--border-accent)" }}>
          <span>
            Showing imported spec <strong>{imported.name}</strong>
          </span>
          <button onClick={() => setImported(null)} className="btn-ghost !py-0.5 !px-2 !text-[11px] ml-auto">
            Back to collector docs
          </button>
        </div>
      )}

      {/* ── Document selector + repo filters ── */}
      {!imported && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="ts-overline">Document</span>
            <select
              className="ts-select !text-[12px] max-w-[280px]"
              value={selected?.id ?? ""}
              onChange={(e) => {
                const doc = docs.find((d) => d.id === e.target.value) ?? null;
                selectDoc(doc);
              }}
              disabled={docs.length === 0}
            >
              {docs.length === 0 && <option value="">No documents</option>}
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.repo ? ` · ${d.repo}` : ""}
                </option>
              ))}
            </select>
          </label>
          {uniqueRepos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setFilterRepo(undefined)}
                className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-all duration-150 ${filterRepo === undefined ? "text-[var(--accent-text)] bg-[var(--accent-light)]" : "text-[var(--text-secondary)] bg-[var(--bg-surface-2)]"}`}
                style={{ border: "1px solid", borderColor: filterRepo === undefined ? "var(--accent)" : "var(--border)" }}
              >
                All repos
              </button>
              {uniqueRepos.map((repo) => (
                <button
                  key={repo}
                  onClick={() => setFilterRepo(repo)}
                  className={`px-2.5 py-1 rounded-[5px] text-[11px] font-medium transition-all duration-150 ${filterRepo === repo ? "text-[var(--accent-text)] bg-[var(--accent-light)]" : "text-[var(--text-secondary)] bg-[var(--bg-surface-2)]"}`}
                  style={{ border: "1px solid", borderColor: filterRepo === repo ? "var(--accent)" : "var(--border)" }}
                >
                  {repo}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!hasContent ? (
        <div className="ts-card p-8 text-center">
          <EmptyState
            title={docs.length === 0 ? "No OpenAPI docs yet" : "This document could not be parsed"}
            description={
              docs.length === 0
                ? "Captured traces with a repo are auto-converted to OpenAPI specs. Use traceSketch({ docs: { repo: 'your-repo' } }) in your SDK, or import a spec."
                : parsed.error ?? "The document is not valid JSON or YAML OpenAPI."
            }
            action={
              <button onClick={() => setImportOpen(true)} className="btn-primary text-[12px]">
                Import a spec
              </button>
            }
          />
        </div>
      ) : view === "interactive" ? (
        <InteractiveDocs key={docKey} spec={spec!} apiBaseUrl={apiBaseUrl} instanceId={instanceId} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="ts-overline">Documents ({docs.length})</div>
              <Badge tone="neutral">
                {uniqueRepos.length} repo{uniqueRepos.length !== 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="space-y-1">
              {docs.map((doc) => (
                <DocListItem key={doc.id} doc={doc} selectedId={selected?.id ?? null} onSelect={selectDoc} />
              ))}
            </div>
          </div>
          <div className="lg:col-span-8 space-y-2 min-w-0">
            {expanded
              ? createPortal(
                  <div
                    className="fixed inset-0 z-[100] flex flex-col p-3 sm:p-5 ts-overlay"
                    style={{ background: "rgba(0, 0, 0, 0.6)" }}
                    onClick={() => setExpanded(false)}
                    role="dialog"
                    aria-modal="true"
                  >
                    <div className="flex-1 min-h-0 flex flex-col" onClick={(e) => e.stopPropagation()}>
                      {codeViewer}
                    </div>
                  </div>,
                  document.body,
                )
              : codeViewer}
          </div>
        </div>
      )}
    </div>
  );
}
