import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../src/errors.js';
import type { AgentSession } from '../src/models.js';

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

describe('AgentsApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('client.agents is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.agents).toBeDefined();
  });

  // ── register ────────────────────────────────────────────────────

  it('register sends POST to /v1/agents/register', async () => {
    const session: AgentSession = {
      sessionId: 'sess-1',
      agentId: 'agent-1',
      agentType: 'coding',
      expiresAt: '2026-12-31',
    };
    mockFetch(200, session);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.agents.register({
      agentId: 'agent-1',
      agentType: 'coding',
      sessionTtlSecs: 3600,
    });

    expect(result.sessionId).toBe('sess-1');
    expect(result.agentId).toBe('agent-1');
    expect(result.agentType).toBe('coding');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/agents/register');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      agentId: 'agent-1',
      agentType: 'coding',
      sessionTtlSecs: 3600,
    });
  });

  // ── getSession ──────────────────────────────────────────────────

  it('getSession sends GET to /v1/agents/sessions/:id', async () => {
    const session: AgentSession = {
      sessionId: 'sess-2',
      agentId: 'agent-2',
      agentType: 'review',
      expiresAt: '2026-06-30',
    };
    mockFetch(200, session);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.agents.getSession('sess-2');

    expect(result.sessionId).toBe('sess-2');
    expect(result.agentType).toBe('review');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/agents/sessions/sess-2');
    expect(opts.method).toBe('GET');
  });

  // ── listSessions ────────────────────────────────────────────────

  it('listSessions sends GET to /v1/agents/:agentId/sessions', async () => {
    const sessions: AgentSession[] = [
      { sessionId: 's1', agentId: 'agent-3', agentType: 'coding', expiresAt: '2026-12-31' },
      { sessionId: 's2', agentId: 'agent-3', agentType: 'coding', expiresAt: '2026-12-31' },
    ];
    mockFetch(200, sessions);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.agents.listSessions('agent-3');

    expect(result).toHaveLength(2);
    expect(result[0].sessionId).toBe('s1');
    expect(result[1].sessionId).toBe('s2');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/agents/agent-3/sessions');
    expect(opts.method).toBe('GET');
  });

  // ── terminateSession ────────────────────────────────────────────

  it('terminateSession sends DELETE to /v1/agents/sessions/:id', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.agents.terminateSession('sess-1');

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/agents/sessions/sess-1');
    expect(opts.method).toBe('DELETE');
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Unauthorized' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.agents.getSession('s1')).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.agents.terminateSession('s1')).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Session not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.agents.getSession('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Too many requests' }, { 'retry-after': '15' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.agents.listSessions('agent-1');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(15000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.agents.register({ agentId: 'a1', agentType: 'test', sessionTtlSecs: 60 })).rejects.toThrow(
      ServerError,
    );
  });
});
