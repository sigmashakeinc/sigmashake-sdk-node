import { HttpClient } from './http.js';
import type {
  FleetStatus,
  ListAgentsParams,
  AgentListResponse,
  FleetAgentDetail,
  FleetCommand,
  FleetCommandAck,
  FleetBroadcastResult,
  AgentMetricsParams,
  AgentMetricsResponse,
  AgentCommandsParams,
  AgentCommandsResponse,
  FleetConfig,
} from './models.js';

export class FleetApi {
  constructor(private readonly http: HttpClient) {}

  /** Get fleet-wide status summary. */
  getStatus(): Promise<FleetStatus> {
    return this.http.get<FleetStatus>('/v1/fleet/status');
  }

  /** List agents with optional filters and pagination. */
  listAgents(params?: ListAgentsParams): Promise<AgentListResponse> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.presence) query.set('presence', params.presence);
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return this.http.get<AgentListResponse>(`/v1/fleet/agents${qs ? `?${qs}` : ''}`);
  }

  /** Get detailed info for a single agent. */
  getAgent(agentId: string): Promise<FleetAgentDetail> {
    return this.http.get<FleetAgentDetail>(`/v1/fleet/agents/${encodeURIComponent(agentId)}`);
  }

  /** Send a command to a specific agent. */
  sendCommand(agentId: string, command: FleetCommand): Promise<FleetCommandAck> {
    return this.http.post<FleetCommandAck>(
      `/v1/fleet/agents/${encodeURIComponent(agentId)}/command`,
      command,
    );
  }

  /** Broadcast a command to all tenant agents. */
  broadcast(command: FleetCommand): Promise<FleetBroadcastResult> {
    return this.http.post<FleetBroadcastResult>('/v1/fleet/broadcast', command);
  }

  /** Get historical metrics for an agent. */
  getAgentMetrics(agentId: string, params?: AgentMetricsParams): Promise<AgentMetricsResponse> {
    const query = new URLSearchParams();
    if (params?.range) query.set('range', params.range);
    const qs = query.toString();
    return this.http.get<AgentMetricsResponse>(
      `/v1/fleet/agents/${encodeURIComponent(agentId)}/metrics${qs ? `?${qs}` : ''}`,
    );
  }

  /** Get command audit trail for an agent. */
  getAgentCommands(agentId: string, params?: AgentCommandsParams): Promise<AgentCommandsResponse> {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    if (params?.offset !== undefined) query.set('offset', String(params.offset));
    const qs = query.toString();
    return this.http.get<AgentCommandsResponse>(
      `/v1/fleet/agents/${encodeURIComponent(agentId)}/commands${qs ? `?${qs}` : ''}`,
    );
  }

  /** Get tenant fleet configuration. */
  getConfig(): Promise<FleetConfig> {
    return this.http.get<FleetConfig>('/v1/fleet/config');
  }

  /** Update tenant fleet configuration. Pushes ConfigUpdate to connected agents. */
  updateConfig(config: Partial<FleetConfig>): Promise<FleetConfig> {
    return this.http.put<FleetConfig>('/v1/fleet/config', config);
  }
}
