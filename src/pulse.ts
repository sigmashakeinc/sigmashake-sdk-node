import { HttpClient } from './http.js';

export interface PushEventParams {
  events: Record<string, unknown>[];
}

export interface PushEventResponse {
  accepted: number;
  run_id: string | null;
}

export interface GetRunsParams {
  page?: number;
  per_page?: number;
  from?: string;
  to?: string;
}

export interface PulseRunsResponse {
  items: Record<string, unknown>[];
  total: number;
  page: number;
  per_page: number;
}

export interface PulseRun {
  id: string;
  status: string;
  phases: Record<string, unknown>[];
  [key: string]: unknown;
}

export interface TriggerRunParams {
  trigger_type: string;
  config?: Record<string, unknown>;
}

export interface TriggerRunResponse {
  id: string;
  status: string;
  trigger_type: string;
}

export interface GetMetricsParams {
  from?: string;
  to?: string;
}

export interface PulseMetrics {
  build_time_p50_ms?: number;
  test_pass_rate?: number;
  deploy_frequency_per_day?: number;
  [key: string]: unknown;
}

export interface GetBottlenecksParams {
  min_score?: number;
  limit?: number;
}

export interface BottleneckEntry {
  phase: string;
  score: number;
  description: string;
}

export interface BottlenecksResponse {
  bottlenecks: BottleneckEntry[];
  total: number;
}

export interface PulseStatus {
  healthy: boolean;
  active_runs: number;
  queue_depth: number;
  [key: string]: unknown;
}

export interface AiBriefResponse {
  summary: string;
  recommendations: string[];
  [key: string]: unknown;
}

export class PulseApi {
  constructor(private readonly http: HttpClient) {}

  /** Push one or more pipeline events to Pulse. */
  pushEvent(events: Record<string, unknown>[]): Promise<PushEventResponse> {
    return this.http.post<PushEventResponse>('/v1/pulse/events', { events });
  }

  /** List pipeline runs with optional pagination and date-range filtering. */
  getRuns(params?: GetRunsParams): Promise<PulseRunsResponse> {
    const query = new URLSearchParams();
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.per_page !== undefined) query.set('per_page', String(params.per_page));
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const qs = query.toString();
    return this.http.get<PulseRunsResponse>(qs ? `/v1/pulse/history?${qs}` : '/v1/pulse/history');
  }

  /** Get a single pipeline run by ID. */
  getRun(runId: string): Promise<PulseRun> {
    return this.http.get<PulseRun>(`/v1/pulse/runs/${runId}`);
  }

  /** Trigger a new pipeline run. */
  triggerRun(triggerType: string, config?: Record<string, unknown>): Promise<TriggerRunResponse> {
    const body: TriggerRunParams = { trigger_type: triggerType };
    if (config !== undefined) body.config = config;
    return this.http.post<TriggerRunResponse>('/v1/pulse/trigger', body);
  }

  /** Get aggregated pipeline metrics with optional time-range filtering. */
  getMetrics(params?: GetMetricsParams): Promise<PulseMetrics> {
    return this.http.get<PulseMetrics>('/v1/pulse/metrics', params as Record<string, unknown>);
  }

  /** Get detected bottlenecks with optional score threshold and limit. */
  getBottlenecks(params?: GetBottlenecksParams): Promise<BottlenecksResponse> {
    return this.http.get<BottlenecksResponse>('/v1/pulse/bottlenecks', params as Record<string, unknown>);
  }

  /** Get current Pulse system status. */
  getStatus(): Promise<PulseStatus> {
    return this.http.get<PulseStatus>('/v1/pulse/status');
  }

  /** Get the AI-generated pipeline health brief. */
  getAiBrief(): Promise<AiBriefResponse> {
    return this.http.get<AiBriefResponse>('/v1/pulse/ai-brief');
  }
}
