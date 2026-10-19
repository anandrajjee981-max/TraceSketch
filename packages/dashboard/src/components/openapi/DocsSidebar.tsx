import { MethodBadge } from "./MethodBadge";

/* ═══════════════════════════════════════════════════════════════════════════
   In-page docs navigation.

   Mirrors the shape of the app's main sidebar (same tokens, radius, hover) but
   scoped to one OpenAPI document: section jump-links, a search box, and a
   tag-grouped endpoint index. Purely presentational — the page owns scroll and
   filter state.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface DocsNavItem {
  id: string;
  label: string;
  count?: number;
}

export interface DocsEndpointRef {
  index: number;
  method: string;
  path: string;
  summary?: string;
}

export interface DocsEndpointGroup {
  tag: string;
  endpoints: DocsEndpointRef[];
}

function SectionIcon({ id }: { id: string }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", "aria-hidden": true } as const;
  switch (id) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "endpoints":
      return (
        <svg {...common}>
          <path d="M8 6h12M8 12h12M8 18h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="4" cy="6" r="1.4" fill="currentColor" />
          <circle cx="4" cy="12" r="1.4" fill="currentColor" />
          <circle cx="4" cy="18" r="1.4" fill="currentColor" />
        </svg>
      );
    case "schemas":
      return (
        <svg {...common}>
          <path d="M12 3.5l8.5 4.7L12 12.9 3.5 8.2 12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M3.5 12.2L12 16.9l8.5-4.7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M3.5 16.2L12 20.9l8.5-4.7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      );
    case "auth":
      return (
        <svg {...common}>
          <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export function DocsSidebar({
  navItems,
  activeId,
  onNavigate,
  query,
  onQuery,
  groups,
  onEndpoint,
}: {
  navItems: DocsNavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
  query: string;
  onQuery: (q: string) => void;
  groups: DocsEndpointGroup[];
  onEndpoint: (index: number) => void;
}) {
  const totalShown = groups.reduce((sum, g) => sum + g.endpoints.length, 0);

  return (
    <nav className="ts-card p-3 space-y-3 lg:sticky lg:top-4" aria-label="Documentation sections">
      <label className="block">
        <span className="ts-label">Search endpoints</span>
        <input
          className="ts-input"
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="path, method, summary…"
        />
      </label>

      <div className="space-y-1">
        {navItems.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
                active ? "text-[var(--on-accent)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
              }`}
              style={active ? { background: "var(--accent-grad)", boxShadow: "var(--accent-shadow)" } : undefined}
              aria-current={active ? "true" : undefined}
            >
              <SectionIcon id={item.id} />
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span className="ml-auto ts-mono text-[10.5px]" style={{ opacity: active ? 0.85 : 0.6 }}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-1 border-t" style={{ borderColor: "var(--border-dim)" }}>
        <div className="flex items-center justify-between px-1 pt-2 pb-1">
          <span className="ts-overline">Endpoints</span>
          <span className="ts-mono text-[10.5px]" style={{ color: "var(--text-dim)" }}>{totalShown}</span>
        </div>
        <div className="space-y-2 max-h-[46vh] overflow-y-auto ts-scroll-fade pr-1">
          {groups.map((group) => (
            <div key={group.tag}>
              <div className="ts-overline px-1 py-1" style={{ color: "var(--text-dim)" }}>{group.tag}</div>
              <div className="space-y-0.5">
                {group.endpoints.map((ep) => (
                  <button
                    key={`${ep.method}-${ep.path}-${ep.index}`}
                    type="button"
                    onClick={() => onEndpoint(ep.index)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-left hover:bg-[var(--bg-surface-2)] transition-colors"
                  >
                    <MethodBadge method={ep.method} size="sm" />
                    <span className="ts-mono text-[11px] truncate" style={{ color: "var(--text-secondary)" }} title={ep.path}>
                      {ep.path}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {totalShown === 0 && (
            <div className="px-1 py-2 text-[11.5px]" style={{ color: "var(--text-dim)" }}>
              No endpoints match your search.
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
