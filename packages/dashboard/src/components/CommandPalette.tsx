import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTraceSimulator } from "../context/TraceSimulatorContext";

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { simulateTrace } = useTraceSimulator();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 1200);
  };

  const actions = [
    {
      id: "nav-overview",
      category: "Navigation",
      title: "Explore Product Website / Showcase",
      subtitle: "View the official TraceSketch product website & features",
      icon: "🌐",
      badge: "Showcase",
      run: () => {
        navigate("/overview");
        onClose();
      },
    },
    {
      id: "nav-traces",
      category: "Navigation",
      title: "Go to Traces Explorer",
      subtitle: "Inspect captured API requests, waterfall spans & latency",
      icon: "⚡",
      badge: "Dashboard",
      run: () => {
        navigate("/");
        onClose();
      },
    },
    {
      id: "nav-replays",
      category: "Navigation",
      title: "Go to Replay Engine",
      subtitle: "Replay failed requests against local development server",
      icon: "↺",
      badge: "Replay",
      run: () => {
        navigate("/replays");
        onClose();
      },
    },
    {
      id: "nav-settings",
      category: "Navigation",
      title: "Go to Settings & Instance Config",
      subtitle: "View your local-first instance ID & collector endpoint",
      icon: "⚙",
      badge: "Config",
      run: () => {
        navigate("/settings");
        onClose();
      },
    },
    {
      id: "sim-500",
      category: "Trace Simulator",
      title: "Simulate 500 Internal Server Error",
      subtitle: "Injects realistic checkout failure with Stripe API timeout span",
      icon: "💥",
      badge: "500 FAIL",
      run: () => {
        const trace = simulateTrace("checkout-500");
        showToast(`Injected ${trace.trace_id} (500 Error)!`);
        navigate("/");
      },
    },
    {
      id: "sim-401",
      category: "Trace Simulator",
      title: "Simulate 401 Unauthorized Auth Error",
      subtitle: "Injects expired JWT refresh trace with Redis cache check",
      icon: "🔒",
      badge: "401 AUTH",
      run: () => {
        const trace = simulateTrace("auth-401");
        showToast(`Injected ${trace.trace_id} (401 Error)!`);
        navigate("/");
      },
    },
    {
      id: "sim-slow",
      category: "Trace Simulator",
      title: "Simulate Slow DB Query (1.24s Waterfall)",
      subtitle: "Injects Postgres ledger query with 1180ms DB span",
      icon: "🐢",
      badge: "SLOW 1.2s",
      run: () => {
        const trace = simulateTrace("db-slow");
        showToast(`Injected ${trace.trace_id} (Slow DB)!`);
        navigate("/");
      },
    },
    {
      id: "copy-sdk",
      category: "Dev Quick Tools",
      title: "Copy SDK Install Command",
      subtitle: "npm install @tracesketch/sdk",
      icon: "📦",
      badge: "NPM",
      run: () => {
        navigator.clipboard.writeText("npm install @tracesketch/sdk");
        showToast("Copied npm install command! ⚡");
      },
    },
    {
      id: "copy-init",
      category: "Dev Quick Tools",
      title: "Copy CLI Quickstart",
      subtitle: "npx @tracesketch/cli init",
      icon: "💻",
      badge: "CLI",
      run: () => {
        navigator.clipboard.writeText("npx @tracesketch/cli init");
        showToast("Copied CLI init command! ✨");
      },
    },
  ];

  const filtered = actions.filter(
    (a) =>
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + (filtered.length || 1)) % (filtered.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 animate-fade"
      style={{
        backgroundColor: "rgba(5, 7, 12, 0.75)",
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[620px] rounded-[14px] overflow-hidden flex flex-col shadow-2xl transition-all duration-200"
        style={{
          background: "#111422",
          border: "1px solid rgba(108, 71, 255, 0.35)",
          boxShadow: "0 20px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px -5px rgba(108, 71, 255, 0.25)",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div
          className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[#A78BFA] shrink-0">
            <path
              d="M9 16A7 7 0 1 0 9 2a7 7 0 0 0 0 14Zm10 3-4.35-4.35"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, page name, or dev simulator action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-none text-[14px] text-white placeholder-slate-400 focus:outline-none"
          />
          <kbd
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium text-slate-400"
            style={{ background: "rgba(255, 255, 255, 0.08)", border: "1px solid rgba(255, 255, 255, 0.1)" }}
          >
            ESC
          </kbd>
        </div>

        {/* Toast alert if triggered */}
        {toastMessage && (
          <div className="bg-[#6C47FF]/20 border-b border-[#6C47FF]/40 text-[#C4B5FD] text-[12px] px-4 py-2 font-medium flex items-center justify-between animate-fade">
            <span>{toastMessage}</span>
            <span>✓</span>
          </div>
        )}

        {/* Actions List */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-[13px]">
              No actions found for "{query}"
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => item.run()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] cursor-pointer transition-all duration-120 ${
                    isSelected
                      ? "bg-[#6C47FF]/20 text-white"
                      : "text-slate-300 hover:bg-white/[0.04]"
                  }`}
                  style={{
                    border: isSelected ? "1px solid rgba(108, 71, 255, 0.4)" : "1px solid transparent",
                  }}
                >
                  <span className="text-[16px] w-[26px] h-[26px] rounded-[6px] bg-[#161B2E] flex items-center justify-center shrink-0 border border-white/5">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium truncate">{item.title}</span>
                      <span
                        className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold tracking-wider"
                        style={{
                          background: isSelected ? "rgba(108, 71, 255, 0.4)" : "rgba(255, 255, 255, 0.06)",
                          color: isSelected ? "#E0E7FF" : "#94A3B8",
                        }}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                  </div>
                  {isSelected && (
                    <span className="text-[11px] font-mono text-[#A78BFA] shrink-0 font-medium">
                      ↵ select
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div
          className="px-4 py-2.5 bg-[#0C0F1A] flex items-center justify-between text-[11px] text-slate-400"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="font-mono text-slate-300 bg-white/10 px-1 rounded">↑</kbd> <kbd className="font-mono text-slate-300 bg-white/10 px-1 rounded">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="font-mono text-slate-300 bg-white/10 px-1 rounded">↵</kbd> to execute
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#A78BFA] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6C47FF] animate-ping" />
            TraceSketch DevEngine
          </div>
        </div>
      </div>
    </div>
  );
}
