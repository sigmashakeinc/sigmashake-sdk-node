import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Claude Agent SDK before importing
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  betaZodTool: vi.fn((opts: Record<string, unknown>) => ({
    name: opts.name,
    description: opts.description,
    execute: opts.execute,
  })),
  createSdkMcpServer: vi.fn(
    (name: string, opts: Record<string, unknown>) => ({ name, tools: opts.tools }),
  ),
  query: vi.fn(async function* () {
    yield { type: 'result', result: 'done' };
  }),
}));

vi.mock('zod', () => {
  const z = {
    string: () => z,
    number: () => z,
    boolean: () => z,
    array: (_s?: unknown) => z,
    record: (_s?: unknown) => z,
    object: (shape?: Record<string, unknown>) => ({ ...z, _shape: shape }),
    unknown: () => z,
    optional: () => z,
    default: (_v?: unknown) => z,
  };
  return { z };
});

import type { SigmaShake } from '../src/client.js';

function mockClient(): SigmaShake {
  return {
    documents: { search: vi.fn().mockResolvedValue({ results: [], total: 0 }) },
    db: {
      query: vi.fn().mockResolvedValue({ columns: [], rows: [], total: 0 }),
      vectorSearch: vi.fn().mockResolvedValue({ columns: [], rows: [], total: 0 }),
      scroll: vi.fn().mockResolvedValue({ columns: [], rows: [], has_more: false }),
      insert: vi.fn().mockResolvedValue(undefined),
    },
    memory: {
      store: vi.fn().mockResolvedValue({ key: 'k', value: 'v' }),
      get: vi.fn().mockResolvedValue({ key: 'k', value: 'v' }),
      delete: vi.fn().mockResolvedValue(undefined),
      recall: vi.fn().mockResolvedValue([]),
    },
    soc: {
      listAlerts: vi.fn().mockResolvedValue([]),
      getTimeline: vi.fn().mockResolvedValue({ session_id: 's1', events: [] }),
    },
    shield: {
      scan: vi.fn().mockResolvedValue({ allowed: true, risk_score: 0 }),
      registerAgent: vi.fn().mockResolvedValue({ session_id: 's1', agent_id: 'a1' }),
    },
    pulse: {
      getStatus: vi.fn().mockResolvedValue({ healthy: true }),
      getMetrics: vi.fn().mockResolvedValue({}),
      getBottlenecks: vi.fn().mockResolvedValue({ bottlenecks: [], total: 0 }),
      getAiBrief: vi.fn().mockResolvedValue({ summary: 'ok' }),
      getRuns: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getRun: vi.fn().mockResolvedValue({ id: 'r1' }),
      triggerRun: vi.fn().mockResolvedValue({ id: 'r1' }),
      pushEvent: vi.fn().mockResolvedValue({ accepted: 1 }),
    },
    agents: {
      listSessions: vi.fn().mockResolvedValue([]),
      register: vi.fn().mockResolvedValue({ session_id: 's1' }),
      getSession: vi.fn().mockResolvedValue({ session_id: 's1' }),
      update: vi.fn().mockResolvedValue({ session_id: 's1' }),
      createTrigger: vi.fn().mockResolvedValue({ trigger_id: 't1' }),
      listTriggers: vi.fn().mockResolvedValue([]),
      executeTrigger: vi.fn().mockResolvedValue({ status: 'running' }),
      getTriggerStatus: vi.fn().mockResolvedValue({ status: 'completed' }),
      deleteTrigger: vi.fn().mockResolvedValue(undefined),
      storeContext: vi.fn().mockResolvedValue({ stored: true }),
      getContext: vi.fn().mockResolvedValue({ conversation_context: {} }),
      deleteContext: vi.fn().mockResolvedValue(undefined),
      registerTools: vi.fn().mockResolvedValue({ registered: 1 }),
      listTools: vi.fn().mockResolvedValue([]),
      unregisterTool: vi.fn().mockResolvedValue(undefined),
      getUsage: vi.fn().mockResolvedValue({ api_calls: 50 }),
    },
    fleet: {
      getStatus: vi.fn().mockResolvedValue({ total: 10, online: 8 }),
      listAgents: vi.fn().mockResolvedValue({ agents: [], total: 0 }),
      getAgent: vi.fn().mockResolvedValue({ agent_id: 'a1' }),
      sendCommand: vi.fn().mockResolvedValue({ command_id: 'c1' }),
      broadcast: vi.fn().mockResolvedValue({ command_id: 'c1' }),
      getAgentMetrics: vi.fn().mockResolvedValue({ agent_id: 'a1', metrics: [] }),
      getAgentCommands: vi.fn().mockResolvedValue({ agent_id: 'a1', commands: [] }),
    },
    gateway: {
      interceptPre: vi.fn().mockResolvedValue({ allowed: true }),
      interceptPost: vi.fn().mockResolvedValue({ allowed: true }),
    },
    accounts: {
      get: vi.fn().mockResolvedValue({ id: 'acc1' }),
      getUsage: vi.fn().mockResolvedValue({ api_calls: 100 }),
      getSubscription: vi.fn().mockResolvedValue({ tier: 'pro' }),
    },
    auth: {
      createToken: vi.fn().mockResolvedValue({ token: 'tok_xxx' }),
    },
  } as unknown as SigmaShake;
}

