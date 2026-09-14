import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useConfig } from "../context/ConfigContext";
import { useTraceSimulator } from "../context/TraceSimulatorContext";
import { TSLogoMarkFilled } from "./TSLogo";

export function TopNav({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void }) {
  const { instanceId } = useConfig();
  const { simulateTrace } = useTraceSimulator();
  const location = useLocation();
  const isWebsite = location.pathname === "/overview";
  const [toast, setToast] = useState<string | null>(null);

  const handleSimulate = (scenario: "checkout-500" | "auth-401" | "user-200" | "db-slow") => {
    const trace = simulateTrace(scenario);
    setToast(`⚡ Injected ${trace.trace_id} (${trace.method} ${trace.path})`);
    setTimeout(() => setToast(null), 2500);
  };

  return (
    <header
      className="h-[56px] shrink-0 sticky top-0 z-30 flex items-center px-4 sm:px-6 gap-3 backdrop-blur-md"
      style={{
        background: "rgba(10, 13, 20, 0.85)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Brand Logo & Title — TS mark (inline SVG) + two-tone wordmark */}
      <Link to="/" className="flex items-center gap-2.5 no-underline group shrink-0">
        {/* Angular icon badge inspired by the logo's dark-charcoal T frame */}
        <div
          className="ts-icon-badge group-hover:scale-105"
          style={{ width: 32, height: 32, padding: 3 }}
        >
          <TSLogoMarkFilled size={26} />
        </div>
        <div className="flex items-baseline gap-0">
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-white leading-none">
            Trace
          </span>
          <span className="text-[16px] font-extrabold tracking-[-0.02em] text-[#6C47FF] leading-none">
            Sketch
          </span>
        </div>
      </Link>

      {/* Mode Switcher: Console ⟷ Website */}
      <div className="hidden md:flex items-center bg-[#141828] p-0.5 rounded-[8px] border border-[#262E44] text-[12px] font-medium ml-2">
        <Link
          to="/"
          className={`px-3 py-1 rounded-[6px] no-underline transition-all ${
            !isWebsite
              ? "bg-[#6C47FF] text-white shadow-[0_0_10px_rgba(108,71,255,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Console
        </Link>
        <Link
          to="/overview"
          className={`px-3 py-1 rounded-[6px] no-underline transition-all ${
            isWebsite
              ? "bg-[#6C47FF] text-white shadow-[0_0_10px_rgba(108,71,255,0.4)]"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Website
        </Link>
      </div>

      {/* Command Palette Trigger Button */}
      {onOpenCommandPalette && (
        <button
          onClick={onOpenCommandPalette}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] text-slate-400 bg-[#141828] hover:bg-[#1A2034] border border-[#262E44] hover:border-[#6C47FF]/40 transition-all cursor-pointer w-[240px]"
        >
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="text-[#A78BFA] shrink-0">
            <path
              d="M9 16A7 7 0 1 0 9 2a7 7 0 0 0 0 14Zm10 3-4.35-4.35"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <span className="truncate">Search traces or actions...</span>
          <kbd className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Center Toast notification */}
      {toast && (
        <div className="absolute left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#6C47FF]/20 border border-[#6C47FF]/50 text-[#C4B5FD] text-[11px] font-mono flex items-center gap-2 shadow-lg animate-fade">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
          <span>{toast}</span>
        </div>
      )}

      <div className="flex-1" />

      {/* Quick "⚡ Simulate Trace" Button */}
      <div className="relative group">
        <button
          onClick={() => handleSimulate("checkout-500")}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[12px] font-medium text-white bg-[#1E253A] hover:bg-[#6C47FF] border border-[#262E44] hover:border-[#6C47FF] transition-all cursor-pointer shadow-sm active:scale-95"
          title="Simulate realistic live API trace"
        >
          <span className="text-[#F59E0B]">⚡</span>
          <span className="hidden sm:inline">Simulate Bug</span>
        </button>

        {/* Dropdown for quick scenarios on hover */}
        <div className="absolute right-0 top-full mt-1.5 w-[210px] bg-[#141828] border border-[#262E44] rounded-[10px] shadow-2xl p-1.5 hidden group-hover:block z-50">
          <div className="text-[10px] uppercase font-mono px-2 py-1 text-slate-400 font-semibold">
            Simulate Scenario
          </div>
          <button
            onClick={() => handleSimulate("checkout-500")}
            className="w-full text-left px-2 py-1.5 rounded-[6px] text-[12px] text-slate-200 hover:bg-[#F43F5E]/20 hover:text-[#F43F5E] transition-colors flex items-center justify-between"
          >
            <span>💥 Checkout 500</span>
            <span className="text-[10px] font-mono text-slate-400">Payment</span>
          </button>
          <button
            onClick={() => handleSimulate("auth-401")}
            className="w-full text-left px-2 py-1.5 rounded-[6px] text-[12px] text-slate-200 hover:bg-[#F59E0B]/20 hover:text-[#F59E0B] transition-colors flex items-center justify-between"
          >
            <span>🔒 Auth 401</span>
            <span className="text-[10px] font-mono text-slate-400">JWT Exp</span>
          </button>
          <button
            onClick={() => handleSimulate("db-slow")}
            className="w-full text-left px-2 py-1.5 rounded-[6px] text-[12px] text-slate-200 hover:bg-[#38BDF8]/20 hover:text-[#38BDF8] transition-colors flex items-center justify-between"
          >
            <span>🐢 Slow DB 1.2s</span>
            <span className="text-[10px] font-mono text-slate-400">Ledger</span>
          </button>
          <button
            onClick={() => handleSimulate("user-200")}
            className="w-full text-left px-2 py-1.5 rounded-[6px] text-[12px] text-slate-200 hover:bg-[#10B981]/20 hover:text-[#10B981] transition-colors flex items-center justify-between"
          >
            <span>✓ Fast 200 OK</span>
            <span className="text-[10px] font-mono text-slate-400">34ms</span>
          </button>
        </div>
      </div>

      {/* Collector Live Status Chip */}
      <div
        className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium font-mono px-2.5 py-1 rounded-full shrink-0"
        style={{
          color: "var(--text-secondary)",
          background: "var(--bg-surface-2)",
          border: "1px solid var(--border)",
        }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
        </span>
        <span>127.0.0.1:4000</span>
      </div>

      {/* Dev User Pill */}
      <div
        className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 border border-[#6C47FF]/50 shadow-[0_0_8px_rgba(108,71,255,0.4)]"
        style={{ background: "linear-gradient(135deg, #6C47FF 0%, #4F2BE3 100%)" }}
        title={`Instance: ${instanceId}`}
      >
        TS
      </div>
    </header>
  );
}
