export interface Trace {
  id: number;
  trace_id: string;
  instance_id: string;
  method: string;
  path: string;
  status_code: number;
  duration_ms: number;
  environment: string;
  created_at: number;
  expires_at: number;
}

export interface TraceEvent {
  id: number;
  trace_id: string;
  event_type: string;
  service: string;
  operation: string;
  duration_ms: number;
  metadata: string;
  created_at: number;
}

export interface TracesResponse {
  message: string;
  traces: Trace[];
}

export interface TraceResponse {
  message: string;
  trace: Trace;
}

export interface TimelineResponse {
  message: string;
  events: TraceEvent[];
}

export interface ReplayRun {
  id: number;
  trace_id: string;
  target_base_url: string;
  environment: string | null;
  status_code: number | null;
  duration_ms: number | null;
  result: string | null;
  created_at: number;
}

export interface ReplaysResponse {
  message: string;
  replays: ReplayRun[];
}

export interface ReplayResult {
  message: string;
  original: { status_code: number; duration_ms: number };
  replay: { status_code: number; duration_ms: number };
}

export interface RegressionTest {
  id: number;
  source_trace_id: string;
  name: string;
  expected_status: number;
  expected_schema?: string | null;
  created_at: number;
}

export interface RegressionsResponse {
  message: string;
  regressions: RegressionTest[];
}

export interface RegressionRunResult {
  message: string;
  expected_status: number;
  actual_status: number;
  passed?: boolean;
}