describe('createTools', () => {
  it('returns 37 tools', async () => {
    const { createTools } = await import('../src/claude.js');
    const tools = createTools(mockClient());
    expect(tools).toHaveLength(37);
  });

  it('has all expected tool names', async () => {
    const { createTools } = await import('../src/claude.js');
    const tools = createTools(mockClient());
    const names = tools.map((t: { name: string }) => t.name);

    const expected = [
      'sigmashake_search_documents',
      'sigmashake_query_db',
      'sigmashake_vector_search',
      'sigmashake_db_scroll',
      'sigmashake_db_insert',
      'sigmashake_store_memory',
      'sigmashake_recall_memory',
      'sigmashake_get_memory',
      'sigmashake_delete_memory',
      'sigmashake_list_alerts',
      'sigmashake_get_timeline',
      'sigmashake_shield_scan',
      'sigmashake_shield_register',
      'sigmashake_pipeline_status',
      'sigmashake_pipeline_metrics',
      'sigmashake_bottlenecks',
      'sigmashake_ai_brief',
      'sigmashake_get_pipeline_runs',
      'sigmashake_get_pipeline_run',
      'sigmashake_trigger_pipeline',
      'sigmashake_push_events',
      'sigmashake_list_agents',
      'sigmashake_register_agent',
      'sigmashake_get_agent',
      'sigmashake_update_agent',
      'sigmashake_fleet_status',
      'sigmashake_fleet_list_agents',
      'sigmashake_fleet_get_agent',
      'sigmashake_fleet_send_command',
      'sigmashake_fleet_broadcast',
      'sigmashake_fleet_agent_metrics',
      'sigmashake_fleet_command_history',
      'sigmashake_gateway_intercept_pre',
      'sigmashake_gateway_intercept_post',
      'sigmashake_get_account',
      'sigmashake_get_account_usage',
      'sigmashake_get_subscription',
      'sigmashake_create_token',
    ];

    for (const name of expected) {
      expect(names).toContain(name);
    }
  });
});

describe('createMcpServer', () => {
  it('returns a server object', async () => {
    const { createMcpServer } = await import('../src/claude.js');
    const server = createMcpServer(mockClient());
    expect(server).toBeDefined();
    expect((server as Record<string, unknown>).name).toBe('sigmashake');
  });

  it('accepts a custom name', async () => {
    const { createMcpServer } = await import('../src/claude.js');
    const server = createMcpServer(mockClient(), 'custom-ss');
    expect((server as Record<string, unknown>).name).toBe('custom-ss');
  });
});

