import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../src/errors.js';
import type { TokenResponse, IdentityTokenResponse } from '../src/models.js';

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

describe('AuthApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── createToken ─────────────────────────────────────────────────

  it('createToken sends POST to /v1/auth/token', async () => {
    const responseBody: TokenResponse = { token: 'tok-abc', expiresAt: '2026-12-31', scopes: ['read', 'write'] };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.auth.createToken({ agentId: 'agent-1', scopes: ['read', 'write'] });

    expect(result.token).toBe('tok-abc');
    expect(result.expiresAt).toBe('2026-12-31');
    expect(result.scopes).toEqual(['read', 'write']);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/auth/token');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(opts.body)).toEqual({ agentId: 'agent-1', scopes: ['read', 'write'] });
  });

  it('createToken includes optional ttlSecs', async () => {
    mockFetch(200, { token: 'tok-1', expiresAt: '2026-12-31', scopes: ['read'] });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.auth.createToken({ agentId: 'a1', scopes: ['read'], ttlSecs: 3600 });

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.ttlSecs).toBe(3600);
  });

  // ── revokeToken ─────────────────────────────────────────────────

  it('revokeToken sends POST to /v1/auth/token/revoke', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.auth.revokeToken('tok-to-revoke');

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/auth/token/revoke');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ token: 'tok-to-revoke' });
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Invalid API key' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.auth.createToken({ agentId: 'a1', scopes: [] })).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.auth.createToken({ agentId: 'a1', scopes: [] })).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.auth.revokeToken('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429 with retry-after', async () => {
    mockFetch(429, { message: 'Too many requests' }, { 'retry-after': '60' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.auth.createToken({ agentId: 'a1', scopes: [] });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(60000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.auth.createToken({ agentId: 'a1', scopes: [] })).rejects.toThrow(ServerError);
  });
});

describe('IdentityApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── issue ───────────────────────────────────────────────────────

  it('issue sends POST to /v1/identity/issue', async () => {
    const responseBody: IdentityTokenResponse = {
      token: 'jwt-identity-tok',
      expiresAt: '2026-12-31',
      claims: { sub: 'agent-1', agentId: 'agent-1', capabilities: ['tool:bash'], iat: 1, exp: 2 },
    };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.identity.issue({ agentId: 'agent-1', capabilities: ['tool:bash'], ttlSecs: 7200 });

    expect(result.token).toBe('jwt-identity-tok');
    expect(result.claims.agentId).toBe('agent-1');
    expect(result.claims.capabilities).toEqual(['tool:bash']);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/identity/issue');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ agentId: 'agent-1', capabilities: ['tool:bash'], ttlSecs: 7200 });
  });

  // ── verify ──────────────────────────────────────────────────────

  it('verify sends POST to /v1/identity/verify', async () => {
    const responseBody: IdentityTokenResponse = {
      token: 'jwt-identity-tok',
      expiresAt: '2026-12-31',
      claims: { sub: 'agent-2', agentId: 'agent-2', capabilities: ['tool:read'], iat: 10, exp: 20 },
    };
    mockFetch(200, responseBody);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.identity.verify('jwt-identity-tok');

    expect(result.claims.agentId).toBe('agent-2');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/identity/verify');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ token: 'jwt-identity-tok' });
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Unauthorized' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.identity.issue({ agentId: 'a1', capabilities: [], ttlSecs: 60 })).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.identity.verify('bad-token')).rejects.toThrow(AuthorizationError);
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.identity.verify('tok')).rejects.toThrow(ServerError);
  });
});
