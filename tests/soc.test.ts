import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../src/errors.js';
import type {
  StoredIncident,
  Alert,
  MetricSummary,
  PlatformStatus,
  IngestResponse,
  SessionTimeline,
  HostTrafficSummary,
  SessionCostSummary,
  ThreatHeatmapEntry,
} from '../src/models.js';

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

describe('SocApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('client.soc is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.soc).toBeDefined();
  });

  // ── listIncidents ───────────────────────────────────────────────

  it('listIncidents sends GET to /v1/soc/incidents', async () => {
    const incidents: StoredIncident[] = [
      { id: 'inc-1', severity: 'high', status: 'open', title: 'Breach', description: 'Data leak', createdAt: '', updatedAt: '' },
    ];
    mockFetch(200, incidents);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.listIncidents();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('inc-1');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/incidents');
    expect(opts.method).toBe('GET');
  });

  it('listIncidents passes filter params', async () => {
    mockFetch(200, []);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.soc.listIncidents({ status: 'open', severity: 'critical', limit: 20, offset: 5 });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('status=open');
    expect(url).toContain('severity=critical');
    expect(url).toContain('limit=20');
    expect(url).toContain('offset=5');
  });

  it('listIncidents without params omits query string', async () => {
    mockFetch(200, []);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.soc.listIncidents();

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/incidents');
  });

  // ── getIncident ─────────────────────────────────────────────────

  it('getIncident sends GET to /v1/soc/incidents/:id', async () => {
    const incident: StoredIncident = {
      id: 'inc-2',
      severity: 'medium',
      status: 'investigating',
      title: 'Anomaly',
      description: 'Unusual pattern',
      createdAt: '2026-03-25',
      updatedAt: '2026-03-25',
    };
    mockFetch(200, incident);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getIncident('inc-2');

    expect(result.id).toBe('inc-2');
    expect(result.severity).toBe('medium');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/incidents/inc-2');
  });

  // ── getAlerts ───────────────────────────────────────────────────

  it('getAlerts sends GET to /v1/soc/incidents/:id/alerts', async () => {
    const alerts: Alert[] = [
      { id: 'alert-1', incidentId: 'inc-1', message: 'High risk', severity: 'high', timestamp: '2026-03-25' },
    ];
    mockFetch(200, alerts);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getAlerts('inc-1');

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('High risk');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/incidents/inc-1/alerts');
  });

  // ── getMetrics ──────────────────────────────────────────────────

  it('getMetrics sends GET to /v1/soc/metrics', async () => {
    const metrics: MetricSummary[] = [
      { name: 'api_latency_p50', value: 45.2, unit: 'ms', timestamp: '2026-03-25' },
      { name: 'error_rate', value: 0.02, unit: 'pct', timestamp: '2026-03-25' },
    ];
    mockFetch(200, metrics);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getMetrics();

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('api_latency_p50');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/metrics');
  });

  // ── getStatus ───────────────────────────────────────────────────

  it('getStatus sends GET to /v1/soc/status', async () => {
    const status: PlatformStatus = {
      healthy: true,
      version: '2.1.0',
      uptime: 86400,
      aggregateHealth: { status: 'healthy', services: { db: 'up', gateway: 'up' }, lastChecked: '2026-03-25' },
    };
    mockFetch(200, status);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getStatus();

    expect(result.healthy).toBe(true);
    expect(result.version).toBe('2.1.0');
    expect(result.uptime).toBe(86400);
    expect(result.aggregateHealth.services.db).toBe('up');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/status');
  });

  // ── ingestLogs ──────────────────────────────────────────────────

  it('ingestLogs sends POST to /v1/soc/logs/ingest', async () => {
    const response: IngestResponse = { accepted: 3, rejected: 0, errors: [] };
    mockFetch(200, response);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const entries = [
      { id: 'l1', sessionId: 's1', agentId: 'a1', model: 'gpt-4', promptTokens: 100, completionTokens: 50, latencyMs: 200, timestamp: '2026-03-25T12:00:00Z' },
      { id: 'l2', sessionId: 's1', agentId: 'a1', model: 'gpt-4', promptTokens: 200, completionTokens: 100, latencyMs: 300, timestamp: '2026-03-25T12:01:00Z' },
      { id: 'l3', sessionId: 's2', agentId: 'a2', model: 'claude-3', promptTokens: 500, completionTokens: 200, latencyMs: 150, timestamp: '2026-03-25T12:02:00Z' },
    ];

    const result = await client.soc.ingestLogs(entries);

    expect(result.accepted).toBe(3);
    expect(result.rejected).toBe(0);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/logs/ingest');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.entries).toHaveLength(3);
  });

  // ── getTimeline ─────────────────────────────────────────────────

  it('getTimeline sends GET to /v1/soc/sessions/:id/timeline', async () => {
    const timeline: SessionTimeline = {
      sessionId: 'sess-1',
      events: [
        { type: 'tool_call', timestamp: '2026-03-25T12:00:00Z', data: { tool: 'Bash' } },
        { type: 'tool_result', timestamp: '2026-03-25T12:00:01Z', data: { exitCode: 0 } },
      ],
    };
    mockFetch(200, timeline);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getTimeline('sess-1');

    expect(result.sessionId).toBe('sess-1');
    expect(result.events).toHaveLength(2);
    expect(result.events[0].type).toBe('tool_call');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/sessions/sess-1/timeline');
  });

  // ── getHostTraffic ──────────────────────────────────────────────

  it('getHostTraffic sends GET to /v1/soc/traffic/:host', async () => {
    const traffic: HostTrafficSummary = {
      host: 'api.example.com',
      requestCount: 5000,
      bytesIn: 1048576,
      bytesOut: 2097152,
      period: '24h',
    };
    mockFetch(200, traffic);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getHostTraffic('api.example.com');

    expect(result.host).toBe('api.example.com');
    expect(result.requestCount).toBe(5000);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/traffic/api.example.com');
  });

  it('getHostTraffic encodes special characters in host', async () => {
    mockFetch(200, { host: 'a/b', requestCount: 0, bytesIn: 0, bytesOut: 0, period: '1h' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.soc.getHostTraffic('a/b');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/traffic/a%2Fb');
  });

  // ── getSessionCost ──────────────────────────────────────────────

  it('getSessionCost sends GET to /v1/soc/sessions/:id/cost', async () => {
    const cost: SessionCostSummary = {
      sessionId: 'sess-1',
      totalTokens: 15000,
      totalCostUsd: 0.45,
      breakdown: [
        { model: 'gpt-4', tokens: 10000, costUsd: 0.30 },
        { model: 'claude-3', tokens: 5000, costUsd: 0.15 },
      ],
    };
    mockFetch(200, cost);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getSessionCost('sess-1');

    expect(result.totalTokens).toBe(15000);
    expect(result.totalCostUsd).toBe(0.45);
    expect(result.breakdown).toHaveLength(2);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/sessions/sess-1/cost');
  });

  // ── getThreatHeatmap ────────────────────────────────────────────

  it('getThreatHeatmap sends GET to /v1/soc/threats/heatmap', async () => {
    const heatmap: ThreatHeatmapEntry[] = [
      { category: 'injection', severity: 'critical', count: 3, period: '24h' },
      { category: 'exfiltration', severity: 'high', count: 7, period: '24h' },
    ];
    mockFetch(200, heatmap);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.soc.getThreatHeatmap();

    expect(result).toHaveLength(2);
    expect(result[0].category).toBe('injection');
    expect(result[1].count).toBe(7);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/soc/threats/heatmap');
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Unauthorized' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.soc.getStatus()).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.soc.listIncidents()).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Incident not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.soc.getIncident('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Rate limited' }, { 'retry-after': '45' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.soc.getMetrics();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(45000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.soc.getStatus()).rejects.toThrow(ServerError);
  });
});
