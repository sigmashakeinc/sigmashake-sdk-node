import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  SigmaShakeError,
  errorFromStatus,
} from '../src/errors.js';

describe('SigmaShake client', () => {
  it('throws if apiKey is missing', () => {
    expect(() => new SigmaShake({ apiKey: '' })).toThrow('apiKey is required');
  });

  it('initializes all API namespaces', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.auth).toBeDefined();
    expect(client.identity).toBeDefined();
    expect(client.accounts).toBeDefined();
    expect(client.agents).toBeDefined();
    expect(client.shield).toBeDefined();
    expect(client.documents).toBeDefined();
    expect(client.memory).toBeDefined();
    expect(client.soc).toBeDefined();
    expect(client.gateway).toBeDefined();
    expect(client.db).toBeDefined();
    expect(client.fleet).toBeDefined();
  });

  it('uses default base URL', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    // Verify client constructed without error (base URL is internal)
    expect(client).toBeDefined();
  });

  it('accepts custom base URL', () => {
    const client = new SigmaShake({
      apiKey: 'sk-test',
      baseUrl: 'https://custom.api.com',
    });
    expect(client).toBeDefined();
  });
});

describe('errorFromStatus', () => {
  it('maps 401 to AuthenticationError', () => {
    const err = errorFromStatus(401, 'bad token');
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('authentication_error');
    expect(err.message).toBe('bad token');
  });

  it('maps 403 to AuthorizationError', () => {
    const err = errorFromStatus(403, 'forbidden');
    expect(err).toBeInstanceOf(AuthorizationError);
    expect(err.statusCode).toBe(403);
  });

  it('maps 404 to NotFoundError', () => {
    const err = errorFromStatus(404, 'not found');
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.statusCode).toBe(404);
  });

  it('maps 400 to ValidationError', () => {
    const err = errorFromStatus(400, 'bad request');
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400);
  });

  it('maps 422 to ValidationError', () => {
    const err = errorFromStatus(422, 'unprocessable');
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.statusCode).toBe(400); // ValidationError always uses 400
  });

  it('maps 429 to RateLimitError with retryAfterMs', () => {
    const err = errorFromStatus(429, 'slow down', 5000);
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.statusCode).toBe(429);
    expect((err as RateLimitError).retryAfterMs).toBe(5000);
  });

  it('maps 500 to ServerError', () => {
    const err = errorFromStatus(500, 'oops');
    expect(err).toBeInstanceOf(ServerError);
    expect(err.statusCode).toBe(500);
  });

  it('maps 503 to ServerError', () => {
    const err = errorFromStatus(503, 'unavailable');
    expect(err).toBeInstanceOf(ServerError);
    expect(err.statusCode).toBe(503);
  });

  it('maps unknown status to SigmaShakeError', () => {
    const err = errorFromStatus(418, 'teapot');
    expect(err).toBeInstanceOf(SigmaShakeError);
    expect(err.statusCode).toBe(418);
    expect(err.code).toBe('unknown_error');
  });
});

describe('Error class hierarchy', () => {
  it('all errors extend SigmaShakeError', () => {
    expect(new AuthenticationError()).toBeInstanceOf(SigmaShakeError);
    expect(new AuthorizationError()).toBeInstanceOf(SigmaShakeError);
    expect(new NotFoundError()).toBeInstanceOf(SigmaShakeError);
    expect(new ValidationError()).toBeInstanceOf(SigmaShakeError);
    expect(new RateLimitError()).toBeInstanceOf(SigmaShakeError);
    expect(new ServerError()).toBeInstanceOf(SigmaShakeError);
  });

  it('all errors extend Error', () => {
    expect(new AuthenticationError()).toBeInstanceOf(Error);
    expect(new ServerError()).toBeInstanceOf(Error);
  });
});

// Mock fetch for API call tests
describe('API calls with mock fetch', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(status: number, body: unknown, headers?: Record<string, string>) {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: new Headers(headers),
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  }

  it('auth.createToken sends correct request', async () => {
    mockFetch(200, { token: 'tok-123', expiresAt: '2026-01-01', scopes: ['read'] });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.auth.createToken({ agentId: 'a1', scopes: ['read'] });

    expect(result.token).toBe('tok-123');
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/auth/token');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer sk-test');
    expect(JSON.parse(opts.body)).toEqual({ agentId: 'a1', scopes: ['read'] });

    globalThis.fetch = originalFetch;
  });

  it('accounts.get sends GET request', async () => {
    mockFetch(200, { id: 'acc-1', name: 'Test', tier: 'pro', createdAt: '', updatedAt: '' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.get('acc-1');

    expect(result.id).toBe('acc-1');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1');
    expect(opts.method).toBe('GET');

    globalThis.fetch = originalFetch;
  });

  it('shield.scan posts scan request', async () => {
    mockFetch(200, { allowed: true, riskScore: 0.1, findings: [], recommendedActions: [] });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.shield.scan({
      agentId: 'a1',
      sessionId: 's1',
      operation: { name: 'Bash', input: { command: 'ls' } },
    });

    expect(result.allowed).toBe(true);
    expect(result.riskScore).toBe(0.1);

    globalThis.fetch = originalFetch;
  });

  it('memory.store and get work', async () => {
    const entry = { key: 'ctx', value: 'data', tags: ['s1'], createdAt: '', updatedAt: '' };
    mockFetch(200, entry);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const stored = await client.memory.store({ key: 'ctx', value: 'data', tags: ['s1'] });
    expect(stored.key).toBe('ctx');

    globalThis.fetch = originalFetch;
  });

  it('db.query posts query request', async () => {
    mockFetch(200, { columns: ['id', 'data'], rows: [[1, 'a'], [2, 'b']], totalRows: 2 });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.db.query('events', {
      filters: [{ column: 'id', op: 'gt', value: 1 }],
    });

    expect(result.totalRows).toBe(2);
    expect(result.columns).toEqual(['id', 'data']);

    globalThis.fetch = originalFetch;
  });

  it('gateway.interceptPre sends tool call', async () => {
    mockFetch(200, { allowed: true, modified: false });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.gateway.interceptPre({
      name: 'Bash',
      input: { command: 'ls' },
      sessionId: 's1',
      agentId: 'a1',
    });

    expect(result.allowed).toBe(true);

    globalThis.fetch = originalFetch;
  });

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Invalid API key' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.accounts.get('acc-1')).rejects.toThrow(AuthenticationError);

    globalThis.fetch = originalFetch;
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.accounts.get('nonexistent')).rejects.toThrow(NotFoundError);

    globalThis.fetch = originalFetch;
  });

  it('throws RateLimitError on 429 with retry-after header', async () => {
    mockFetch(429, { message: 'Too many requests' }, { 'retry-after': '30' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.accounts.get('acc-1');
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(30000);
    }

    globalThis.fetch = originalFetch;
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.soc.getStatus()).rejects.toThrow(ServerError);

    globalThis.fetch = originalFetch;
  });
});
