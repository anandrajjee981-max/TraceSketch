import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface Config {
  apiBaseUrl: string;
  instanceId: string;
  loading: boolean;
  error: string | null;
}

// VITE_COLLECTOR_URL="" means use Vite proxy in development. Packaged builds use the local collector.
const env = (import.meta as unknown as { env: Record<string, string | boolean | undefined> }).env;
const envBase = (env?.VITE_COLLECTOR_URL ?? (env?.PROD ? "http://localhost:4000" : "")) as string;
// Keep placeholder until real instance fetched — reads will still work because collector GETs don't auth
const placeholder = (import.meta as unknown as { env: Record<string, string | undefined> }).env?.VITE_INSTANCE_ID ?? "inst_placeholder_12345";

const defaultConfig: Config = {
  apiBaseUrl: envBase,
  instanceId: placeholder,
  loading: true,
  error: null,
};

const ConfigContext = createContext<Config>(defaultConfig);

function instanceUrl(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/$/, "");
  return base ? `${base}/instance` : "/instance";
}

function healthUrl(apiBaseUrl: string) {
  const base = apiBaseUrl.replace(/\/$/, "");
  return base ? `${base}/health` : "/health";
}

export function ConfigProvider({ children, config }: { children: ReactNode; config?: Partial<Config> }) {
  const mergedBase = config?.apiBaseUrl ?? defaultConfig.apiBaseUrl;
  const [instanceId, setInstanceId] = useState<string>(config?.instanceId ?? placeholder);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchInstance() {
      // Try /instance first (new), fall back to /health.instance_id
      try {
        const res = await fetch(instanceUrl(mergedBase));
        if (res.ok) {
          const data = (await res.json()) as { instance_id?: string; instanceId?: string };
          const id = data.instance_id ?? data.instanceId;
          if (id && !cancelled) {
            setInstanceId(id);
            setError(null);
            setLoading(false);
            return;
          }
        }
        // fallback to /health
        const h = await fetch(healthUrl(mergedBase));
        if (h.ok) {
          const data = (await h.json()) as { instance_id?: string };
          if (data.instance_id && !cancelled) {
            setInstanceId(data.instance_id);
            setError(null);
            setLoading(false);
            return;
          }
        }
        if (!cancelled) {
          setError(null);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      }
    }
    fetchInstance();
    return () => {
      cancelled = true;
    };
  }, [mergedBase]);

  const value: Config = {
    apiBaseUrl: mergedBase,
    instanceId: config?.instanceId ?? instanceId,
    loading: config?.instanceId ? false : loading,
    error,
  };

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
