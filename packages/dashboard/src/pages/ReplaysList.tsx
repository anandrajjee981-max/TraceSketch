import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllReplays } from "../api/client";
import type { ReplayRun } from "../types";
import { Breadcrumbs } from "../components/Breadcrumbs";
import { StatusBadge, ResultBadge } from "../components/StatusBadge";
import { SkeletonTable } from "../components/Skeleton";
import { ErrorState, EmptyState, IconEmptyReplays } from "../components/EmptyState";
import { Badge, PageHeader, TableWrap } from "../components/ui";
import { absoluteTime, relativeTime } from "../lib/format";
import { useConfig } from "../context/ConfigContext";

export function ReplaysList() {
  const navigate = useNavigate();
  const { instanceId, apiBaseUrl } = useConfig();
  const [replays, setReplays] = useState<ReplayRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Every state update happens after an await, so this is safe to call from a
  // mount effect as well as from the refresh button.
  const fetchAll = async () => {
    try {
      const replaysRes = await getAllReplays({ instanceId, apiBaseUrl, limit: 100 });
      setReplays(Array.isArray(replaysRes.replays) ? replaysRes.replays : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setReplays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getAllReplays({ instanceId, apiBaseUrl, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setReplays(Array.isArray(res.replays) ? res.replays : []);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setReplays([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId, apiBaseUrl]);

  return (
    <div className="space-y-5">
      <Breadcrumbs items={[{ label: "traceSketch", to: "/" }, { label: "Replays" }]} />

      <PageHeader
        title="Replay History"
        description="Audit log of replayed HTTP traces and saved regression tests. Click any row to inspect the source trace."
        badge={<Badge>Local Engine</Badge>}
        actions={
          <button
            onClick={() => {
              setLoading(true);
              void fetchAll();
            }}
            className="btn-primary"
          >
            <span aria-hidden="true">↻</span>
            <span>Refresh</span>
          </button>
        }
      />

      <div className="ts-card">
        <div className="ts-card-header">
          <div>
            <div className="ts-card-title">Replays</div>
            <div className="ts-card-subtitle">Every request re-sent from the console</div>
          </div>
          <Badge tone="neutral" >
            <span className="ts-numeric">{replays.length}</span>
          </Badge>
        </div>

        {loading ? (
          <SkeletonTable rows={6} />
        ) : error ? (
          <div className="p-4">
            <ErrorState
              title="Unable to load replays"
              description="We couldn't reach the collector for replay history."
              detail={error}
              action={
                <button
                  onClick={() => {
                    setLoading(true);
                    void fetchAll();
                  }}
                  className="btn-destructive"
                >
                  Retry
                </button>
              }
            />
          </div>
        ) : replays.length === 0 ? (
          <EmptyState
            icon={<IconEmptyReplays />}
            title="No replays executed yet"
            description="Select any recorded trace from the Explorer and click 'Replay' to test your server."
            action={
              <button onClick={() => navigate("/")} className="btn-primary">
                Browse Traces →
              </button>
            }
          />
        ) : (
          <TableWrap>
            <table className="ts-table ts-table-clickable">
              <thead>
                <tr>
                  <th scope="col">Trace ID</th>
                  <th scope="col">Target Base URL</th>
                  <th scope="col">Replay Status</th>
                  <th scope="col">Latency</th>
                  <th scope="col">Result</th>
                  <th scope="col">Executed</th>
                </tr>
              </thead>
              <tbody>
                {replays.map((r, i) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/traces/${encodeURIComponent(r.trace_id)}`)}
                    className="group ts-stagger"
                    style={{ ["--stagger-i" as string]: Math.min(i, 10) }}
                  >
                    <td className="whitespace-nowrap">
                      <span className="ts-mono text-[12px] font-semibold transition-colors group-hover:text-[var(--text-primary)] text-[var(--accent-text)]" title={r.trace_id}>
                        {r.trace_id.slice(0, 10)}…
                      </span>
                    </td>
                    <td className="ts-mono text-[12px] max-w-[220px] truncate text-[var(--text-secondary)]" title={r.target_base_url}>
                      {r.target_base_url}
                    </td>
                    <td className="whitespace-nowrap">
                      {r.status_code != null ? (
                        <StatusBadge code={r.status_code} />
                      ) : (
                        <span style={{ color: "var(--text-dim)" }}>—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap ts-mono text-[12px] ts-numeric text-[var(--text-secondary)]">
                      {r.duration_ms != null ? `${r.duration_ms} ms` : "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      <ResultBadge
                        status={r.result === "completed" ? "success" : r.result === "failed" ? "fail" : "neutral"}
                        label={r.result ?? "—"}
                      />
                    </td>
                    <td className="whitespace-nowrap text-[12px] text-[var(--text-dim)] ts-mono ts-numeric" title={absoluteTime(r.created_at)}>
                      {relativeTime(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </div>
    </div>
  );
}
