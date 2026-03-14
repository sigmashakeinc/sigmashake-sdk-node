import { HttpClient } from './http.js';
import type { MemoryEntry, StoreRequest, MemoryQuery } from './models.js';

export class MemoryApi {
  constructor(private readonly http: HttpClient) {}

  /** Store a memory entry. */
  store(request: StoreRequest): Promise<MemoryEntry> {
    return this.http.post<MemoryEntry>('/v1/memory', request);
  }

  /** Get a memory entry by key. */
  get(key: string): Promise<MemoryEntry> {
    return this.http.get<MemoryEntry>(`/v1/memory/${encodeURIComponent(key)}`);
  }

  /** Delete a memory entry by key. */
  delete(key: string): Promise<void> {
    return this.http.delete<void>(`/v1/memory/${encodeURIComponent(key)}`);
  }

  /** Recall memories matching a query. */
  recall(query: MemoryQuery): Promise<MemoryEntry[]> {
    return this.http.post<MemoryEntry[]>('/v1/memory/recall', query);
  }
}
