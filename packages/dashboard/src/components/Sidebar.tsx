import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { TSLogoMarkFilled } from "./TSLogo";

// Every nav glyph is drawn in the same 24x24 grid with one inherited stroke, so
// the set reads as a family instead of seven separately-tuned drawings. Color is
// applied on the <svg> and inherited by the paths below.
//
// The active link paints an indigo gradient and sets its label to --on-accent
// (black in the dark theme), so the icon has to use the same token — an
// accent-colored icon vanished into the accent gradient in dark mode.
type NavIconProps = { active?: boolean };

function NavSvg({ active, children }: NavIconProps & { children: ReactNode }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
      style={{
        color: active ? "var(--on-accent)" : "var(--text-secondary)",
        transition: "color var(--dur-fast) var(--ease-out)",
      }}
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function IconTraces({ active }: NavIconProps) {
  return (
    <NavSvg active={active}>
      <path d="M7 3.5h6.3L18 8.2v12.3H7z" />
      <path d="M13.3 3.5v4.7H18" />
      <path d="M9.8 13h5M9.8 16h3.4" />
    </NavSvg>
  );
}

function IconReplay({ active }: NavIconProps) {
  return (
    <NavSvg active={active}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2" />
      <path d="M20.5 4.4v4.6H16" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2" />
      <path d="M3.5 19.6V15H8" />
    </NavSvg>
  );
}

function IconRegression({ active }: NavIconProps) {
  return (
    <NavSvg active={active}>
      <path d="M4 4v16h16" />
      <path d="M7.5 15.5l3.5-4.5 3 3L20 7.5" />
      <circle cx="20" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </NavSvg>
  );
}

function IconRelay({ active }: NavIconProps) {
  return (
    <NavSvg active={active}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3 2.5-5.5 5.5-5.5s5.5 2.5 5.5 5.5" />
      <path d="M15.8 5.7a3 3 0 0 1 0 4.6" />
      <path d="M17 14.8c2.1.6 3.5 2.5 3.5 4.7" />
    </NavSvg>
  );
}

function IconCli({ active }: NavIconProps) {
  return (
    <NavSvg active={active}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M7 10l2.4 2.2L7 14.4" />
      <path d="M12.5 15h4.5" />
    </NavSvg>
  );
}

function IconOpenApi({ active }: NavIconProps) {
  return (
    <NavSvg active={active}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M9.6 9.4L7.2 12l2.4 2.6" />
      <path d="M14.4 9.4L16.8 12l-2.4 2.6" />
    </NavSvg>
  );
}

function IconSettings({ active }: NavIconProps) {
  return (
    <NavSvg active={active}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 3.6v2.1M12 18.3v2.1M3.6 12h2.1M18.3 12h2.1M6.1 6.1l1.5 1.5M16.4 16.4l1.5 1.5M17.9 6.1l-1.5 1.5M7.6 16.4l-1.5 1.5" />
    </NavSvg>
  );
}

const NAV = [
  { to: "/", label: "Traces", Icon: IconTraces, end: true },
  { to: "/replays", label: "Replays", Icon: IconReplay, end: false },
  { to: "/regressions", label: "Regressions", Icon: IconRegression, end: false },
  { to: "/relay", label: "Relay", Icon: IconRelay, end: false },
  { to: "/cli", label: "CLI", Icon: IconCli, end: false },
  { to: "/openapi", label: "OpenAPI", Icon: IconOpenApi, end: false },
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
              {badge && <span className="badge-angular badge-angular-cyan">{badge}</span>}
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

        {/* <NavItem
          to="/overview"
          label="Product Website"
          Icon={IconGlobe}
          end={false}
          collapsed={collapsed}
          badge="NEW"
        /> */}
      </nav>

      {/* Local-First status card — emerald is the "live & local" voice, the
          same one used for the collector dot in the top bar. */}
      {!collapsed && (
        <div className="mt-auto p-3 m-2 rounded-[8px] ts-card" style={{ background: "var(--bg-surface-2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="relative flex h-2 w-2 shrink-0"
              aria-hidden="true"
            >
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: "var(--live)" }}
              />
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: "var(--live)" }}
              />
            </span>
            <span className="text-[11px] font-mono font-bold text-[var(--text-primary)]">Local-First Mode</span>
          </div>
          <p className="text-[10px] text-[var(--text-dim)] font-sans leading-tight">
            SQLite database active. 0 cloud telemetry sent.
          </p>
          <div className="mt-2 text-[9px] text-[var(--cyan-text)] font-mono">
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
