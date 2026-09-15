import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Trace, TraceEvent } from "../types";

export interface TraceSimulatorContextType {
  simulatedTraces: Trace[];
  simulatedEvents: Record<string, TraceEvent[]>;
  simulateTrace: (scenario?: "checkout-500" | "auth-401" | "user-200" | "db-slow") => Trace;
  clearSimulated: () => void;
  getEventsForTrace: (traceId: string) => TraceEvent[];
}

const TraceSimulatorContext = createContext<TraceSimulatorContextType | undefined>(undefined);

export function TraceSimulatorProvider({ children }: { children: ReactNode }) {
  const [simulatedTraces, setSimulatedTraces] = useState<Trace[]>(() => {
    const cached = sessionStorage.getItem("ts_simulated_traces");
    if (cached) {
      try {
        const traces = JSON.parse(cached) as Trace[];
        return traces.filter((trace) => trace.trace_id.startsWith("tr_sim_"));
      } catch {
        // fallback
      }
    }
    return [];
  });

  const [simulatedEvents, setSimulatedEvents] = useState<Record<string, TraceEvent[]>>(() => {
    const cached = sessionStorage.getItem("ts_simulated_events");
    if (cached) {
      try {
        const events = JSON.parse(cached) as Record<string, TraceEvent[]>;
        return Object.fromEntries(Object.entries(events).filter(([traceId]) => traceId.startsWith("tr_sim_")));
      } catch {
        // fallback
      }
    }
    return {};
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("ts_simulated_traces", JSON.stringify(simulatedTraces));
      sessionStorage.setItem("ts_simulated_events", JSON.stringify(simulatedEvents));
    } catch {
      // quota or private mode
    }
  }, [simulatedTraces, simulatedEvents]);

  const simulateTrace = (scenario: "checkout-500" | "auth-401" | "user-200" | "db-slow" = "checkout-500"): Trace => {
    const now = Date.now();
    const hex = Math.random().toString(16).substring(2, 8);
    const traceId = `tr_sim_${hex}`;

    let method = "POST";
    let path = "/api/v1/orders/checkout";
    let statusCode = 500;
    let durationMs = 384;
    let events: TraceEvent[] = [];

    if (scenario === "checkout-500") {
      method = "POST";
      path = "/api/v1/orders/checkout";
      statusCode = 500;
      durationMs = 412;
      events = [
        {
          id: now + 1,
          trace_id: traceId,
          event_type: "http",
          service: "api-gateway",
          operation: `POST ${path}`,
          duration_ms: durationMs,
          metadata: JSON.stringify({ headers: { "content-type": "application/json" } }),
          created_at: now,
        },
        {
          id: now + 2,
          trace_id: traceId,
          event_type: "db",
          service: "postgres",
          operation: "SELECT * FROM inventory WHERE sku = 'PROD-998'",
          duration_ms: 45,
          metadata: JSON.stringify({ error: null, count: 1 }),
          created_at: now + 10,
        },
        {
          id: now + 3,
          trace_id: traceId,
          event_type: "external",
          service: "stripe-payments",
          operation: "POST /v1/charges",
          duration_ms: 320,
          metadata: JSON.stringify({ error: "PaymentGatewayTimeout", code: "GATEWAY_TIMEOUT" }),
          created_at: now + 60,
        },
      ];
    } else if (scenario === "auth-401") {
      method = "POST";
      path = "/api/v1/auth/jwt/refresh";
      statusCode = 401;
      durationMs = 62;
      events = [
        {
          id: now + 1,
          trace_id: traceId,
          event_type: "http",
          service: "auth-service",
          operation: "POST /api/v1/auth/jwt/refresh",
          duration_ms: durationMs,
          metadata: JSON.stringify({ reason: "token_expired", exp: now - 3600000 }),
          created_at: now,
        },
        {
          id: now + 2,
          trace_id: traceId,
          event_type: "cache",
          service: "redis",
          operation: "GET blacklist:jwt_token_99",
          duration_ms: 8,
          metadata: JSON.stringify({ revoked: true }),
          created_at: now + 5,
        },
      ];
    } else if (scenario === "db-slow") {
      method = "GET";
      path = "/api/v1/reports/monthly-aggregation";
      statusCode = 200;
      durationMs = 1240;
      events = [
        {
          id: now + 1,
          trace_id: traceId,
          event_type: "http",
          service: "reporting-svc",
          operation: "GET /api/v1/reports/monthly-aggregation",
          duration_ms: durationMs,
          metadata: JSON.stringify({ cached: false }),
          created_at: now,
        },
        {
          id: now + 2,
          trace_id: traceId,
          event_type: "db",
          service: "postgres",
          operation: "SELECT date_trunc('day', created_at), sum(amount) FROM ledger GROUP BY 1",
          duration_ms: 1180,
          metadata: JSON.stringify({ full_table_scan: true, scanned_rows: 450200 }),
          created_at: now + 20,
        },
      ];
    } else {
      method = "GET";
      path = "/api/v1/user/profile";
      statusCode = 200;
      durationMs = 34;
      events = [
        {
          id: now + 1,
          trace_id: traceId,
          event_type: "http",
          service: "user-svc",
          operation: "GET /api/v1/user/profile",
          duration_ms: durationMs,
          metadata: JSON.stringify({ cached: true }),
          created_at: now,
        },
        {
          id: now + 2,
          trace_id: traceId,
          event_type: "cache",
          service: "redis",
          operation: "GET user:usr_active_session",
          duration_ms: 3,
          metadata: JSON.stringify({ hit: true }),
          created_at: now + 4,
        },
      ];
    }

    const newTrace: Trace = {
      id: now,
      trace_id: traceId,
      instance_id: "inst_local_dev",
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
      environment: "development",
      created_at: now,
      expires_at: now + 1000 * 86400 * 7,
    };

    setSimulatedTraces((prev) => [newTrace, ...prev]);
    setSimulatedEvents((prev) => ({
      ...prev,
      [traceId]: events,
    }));

    return newTrace;
  };

  const clearSimulated = () => {
    setSimulatedTraces([]);
    setSimulatedEvents({});
    sessionStorage.removeItem("ts_simulated_traces");
    sessionStorage.removeItem("ts_simulated_events");
  };

  const getEventsForTrace = (traceId: string): TraceEvent[] => {
    return simulatedEvents[traceId] || [];
  };

  return (
    <TraceSimulatorContext.Provider
      value={{
        simulatedTraces,
        simulatedEvents,
        simulateTrace,
        clearSimulated,
        getEventsForTrace,
      }}
    >
      {children}
    </TraceSimulatorContext.Provider>
  );
}

export function useTraceSimulator() {
  const ctx = useContext(TraceSimulatorContext);
  if (!ctx) {
    throw new Error("useTraceSimulator must be used within TraceSimulatorProvider");
  }
  return ctx;
}
