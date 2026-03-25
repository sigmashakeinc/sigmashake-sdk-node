import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SigmaShake } from '../src/client.js';

describe('Pulse API', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(status: number, body: unknown) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(),
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }

  it('client.pulse is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.pulse).toBeDefined();
  });

  it('pushEvent posts to /v1/pulse/events', async () => {
    const responseBody = { accepted: 2, run_id: 'run-abc' };
    mockFetch(202, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const events = [
      { event_type: 'build_start', timestamp: '2026-03-25T10:00:00Z' },
      { event_type: 'test_pass', timestamp: '2026-03-25T10:01:00Z' },
    ];
    const result = await client.pulse.pushEvent(events);

    expect(result.accepted).toBe(2);
    expect(result.run_id).toBe('run-abc');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/pulse/events');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.events).toHaveLength(2);

    globalThis.fetch = originalFetch;
  });

  it('getRuns calls GET /v1/pulse/history', async () => {
    const responseBody = { items: [], total: 0, page: 1, per_page: 20 };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.pulse.getRuns();

    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/pulse/history');
    expect(opts.method).toBe('GET');

    globalThis.fetch = originalFetch;
  });

  it('getRuns passes pagination params as query string', async () => {
    mockFetch(200, { items: [], total: 0, page: 2, per_page: 5 });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.pulse.getRuns({ page: 2, per_page: 5, from: '2026-03-01T00:00:00Z' });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('page=2');
    expect(url).toContain('per_page=5');
    expect(url).toContain('from=');

    globalThis.fetch = originalFetch;
  });

  it('getRun calls GET /v1/pulse/runs/:id', async () => {
    const runId = 'd4c3b2a1-0000-0000-0000-111111111111';
    const responseBody = { id: runId, status: 'success', phases: [] };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.pulse.getRun(runId);

    expect(result.id).toBe(runId);
    expect(result.status).toBe('success');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain(`/v1/pulse/runs/${runId}`);

    globalThis.fetch = originalFetch;
  });

  it('triggerRun posts trigger_type to /v1/pulse/trigger', async () => {
    const responseBody = { id: 'run-001', status: 'pending', trigger_type: 'manual' };
    mockFetch(202, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.pulse.triggerRun('manual');

    expect(result.status).toBe('pending');
    expect(result.trigger_type).toBe('manual');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/pulse/trigger');
    const body = JSON.parse(opts.body as string);
    expect(body.trigger_type).toBe('manual');

    globalThis.fetch = originalFetch;
  });

  it('getMetrics calls GET /v1/pulse/metrics', async () => {
    const responseBody = { build_time_p50_ms: 12000, test_pass_rate: 0.98, deploy_frequency_per_day: 3.5 };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.pulse.getMetrics();

    expect(result.test_pass_rate).toBe(0.98);
    expect(result.build_time_p50_ms).toBe(12000);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/pulse/metrics');
    expect(opts.method).toBe('GET');

    globalThis.fetch = originalFetch;
  });

  it('getMetrics passes time-range params', async () => {
    mockFetch(200, { build_time_p50_ms: 0 });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.pulse.getMetrics({ from: '2026-03-01T00:00:00Z', to: '2026-03-25T00:00:00Z' });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('from=');
    expect(url).toContain('to=');

    globalThis.fetch = originalFetch;
  });

  it('getBottlenecks calls GET /v1/pulse/bottlenecks', async () => {
    const responseBody = {
      bottlenecks: [{ phase: 'build', score: 0.87, description: 'slow build' }],
      total: 1,
    };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.pulse.getBottlenecks();

    expect(result.total).toBe(1);
    expect(result.bottlenecks[0].phase).toBe('build');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/pulse/bottlenecks');

    globalThis.fetch = originalFetch;
  });

  it('getBottlenecks passes min_score and limit params', async () => {
    mockFetch(200, { bottlenecks: [], total: 0 });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.pulse.getBottlenecks({ min_score: 0.5, limit: 10 });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('min_score=0.5');
    expect(url).toContain('limit=10');

    globalThis.fetch = originalFetch;
  });

  it('getStatus calls GET /v1/pulse/status', async () => {
    const responseBody = { healthy: true, active_runs: 2, queue_depth: 0 };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.pulse.getStatus();

    expect(result.healthy).toBe(true);
    expect(result.active_runs).toBe(2);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/pulse/status');

    globalThis.fetch = originalFetch;
  });

  it('getAiBrief calls GET /v1/pulse/ai-brief', async () => {
    const responseBody = {
      summary: 'Pipeline healthy. Build times up 12%.',
      recommendations: ['Consider caching test dependencies'],
    };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.pulse.getAiBrief();

    expect(result.summary).toContain('Pipeline healthy');
    expect(Array.isArray(result.recommendations)).toBe(true);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/pulse/ai-brief');

    globalThis.fetch = originalFetch;
  });
});
