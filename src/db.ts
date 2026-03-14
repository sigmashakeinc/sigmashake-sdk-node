import { HttpClient } from './http.js';
import type {
  CreateTableRequest,
  InsertRequest,
  QueryRequest,
  QueryResponse,
  VectorSearchRequest,
  ScrollQueryRequest,
  ScrollQueryResponse,
  ClusterInitRequest,
  ClusterStatusResponse,
} from './models.js';

export class DbApi {
  constructor(private readonly http: HttpClient) {}

  /** Create a new table. */
  createTable(table: string, request: CreateTableRequest): Promise<void> {
    return this.http.post<void>(`/v1/db/tables/${encodeURIComponent(table)}`, request);
  }

  /** Drop a table. */
  dropTable(table: string): Promise<void> {
    return this.http.delete<void>(`/v1/db/tables/${encodeURIComponent(table)}`);
  }

  /** Insert rows into a table. */
  insert(table: string, request: InsertRequest): Promise<void> {
    return this.http.post<void>(`/v1/db/tables/${encodeURIComponent(table)}/rows`, request);
  }

  /** Query rows from a table. */
  query(table: string, request: QueryRequest): Promise<QueryResponse> {
    return this.http.post<QueryResponse>(`/v1/db/tables/${encodeURIComponent(table)}/query`, request);
  }

  /** Paginated scroll query. */
  scroll(table: string, request: ScrollQueryRequest): Promise<ScrollQueryResponse> {
    return this.http.post<ScrollQueryResponse>(`/v1/db/tables/${encodeURIComponent(table)}/scroll`, request);
  }

  /** Vector similarity search. */
  vectorSearch(table: string, request: VectorSearchRequest): Promise<QueryResponse> {
    return this.http.post<QueryResponse>(`/v1/db/tables/${encodeURIComponent(table)}/vector-search`, request);
  }

  /** Initialize a cluster. */
  initCluster(request: ClusterInitRequest): Promise<ClusterStatusResponse> {
    return this.http.post<ClusterStatusResponse>('/v1/db/cluster/init', request);
  }

  /** Get cluster status. */
  getClusterStatus(): Promise<ClusterStatusResponse> {
    return this.http.get<ClusterStatusResponse>('/v1/db/cluster/status');
  }
}
