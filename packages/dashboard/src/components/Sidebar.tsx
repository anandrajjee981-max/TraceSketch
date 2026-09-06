import { NavLink } from "react-router-dom";

function IconTraces({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-dim)";
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M5 2.5H9.2L12 5.3V13.5H5V2.5Z" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9.2 2.5V5.3H12" stroke={stroke} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6.5 8.2H10.5M6.5 10.2H10.5M6.5 6.2H8.2" stroke={stroke} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function IconSettings({ active }: { active?: boolean }) {
  const stroke = active ? "var(--accent)" : "var(--text-dim)";
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="M8 10.5A2.5 2.5 0 1 0 8 5.5a2.5 2.5 0 0 0 0 5Z" stroke={stroke} strokeWidth="1.2" />
      <path
        d="M8 2.5v1.2M8 12.3V13.5M2.8 8H4M12 8h1.2M4.3 4.3l.85.85M11 11l.7.7M11.7 4.3l-.7.85M4.3 11.7l.85-.7"
        stroke={stroke}
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

const navItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: "9px",
  padding: "7px 10px",
  borderRadius: "6px",
  fontSize: "13px",
  fontWeight: isActive ? 600 : 400,
  textDecoration: "none",
  cursor: "pointer",
  transition: "all 0.12s ease",
  color: isActive ? "var(--accent-text)" : "var(--text-secondary)",
  background: isActive ? "var(--accent-light)" : "transparent",
  borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
});

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside
      className="shrink-0 flex flex-col transition-[width] duration-200 overflow-hidden"
      style={{
        width: collapsed ? "52px" : "216px",
        background: "var(--bg-surface-2)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div
        className="h-[40px] flex items-center px-2 shrink-0"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        {!collapsed && (
          <span
            className="text-[10px] font-semibold tracking-[0.1em] uppercase ml-1"
            style={{ color: "var(--text-dim)" }}
          >
            Menu
          </span>
        )}
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className="ml-auto w-[24px] h-[24px] rounded-[4px] flex items-center justify-center text-[12px] transition-all duration-120"
          style={{
            color: "var(--text-dim)",
            background: "transparent",
            border: "1px solid var(--border)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--bg-surface-3)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-dim)";
          }}
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {/* Nav */}
      <nav className="p-2 flex flex-col gap-0.5">
        <NavLink to="/" end style={{ textDecoration: "none" }}>
          {({ isActive }: { isActive: boolean }) => (
            <span
              style={navItemStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "var(--bg-surface-3)";
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
              {!collapsed && "Traces"}
            </span>
          )}
        </NavLink>

        <NavLink to="/settings" style={{ textDecoration: "none" }}>
          {({ isActive }: { isActive: boolean }) => (
            <span
              style={navItemStyle(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLSpanElement).style.background = "var(--bg-surface-3)";
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
              {!collapsed && "Settings"}
            </span>
          )}
        </NavLink>
      </nav>

      <div className="mx-2 my-1" style={{ borderTop: "1px solid var(--border-dim)" }} aria-hidden="true" />

      {!collapsed && (
        <div className="px-3 pb-2">
          <div className="text-[11px] leading-[14px]" style={{ color: "var(--text-dim)" }}>
            Add sections above.
          </div>
        </div>
      )}

      {/* Footer */}
      {!collapsed && (
        <div className="mt-auto p-3" style={{ borderTop: "1px solid var(--border-dim)" }}>
          <div className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
            traceSketch console
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
            v0.0.1 • local
          </div>
        </div>
      )}
    </aside>
  );
}
