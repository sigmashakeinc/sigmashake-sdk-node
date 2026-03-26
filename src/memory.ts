import { HttpClient } from './http.js';
import type { MemoryEntry, StoreRequest, MemoryQuery } from './models.js';

export class MemoryApi {
  constructor(private readonly http: HttpClient) {}

  /** Store a memory entry for an agent. */
  store(agentId: string, key: string, request: StoreRequest): Promise<MemoryEntry> {
    return this.http.put<MemoryEntry>(`/api/v1/agents/${encodeURIComponent(agentId)}/memory/${encodeURIComponent(key)}`, request);
  }

  /** Get a memory entry by agent and key. */
  get(agentId: string, key: string): Promise<MemoryEntry> {
    return this.http.get<MemoryEntry>(`/api/v1/agents/${encodeURIComponent(agentId)}/memory/${encodeURIComponent(key)}`);
  }

  /** Delete a memory entry by agent and key. */
  delete(agentId: string, key: string): Promise<void> {
    return this.http.delete<void>(`/api/v1/agents/${encodeURIComponent(agentId)}/memory/${encodeURIComponent(key)}`);
  }

  /** Recall memories for an agent matching a query. */
  recall(agentId: string, query: MemoryQuery): Promise<MemoryEntry[]> {
    return this.http.post<MemoryEntry[]>(`/api/v1/agents/${encodeURIComponent(agentId)}/memory/search`, query);
  }
}
