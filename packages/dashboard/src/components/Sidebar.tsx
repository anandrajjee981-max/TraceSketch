import { NavLink } from "react-router-dom";
import { TSLogoMarkFilled } from "./TSLogo";

function IconTraces({ active }: { active?: boolean }) {
  const stroke = active ? "#A78BFA" : "var(--text-dim)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M5 2.5H9.2L12 5.3V13.5H5V2.5Z" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.2 2.5V5.3H12" stroke={stroke} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M6.5 8.2H10.5M6.5 10.2H10.5M6.5 6.2H8.2" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconReplay({ active }: { active?: boolean }) {
  const stroke = active ? "#A78BFA" : "var(--text-dim)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M8 13.5A5.5 5.5 0 1 0 3.2 7.2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3.2 3.5v3.7H6.9" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.2 8L8.2 10L11.5 6.2" stroke={stroke} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconSettings({ active }: { active?: boolean }) {
  const stroke = active ? "#A78BFA" : "var(--text-dim)";
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
  const stroke = active ? "#A78BFA" : "var(--text-dim)";
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <circle cx="8" cy="8" r="6" stroke={stroke} strokeWidth="1.3" />
      <path d="M2.5 8h11M8 2a9 9 0 0 1 0 12M8 2a9 9 0 0 0 0 12" stroke={stroke} strokeWidth="1.2" />
    </svg>
  );
}

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "13px",
  fontWeight: isActive ? 600 : 400,
  textDecoration: "none",
  cursor: "pointer",
  transition: "all 0.15s ease",
  color: isActive ? "#FFFFFF" : "var(--text-secondary)",
  background: isActive ? "rgba(108, 71, 255, 0.2)" : "transparent",
  border: isActive ? "1px solid rgba(108, 71, 255, 0.4)" : "1px solid transparent",
  boxShadow: isActive ? "0 0 15px -3px rgba(108, 71, 255, 0.3)" : "none",
});

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className="shrink-0 flex flex-col transition-[width] duration-200 overflow-hidden select-none"
      style={{
        width: collapsed ? "56px" : "220px",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header — angular brand mark inspired by TS logomark geometry */}
      <div
        className="h-[52px] flex items-center px-3 shrink-0 gap-2"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        {collapsed ? (
          /* Collapsed: just the TS mark, clicking anywhere in header toggles */
          <button
            onClick={onToggle}
            aria-label="Expand sidebar"
            className="ts-icon-badge mx-auto cursor-pointer"
            style={{ width: 30, height: 30, padding: 3, border: "none" }}
          >
            <TSLogoMarkFilled size={24} />
          </button>
        ) : (
          /* Expanded: TS mark + wordmark + collapse button */
          <>
            <div className="ts-icon-badge shrink-0" style={{ width: 28, height: 28, padding: 2 }}>
              <TSLogoMarkFilled size={24} />
            </div>
            <div className="flex items-baseline gap-0 flex-1 min-w-0">
              <span className="text-[13px] font-extrabold tracking-[-0.02em] text-white leading-none">Trace</span>
              <span className="text-[13px] font-extrabold tracking-[-0.02em] text-[#6C47FF] leading-none">Sketch</span>
            </div>
            <button
              onClick={onToggle}
              aria-label="Collapse sidebar"
              className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px] transition-all shrink-0"
              style={{
                color: "var(--text-dim)",
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border)",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface-3)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255, 255, 255, 0.03)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
              }}
            >
              «
            </button>
          </>
        )}
      </div>


      {/* Nav links */}
      <nav className="p-2.5 flex flex-col gap-1">
        <NavLink to="/" end style={{ textDecoration: "none" }}>
          {({ isActive }: { isActive: boolean }) => (
            <span
              style={navItemStyle(isActive)}
              className={isActive ? "ts-nav-active" : ""}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "var(--bg-surface-2)";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "transparent";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <IconTraces active={isActive} />
              {!collapsed && <span>Traces</span>}
            </span>
          )}
        </NavLink>

        <NavLink to="/replays" style={{ textDecoration: "none" }}>
          {({ isActive }: { isActive: boolean }) => (
            <span
              style={navItemStyle(isActive)}
              className={isActive ? "ts-nav-active" : ""}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "var(--bg-surface-2)";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "transparent";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <IconReplay active={isActive} />
              {!collapsed && <span>Replays</span>}
            </span>
          )}
        </NavLink>

        <NavLink to="/settings" style={{ textDecoration: "none" }}>
          {({ isActive }: { isActive: boolean }) => (
            <span
              style={navItemStyle(isActive)}
              className={isActive ? "ts-nav-active" : ""}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "var(--bg-surface-2)";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "transparent";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <IconSettings active={isActive} />
              {!collapsed && <span>Settings</span>}
            </span>
          )}
        </NavLink>

        {/* Angular TS divider — skewed like the T's parallelogram top bar */}
        <div className="my-2 mx-1">
          <div className="ts-divider" />
        </div>

        <NavLink to="/overview" style={{ textDecoration: "none" }}>
          {({ isActive }: { isActive: boolean }) => (
            <span
              style={navItemStyle(isActive)}
              className={isActive ? "ts-nav-active" : ""}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "var(--bg-surface-2)";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "transparent";
                  (e.currentTarget as HTMLSpanElement).style.color = "var(--text-secondary)";
                }
              }}
            >
              <IconGlobe active={isActive} />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span>Product Website</span>
                  {/* Angular parallelogram "NEW" badge inspired by logo geometry */}
                  <span className="badge-angular badge-angular-accent">
                    NEW
                  </span>
                </div>
              )}
            </span>
          )}
        </NavLink>
      </nav>

      {/* Gen-Z / Developer Status Card in Sidebar */}
      {!collapsed && (
        <div className="mt-auto p-3 m-2 rounded-[8px] bg-[#141828] border border-[#262E44]">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_6px_#10B981]" />
            <span className="text-[11px] font-mono font-bold text-white">Local-First Mode</span>
          </div>
          <p className="text-[10px] text-slate-400 font-sans leading-tight">
            SQLite database active. 0 cloud telemetry sent.
          </p>
          <div className="mt-2 text-[9px] text-[#A78BFA] font-mono">
            Press <kbd className="bg-white/10 px-1 py-0.5 rounded text-white">⌘K</kbd> for quick actions
          </div>
        </div>
      )}

      {/* Footer version */}
      {!collapsed && (
        <div className="p-3 border-t border-[var(--border-dim)] flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>traceSketch</span>
          <span>v0.0.1</span>
        </div>
      )}
    </aside>
  );
}
