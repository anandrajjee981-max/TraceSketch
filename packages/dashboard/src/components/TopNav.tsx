import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { listMyGroups, type GroupSummary } from "../api/client";
import { relativeTime } from "../lib/format";
import { TSLogoMarkFilled } from "./TSLogo";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Top-right dropdown of every group this instance has previously joined.
 *
 * Backed by the relay's shared group_history, which has no TTL — so these
 * survive the relay's 6h session expiry, unlike the live relay feed, and both
 * peers see the same list.
 */
function JoinedGroupsMenu() {
  const { instanceId } = useConfig();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [error, setError] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || groups !== null) return;
    let cancelled = false;
    listMyGroups({ instanceId })
      .then((data) => {
        if (!cancelled) setGroups(data.groups ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [open, groups, instanceId]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium btn-secondary"
        style={{ color: "var(--text-secondary)" }}
        title="Previously joined groups"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span>Groups</span>
        {groups && groups.length > 0 && (
          <span className="ts-numeric" style={{ color: "var(--text-dim)" }}>
            {groups.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] w-[280px] rounded-[10px] overflow-hidden ts-card"
          style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}
        >
          <p className="ts-overline px-3 py-2" style={{ borderBottom: "1px solid var(--border-dim)" }}>
            Joined Groups
          </p>

          <div className="max-h-[320px] overflow-y-auto">
            {error ? (
              <p className="px-3 py-3 text-[11px]" style={{ color: "var(--red)" }}>
                Could not load groups from the collector.
              </p>
            ) : groups === null ? (
              <p className="px-3 py-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
                Loading…
              </p>
            ) : groups.length === 0 ? (
              <p className="px-3 py-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
                No groups yet. Create or join one from the Relay page.
              </p>
            ) : (
              groups.map((g) => (
                <button
                  key={g.group_code}
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    navigate(`/relay?group=${encodeURIComponent(g.group_code)}`);
                  }}
                  className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-[var(--bg-surface-3)] transition-colors"
                  style={{ borderBottom: "1px solid var(--border-dim)" }}
                >
                  <span className="ts-mono font-bold tracking-[0.18em] text-[13px] text-[var(--text-primary)]">
                    {g.group_code}
                  </span>
                  <span className="text-[10px] ts-numeric shrink-0" style={{ color: "var(--text-dim)" }}>
                    {g.share_entries > 0 ? `${g.share_entries} shared · ` : ""}
                    {relativeTime(g.last_activity)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TopNav({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const { instanceId } = useConfig();
  const location = useLocation();
  const isWebsite = location.pathname === "/overview";

  return (
    <header
      className="h-[56px] shrink-0 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-3 backdrop-blur-md"
      style={{
        background: "var(--bg-nav)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Brand Logo & Title — TS mark (inline SVG) + two-tone wordmark */}
      <Link to="/" className="flex items-center gap-2.5 no-underline group shrink-0">
        <div
          className="ts-icon-badge transition-transform duration-200 group-hover:scale-105"
          style={{ width: 32, height: 32, padding: 3 }}
        >
          <TSLogoMarkFilled size={26} />
        </div>
        <div className="flex items-baseline gap-0">
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)] leading-none">Trace</span>
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[var(--accent)] leading-none">Sketch</span>
        </div>
      </Link>

      {/* Mode Switcher: Console ⟷ Website */}
      <div className="hidden md:flex items-center p-0.5 rounded-[8px] text-[12px] font-medium ml-2" style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
        <Link
          to="/"
          className="px-3 py-1 rounded-[6px] no-underline transition-all duration-150"
          style={
            !isWebsite
              ? {
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  boxShadow: "0 0 12px -2px var(--accent-glow)",
                }
              : { color: "var(--text-secondary)" }
          }
        >
          Console
        </Link>
        <Link
          to="/overview"
          className="px-3 py-1 rounded-[6px] no-underline transition-all duration-150"
          style={
            isWebsite
              ? {
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                  boxShadow: "0 0 12px -2px var(--accent-glow)",
                }
              : { color: "var(--text-secondary)" }
          }
        >
          Website
        </Link>
      </div>

      {/* Command Palette Trigger Button */}
      {onOpenCommandPalette && (
        <button
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] w-[240px] btn-secondary !justify-start"
          style={{ color: "var(--text-secondary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-[var(--accent-text)] shrink-0" aria-hidden="true">
            <path
              d="M9 16A7 7 0 1 0 9 2a7 7 0 0 0 0 14Zm10 3-4.35-4.35"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="truncate">Search traces or actions...</span>
          <kbd className="ml-auto ts-kbd">⌘K</kbd>
        </button>
      )}

      <div className="flex-1" />

      {/* Theme: light ⇄ dark. Same control as the website navbar, and it is
          here (not only on /overview) because the console is the surface people
          stare at longest. */}
      <ThemeToggle />

      {/* Previously joined groups */}
      <JoinedGroupsMenu />

      {/* Collector Live Status Chip */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium font-mono px-2.5 py-1 rounded-full shrink-0 ts-numeric" style={{ color: "var(--text-secondary)", background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--live)" }} />
          <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--live)" }} />
        </span>
        <span>127.0.0.1:4000</span>
      </div>

      {/* Dev User Pill */}
      <div
        className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold text-[var(--text-primary)] shrink-0"
        style={{
          background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-grad-2) 100%)",
          border: "1px solid var(--accent-glow)",
          boxShadow: "0 0 10px -2px var(--accent-glow)",
        }}
        title={`Instance: ${instanceId}`}
      >
        TS
      </div>
    </header>
  );
}
