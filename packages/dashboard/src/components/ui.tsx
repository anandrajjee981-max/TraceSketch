import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Shared UI primitives.
   Every page composes from these so spacing, motion, focus behaviour and
   typography stay identical across the console. Presentation only — these
   components never own data or perform I/O.
   ═══════════════════════════════════════════════════════════════════════════ */

type StaggerStyle = React.CSSProperties & { "--stagger-i"?: number };

function stagger(i: number): StaggerStyle {
  return { "--stagger-i": i };
}

/* ─── Page header ───────────────────────────────────────────────────────── */

export function PageHeader({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 ts-stagger" style={stagger(0)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-white">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-[12.5px] leading-[19px] mt-1.5 text-slate-400 max-w-[68ch]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function Badge({ children, tone = "accent" }: { children: ReactNode; tone?: "accent" | "neutral" }) {
  return <span className={`ts-chip ${tone === "accent" ? "ts-chip-accent" : "ts-chip-neutral"}`}>{children}</span>;
}

/* ─── Card ──────────────────────────────────────────────────────────────── */

export function Card({
  children,
  className = "",
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <div className={`ts-card ${interactive ? "ts-card-interactive" : ""} ${className}`}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="ts-card-header">
      <div className="min-w-0">
        <div className="ts-card-title">{title}</div>
        {subtitle && <div className="ts-card-subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ts-card-body ${className}`}>{children}</div>;
}

/* ─── Toolbar ───────────────────────────────────────────────────────────── */

export function Toolbar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`ts-toolbar ${className}`}>{children}</div>;
}

export function ToolbarFooter({ children }: { children: ReactNode }) {
  return <div className="ts-toolbar-footer">{children}</div>;
}

/* ─── Form primitives ───────────────────────────────────────────────────── */

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="ts-label">{label}</label>
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative flex-1 min-w-[200px]">
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: "var(--text-dim)" }}
        aria-hidden="true"
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="ts-input ts-input-mono !pl-9"
      />
    </div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────────── */

export function StatCard({
  label,
  value,
  sub,
  accent = "accent",
  index = 0,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "accent" | "green" | "red" | "amber" | "blue";
  index?: number;
}) {
  return (
    <div className="ts-stat ts-stagger" data-accent={accent} style={stagger(index)}>
      <div className="ts-stat-label">{label}</div>
      <div className="ts-stat-value">{value}</div>
      {sub && <div className="ts-stat-sub">{sub}</div>}
    </div>
  );
}

/* ─── Data table ────────────────────────────────────────────────────────── */

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="ts-table-wrap">{children}</div>;
}

export function SortableTh<K extends string>({
  label,
  column,
  activeKey,
  dir,
  onToggle,
}: {
  label: string;
  column: K;
  activeKey: K;
  dir: "asc" | "desc";
  onToggle: (key: K) => void;
}) {
  const active = activeKey === column;
  return (
    <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="ts-sort" data-active={active} onClick={() => onToggle(column)}>
        {label}
        <span className="ts-sort-arrow" aria-hidden="true">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

/* ─── Status pills ──────────────────────────────────────────────────────── */

export function MetaPill({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] text-[12px]"
      style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-dim)" }}
    >
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </span>
  );
}

/* ─── Inline feedback ───────────────────────────────────────────────────── */

export function InlineError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 text-[12px] px-3 py-2 rounded-[7px]"
      style={{ color: "var(--red)", background: "var(--red-bg)", border: "1px solid var(--red-border)" }}
    >
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </div>
  );
}

export function InlineSuccess({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-[7px]"
      style={{ color: "var(--green)", background: "var(--green-bg)", border: "1px solid var(--green-border)" }}
    >
      <span aria-hidden="true">✓</span>
      <span>{children}</span>
    </div>
  );
}

/* ─── Copy-to-clipboard ─────────────────────────────────────────────────── */

export function CopyButton({
  value,
  children,
  className = "btn-secondary",
  copiedLabel = "Copied",
  title,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  copiedLabel?: string;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button type="button" onClick={copy} className={className} title={title}>
      {copied ? (
        <span className="ts-pop inline-flex items-center gap-1.5" style={{ color: "var(--green)" }}>
          <span aria-hidden="true">✓</span>
          {copiedLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/* ─── Code block ────────────────────────────────────────────────────────── */

export function CodeBlock({
  code,
  label,
  copyable = true,
  copyLabel = "Copy",
}: {
  code: string;
  label?: string;
  copyable?: boolean;
  copyLabel?: string;
}) {
  return (
    <div
      className="rounded-[10px] overflow-hidden text-left"
      style={{ background: "var(--bg-page)", border: "1px solid var(--border)" }}
    >
      {(label || copyable) && (
        <div
          className="flex items-center justify-between gap-3 px-3.5 py-2"
          style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border-dim)" }}
        >
          <span className="ts-overline">{label}</span>
          {copyable && <CopyButton value={code} className="btn-ghost !py-1 !px-2 !text-[11px]">{copyLabel}</CopyButton>}
        </div>
      )}
      <pre className="text-[12px] leading-[20px] font-mono whitespace-pre-wrap break-all p-4 text-slate-200">
        {code}
      </pre>
    </div>
  );
}
