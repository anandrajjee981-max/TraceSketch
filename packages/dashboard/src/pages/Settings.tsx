import { useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { Badge, CopyButton, PageHeader } from "../components/ui";
import { useConfig } from "../context/ConfigContext";

export function Settings() {
  const { instanceId, apiBaseUrl } = useConfig();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(instanceId);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = instanceId;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "Settings" }]} />

      <PageHeader
        title="Settings & Config"
        description="Local configuration and credentials for the TraceSketch SQLite collector."
        badge={<Badge>Instance</Badge>}
      />

      <div className="max-w-[820px] space-y-4">
        <section className="ts-card ts-stagger">
          <div className="ts-card-header">
            <div>
              <div className="ts-card-title">Instance Identity</div>
              <div className="ts-card-subtitle">Unique identifier for this machine&apos;s local SQLite collector.</div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] shrink-0" aria-label="Collector reachable" />
          </div>

          <div className="ts-card-body space-y-5">
            <div>
              <label className="ts-label">Instance ID</label>
              <div className="flex flex-wrap items-center gap-2.5">
                <code
                  className="flex-1 min-w-[240px] ts-mono text-[13px] rounded-[8px] px-3.5 py-2.5 break-all text-[var(--text-primary)] font-medium select-all"
                  style={{ background: "var(--bg-page)", border: "1px solid var(--border)" }}
                >
                  {instanceId}
                </code>
                <button onClick={copy} className="btn-secondary">
                  Copy ID
                </button>
              </div>
              {copied && (
                <div role="status" className="ts-pop text-[11px] font-medium mt-2 flex items-center gap-1.5" style={{ color: "var(--green)" }}>
                  <span aria-hidden="true">✓</span> Copied instance ID to clipboard.
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-[10px] p-4 ts-stagger" style={{ ["--stagger-i" as string]: 1, background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                <div className="ts-overline">Collector Endpoint</div>
                <div className="ts-mono text-[12px] text-[var(--text-primary)] font-medium break-all mt-1.5">
                  {apiBaseUrl || `http://localhost:4000 (Vite proxy)`}
                </div>
              </div>

              <div className="rounded-[10px] p-4 ts-stagger" style={{ ["--stagger-i" as string]: 2, background: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                <div className="ts-overline" style={{ color: "var(--blue)" }}>
                  Local-First Isolation
                </div>
                <div className="text-[12px] leading-[18px] mt-1.5 text-[var(--text-secondary)]">
                  All traces are stored in <code className="ts-mono" style={{ color: "var(--accent-text)" }}>~/.tracebox/tracebox.db</code>. No telemetry
                  leaves your machine.
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="ts-card ts-stagger" style={{ ["--stagger-i" as string]: 3 }}>
          <div className="ts-card-header">
            <div>
              <div className="ts-card-title">Send a trace manually</div>
              <div className="ts-card-subtitle">Use your instance ID and secret to verify ingestion end to end.</div>
            </div>
            <CopyButton
              value={`curl -X POST ${apiBaseUrl || "http://localhost:4000"}/traces -H "Content-Type: application/json" -H "x-instance-id: ${instanceId}" -H "x-instance-secret: <your-secret>" -d '{"method":"GET","path":"/api/ping","status_code":200,"duration_ms":42,"environment":"development"}'`}
              className="btn-secondary !py-1 !px-2.5 !text-[11px]"
              copiedLabel="Copied"
              title="Copy curl command"
            >
              Copy curl
            </CopyButton>
          </div>
          <div className="ts-card-body">
            <pre className="text-[12px] leading-[20px] font-mono whitespace-pre-wrap break-all p-3.5 rounded-[9px] text-[var(--text-secondary)]" style={{ background: "var(--bg-page)", border: "1px solid var(--border)" }}>
{`curl -X POST ${apiBaseUrl || "http://localhost:4000"}/traces \\
  -H "Content-Type: application/json" \\
  -H "x-instance-id: ${instanceId}" \\
  -H "x-instance-secret: <your-secret>" \\
  -d '{"method":"GET","path":"/api/ping","status_code":200,"duration_ms":42}'`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
