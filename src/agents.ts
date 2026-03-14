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

  /** Terminate an agent session. */
  terminateSession(sessionId: string): Promise<void> {
    return this.http.delete<void>(`/v1/agents/sessions/${sessionId}`);
  }
}
