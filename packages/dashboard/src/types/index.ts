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
