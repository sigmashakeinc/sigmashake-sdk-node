import { HttpClient } from './http.js';
import type { AgentRegistration, AgentSession, ScanRequest, ScanResult } from './models.js';

export class ShieldApi {
  constructor(private readonly http: HttpClient) {}

  /** Register an agent for shield monitoring. */
  registerAgent(registration: AgentRegistration): Promise<AgentSession> {
    return this.http.post<AgentSession>('/v1/shield/register', registration);
  }

  /** Scan an operation for risk. */
  scan(request: ScanRequest): Promise<ScanResult> {
    return this.http.post<ScanResult>('/v1/shield/scan', request);
  }

  /** Get scan history for a session. */
  getScanHistory(sessionId: string): Promise<ScanResult[]> {
    return this.http.get<ScanResult[]>(`/v1/shield/sessions/${sessionId}/scans`);
  }
}
