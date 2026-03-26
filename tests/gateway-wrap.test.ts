import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
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

function mockFetchSequence(responses: Array<{ status: number; body: unknown }>) {
  let callIndex = 0;
  globalThis.fetch = vi.fn().mockImplementation(() => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return Promise.resolve({
      ok: resp.status >= 200 && resp.status < 300,
      status: resp.status,
      headers: new Headers(),
      json: () => Promise.resolve(resp.body),
      text: () => Promise.resolve(JSON.stringify(resp.body)),
    });
  });
}

describe('GatewayApi.wrap', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('wrap() calls interceptPre and interceptPost around the function', async () => {
    const interceptResult: InterceptResult = { allowed: true, modified: false };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    function myTool(x: number): number {
      return x * 2;
    }

    const wrapped = client.gateway.wrap(myTool, { agentId: 'test-agent' });
    const result = await wrapped(5);

    expect(result).toBe(10);
    // Should have called interceptPre and interceptPost
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(2);
  });

  it('wrap() is non-fatal when gateway is down', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    function myTool(x: number): number {
      return x + 1;
    }

    const wrapped = client.gateway.wrap(myTool);
    const result = await wrapped(10);
    expect(result).toBe(11);
  });

  it('wrap() preserves function name', () => {
    mockFetch(200, { allowed: true, modified: false });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    function mySpecialTool(): void {
      // noop
    }

    const wrapped = client.gateway.wrap(mySpecialTool);
    expect(wrapped.name).toBe('mySpecialTool');
  });

  it('wrap() sends correct input shape to interceptPre', async () => {
    const interceptResult: InterceptResult = { allowed: true, modified: false };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    function search(query: string, limit: number): { results: string[] } {
      return { results: [query] };
    }

    const wrapped = client.gateway.wrap(search, { agentId: 'agent-1' });
    await wrapped('hello', 5);

    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const preBody = JSON.parse(calls[0][1].body);
    expect(preBody.name).toBe('search');
    expect(preBody.input.args).toEqual(['hello', 5]);
  });

  it('wrap() works with async functions', async () => {
    const interceptResult: InterceptResult = { allowed: true, modified: false };
    mockFetch(200, interceptResult);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    async function asyncTool(x: number): Promise<number> {
      return x * 3;
    }

    const wrapped = client.gateway.wrap(asyncTool);
    const result = await wrapped(4);
    expect(result).toBe(12);
  });
});

describe('SigmaShake.ping', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('ping() returns status ok with latency', async () => {
    mockFetch(200, { status: 'ok' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.ping();
    expect(result.status).toBe('ok');
    expect(typeof result.latencyMs).toBe('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('ping() throws on API failure', async () => {
    mockFetch(500, { message: 'Server error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.ping()).rejects.toThrow();
  });
});
