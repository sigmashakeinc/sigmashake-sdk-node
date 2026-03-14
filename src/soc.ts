import { HttpClient } from './http.js';
import type {
  StoredIncident,
  Alert,
  MetricSummary,
  PlatformStatus,
  LlmLogEntry,
  IngestResponse,
  SessionTimeline,
  HostTrafficSummary,
  SessionCostSummary,
  ThreatHeatmapEntry,
} from './models.js';

export interface ListIncidentsParams {
  status?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}

export class SocApi {
  constructor(private readonly http: HttpClient) {}

  /** List incidents with optional filters. */
  listIncidents(params?: ListIncidentsParams): Promise<StoredIncident[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.http.get<StoredIncident[]>(`/v1/soc/incidents${qs ? `?${qs}` : ''}`);
  }

  /** Get a single incident by ID. */
  getIncident(incidentId: string): Promise<StoredIncident> {
    return this.http.get<StoredIncident>(`/v1/soc/incidents/${incidentId}`);
  }

  /** Get alerts for an incident. */
  getAlerts(incidentId: string): Promise<Alert[]> {
    return this.http.get<Alert[]>(`/v1/soc/incidents/${incidentId}/alerts`);
  }

  /** Get platform metrics summary. */
  getMetrics(): Promise<MetricSummary[]> {
    return this.http.get<MetricSummary[]>('/v1/soc/metrics');
  }

  /** Get platform health status. */
  getStatus(): Promise<PlatformStatus> {
    return this.http.get<PlatformStatus>('/v1/soc/status');
  }

  /** Ingest LLM log entries. */
  ingestLogs(entries: LlmLogEntry[]): Promise<IngestResponse> {
    return this.http.post<IngestResponse>('/v1/soc/logs/ingest', { entries });
  }

  /** Get session timeline. */
  getTimeline(sessionId: string): Promise<SessionTimeline> {
    return this.http.get<SessionTimeline>(`/v1/soc/sessions/${sessionId}/timeline`);
  }

  /** Get host traffic summary. */
  getHostTraffic(host: string): Promise<HostTrafficSummary> {
    return this.http.get<HostTrafficSummary>(`/v1/soc/traffic/${encodeURIComponent(host)}`);
  }

  /** Get session cost summary. */
  getSessionCost(sessionId: string): Promise<SessionCostSummary> {
    return this.http.get<SessionCostSummary>(`/v1/soc/sessions/${sessionId}/cost`);
  }

  /** Get threat heatmap. */
  getThreatHeatmap(): Promise<ThreatHeatmapEntry[]> {
    return this.http.get<ThreatHeatmapEntry[]>('/v1/soc/threats/heatmap');
  }
}
