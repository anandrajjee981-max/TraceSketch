import { NavLink } from "react-router-dom";
import { TSLogoMarkFilled } from "./TSLogo";

function IconTraces({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-secondary)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M5 2.5H9.2L12 5.3V13.5H5V2.5Z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.2 2.5V5.3H12" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.5 8.2H10.5M6.5 10.2H10.5M6.5 6.2H8.2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconReplay({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-secondary)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M8 13.5A5.5 5.5 0 1 0 3.2 7.2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3.2 3.5v3.7H6.9" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.2 8L8.2 10L11.5 6.2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconRegression({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-secondary)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M2.5 13.5H13.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M4 10.5L7 6.5L9.5 9L13.5 3.5" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13.5" cy="3.5" r="1.2" fill={stroke} />
    </svg>
  );
}

function IconRelay({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-secondary)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="5.5" cy="4.5" r="2" stroke={stroke} strokeWidth="1.3" />
      <path d="M1.5 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="11.5" cy="4.5" r="1.5" stroke={stroke} strokeWidth="1.2" />
      <path d="M13.5 13.5c0-1.7-1-3-2.5-3.5" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-secondary)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M8 10.5A2.5 2.5 0 1 0 8 5.5a2.5 2.5 0 0 0 0 5Z" stroke={stroke} strokeWidth="1.3" />
      <path
        d="M8 2.5v1.2M8 12.3V13.5M2.8 8H4M12 8h1.2M4.3 4.3l.85.85M11 11l.7.7M11.7 4.3l-.7.85M4.3 11.7l.85-.7"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconGlobe({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-secondary)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="6" stroke={stroke} strokeWidth="1.3" />
      <path d="M2.5 8h11M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12" stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}

const NAV = [
  { to: "/", label: "Traces", Icon: IconTraces, end: true },
  { to: "/replays", label: "Replays", Icon: IconReplay, end: false },
  { to: "/regressions", label: "Regressions", Icon: IconRegression, end: false },
  { to: "/relay", label: "Relay", Icon: IconRelay, end: false },
  { to: "/settings", label: "Settings", Icon: IconSettings, end: false },
] as const;

function NavItem({
  to,
  label,
  Icon,
  end,
  collapsed,
  badge,
}: {
  to: string;
  label: string;
  Icon: (props: { active?: boolean }) => React.JSX.Element;
  end: boolean;
  collapsed: boolean;
  badge?: string;
}) {
  return (
    <NavLink to={to} end={end} style={{ textDecoration: "none" }} title={collapsed ? label : undefined}>
      {({ isActive }: { isActive: boolean }) => (
        <span className="ts-nav-link w-full" data-active={isActive} aria-current={isActive ? "page" : undefined}>
          <Icon active={isActive} />
          {!collapsed && (
            <span className="flex items-center justify-between flex-1 min-w-0">
              <span className="truncate">{label}</span>
              {badge && <span className="badge-angular badge-angular-accent">{badge}</span>}
            </span>
          )}
        </span>
      )}
    </NavLink>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className="shrink-0 flex flex-col overflow-hidden select-none"
      style={{
        width: collapsed ? "56px" : "220px",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        transition: "width 200ms cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header — angular brand mark inspired by TS logomark geometry */}
      <div
        className="h-[52px] flex items-center px-3 shrink-0 gap-2"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        {collapsed ? (
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="ts-icon-badge mx-auto"
            style={{ width: 30, height: 30, padding: 3, border: "none", cursor: "pointer" }}
          >
            <TSLogoMarkFilled size={24} />
          </button>
        ) : (
          <>
            <div className="ts-icon-badge shrink-0" style={{ width: 28, height: 28, padding: 2 }}>
              <TSLogoMarkFilled size={24} />
            </div>
            <div className="flex items-baseline gap-0 flex-1 min-w-0">
              <span className="text-[13px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] leading-none">Trace</span>
              <span className="text-[13px] font-extrabold tracking-[-0.02em] text-[var(--accent)] leading-none">Sketch</span>
            </div>
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px] shrink-0 btn-ghost !px-0 !py-0"
            >
              «
            </button>
          </>
        )}
      </div>

      <nav className="p-2.5 flex flex-col gap-1" aria-label="Primary">
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}

        {/* Angular TS divider — skewed like the T's parallelogram top bar */}
        <div className="my-2 mx-1">
          <div className="ts-divider" />
        </div>

        <NavItem
          to="/overview"
          label="Product Website"
          Icon={IconGlobe}
          end={false}
          collapsed={collapsed}
          badge="NEW"
        />
      </nav>

      {/* Local-First status card */}
      {!collapsed && (
        <div className="mt-auto p-3 m-2 rounded-[8px] ts-card" style={{ background: "var(--bg-surface-2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[var(--green)]" />
            <span className="text-[11px] font-mono font-bold text-[var(--text-primary)]">Local-First Mode</span>
          </div>
          <p className="text-[10px] text-[var(--text-dim)] font-sans leading-tight">
            SQLite database active. 0 cloud telemetry sent.
          </p>
          <div className="mt-2 text-[9px] text-[var(--accent-text)] font-mono">
            Press <kbd className="ts-kbd">⌘K</kbd> for quick actions
          </div>
        </div>
      )}

      {!collapsed && (
        <div
          className="p-3 flex items-center justify-between text-[11px] font-mono ts-numeric"
          style={{ borderTop: "1px solid var(--border-dim)", color: "var(--text-dim)" }}
        >
          <span>traceSketch</span>
          <span>v0.0.1</span>
        </div>
      )}
    </aside>
  );
}
