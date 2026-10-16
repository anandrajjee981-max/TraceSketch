import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { loadDashboardSession, fetchInstanceId } from "../api/client";

interface Config {
  apiBaseUrl: string;
  instanceId: string;
  loading: boolean;
  error: string | null;
}

// VITE_COLLECTOR_URL="" means use Vite proxy in development. Packaged builds use the local collector.
const env = (import.meta as unknown as { env: Record<string, string | boolean | undefined> }).env;
const envBase = (env?.VITE_COLLECTOR_URL ?? (env?.PROD ? "http://localhost:4000" : "")) as string;

// No instance id / secret is known at build time any more — both arrive at
// runtime from the collector (GET /dashboard-session) and live only in memory.
const defaultConfig: Config = {
  apiBaseUrl: envBase,
  instanceId: "",
  loading: true,
  error: null,
};

const ConfigContext = createContext<Config>(defaultConfig);

export function ConfigProvider({ children, config }: { children: ReactNode; config?: Partial<Config> }) {
  const mergedBase = config?.apiBaseUrl ?? defaultConfig.apiBaseUrl;
  const [instanceId, setInstanceId] = useState<string>(config?.instanceId ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        // Preferred path: the collector hands the local instance credentials to
        // the locally-served dashboard once, in memory. Never baked into a build.
        const session = await loadDashboardSession();
        if (!cancelled) {
          setInstanceId(session.instanceId);
          setError(null);
        }
      } catch (err) {
        // Fallback for local dev / older collectors: read the unauthenticated
        // instance id so the UI still works (with an empty secret).
        try {
          const id = await fetchInstanceId(mergedBase);
          if (!cancelled) setInstanceId(id);
        } catch {
          if (!cancelled) setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [mergedBase]);

  const value: Config = {
    apiBaseUrl: mergedBase,
    instanceId: config?.instanceId ?? instanceId,
    loading,
    error,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
