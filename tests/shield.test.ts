import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../src/errors.js';
import type { AgentSession, ScanResult } from '../src/models.js';

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

describe('ShieldApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('client.shield is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.shield).toBeDefined();
  });

  // ── registerAgent ───────────────────────────────────────────────

  it('registerAgent sends POST to /v1/shield/register', async () => {
    const session: AgentSession = {
      sessionId: 'shield-sess-1',
      agentId: 'agent-1',
      agentType: 'coding',
      expiresAt: '2026-12-31',
    };
    mockFetch(200, session);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.shield.registerAgent({
      agentId: 'agent-1',
      agentType: 'coding',
      sessionTtlSecs: 7200,
    });

    expect(result.sessionId).toBe('shield-sess-1');
    expect(result.agentId).toBe('agent-1');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/shield/register');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      agentId: 'agent-1',
      agentType: 'coding',
      sessionTtlSecs: 7200,
    });
  });

  // ── scan ────────────────────────────────────────────────────────

  it('scan sends POST to /v1/shield/scan with operation', async () => {
    const scanResult: ScanResult = {
      allowed: true,
      riskScore: 0.05,
      findings: [],
      recommendedActions: [],
    };
    mockFetch(200, scanResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.shield.scan({
      agentId: 'agent-1',
      sessionId: 'sess-1',
      operation: { name: 'Bash', input: { command: 'ls -la' } },
    });

    expect(result.allowed).toBe(true);
    expect(result.riskScore).toBe(0.05);
    expect(result.findings).toEqual([]);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/shield/scan');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.agentId).toBe('agent-1');
    expect(body.operation.name).toBe('Bash');
  });

  it('scan returns findings when operation is risky', async () => {
    const scanResult: ScanResult = {
      allowed: false,
      riskScore: 0.95,
      findings: ['Destructive file operation detected'],
      recommendedActions: ['Review before allowing'],
    };
    mockFetch(200, scanResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.shield.scan({
      agentId: 'agent-1',
      sessionId: 'sess-1',
      operation: { name: 'Bash', input: { command: 'rm -rf /' } },
    });

    expect(result.allowed).toBe(false);
    expect(result.riskScore).toBe(0.95);
    expect(result.findings).toHaveLength(1);
    expect(result.recommendedActions).toHaveLength(1);
  });

  it('scan includes optional context', async () => {
    mockFetch(200, { allowed: true, riskScore: 0.0, findings: [], recommendedActions: [] });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.shield.scan({
      agentId: 'agent-1',
      sessionId: 'sess-1',
      operation: { name: 'Read', input: { path: '/tmp/test' } },
      context: { sessionId: 'sess-1', agentId: 'agent-1', timestamp: '2026-03-25T12:00:00Z' },
    });

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.context.timestamp).toBe('2026-03-25T12:00:00Z');
  });

  // ── getScanHistory ──────────────────────────────────────────────

  it('getScanHistory sends GET to /v1/shield/sessions/:id/scans', async () => {
    const history: ScanResult[] = [
      { allowed: true, riskScore: 0.01, findings: [], recommendedActions: [] },
      { allowed: false, riskScore: 0.8, findings: ['suspicious'], recommendedActions: ['block'] },
    ];
    mockFetch(200, history);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.shield.getScanHistory('sess-1');

    expect(result).toHaveLength(2);
    expect(result[0].allowed).toBe(true);
    expect(result[1].allowed).toBe(false);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/shield/sessions/sess-1/scans');
    expect(opts.method).toBe('GET');
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Invalid API key' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(
      client.shield.scan({
        agentId: 'a1',
        sessionId: 's1',
        operation: { name: 'Bash', input: {} },
      }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.shield.getScanHistory('s1')).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Session not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.shield.getScanHistory('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Too many requests' }, { 'retry-after': '20' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.shield.scan({
        agentId: 'a1',
        sessionId: 's1',
        operation: { name: 'Bash', input: {} },
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(20000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(
      client.shield.registerAgent({ agentId: 'a1', agentType: 'test', sessionTtlSecs: 60 }),
    ).rejects.toThrow(ServerError);
  });
});
