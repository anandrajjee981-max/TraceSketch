import { useState } from "react";
import type { ReactElement } from "react";
import type { OpenApiSchema, OpenApiSpec } from "../../lib/openapi";
import { derefSchema, sampleFromSchema, schemaTypeLabel } from "../../lib/openapi";

/* ═══════════════════════════════════════════════════════════════════════════
   Recursive schema viewer.

   Renders an object schema as an expandable property tree: name, type, a
   REQUIRED marker, description and a synthesized example. Nested objects,
   arrays and compositions (allOf/oneOf/anyOf) expand inline; recursion is
   depth-bounded so circular $refs cannot blow the stack.
   ═══════════════════════════════════════════════════════════════════════════ */

const MAX_DEPTH = 6;

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0 transition-transform duration-150"
      style={{ transform: open ? "rotate(90deg)" : "none" }}
    >
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TypeLabel({ spec, schema }: { spec: OpenApiSpec; schema: OpenApiSchema }) {
  const label = schemaTypeLabel(spec, schema);
  return (
    <span className="ts-mono text-[11px] shrink-0" style={{ color: "var(--accent-text)" }}>
      {label}
      {schema.format ? <span style={{ color: "var(--text-dim)" }}> · {schema.format}</span> : null}
    </span>
  );
}

function RequiredTag() {
  return (
    <span
      className="text-[9px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 rounded-[4px] shrink-0"
      style={{ color: "var(--red-text)", background: "var(--red-bg)", border: "1px solid var(--red-border)" }}
    >
      required
    </span>
  );
}

function hasChildren(spec: OpenApiSpec, schema: OpenApiSchema): boolean {
  const resolved = derefSchema(spec, schema);
  if (!resolved) return false;
  if (resolved.properties && Object.keys(resolved.properties).length > 0) return true;
  if (resolved.type === "array" && resolved.items) return true;
  if (resolved.allOf?.length || resolved.oneOf?.length || resolved.anyOf?.length) return true;
  return false;
}

interface NodeProps {
  spec: OpenApiSpec;
  name: string;
  schema: OpenApiSchema;
  required?: boolean;
  depth: number;
}

function SchemaNode({ spec, name, schema, required, depth }: NodeProps) {
  const [open, setOpen] = useState(depth < 1);
  const resolved = derefSchema(spec, schema);
  const expandable = depth < MAX_DEPTH && hasChildren(spec, schema);
  const children = renderChildren({ spec, schema: resolved, depth });
  const example = sampleFromSchema(spec, schema);
  const exampleText =
    example !== null && example !== undefined && typeof example !== "object" ? String(example) : null;

  return (
    <div className="border-t first:border-t-0" style={{ borderColor: "var(--border-dim)" }}>
      <div className="flex items-start gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => expandable && setOpen((v) => !v)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-[5px]"
          style={{ cursor: expandable ? "pointer" : "default" }}
          aria-expanded={expandable ? open : undefined}
          disabled={!expandable}
        >
          <span style={{ color: "var(--text-dim)", visibility: expandable ? "visible" : "hidden" }}>
            <Chevron open={open} />
          </span>
          <span className="ts-mono text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {name}
          </span>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          {exampleText !== null && (
            <span className="ts-mono text-[11px] max-w-[180px] truncate hidden sm:inline" style={{ color: "var(--text-dim)" }} title={exampleText}>
              {exampleText}
            </span>
          )}
          {resolved && <TypeLabel spec={spec} schema={resolved} />}
          {required && <RequiredTag />}
        </div>
      </div>

      {resolved?.description && (
        <div className="px-3 pb-2 -mt-1 pl-[42px] text-[11.5px] leading-[17px]" style={{ color: "var(--text-secondary)" }}>
          {resolved.description}
        </div>
      )}

      {resolved?.enum && resolved.enum.length > 0 && (
        <div className="px-3 pb-2 pl-[42px] flex flex-wrap gap-1.5">
          {resolved.enum.map((v, i) => (
            <span
              key={i}
              className="ts-mono text-[10.5px] px-1.5 py-0.5 rounded-[4px]"
              style={{ color: "var(--text-secondary)", background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}
            >
              {JSON.stringify(v)}
            </span>
          ))}
        </div>
      )}

      {open && children.length > 0 && (
        <div className="pl-[14px] ml-[18px] border-l" style={{ borderColor: "var(--border-dim)" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function renderChildren({ spec, schema, depth }: { spec: OpenApiSpec; schema: OpenApiSchema | undefined; depth: number }): ReactElement[] {
  if (!schema || depth >= MAX_DEPTH) return [];
  const nodes: ReactElement[] = [];

  if (schema.properties) {
    const requiredSet = new Set(schema.required ?? []);
    for (const [key, child] of Object.entries(schema.properties)) {
      nodes.push(
        <SchemaNode key={key} spec={spec} name={key} schema={child} required={requiredSet.has(key)} depth={depth + 1} />,
      );
    }
  }

  if (schema.type === "array" && schema.items) {
    nodes.push(<SchemaNode key="__items" spec={spec} name="items" schema={schema.items} depth={depth + 1} />);
  }

  const composed = [...(schema.allOf ?? []), ...(schema.oneOf ?? []), ...(schema.anyOf ?? [])];
  composed.forEach((part, i) => {
    const resolved = derefSchema(spec, part);
    if (resolved?.properties) {
      const requiredSet = new Set(resolved.required ?? []);
      for (const [key, child] of Object.entries(resolved.properties)) {
        nodes.push(
          <SchemaNode key={`c${i}-${key}`} spec={spec} name={key} schema={child} required={requiredSet.has(key)} depth={depth + 1} />,
        );
      }
    }
  });

  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    nodes.push(
      <SchemaNode key="__additional" spec={spec} name="<additional properties>" schema={schema.additionalProperties} depth={depth + 1} />,
    );
  }

  return nodes;
}

/** Root renderer: a labelled card containing the property tree. */
export function SchemaTree({
  spec,
  schema,
  label,
  defaultOpen = true,
}: {
  spec: OpenApiSpec;
  schema: OpenApiSchema | undefined;
  label?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const resolved = derefSchema(spec, schema);
  if (!resolved) {
    return (
      <div className="ts-mono text-[11.5px] px-3 py-2" style={{ color: "var(--text-dim)" }}>
        No schema declared.
      </div>
    );
  }

  const children = renderChildren({ spec, schema: resolved, depth: 0 });
  const label2 = label ?? schemaTypeLabel(spec, resolved);

  return (
    <div className="rounded-[8px] overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--bg-surface)" }}>
      <button
        type="button"
        onClick={() => children.length > 0 && setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
        style={{ background: "var(--bg-surface-2)", cursor: children.length ? "pointer" : "default" }}
        aria-expanded={children.length ? open : undefined}
      >
        {children.length > 0 ? (
          <span style={{ color: "var(--text-dim)" }}>
            <Chevron open={open} />
          </span>
        ) : (
          <span className="w-[12px]" />
        )}
        <span className="ts-mono text-[11.5px] font-semibold" style={{ color: "var(--text-primary)" }}>
          {label2}
        </span>
        <span className="ts-overline ml-auto" style={{ color: "var(--text-dim)" }}>
          {children.length ? (open ? "hide" : "show") : "scalar"}
        </span>
      </button>
      {resolved.description && (
        <div className="px-3 py-2 text-[11.5px] leading-[17px]" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border-dim)" }}>
          {resolved.description}
        </div>
      )}
      {open && children.length > 0 && <div>{children}</div>}
    </div>
  );
}
