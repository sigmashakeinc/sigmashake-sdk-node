import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../src/errors.js';
import type { IdentityTokenResponse } from '../src/models.js';

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

describe('IdentityApi (dedicated)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('client.identity is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.identity).toBeDefined();
  });

  // ── issue ───────────────────────────────────────────────────────

  it('issue sends correct request body', async () => {
    const responseBody: IdentityTokenResponse = {
      token: 'id-tok-1',
      expiresAt: '2026-06-01',
      claims: { sub: 'agent-x', agentId: 'agent-x', capabilities: ['tool:bash', 'tool:read'], iat: 100, exp: 200 },
    };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.identity.issue({
      agentId: 'agent-x',
      capabilities: ['tool:bash', 'tool:read'],
      ttlSecs: 3600,
    });

    expect(result.token).toBe('id-tok-1');
    expect(result.claims.sub).toBe('agent-x');
    expect(result.claims.capabilities).toHaveLength(2);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/identity/issue');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.agentId).toBe('agent-x');
    expect(body.ttlSecs).toBe(3600);
  });

  // ── verify ──────────────────────────────────────────────────────

  it('verify returns claims for valid token', async () => {
    const responseBody: IdentityTokenResponse = {
      token: 'valid-jwt',
      expiresAt: '2026-06-01',
      claims: { sub: 'agent-y', agentId: 'agent-y', capabilities: [], iat: 50, exp: 100 },
    };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.identity.verify('valid-jwt');

    expect(result.token).toBe('valid-jwt');
    expect(result.expiresAt).toBe('2026-06-01');
    expect(result.claims.iat).toBe(50);
    expect(result.claims.exp).toBe(100);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/identity/verify');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ token: 'valid-jwt' });
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Invalid credentials' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.identity.issue({ agentId: 'a1', capabilities: [], ttlSecs: 60 })).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Insufficient permissions' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.identity.verify('tok')).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Token not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.identity.verify('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Slow down' }, { 'retry-after': '10' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.identity.issue({ agentId: 'a1', capabilities: [], ttlSecs: 60 });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(10000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal server error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.identity.verify('tok')).rejects.toThrow(ServerError);
  });
});
