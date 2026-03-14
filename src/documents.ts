import { HttpClient } from './http.js';
import type {
  Document,
  MutationRequest,
  MutationResponse,
  SearchRequest,
  SearchResponse,
} from './models.js';

export class DocumentsApi {
  constructor(private readonly http: HttpClient) {}

  /** Create or mutate a document. */
  create(request: MutationRequest): Promise<MutationResponse> {
    return this.http.post<MutationResponse>('/v1/documents', request);
  }

  /** Get a document by ID. */
  get(documentId: string): Promise<Document> {
    return this.http.get<Document>(`/v1/documents/${documentId}`);
  }

  /** Delete a document by ID. */
  delete(documentId: string): Promise<void> {
    return this.http.delete<void>(`/v1/documents/${documentId}`);
  }

  /** Search documents. */
  search(request: SearchRequest): Promise<SearchResponse> {
    return this.http.post<SearchResponse>('/v1/documents/search', request);
  }
}
