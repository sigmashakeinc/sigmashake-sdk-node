import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '../src/errors.js';
import { ColumnType, FilterOp, DistanceMetric } from '../src/models.js';
import type { QueryResponse, ScrollQueryResponse, ClusterStatusResponse } from '../src/models.js';

const originalFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('DbApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('client.db is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.db).toBeDefined();
  });

  // ── createTable ─────────────────────────────────────────────────

  it('createTable sends POST to /v1/db/tables/:name', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.db.createTable('events', {
      columns: [
        { name: 'id', colType: ColumnType.Uuid },
        { name: 'data', colType: ColumnType.Json },
        { name: 'created_at', colType: ColumnType.Timestamp },
      ],
      primaryKey: 'id',
    });

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/tables/events');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.columns).toHaveLength(3);
    expect(body.primaryKey).toBe('id');
  });

  it('createTable encodes special characters in table name', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.db.createTable('my table', { columns: [{ name: 'id', colType: ColumnType.Uint64 }] });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/tables/my%20table');
  });

  // ── dropTable ───────────────────────────────────────────────────

  it('dropTable sends DELETE to /v1/db/tables/:name', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.db.dropTable('old_table');

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/tables/old_table');
    expect(opts.method).toBe('DELETE');
  });

  // ── insert ──────────────────────────────────────────────────────

  it('insert sends POST to /v1/db/tables/:name/rows', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.db.insert('events', {
      columns: [
        { name: 'id', data: [1, 2, 3] },
        { name: 'data', data: ['a', 'b', 'c'] },
      ],
    });

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/tables/events/rows');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.columns).toHaveLength(2);
    expect(body.columns[0].data).toEqual([1, 2, 3]);
  });

  // ── query ───────────────────────────────────────────────────────

  it('query sends POST to /v1/db/tables/:name/query', async () => {
    const queryResponse: QueryResponse = {
      columns: ['id', 'data'],
      rows: [[1, 'a'], [2, 'b']],
      totalRows: 2,
    };
    mockFetch(200, queryResponse);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.query('events', {
      filters: [{ column: 'id', op: FilterOp.Gt, value: 0 }],
      limit: 100,
    });

    expect(result.totalRows).toBe(2);
    expect(result.columns).toEqual(['id', 'data']);
    expect(result.rows).toHaveLength(2);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/tables/events/query');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.filters[0].op).toBe('gt');
    expect(body.limit).toBe(100);
  });

  it('query with aggregations', async () => {
    mockFetch(200, { columns: ['count'], rows: [[42]], totalRows: 1 });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.query('events', {
      aggregations: [{ column: 'id', aggType: 'count', alias: 'count' }],
    });

    expect(result.rows[0][0]).toBe(42);
  });

  // ── scroll ──────────────────────────────────────────────────────

  it('scroll sends POST to /v1/db/tables/:name/scroll', async () => {
    const scrollResponse: ScrollQueryResponse = {
      columns: ['id', 'data'],
      rows: [[1, 'a']],
      cursorId: 'cursor-abc',
      hasMore: true,
    };
    mockFetch(200, scrollResponse);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.scroll('events', { pageSize: 10 });

    expect(result.cursorId).toBe('cursor-abc');
    expect(result.hasMore).toBe(true);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/tables/events/scroll');
    expect(opts.method).toBe('POST');
  });

  it('scroll with cursorId for pagination', async () => {
    mockFetch(200, { columns: ['id'], rows: [[2]], hasMore: false });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.scroll('events', { cursorId: 'cursor-abc', pageSize: 10 });

    expect(result.hasMore).toBe(false);
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.cursorId).toBe('cursor-abc');
  });

  // ── vectorSearch ────────────────────────────────────────────────

  it('vectorSearch sends POST to /v1/db/tables/:name/vector-search', async () => {
    const queryResponse: QueryResponse = {
      columns: ['id', 'distance'],
      rows: [[1, 0.05], [2, 0.12]],
      totalRows: 2,
    };
    mockFetch(200, queryResponse);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.vectorSearch('embeddings', {
      vector: [0.1, 0.2, 0.3],
      topK: 5,
      metric: DistanceMetric.Cosine,
    });

    expect(result.totalRows).toBe(2);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/tables/embeddings/vector-search');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.vector).toEqual([0.1, 0.2, 0.3]);
    expect(body.topK).toBe(5);
    expect(body.metric).toBe('cosine');
  });

  it('vectorSearch with filters', async () => {
    mockFetch(200, { columns: ['id'], rows: [[3]], totalRows: 1 });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.db.vectorSearch('embeddings', {
      vector: [0.5, 0.5],
      topK: 10,
      filters: [{ column: 'active', op: FilterOp.Eq, value: true }],
    });

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.filters).toHaveLength(1);
    expect(body.filters[0].op).toBe('eq');
  });

  // ── initCluster ─────────────────────────────────────────────────

  it('initCluster sends POST to /v1/db/cluster/init', async () => {
    const clusterStatus: ClusterStatusResponse = {
      clusterId: 'cluster-1',
      status: 'initializing',
      nodes: 3,
      replicationFactor: 2,
      shards: 6,
      healthy: false,
    };
    mockFetch(200, clusterStatus);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.initCluster({ nodes: 3, replicationFactor: 2, shards: 6 });

    expect(result.clusterId).toBe('cluster-1');
    expect(result.nodes).toBe(3);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/cluster/init');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ nodes: 3, replicationFactor: 2, shards: 6 });
  });

  // ── getClusterStatus ────────────────────────────────────────────

  it('getClusterStatus sends GET to /v1/db/cluster/status', async () => {
    const clusterStatus: ClusterStatusResponse = {
      clusterId: 'cluster-1',
      status: 'healthy',
      nodes: 3,
      replicationFactor: 2,
      shards: 6,
      healthy: true,
    };
    mockFetch(200, clusterStatus);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.getClusterStatus();

    expect(result.healthy).toBe(true);
    expect(result.status).toBe('healthy');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/db/cluster/status');
    expect(opts.method).toBe('GET');
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Invalid API key' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.db.getClusterStatus()).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.db.dropTable('secret_table')).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Table not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.db.query('nonexistent', {})).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError on 400', async () => {
    mockFetch(400, { message: 'Invalid column type' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(
      client.db.createTable('bad', { columns: [] }),
    ).rejects.toThrow(ValidationError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Too many requests' }, { 'retry-after': '5' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.db.query('events', {});
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(5000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.db.getClusterStatus()).rejects.toThrow(ServerError);
  });
});
