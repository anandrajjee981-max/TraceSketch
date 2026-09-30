import { Link, useLocation } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { TSLogoMarkFilled } from "./TSLogo";

export function TopNav({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const { instanceId } = useConfig();
  const location = useLocation();
  const isWebsite = location.pathname === "/overview";

  return (
    <header
      className="h-[56px] shrink-0 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-3 backdrop-blur-md"
      style={{
        background: "rgba(10, 10, 12, 0.82)",
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
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-white leading-none">Trace</span>
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[#6C47FF] leading-none">Sketch</span>
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
                  color: "#fff",
                  boxShadow: "0 0 12px -2px rgba(108, 71, 255, 0.6)",
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
                  color: "#fff",
                  boxShadow: "0 0 12px -2px rgba(108, 71, 255, 0.6)",
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
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-[#A78BFA] shrink-0" aria-hidden="true">
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

      {/* Collector Live Status Chip */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium font-mono px-2.5 py-1 rounded-full shrink-0 ts-numeric" style={{ color: "var(--text-secondary)", background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
        </span>
        <span>127.0.0.1:4000</span>
      </div>

      {/* Dev User Pill */}
      <div
        className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
        style={{
          background: "linear-gradient(135deg, #6C47FF 0%, #4F2BE3 100%)",
          border: "1px solid rgba(108, 71, 255, 0.5)",
          boxShadow: "0 0 10px -2px rgba(108, 71, 255, 0.6)",
        }}
        title={`Instance: ${instanceId}`}
      >
        TS
      </div>
    </header>
  );
}
