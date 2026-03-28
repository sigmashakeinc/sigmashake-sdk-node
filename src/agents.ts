import { HttpClient } from './http.js';
import type { AgentRegistration, AgentSession } from './models.js';

export class AgentsApi {
  constructor(private readonly http: HttpClient) {}

  /** Register a new agent session. */
  register(registration: AgentRegistration): Promise<AgentSession> {
    return this.http.post<AgentSession>('/v1/agents/register', registration);
  }

  /** Get an active agent session. */
  getSession(sessionId: string): Promise<AgentSession> {
    return this.http.get<AgentSession>(`/v1/agents/sessions/${sessionId}`);
  }

  /** List active sessions for an agent. */
  listSessions(agentId: string): Promise<AgentSession[]> {
    return this.http.get<AgentSession[]>(`/v1/agents/${agentId}/sessions`);
  }

  /** Update an agent session. */
  update(sessionId: string, body: Partial<AgentRegistration>): Promise<AgentSession> {
    return this.http.patch<AgentSession>(`/v1/agents/sessions/${sessionId}`, body);
  }

  /** Terminate an agent session. */
  terminateSession(sessionId: string): Promise<void> {
    return this.http.delete<void>(`/v1/agents/sessions/${sessionId}`);
  }

  // -- Triggers -------------------------------------------------------------

  /** Create a remote trigger for an agent. */
  createTrigger(agentId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/agents/${agentId}/triggers`, body);
  }

  /** List triggers for an agent. */
  listTriggers(agentId: string): Promise<Record<string, unknown>[]> {
    return this.http.get(`/v1/agents/${agentId}/triggers`);
  }

  /** Execute a trigger. */
  executeTrigger(agentId: string, triggerId: string): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/agents/${agentId}/triggers/${triggerId}/execute`);
  }

  /** Get trigger execution status. */
  getTriggerStatus(agentId: string, triggerId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/agents/${agentId}/triggers/${triggerId}/status`);
  }

  /** Delete a trigger. */
  deleteTrigger(agentId: string, triggerId: string): Promise<void> {
    return this.http.delete<void>(`/v1/agents/${agentId}/triggers/${triggerId}`);
  }

  // -- Context --------------------------------------------------------------

  /** Store conversation context for an agent. */
  storeContext(agentId: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.http.put(`/v1/agents/${agentId}/context`, body);
  }

  /** Get stored context for an agent. */
  getContext(agentId: string): Promise<Record<string, unknown>> {
    return this.http.get(`/v1/agents/${agentId}/context`);
  }

  /** Delete stored context for an agent. */
  deleteContext(agentId: string): Promise<void> {
    return this.http.delete<void>(`/v1/agents/${agentId}/context`);
  }

  // -- Tools ----------------------------------------------------------------

  /** Register tools for an agent. */
  registerTools(agentId: string, tools: Record<string, unknown>[]): Promise<Record<string, unknown>> {
    return this.http.post(`/v1/agents/${agentId}/tools`, { tools });
  }

  /** List registered tools for an agent. */
  listTools(agentId: string): Promise<Record<string, unknown>[]> {
    return this.http.get(`/v1/agents/${agentId}/tools`);
  }

  /** Unregister a tool from an agent. */
  unregisterTool(agentId: string, toolName: string): Promise<void> {
    return this.http.delete<void>(`/v1/agents/${agentId}/tools/${toolName}`);
  }

  // -- Usage ----------------------------------------------------------------

  /** Get usage metrics for an agent. */
  getUsage(agentId: string, params?: { fromDate?: string; toDate?: string }): Promise<Record<string, unknown>> {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set('from_date', params.fromDate);
    if (params?.toDate) query.set('to_date', params.toDate);
    const qs = query.toString();
    return this.http.get(`/v1/agents/${agentId}/usage${qs ? `?${qs}` : ''}`);
  }
}
