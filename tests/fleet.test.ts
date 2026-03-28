import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SigmaShake } from '../src/client.js';
import {
  AgentStatus,
  AgentPresence,
  FleetCommandType,
  FleetMessageType,
} from '../src/models.js';
import { FleetConnection } from '../src/fleet-ws.js';

// ── REST API Tests ─────────────────────────────────────────────────

describe('Fleet REST API', () => {
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

  it('client.fleet is defined', () => {
    const client = new SigmaShake({ apiKey: 'sk-test' });
    expect(client.fleet).toBeDefined();
  });

  it('fleet.getStatus calls GET /v1/fleet/status', async () => {
    const body = { totalAgents: 100, onlineAgents: 90, degradedAgents: 5, offlineAgents: 5, shardCount: 3 };
    mockFetch(200, body);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.fleet.getStatus();

    expect(result.totalAgents).toBe(100);
    expect(result.onlineAgents).toBe(90);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/fleet/status');
    expect(opts.method).toBe('GET');

    globalThis.fetch = originalFetch;
  });

  it('fleet.listAgents calls GET /v1/fleet/agents with query params', async () => {
    const body = { agents: [], total: 0, hasMore: false };
    mockFetch(200, body);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.fleet.listAgents({ status: 'active', limit: 10, offset: 0 });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/fleet/agents?');
    expect(url).toContain('status=active');
    expect(url).toContain('limit=10');

    globalThis.fetch = originalFetch;
  });

  it('fleet.listAgents works without params', async () => {
    mockFetch(200, { agents: [], total: 0, hasMore: false });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.fleet.listAgents();

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/fleet/agents');

    globalThis.fetch = originalFetch;
  });

  it('fleet.getAgent calls GET /v1/fleet/agents/:id', async () => {
    const body = {
      agentId: 'agent-1',
      status: 'active',
      presence: 'online',
      version: '2.1.0',
      capabilities: ['tool:bash'],
      connectedAt: '2026-03-15T00:00:00Z',
      lastSeen: '2026-03-15T00:00:05Z',
      lastHeartbeat: '2026-03-15T00:00:05Z',
      shardId: 'fleet-t1-0',
      metadata: {},
    };
    mockFetch(200, body);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.fleet.getAgent('agent-1');

    expect(result.agentId).toBe('agent-1');
    expect(result.status).toBe('active');
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/fleet/agents/agent-1');

    globalThis.fetch = originalFetch;
  });

  it('fleet.sendCommand posts to /v1/fleet/agents/:id/command', async () => {
    const ack = { commandId: 'cmd-1', agentId: 'agent-1', success: true, timestamp: '2026-03-15T00:00:00Z' };
    mockFetch(200, ack);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.fleet.sendCommand('agent-1', {
      commandType: 'restart',
    });

    expect(result.commandId).toBe('cmd-1');
    expect(result.success).toBe(true);
    const [url, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/fleet/agents/agent-1/command');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ commandType: 'restart' });

    globalThis.fetch = originalFetch;
  });

  it('fleet.broadcast posts to /v1/fleet/broadcast', async () => {
    mockFetch(200, { commandId: 'cmd-2', targeted: 50, acknowledged: 0 });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.fleet.broadcast({ commandType: 'pause' });

    expect(result.targeted).toBe(50);
    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('https://api.sigmashake.com/v1/fleet/broadcast');

    globalThis.fetch = originalFetch;
  });

  it('fleet.getAgentMetrics includes range param', async () => {
    mockFetch(200, { metrics: [] });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.fleet.getAgentMetrics('agent-1', { range: '24h' });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/v1/fleet/agents/agent-1/metrics?range=24h');

    globalThis.fetch = originalFetch;
  });

  it('fleet.getAgentCommands includes pagination params', async () => {
    mockFetch(200, { commands: [], total: 0, hasMore: false });
    const client = new SigmaShake({ apiKey: 'sk-test' });

    await client.fleet.getAgentCommands('agent-1', { limit: 5, offset: 10 });

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('limit=5');
    expect(url).toContain('offset=10');

    globalThis.fetch = originalFetch;
  });

  it('fleet.getConfig calls GET /v1/fleet/config', async () => {
    const config = {
      heartbeatIntervalSecs: 60,
      metricsIntervalSecs: 60,
      maxAgents: 1000,
      alertThresholds: { missedHeartbeats: 3, errorRatePct: 5 },
      autoScaleEnabled: true,
    };
    mockFetch(200, config);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.fleet.getConfig();

    expect(result.heartbeatIntervalSecs).toBe(60);
    expect(result.autoScaleEnabled).toBe(true);

    globalThis.fetch = originalFetch;
  });

  it('fleet.updateConfig calls PUT /v1/fleet/config', async () => {
    const config = {
      heartbeatIntervalSecs: 15,
      metricsIntervalSecs: 30,
      maxAgents: 2000,
      alertThresholds: { missedHeartbeats: 5, errorRatePct: 10 },
      autoScaleEnabled: false,
    };
    mockFetch(200, config);
    const client = new SigmaShake({ apiKey: 'sk-test' });

    const result = await client.fleet.updateConfig({ heartbeatIntervalSecs: 15 });

    expect(result.heartbeatIntervalSecs).toBe(15);
    const [, opts] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(opts.method).toBe('PUT');

    globalThis.fetch = originalFetch;
  });
});

// ── Enum Tests ─────────────────────────────────────────────────────

describe('Fleet enums', () => {
  it('AgentStatus has expected values', () => {
    expect(AgentStatus.Active).toBe('active');
    expect(AgentStatus.Idle).toBe('idle');
    expect(AgentStatus.Busy).toBe('busy');
    expect(AgentStatus.Error).toBe('error');
  });

  it('AgentPresence has expected values', () => {
    expect(AgentPresence.Online).toBe('online');
    expect(AgentPresence.Disconnected).toBe('disconnected');
    expect(AgentPresence.Offline).toBe('offline');
  });

  it('FleetCommandType has 9 variants', () => {
    const values = Object.values(FleetCommandType);
    expect(values).toHaveLength(9);
    expect(values).toContain('restart');
    expect(values).toContain('update_config');
    expect(values).toContain('revoke_credentials');
    expect(values).toContain('inject_tool');
    expect(values).toContain('remove_tool');
    expect(values).toContain('pause');
    expect(values).toContain('resume');
    expect(values).toContain('collect_diagnostics');
    expect(values).toContain('update_version');
  });

  it('FleetMessageType has 10 variants', () => {
    const values = Object.values(FleetMessageType);
    expect(values).toHaveLength(10);
    expect(values).toContain('client_hello');
    expect(values).toContain('server_hello');
    expect(values).toContain('heartbeat');
    expect(values).toContain('command');
  });
});

// ── WebSocket Client Tests ─────────────────────────────────────────

describe('FleetConnection', () => {
  it('constructs with defaults', () => {
    const conn = new FleetConnection({
      url: 'wss://example.com/v1/fleet/ws',
      token: 'jwt-token',
      agentId: 'agent-1',
      version: '1.0.0',
    });
    expect(conn.connected).toBe(false);
    expect(conn.currentSessionId).toBeNull();
  });

  it('close prevents reconnection', async () => {
    const conn = new FleetConnection({
      url: 'wss://example.com/v1/fleet/ws',
      token: 'jwt-token',
      agentId: 'agent-1',
      version: '1.0.0',
    });
    conn.close();
    await expect(conn.connect()).rejects.toThrow('FleetConnection has been closed');
  });

  it('on/off register and remove listeners', () => {
    const conn = new FleetConnection({
      url: 'wss://example.com/v1/fleet/ws',
      token: 'jwt-token',
      agentId: 'agent-1',
      version: '1.0.0',
    });
    const handler = vi.fn();
    conn.on('error', handler);
    conn.off('error', handler);
    // No way to test emission without WebSocket, but verify no throw
    expect(true).toBe(true);
  });

  it('setMetricsProvider returns this for chaining', () => {
    const conn = new FleetConnection({
      url: 'wss://example.com/v1/fleet/ws',
      token: 'jwt-token',
      agentId: 'agent-1',
      version: '1.0.0',
    });
    const result = conn.setMetricsProvider(() => ({
      cpuPct: 50,
      memoryMb: 512,
      llmTokensIn: 0,
      llmTokensOut: 0,
      llmCostUsd: 0,
      activeTools: 0,
      activeSessions: 0,
    }));
    expect(result).toBe(conn);
  });
});
