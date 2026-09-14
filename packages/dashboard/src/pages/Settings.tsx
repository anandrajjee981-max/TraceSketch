import { useState } from "react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Panel } from "../components/Panel";
import { useConfig } from "../context/ConfigContext";

export function Settings() {
  const { instanceId, apiBaseUrl } = useConfig();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(instanceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = instanceId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "Settings" }]} />
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-[-0.02em] leading-none mb-1 text-white flex items-center gap-3">
          <span>Settings & Config</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#6C47FF]/20 text-[#C4B5FD] border border-[#6C47FF]/30 font-medium">
            Instance
          </span>
        </h1>
        <p className="text-[12px] text-slate-400">
          Local configuration and credentials for the TraceSketch SQLite collector.
        </p>
      </div>

      <Panel className="max-w-[760px] overflow-hidden">
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface-2)",
          }}
        >
          <div>
            <div className="text-[14px] font-semibold text-white">
              Instance Identity
            </div>
            <div className="text-[12px] text-slate-400">
              Unique identifier for this machine's local SQLite collector.
            </div>
          </div>
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981]" />
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label
              className="text-[11px] font-semibold tracking-[0.06em] uppercase font-mono"
              style={{ color: "var(--text-dim)" }}
            >
              Instance ID
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <code
                className="flex-1 font-mono text-[13px] rounded-[8px] px-3.5 py-2.5 break-all text-white font-medium"
                style={{
                  background: "rgba(10, 13, 20, 0.6)",
                  border: "1px solid var(--border-accent)",
                }}
              >
                {instanceId}
              </code>
              <button
                onClick={copy}
                className="shrink-0 px-4 py-2.5 rounded-[8px] text-[13px] font-semibold transition-all flex items-center gap-1.5"
                style={{
                  border: "1px solid var(--border)",
                  background: copied ? "var(--green-bg)" : "var(--bg-surface-2)",
                  color: copied ? "var(--green)" : "var(--text-primary)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!copied) e.currentTarget.style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  if (!copied) e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {copied ? "Copied ✓" : "Copy ID"}
              </button>
            </div>
            {copied && (
              <div className="text-[11px] font-medium font-mono mt-1.5 text-[#10B981] flex items-center gap-1">
                <span>✓</span> Copied instance ID to clipboard.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              className="rounded-[8px] p-3.5"
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="text-[11px] font-semibold font-mono tracking-[0.04em] uppercase text-slate-400">
                Collector Endpoint
              </div>
              <div className="font-mono text-[12px] text-white font-medium break-all mt-1">
                {apiBaseUrl || `http://localhost:4000 (Vite proxy)`}
              </div>
            </div>

            <div
              className="rounded-[8px] p-3.5 bg-[#161B2B] border border-[#262E44]"
            >
              <div className="text-[11px] font-semibold font-mono tracking-[0.04em] uppercase text-[#38BDF8]">
                Local-First Isolation
              </div>
              <div className="text-[12px] leading-[18px] mt-1 text-slate-300">
                All traces are stored in <code className="text-[#A78BFA]">~/.tracebox/tracebox.db</code>. No data ever leaves your computer.
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
