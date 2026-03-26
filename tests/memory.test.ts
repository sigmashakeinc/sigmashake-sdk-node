import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
} from '../src/errors.js';
import type { MemoryEntry } from '../src/models.js';

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

describe('MemoryApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('client.memory is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.memory).toBeDefined();
  });

  // ── store ───────────────────────────────────────────────────────

  it('store sends POST to /v1/memory', async () => {
    const entry: MemoryEntry = {
      key: 'user-pref',
      value: '{"theme":"dark"}',
      tags: ['session-1', 'prefs'],
      createdAt: '2026-03-25',
      updatedAt: '2026-03-25',
    };
    mockFetch(200, entry);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.memory.store({ key: 'user-pref', value: '{"theme":"dark"}', tags: ['session-1', 'prefs'] });

    expect(result.key).toBe('user-pref');
    expect(result.value).toBe('{"theme":"dark"}');
    expect(result.tags).toEqual(['session-1', 'prefs']);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/memory');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.key).toBe('user-pref');
    expect(body.tags).toHaveLength(2);
  });

  it('store without optional tags', async () => {
    const entry: MemoryEntry = { key: 'k1', value: 'v1', tags: [], createdAt: '', updatedAt: '' };
    mockFetch(200, entry);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.memory.store({ key: 'k1', value: 'v1' });

    expect(result.key).toBe('k1');
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.tags).toBeUndefined();
  });

  // ── get ─────────────────────────────────────────────────────────

  it('get sends GET to /v1/memory/:key', async () => {
    const entry: MemoryEntry = { key: 'context', value: 'some data', tags: ['t1'], createdAt: '', updatedAt: '' };
    mockFetch(200, entry);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.memory.get('context');

    expect(result.key).toBe('context');
    expect(result.value).toBe('some data');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/memory/context');
    expect(opts.method).toBe('GET');
  });

  it('get encodes special characters in key', async () => {
    mockFetch(200, { key: 'a/b', value: '', tags: [], createdAt: '', updatedAt: '' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.memory.get('a/b');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/memory/a%2Fb');
  });

  // ── delete ──────────────────────────────────────────────────────

  it('delete sends DELETE to /v1/memory/:key', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.memory.delete('old-key');

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/memory/old-key');
    expect(opts.method).toBe('DELETE');
  });

  it('delete encodes special characters', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.memory.delete('key with spaces');

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/memory/key%20with%20spaces');
  });

  // ── recall ──────────────────────────────────────────────────────

  it('recall sends POST to /v1/memory/recall', async () => {
    const entries: MemoryEntry[] = [
      { key: 'k1', value: 'v1', tags: ['session-1'], createdAt: '', updatedAt: '' },
      { key: 'k2', value: 'v2', tags: ['session-1'], createdAt: '', updatedAt: '' },
    ];
    mockFetch(200, entries);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.memory.recall({ tags: ['session-1'], limit: 10 });

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('k1');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/memory/recall');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.tags).toEqual(['session-1']);
    expect(body.limit).toBe(10);
  });

  it('recall with prefix filter', async () => {
    mockFetch(200, []);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.memory.recall({ prefix: 'user-' });

    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const body = JSON.parse(opts.body);
    expect(body.prefix).toBe('user-');
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Unauthorized' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.memory.get('key')).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.memory.delete('key')).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Key not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.memory.get('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Too many requests' }, { 'retry-after': '25' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.memory.store({ key: 'k', value: 'v' });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(25000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.memory.recall({ tags: [] })).rejects.toThrow(ServerError);
  });
});