describe('tool execution', () => {
  let client: SigmaShake;
  let tools: Array<{ name: string; execute: (args: Record<string, unknown>) => Promise<unknown> }>;

  beforeEach(async () => {
    client = mockClient();
    const { createTools } = await import('../src/claude.js');
    tools = createTools(client) as typeof tools;
  });

  function findTool(name: string) {
    return tools.find((t) => t.name === name)!;
  }

  it('search_documents calls client.documents.search', async () => {
    const result = await findTool('sigmashake_search_documents').execute({ query: 'test', limit: 5, offset: 0 });
    expect(client.documents.search).toHaveBeenCalled();
    expect(result).toHaveProperty('content');
  });

  it('query_db calls client.db.query', async () => {
    await findTool('sigmashake_query_db').execute({ table_name: 'users' });
    expect(client.db.query).toHaveBeenCalled();
  });

  it('store_memory calls client.memory.store', async () => {
    await findTool('sigmashake_store_memory').execute({ agent_id: 'a1', key: 'k', value: 'v' });
    expect(client.memory.store).toHaveBeenCalled();
  });

  it('list_alerts calls client.soc.listAlerts', async () => {
    await findTool('sigmashake_list_alerts').execute({ severity: 'critical' });
    expect(client.soc.listAlerts).toHaveBeenCalled();
  });

  it('shield_scan calls client.shield.scan', async () => {
    await findTool('sigmashake_shield_scan').execute({
      agent_id: 'a1', session_id: 's1', operation: { name: 'test' },
    });
    expect(client.shield.scan).toHaveBeenCalled();
  });

  it('pipeline_status calls client.pulse.getStatus', async () => {
    await findTool('sigmashake_pipeline_status').execute({});
    expect(client.pulse.getStatus).toHaveBeenCalled();
  });

  it('fleet_status calls client.fleet.getStatus', async () => {
    await findTool('sigmashake_fleet_status').execute({});
    expect(client.fleet.getStatus).toHaveBeenCalled();
  });

  it('fleet_send_command calls client.fleet.sendCommand', async () => {
    await findTool('sigmashake_fleet_send_command').execute({
      agent_id: 'a1', command_type: 'restart',
    });
    expect(client.fleet.sendCommand).toHaveBeenCalled();
  });

  it('fleet_broadcast calls client.fleet.broadcast', async () => {
    await findTool('sigmashake_fleet_broadcast').execute({ command_type: 'pause' });
    expect(client.fleet.broadcast).toHaveBeenCalled();
  });

  it('gateway_intercept_pre calls client.gateway.interceptPre', async () => {
    await findTool('sigmashake_gateway_intercept_pre').execute({
      name: 'read_file', input: {}, session_id: 's1', agent_id: 'a1',
    });
    expect(client.gateway.interceptPre).toHaveBeenCalled();
  });

  it('get_account calls client.accounts.get', async () => {
    await findTool('sigmashake_get_account').execute({ account_id: 'acc1' });
    expect(client.accounts.get).toHaveBeenCalledWith('acc1');
  });

  it('create_token calls client.auth.createToken', async () => {
    await findTool('sigmashake_create_token').execute({ agent_id: 'a1', scopes: ['read'] });
    expect(client.auth.createToken).toHaveBeenCalled();
  });

  it('trigger_pipeline calls client.pulse.triggerRun', async () => {
    await findTool('sigmashake_trigger_pipeline').execute({ trigger_type: 'manual' });
    expect(client.pulse.triggerRun).toHaveBeenCalledWith('manual', undefined);
  });

  it('push_events calls client.pulse.pushEvent', async () => {
    const events = [{ event_type: 'deploy' }];
    await findTool('sigmashake_push_events').execute({ events });
    expect(client.pulse.pushEvent).toHaveBeenCalledWith(events);
  });

  it('register_agent calls client.agents.register', async () => {
    await findTool('sigmashake_register_agent').execute({
      agent_id: 'a1', agent_type: 'worker',
    });
    expect(client.agents.register).toHaveBeenCalled();
  });

  it('db_insert calls client.db.insert', async () => {
    await findTool('sigmashake_db_insert').execute({
      table_name: 'events', columns: [{ name: 'id', data: [1] }],
    });
    expect(client.db.insert).toHaveBeenCalled();
  });
});
