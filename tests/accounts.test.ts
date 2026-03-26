import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '../src/errors.js';
import { Tier, MemberRole, SubscriptionStatus } from '../src/models.js';
import type { Account, Subscription, Seat, TenantUsage } from '../src/models.js';

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

describe('AccountsApi', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // ── create ──────────────────────────────────────────────────────

  it('create sends POST to /v1/accounts', async () => {
    const account: Account = { id: 'acc-new', name: 'New Org', tier: Tier.Pro, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    mockFetch(200, account);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.create({ name: 'New Org', tier: Tier.Pro });

    expect(result.id).toBe('acc-new');
    expect(result.name).toBe('New Org');
    expect(result.tier).toBe('pro');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ name: 'New Org', tier: 'pro' });
  });

  // ── get ─────────────────────────────────────────────────────────

  it('get sends GET to /v1/accounts/:id', async () => {
    const account: Account = { id: 'acc-1', name: 'Test Org', tier: Tier.Enterprise, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
    mockFetch(200, account);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.get('acc-1');

    expect(result.id).toBe('acc-1');
    expect(result.tier).toBe('enterprise');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1');
    expect(opts.method).toBe('GET');
  });

  // ── list ────────────────────────────────────────────────────────

  it('list sends GET with default pagination', async () => {
    mockFetch(200, []);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.list();

    expect(result).toEqual([]);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts?limit=50&offset=0');
  });

  it('list sends GET with custom pagination', async () => {
    mockFetch(200, []);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.accounts.list(10, 20);

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts?limit=10&offset=20');
  });

  // ── getSubscription ─────────────────────────────────────────────

  it('getSubscription sends GET to /v1/accounts/:id/subscription', async () => {
    const sub: Subscription = {
      id: 'sub-1',
      accountId: 'acc-1',
      tier: Tier.Pro,
      status: SubscriptionStatus.Active,
      currentPeriodStart: '2026-01-01',
      currentPeriodEnd: '2026-02-01',
    };
    mockFetch(200, sub);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.getSubscription('acc-1');

    expect(result.id).toBe('sub-1');
    expect(result.status).toBe('active');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1/subscription');
  });

  // ── updateSubscription ──────────────────────────────────────────

  it('updateSubscription sends PATCH to /v1/accounts/:id/subscription', async () => {
    const sub: Subscription = {
      id: 'sub-1',
      accountId: 'acc-1',
      tier: Tier.Enterprise,
      status: SubscriptionStatus.Active,
      currentPeriodStart: '2026-01-01',
      currentPeriodEnd: '2026-02-01',
    };
    mockFetch(200, sub);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.updateSubscription('acc-1', { tier: Tier.Enterprise });

    expect(result.tier).toBe('enterprise');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1/subscription');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ tier: 'enterprise' });
  });

  // ── listSeats ───────────────────────────────────────────────────

  it('listSeats sends GET to /v1/accounts/:id/seats', async () => {
    const seats: Seat[] = [
      { id: 'seat-1', accountId: 'acc-1', userId: 'u1', role: MemberRole.Owner, createdAt: '2026-01-01' },
    ];
    mockFetch(200, seats);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.listSeats('acc-1');

    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('owner');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1/seats');
  });

  // ── addSeat ─────────────────────────────────────────────────────

  it('addSeat sends POST to /v1/accounts/:id/seats', async () => {
    const seat: Seat = { id: 'seat-2', accountId: 'acc-1', userId: 'u2', role: MemberRole.Member, createdAt: '2026-01-01' };
    mockFetch(200, seat);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.addSeat('acc-1', { userId: 'u2', role: MemberRole.Member });

    expect(result.id).toBe('seat-2');
    expect(result.role).toBe('member');
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1/seats');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ userId: 'u2', role: 'member' });
  });

  // ── removeSeat ──────────────────────────────────────────────────

  it('removeSeat sends DELETE to /v1/accounts/:id/seats/:seatId', async () => {
    mockFetch(204, undefined);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.accounts.removeSeat('acc-1', 'seat-2');

    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1/seats/seat-2');
    expect(opts.method).toBe('DELETE');
  });

  // ── getUsage ────────────────────────────────────────────────────

  it('getUsage sends GET to /v1/accounts/:id/usage', async () => {
    const usage: TenantUsage = {
      accountId: 'acc-1',
      period: '2026-03',
      apiCalls: 15000,
      storageBytes: 1024000,
      agentSessions: 42,
      scansPerformed: 300,
    };
    mockFetch(200, usage);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.accounts.getUsage('acc-1');

    expect(result.apiCalls).toBe(15000);
    expect(result.agentSessions).toBe(42);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/accounts/acc-1/usage');
  });

  // ── Error handling ──────────────────────────────────────────────

  it('throws AuthenticationError on 401', async () => {
    mockFetch(401, { message: 'Invalid API key' });
    const client = new SigmaShake({ apiKey: 'sk-bad' });

    await expect(client.accounts.get('acc-1')).rejects.toThrow(AuthenticationError);
  });

  it('throws AuthorizationError on 403', async () => {
    mockFetch(403, { message: 'Forbidden' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.accounts.get('acc-1')).rejects.toThrow(AuthorizationError);
  });

  it('throws NotFoundError on 404', async () => {
    mockFetch(404, { message: 'Account not found' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.accounts.get('nonexistent')).rejects.toThrow(NotFoundError);
  });

  it('throws ValidationError on 400', async () => {
    mockFetch(400, { message: 'Invalid name' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.accounts.create({ name: '', tier: Tier.Free })).rejects.toThrow(ValidationError);
  });

  it('throws RateLimitError on 429', async () => {
    mockFetch(429, { message: 'Rate limited' }, { 'retry-after': '30' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    try {
      await client.accounts.list();
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimitError);
      expect((err as RateLimitError).retryAfterMs).toBe(30000);
    }
  });

  it('throws ServerError on 500', async () => {
    mockFetch(500, { message: 'Internal error' });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await expect(client.accounts.get('acc-1')).rejects.toThrow(ServerError);
  });
});
