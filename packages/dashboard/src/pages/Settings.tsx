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
      // fallback
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
      <h1
        className="text-[24px] font-bold tracking-[-0.02em] leading-none mb-5"
        style={{ color: "var(--text-primary)" }}
      >
        Settings — Instance Info
      </h1>

      <Panel className="max-w-[720px] overflow-hidden">
        <div
          className="px-4 py-3"
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-surface-2)",
          }}
        >
          <div className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Instance Configuration
          </div>
          <div className="text-[12px]" style={{ color: "var(--text-dim)" }}>
            Read-only instance identifier. The secret is never displayed in the dashboard.
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label
              className="text-[11px] font-semibold tracking-[0.06em] uppercase"
              style={{ color: "var(--text-dim)" }}
            >
              Instance ID
            </label>
            <div className="mt-1 flex items-center gap-2">
              <code
                className="flex-1 font-mono text-[13px] rounded-[5px] px-3 py-2 break-all"
                style={{
                  background: "var(--bg-surface-2)",
                  border: "1px solid var(--border-dim)",
                  color: "var(--accent-text)",
                }}
              >
                {instanceId}
              </code>
              <button
                onClick={copy}
                className="shrink-0 px-3 py-2 rounded-[5px] text-[13px] font-medium transition-colors"
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--bg-surface)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)";
                }}
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            </div>
            {copied && (
              <div className="text-[11px] font-medium mt-1.5" style={{ color: "var(--green)" }}>
                Copied to clipboard.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className="rounded-[6px] px-3.5 py-2.5"
              style={{
                background: "var(--bg-surface-2)",
                border: "1px solid var(--border-dim)",
              }}
            >
              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase" style={{ color: "var(--text-dim)" }}>
                Collector API
              </div>
              <div className="font-mono text-[12px] break-all mt-0.5" style={{ color: "var(--text-primary)" }}>
                {apiBaseUrl || `${window.location.origin} (proxied → http://localhost:4000)`}
              </div>
            </div>

            <div
              className="rounded-[6px] px-3.5 py-2.5"
              style={{
                background: "var(--amber-bg)",
                border: "1px solid var(--amber-border)",
              }}
            >
              <div className="text-[11px] font-semibold tracking-[0.04em] uppercase" style={{ color: "var(--amber)" }}>
                Security Note
              </div>
              <div className="text-[12px] leading-[18px] mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Instance secrets are never exposed here. Keep them safe in your environment configuration.
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
