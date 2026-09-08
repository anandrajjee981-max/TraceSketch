import { useState } from "react";
import { replayTrace } from "../api/client";
import type { Trace } from "../types";

export function ReplaySection({
  trace,
  instanceId,
  apiBaseUrl,
}: {
  trace: Trace;
  instanceId: string;
  apiBaseUrl: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [targetUrl, setTargetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ original: { status_code: number; duration_ms: number }; replay: { status_code: number; duration_ms: number } } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = targetUrl.trim();
    if (!trimmed) {
      setError("Target Base URL is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await replayTrace(trace.trace_id, trimmed, { instanceId, apiBaseUrl });
      setResult({ original: res.original, replay: res.replay });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => {
          setShowForm((v) => !v);
          setError(null);
        }}
        disabled={loading}
        className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-[5px] text-[13px] font-semibold disabled:opacity-60"
        style={{
          background: "var(--accent)",
          color: "#ffffff",
          border: "none",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading ? "Replaying..." : "▶ Replay"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-semibold tracking-[0.06em] uppercase block mb-1" style={{ color: "var(--text-dim)" }}>
              Target Base URL
            </label>
            <input
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="http://localhost:5000"
              className="w-full px-3 font-mono text-[13px]"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                borderRadius: "6px",
                height: "32px",
                outline: "none",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 px-4 py-2 rounded-[5px] text-[13px] font-semibold disabled:opacity-60"
            style={{
              background: "var(--accent)",
              color: "#ffffff",
              border: "none",
              cursor: loading ? "wait" : "pointer",
              height: "32px",
            }}
          >
            {loading ? "Replaying..." : "Send Replay"}
          </button>
        </form>
      )}

      {error && (
        <div className="text-[12px]" style={{ color: "var(--red)" }}>
          {error}
        </div>
      )}

      {result && (
        <div className="flex gap-4 text-[12px] flex-wrap" style={{ color: "var(--text-primary)" }}>
          <div>
            <span style={{ color: "var(--text-dim)" }}>original</span> status_code: {result.original.status_code} duration_ms: {result.original.duration_ms}
          </div>
          <div>
            <span style={{ color: "var(--text-dim)" }}>replay</span> status_code: {result.replay.status_code} duration_ms: {result.replay.duration_ms}
          </div>
        </div>
      )}
    </div>
  );
}
