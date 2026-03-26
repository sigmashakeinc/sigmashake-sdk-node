import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../src/errors.js';
import type { InterceptResult } from '../src/models.js';

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

describe('GatewayApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('client.gateway is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.gateway).toBeDefined();
  });

  // ── interceptPre ────────────────────────────────────────────────

  it('interceptPre sends POST to /v1/gateway/intercept/pre', async () => {
    const interceptResult: InterceptResult = { allowed: true, modified: false };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.gateway.interceptPre({
      name: 'Bash',
      input: { command: 'echo hello' },
      sessionId: 'sess-1',
      agentId: 'agent-1',
    });

    expect(result.allowed).toBe(true);
    expect(result.modified).toBe(false);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/gateway/intercept/pre');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('Bash');
    expect(body.input.command).toBe('echo hello');
    expect(body.sessionId).toBe('sess-1');
    expect(body.agentId).toBe('agent-1');
  });

  it('interceptPre returns modified tool call when input is rewritten', async () => {
    const interceptResult: InterceptResult = {
      allowed: true,
      modified: true,
      toolCall: {
        name: 'Bash',
        input: { command: 'echo hello (sanitized)' },
        sessionId: 'sess-1',
        agentId: 'agent-1',
      },
      reason: 'Input sanitized',
    };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.gateway.interceptPre({
      name: 'Bash',
      input: { command: 'echo <script>alert(1)</script>' },
      sessionId: 'sess-1',
      agentId: 'agent-1',
    });

    expect(result.modified).toBe(true);
    expect(result.toolCall?.input.command).toBe('echo hello (sanitized)');
    expect(result.reason).toBe('Input sanitized');
  });

  it('interceptPre returns blocked when operation is denied', async () => {
    const interceptResult: InterceptResult = {
      allowed: false,
      modified: false,
      reason: 'Destructive operation blocked',
    };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.gateway.interceptPre({
      name: 'Bash',
      input: { command: 'rm -rf /' },
      sessionId: 'sess-1',
      agentId: 'agent-1',
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Destructive operation blocked');
  });

  // ── interceptPost ───────────────────────────────────────────────

  it('interceptPost sends POST to /v1/gateway/intercept/post', async () => {
    const interceptResult: InterceptResult = { allowed: true, modified: false };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.gateway.interceptPost({
      name: 'Bash',
      output: { stdout: 'hello', exitCode: 0 },
      sessionId: 'sess-1',
      agentId: 'agent-1',
      durationMs: 150,
    });

    expect(result.allowed).toBe(true);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/gateway/intercept/post');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.name).toBe('Bash');
    expect(body.output.exitCode).toBe(0);
    expect(body.durationMs).toBe(150);
  });

  it('interceptPost detects sensitive output', async () => {
    const interceptResult: InterceptResult = {
      allowed: false,
      modified: false,
      reason: 'Output contains sensitive data',
    };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.gateway.interceptPost({
      name: 'Bash',
      output: { stdout: 'API_KEY=sk-secret123' },
      sessionId: 'sess-1',
      agentId: 'agent-1',
      durationMs: 50,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('Output contains sensitive data');
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Invalid API key' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(
      client.gateway.interceptPre({
        name: 'Bash',
        input: {},
        sessionId: 's1',
        agentId: 'a1',
      }),
    ).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(
      client.gateway.interceptPost({
        name: 'Bash',
        output: {},
        sessionId: 's1',
        agentId: 'a1',
        durationMs: 0,
      }),
    ).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(
      client.gateway.interceptPre({
        name: 'Unknown',
        input: {},
        sessionId: 's1',
        agentId: 'a1',
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Rate limited' }, { 'retry-after': '10' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.gateway.interceptPre({
        name: 'Bash',
        input: {},
        sessionId: 's1',
        agentId: 'a1',
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(10000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(
      client.gateway.interceptPre({
        name: 'Bash',
        input: {},
        sessionId: 's1',
        agentId: 'a1',
      }),
    ).rejects.toThrow(ServerError);
  });
});
