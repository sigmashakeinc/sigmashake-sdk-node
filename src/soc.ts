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

  /** List SOC alerts with optional filters. */
  listAlerts(params?: ListIncidentsParams): Promise<StoredIncident[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.severity) query.set('severity', params.severity);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.http.get<StoredIncident[]>(`/api/v1/soc/alerts${qs ? `?${qs}` : ''}`);
  }

  /** @deprecated Use listAlerts() instead. */
  listIncidents(params?: ListIncidentsParams): Promise<StoredIncident[]> {
    return this.listAlerts(params);
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
    return this.http.get<SessionTimeline>(`/api/v1/soc/timeline/${encodeURIComponent(sessionId)}`);
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

  /** @deprecated Not yet implemented. */
  topHosts(_host?: string): Promise<HostTrafficSummary[]> {
    return Promise.reject(new Error('Not yet implemented'));
  }
}
