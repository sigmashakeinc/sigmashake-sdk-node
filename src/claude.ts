/**
 * Claude Agent SDK integration — expose SigmaShake as MCP tools for Claude Code.
 *
 * Usage with `ClaudeSDKClient`:
 * ```ts
 * import { SigmaShake } from 'sigmashake';
 * import { createMcpServer } from 'sigmashake/claude';
 * import { ClaudeSDKClient, ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk';
 *
 * const ss = new SigmaShake({ apiKey: 'sk-...' });
 * const server = createMcpServer(ss);
 *
 * const client = new ClaudeSDKClient({
 *   options: new ClaudeAgentOptions({ mcpServers: { sigmashake: server } }),
 * });
 * ```
 *
 * Usage with `query()`:
 * ```ts
 * import { queryWithSigmaShake } from 'sigmashake/claude';
 *
 * for await (const message of queryWithSigmaShake(ss, {
 *   prompt: 'Check pipeline status and list recent alerts',
 * })) {
 *   if (message.type === 'result') console.log(message.result);
 * }
 * ```
 */

import {
  betaZodTool,
  createSdkMcpServer,
  query as sdkQuery,
  type ClaudeAgentOptions,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { SigmaShake } from './client.js';
import type { FleetCommand as FleetCommandModel } from './models.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResult(data: unknown): { content: Array<{ type: 'text'; text: string }> } {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 0);
  return { content: [{ type: 'text', text }] };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export function createTools(client: SigmaShake) {
  // -- Documents -----------------------------------------------------------

  const sigmashake_search_documents = betaZodTool({
    name: 'sigmashake_search_documents',
    description: 'Search documents in the SigmaShake platform',
    schema: z.object({
      query: z.string(),
      limit: z.number().optional().default(10),
      offset: z.number().optional().default(0),
    }),
    async execute(args) {
      const result = await client.documents.search({
        query: args.query,
        limit: args.limit,
        offset: args.offset,
        filters: {},
      });
      return jsonResult(result);
    },
  });

  // -- DB ------------------------------------------------------------------

  const sigmashake_query_db = betaZodTool({
    name: 'sigmashake_query_db',
    description: 'Query a SigmaShake database table with optional filters',
    schema: z.object({
      table_name: z.string(),
      filters: z.array(z.record(z.unknown())).optional(),
      columns: z.array(z.string()).optional(),
      limit: z.number().optional(),
    }),
    async execute(args) {
      const result = await client.db.query(args.table_name, {
        filters: args.filters as never,
        columns: args.columns,
        limit: args.limit,
      } as never);
      return jsonResult(result);
    },
  });

  const sigmashake_vector_search = betaZodTool({
    name: 'sigmashake_vector_search',
    description: 'Perform vector similarity search on a SigmaShake database table',
    schema: z.object({
      table_name: z.string(),
      column: z.string(),
      vector: z.array(z.number()),
      top_k: z.number().optional().default(10),
    }),
    async execute(args) {
      const result = await client.db.vectorSearch(args.table_name, {
        column: args.column,
        vector: args.vector,
        topK: args.top_k,
      } as never);
      return jsonResult(result);
    },
  });

  const sigmashake_db_scroll = betaZodTool({
    name: 'sigmashake_db_scroll',
    description: 'Scroll through large database result sets with cursor-based pagination',
    schema: z.object({
      table_name: z.string(),
      batch_size: z.number().optional().default(100),
      cursor: z.string().optional(),
      filters: z.array(z.record(z.unknown())).optional(),
    }),
    async execute(args) {
      const result = await client.db.scroll(args.table_name, {
        batchSize: args.batch_size,
        cursor: args.cursor,
        filters: args.filters as never,
      } as never);
      return jsonResult(result);
    },
  });

  const sigmashake_db_insert = betaZodTool({
    name: 'sigmashake_db_insert',
    description: 'Insert rows into a SigmaShake database table',
    schema: z.object({
      table_name: z.string(),
      columns: z.array(z.record(z.unknown())),
    }),
    async execute(args) {
      await client.db.insert(args.table_name, { columns: args.columns } as never);
      return jsonResult({ inserted: true });
    },
  });

  // -- Memory --------------------------------------------------------------

  const sigmashake_store_memory = betaZodTool({
    name: 'sigmashake_store_memory',
    description: 'Store a key-value memory entry for an agent',
    schema: z.object({
      agent_id: z.string(),
      key: z.string(),
      value: z.string(),
      tags: z.array(z.string()).optional(),
    }),
    async execute(args) {
      const result = await client.memory.store(args.agent_id, args.key, {
        key: args.key,
        value: args.value,
        tags: args.tags ?? [],
      });
      return jsonResult(result);
    },
  });

  const sigmashake_recall_memory = betaZodTool({
    name: 'sigmashake_recall_memory',
    description: 'Search agent memory by semantic query',
    schema: z.object({
      agent_id: z.string(),
      query: z.string(),
    }),
    async execute(args) {
      const result = await client.memory.recall(args.agent_id, {
        tags: [],
        prefix: args.query,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_get_memory = betaZodTool({
    name: 'sigmashake_get_memory',
    description: 'Get a specific memory entry by key',
    schema: z.object({
      agent_id: z.string(),
      key: z.string(),
    }),
    async execute(args) {
      const result = await client.memory.get(args.agent_id, args.key);
      return jsonResult(result);
    },
  });

  const sigmashake_delete_memory = betaZodTool({
    name: 'sigmashake_delete_memory',
    description: 'Delete a memory entry by key',
    schema: z.object({
      agent_id: z.string(),
      key: z.string(),
    }),
    async execute(args) {
      await client.memory.delete(args.agent_id, args.key);
      return jsonResult('deleted');
    },
  });

  // -- SOC -----------------------------------------------------------------

  const sigmashake_list_alerts = betaZodTool({
    name: 'sigmashake_list_alerts',
    description: 'List security alerts from the SigmaShake SOC',
    schema: z.object({
      status: z.string().optional(),
      severity: z.string().optional(),
      limit: z.number().optional().default(100),
    }),
    async execute(args) {
      const result = await client.soc.listAlerts({
        status: args.status,
        severity: args.severity,
        limit: args.limit,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_get_timeline = betaZodTool({
    name: 'sigmashake_get_timeline',
    description: 'Get the event timeline for a session',
    schema: z.object({ session_id: z.string() }),
    async execute(args) {
      const result = await client.soc.getTimeline(args.session_id);
      return jsonResult(result);
    },
  });

  // -- Shield --------------------------------------------------------------

  const sigmashake_shield_scan = betaZodTool({
    name: 'sigmashake_shield_scan',
    description: 'Scan an operation through the SigmaShake security shield',
    schema: z.object({
      agent_id: z.string(),
      session_id: z.string(),
      operation: z.record(z.unknown()),
    }),
    async execute(args) {
      const result = await client.shield.scan({
        agent_id: args.agent_id,
        session_id: args.session_id,
        operation: args.operation,
      } as never);
      return jsonResult(result);
    },
  });

  const sigmashake_shield_register = betaZodTool({
    name: 'sigmashake_shield_register',
    description: 'Register an agent session with the security shield',
    schema: z.object({
      agent_id: z.string(),
      agent_type: z.string(),
      session_ttl_secs: z.number().optional().default(3600),
      metadata: z.record(z.unknown()).optional(),
    }),
    async execute(args) {
      const result = await client.shield.registerAgent({
        agent_id: args.agent_id,
        agent_type: args.agent_type,
        session_ttl_secs: args.session_ttl_secs,
        metadata: args.metadata ?? {},
      } as never);
      return jsonResult(result);
    },
  });

  // -- Pulse ---------------------------------------------------------------

  const sigmashake_pipeline_status = betaZodTool({
    name: 'sigmashake_pipeline_status',
    description: 'Get the current SigmaShake pipeline status and health',
    schema: z.object({}),
    async execute() {
      const result = await client.pulse.getStatus();
      return jsonResult(result);
    },
  });

  const sigmashake_pipeline_metrics = betaZodTool({
    name: 'sigmashake_pipeline_metrics',
    description: 'Get aggregated pipeline metrics for a time range',
    schema: z.object({
      from_ts: z.string().optional(),
      to_ts: z.string().optional(),
    }),
    async execute(args) {
      const result = await client.pulse.getMetrics({
        from: args.from_ts,
        to: args.to_ts,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_bottlenecks = betaZodTool({
    name: 'sigmashake_bottlenecks',
    description: 'Get detected pipeline bottlenecks ranked by severity',
    schema: z.object({
      min_score: z.number().optional(),
      limit: z.number().optional(),
    }),
    async execute(args) {
      const result = await client.pulse.getBottlenecks({
        min_score: args.min_score,
        limit: args.limit,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_ai_brief = betaZodTool({
    name: 'sigmashake_ai_brief',
    description: 'Get an AI-optimized summary of current pipeline state',
    schema: z.object({}),
    async execute() {
      const result = await client.pulse.getAiBrief();
      return jsonResult(result);
    },
  });

  const sigmashake_get_pipeline_runs = betaZodTool({
    name: 'sigmashake_get_pipeline_runs',
    description: 'List recent pipeline runs with optional time range filter',
    schema: z.object({
      page: z.number().optional(),
      per_page: z.number().optional(),
      from_ts: z.string().optional(),
      to_ts: z.string().optional(),
    }),
    async execute(args) {
      const result = await client.pulse.getRuns({
        page: args.page,
        per_page: args.per_page,
        from: args.from_ts,
        to: args.to_ts,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_get_pipeline_run = betaZodTool({
    name: 'sigmashake_get_pipeline_run',
    description: 'Get full detail for a specific pipeline run by ID',
    schema: z.object({ run_id: z.string() }),
    async execute(args) {
      const result = await client.pulse.getRun(args.run_id);
      return jsonResult(result);
    },
  });

  const sigmashake_trigger_pipeline = betaZodTool({
    name: 'sigmashake_trigger_pipeline',
    description: 'Trigger a new pipeline run',
    schema: z.object({
      trigger_type: z.string(),
      config: z.record(z.unknown()).optional(),
    }),
    async execute(args) {
      const result = await client.pulse.triggerRun(args.trigger_type, args.config);
      return jsonResult(result);
    },
  });

  const sigmashake_push_events = betaZodTool({
    name: 'sigmashake_push_events',
    description: 'Ingest external events into the Pulse pipeline for correlation',
    schema: z.object({ events: z.array(z.record(z.unknown())) }),
    async execute(args) {
      const result = await client.pulse.pushEvent(args.events);
      return jsonResult(result);
    },
  });

  // -- Agents --------------------------------------------------------------

  const sigmashake_list_agents = betaZodTool({
    name: 'sigmashake_list_agents',
    description: 'List active agent sessions for an agent',
    schema: z.object({ agent_id: z.string() }),
    async execute(args) {
      const result = await client.agents.listSessions(args.agent_id);
      return jsonResult(result);
    },
  });

  const sigmashake_register_agent = betaZodTool({
    name: 'sigmashake_register_agent',
    description: 'Register a new agent session',
    schema: z.object({
      agent_id: z.string(),
      agent_type: z.string(),
      metadata: z.record(z.unknown()).optional(),
    }),
    async execute(args) {
      const result = await client.agents.register({
        agent_id: args.agent_id,
        agent_type: args.agent_type,
        metadata: args.metadata ?? {},
      } as never);
      return jsonResult(result);
    },
  });

  const sigmashake_get_agent = betaZodTool({
    name: 'sigmashake_get_agent',
    description: 'Get details of an agent session by session ID',
    schema: z.object({ session_id: z.string() }),
    async execute(args) {
      const result = await client.agents.getSession(args.session_id);
      return jsonResult(result);
    },
  });

  const sigmashake_update_agent = betaZodTool({
    name: 'sigmashake_update_agent',
    description: "Update an agent session's metadata",
    schema: z.object({
      session_id: z.string(),
      metadata: z.record(z.unknown()).optional(),
    }),
    async execute(args) {
      const result = await client.agents.update(args.session_id, {
        metadata: args.metadata,
      } as never);
      return jsonResult(result);
    },
  });

  // -- Fleet ---------------------------------------------------------------

  const sigmashake_fleet_status = betaZodTool({
    name: 'sigmashake_fleet_status',
    description: 'Get fleet-wide status summary (total, online, degraded, offline agents)',
    schema: z.object({}),
    async execute() {
      const result = await client.fleet.getStatus();
      return jsonResult(result);
    },
  });

  const sigmashake_fleet_list_agents = betaZodTool({
    name: 'sigmashake_fleet_list_agents',
    description: 'List agents in the fleet with optional status filter',
    schema: z.object({
      status: z.string().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    async execute(args) {
      const result = await client.fleet.listAgents({
        status: args.status,
        limit: args.limit,
        offset: args.offset,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_fleet_get_agent = betaZodTool({
    name: 'sigmashake_fleet_get_agent',
    description: 'Get detailed info for a specific fleet agent',
    schema: z.object({ agent_id: z.string() }),
    async execute(args) {
      const result = await client.fleet.getAgent(args.agent_id);
      return jsonResult(result);
    },
  });

  const sigmashake_fleet_send_command = betaZodTool({
    name: 'sigmashake_fleet_send_command',
    description: 'Send a command to a specific fleet agent (restart, pause, resume, etc.)',
    schema: z.object({
      agent_id: z.string(),
      command_type: z.string(),
      payload: z.record(z.unknown()).optional(),
    }),
    async execute(args) {
      const cmd: FleetCommandModel = {
        command_type: args.command_type,
        payload: (args.payload ?? {}) as Record<string, unknown>,
      } as never;
      const result = await client.fleet.sendCommand(args.agent_id, cmd);
      return jsonResult(result);
    },
  });

  const sigmashake_fleet_broadcast = betaZodTool({
    name: 'sigmashake_fleet_broadcast',
    description: 'Broadcast a command to all fleet agents',
    schema: z.object({
      command_type: z.string(),
      payload: z.record(z.unknown()).optional(),
    }),
    async execute(args) {
      const cmd: FleetCommandModel = {
        command_type: args.command_type,
        payload: (args.payload ?? {}) as Record<string, unknown>,
      } as never;
      const result = await client.fleet.broadcast(cmd);
      return jsonResult(result);
    },
  });

  const sigmashake_fleet_agent_metrics = betaZodTool({
    name: 'sigmashake_fleet_agent_metrics',
    description: 'Get resource metrics for a specific fleet agent',
    schema: z.object({
      agent_id: z.string(),
      range: z.string().optional(),
    }),
    async execute(args) {
      const result = await client.fleet.getAgentMetrics(args.agent_id, {
        range: args.range,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_fleet_command_history = betaZodTool({
    name: 'sigmashake_fleet_command_history',
    description: 'Get command history for a specific fleet agent',
    schema: z.object({
      agent_id: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }),
    async execute(args) {
      const result = await client.fleet.getAgentCommands(args.agent_id, {
        limit: args.limit,
        offset: args.offset,
      });
      return jsonResult(result);
    },
  });

  // -- Gateway -------------------------------------------------------------

  const sigmashake_gateway_intercept_pre = betaZodTool({
    name: 'sigmashake_gateway_intercept_pre',
    description: 'Run a pre-execution gateway intercept on a tool call',
    schema: z.object({
      name: z.string(),
      input: z.record(z.unknown()),
      session_id: z.string(),
      agent_id: z.string(),
    }),
    async execute(args) {
      const result = await client.gateway.interceptPre({
        name: args.name,
        input: args.input,
        sessionId: args.session_id,
        agentId: args.agent_id,
      });
      return jsonResult(result);
    },
  });

  const sigmashake_gateway_intercept_post = betaZodTool({
    name: 'sigmashake_gateway_intercept_post',
    description: 'Run a post-execution gateway intercept on a tool call result',
    schema: z.object({
      name: z.string(),
      output: z.record(z.unknown()),
      session_id: z.string(),
      agent_id: z.string(),
    }),
    async execute(args) {
      const result = await client.gateway.interceptPost({
        name: args.name,
        output: args.output,
        sessionId: args.session_id,
        agentId: args.agent_id,
      } as never);
      return jsonResult(result);
    },
  });

  // -- Accounts ------------------------------------------------------------

  const sigmashake_get_account = betaZodTool({
    name: 'sigmashake_get_account',
    description: 'Get account details by ID',
    schema: z.object({ account_id: z.string() }),
    async execute(args) {
      const result = await client.accounts.get(args.account_id);
      return jsonResult(result);
    },
  });

  const sigmashake_get_account_usage = betaZodTool({
    name: 'sigmashake_get_account_usage',
    description: 'Get usage metrics for an account',
    schema: z.object({ account_id: z.string() }),
    async execute(args) {
      const result = await client.accounts.getUsage(args.account_id);
      return jsonResult(result);
    },
  });

  const sigmashake_get_subscription = betaZodTool({
    name: 'sigmashake_get_subscription',
    description: 'Get subscription details for an account',
    schema: z.object({ account_id: z.string() }),
    async execute(args) {
      const result = await client.accounts.getSubscription(args.account_id);
      return jsonResult(result);
    },
  });

  // -- Auth ----------------------------------------------------------------

  const sigmashake_create_token = betaZodTool({
    name: 'sigmashake_create_token',
    description: 'Create an auth token for an agent with specified scopes',
    schema: z.object({
      agent_id: z.string(),
      scopes: z.array(z.string()).optional(),
    }),
    async execute(args) {
      const result = await client.auth.createToken({
        agentId: args.agent_id,
        scopes: args.scopes ?? [],
      } as never);
      return jsonResult(result);
    },
  });

  // -- Triggers -------------------------------------------------------------

  const sigmashake_create_trigger = betaZodTool({
    name: 'sigmashake_create_trigger',
    description: 'Create a remote trigger for an agent',
    schema: z.object({
      agent_id: z.string(),
      name: z.string(),
      prompt: z.string(),
      tools: z.array(z.string()).optional(),
      max_turns: z.number().optional().default(10),
      model: z.string().optional(),
      schedule: z.string().optional(),
    }),
    async execute(args) {
      const body: Record<string, unknown> = {
        name: args.name,
        prompt: args.prompt,
        max_turns: args.max_turns,
      };
      if (args.tools !== undefined) body.tools = args.tools;
      if (args.model !== undefined) body.model = args.model;
      if (args.schedule !== undefined) body.schedule = args.schedule;
      const result = await client.agents.createTrigger(args.agent_id, body);
      return jsonResult(result);
    },
  });

  const sigmashake_list_triggers = betaZodTool({
    name: 'sigmashake_list_triggers',
    description: 'List remote triggers for an agent',
    schema: z.object({ agent_id: z.string() }),
    async execute(args) {
      const result = await client.agents.listTriggers(args.agent_id);
      return jsonResult(result);
    },
  });

  const sigmashake_execute_trigger = betaZodTool({
    name: 'sigmashake_execute_trigger',
    description: 'Execute a remote trigger for an agent',
    schema: z.object({
      agent_id: z.string(),
      trigger_id: z.string(),
    }),
    async execute(args) {
      const result = await client.agents.executeTrigger(args.agent_id, args.trigger_id);
      return jsonResult(result);
    },
  });

  const sigmashake_get_trigger_status = betaZodTool({
    name: 'sigmashake_get_trigger_status',
    description: 'Get execution status of a remote trigger',
    schema: z.object({
      agent_id: z.string(),
      trigger_id: z.string(),
    }),
    async execute(args) {
      const result = await client.agents.getTriggerStatus(args.agent_id, args.trigger_id);
      return jsonResult(result);
    },
  });

  const sigmashake_delete_trigger = betaZodTool({
    name: 'sigmashake_delete_trigger',
    description: 'Delete a remote trigger for an agent',
    schema: z.object({
      agent_id: z.string(),
      trigger_id: z.string(),
    }),
    async execute(args) {
      await client.agents.deleteTrigger(args.agent_id, args.trigger_id);
      return jsonResult('deleted');
    },
  });

  // -- Context --------------------------------------------------------------

  const sigmashake_store_context = betaZodTool({
    name: 'sigmashake_store_context',
    description: 'Store conversation context for an agent',
    schema: z.object({
      agent_id: z.string(),
      conversation_context: z.record(z.unknown()),
      system_prompt: z.string().optional(),
      tool_config: z.record(z.unknown()).optional(),
    }),
    async execute(args) {
      const body: Record<string, unknown> = {
        conversation_context: args.conversation_context,
      };
      if (args.system_prompt !== undefined) body.system_prompt = args.system_prompt;
      if (args.tool_config !== undefined) body.tool_config = args.tool_config;
      const result = await client.agents.storeContext(args.agent_id, body);
      return jsonResult(result);
    },
  });

  const sigmashake_get_context = betaZodTool({
    name: 'sigmashake_get_context',
    description: 'Get stored conversation context for an agent',
    schema: z.object({ agent_id: z.string() }),
    async execute(args) {
      const result = await client.agents.getContext(args.agent_id);
      return jsonResult(result);
    },
  });

  const sigmashake_delete_context = betaZodTool({
    name: 'sigmashake_delete_context',
    description: 'Delete stored conversation context for an agent',
    schema: z.object({ agent_id: z.string() }),
    async execute(args) {
      await client.agents.deleteContext(args.agent_id);
      return jsonResult('deleted');
    },
  });

  // -- Agent Tools ----------------------------------------------------------

  const sigmashake_register_tools = betaZodTool({
    name: 'sigmashake_register_tools',
    description: 'Register tools for an agent',
    schema: z.object({
      agent_id: z.string(),
      tools: z.array(z.record(z.unknown())),
    }),
    async execute(args) {
      const result = await client.agents.registerTools(args.agent_id, args.tools);
      return jsonResult(result);
    },
  });

  const sigmashake_list_agent_tools = betaZodTool({
    name: 'sigmashake_list_agent_tools',
    description: 'List registered tools for an agent',
    schema: z.object({ agent_id: z.string() }),
    async execute(args) {
      const result = await client.agents.listTools(args.agent_id);
      return jsonResult(result);
    },
  });

  const sigmashake_unregister_tool = betaZodTool({
    name: 'sigmashake_unregister_tool',
    description: 'Unregister a tool from an agent',
    schema: z.object({
      agent_id: z.string(),
      tool_name: z.string(),
    }),
    async execute(args) {
      await client.agents.unregisterTool(args.agent_id, args.tool_name);
      return jsonResult('deleted');
    },
  });

  // -- Agent Usage ----------------------------------------------------------

  const sigmashake_get_agent_usage = betaZodTool({
    name: 'sigmashake_get_agent_usage',
    description: 'Get usage metrics for an agent',
    schema: z.object({
      agent_id: z.string(),
      from_date: z.string().optional(),
      to_date: z.string().optional(),
    }),
    async execute(args) {
      const result = await client.agents.getUsage(args.agent_id, {
        fromDate: args.from_date,
        toDate: args.to_date,
      });
      return jsonResult(result);
    },
  });

  return [
    // Documents
    sigmashake_search_documents,
    // DB
    sigmashake_query_db,
    sigmashake_vector_search,
    sigmashake_db_scroll,
    sigmashake_db_insert,
    // Memory
    sigmashake_store_memory,
    sigmashake_recall_memory,
    sigmashake_get_memory,
    sigmashake_delete_memory,
    // SOC
    sigmashake_list_alerts,
    sigmashake_get_timeline,
    // Shield
    sigmashake_shield_scan,
    sigmashake_shield_register,
    // Pulse
    sigmashake_pipeline_status,
    sigmashake_pipeline_metrics,
    sigmashake_bottlenecks,
    sigmashake_ai_brief,
    sigmashake_get_pipeline_runs,
    sigmashake_get_pipeline_run,
    sigmashake_trigger_pipeline,
    sigmashake_push_events,
    // Agents
    sigmashake_list_agents,
    sigmashake_register_agent,
    sigmashake_get_agent,
    sigmashake_update_agent,
    // Fleet
    sigmashake_fleet_status,
    sigmashake_fleet_list_agents,
    sigmashake_fleet_get_agent,
    sigmashake_fleet_send_command,
    sigmashake_fleet_broadcast,
    sigmashake_fleet_agent_metrics,
    sigmashake_fleet_command_history,
    // Gateway
    sigmashake_gateway_intercept_pre,
    sigmashake_gateway_intercept_post,
    // Accounts
    sigmashake_get_account,
    sigmashake_get_account_usage,
    sigmashake_get_subscription,
    // Auth
    sigmashake_create_token,
  ];
}

// ---------------------------------------------------------------------------
// MCP server factory
// ---------------------------------------------------------------------------

export function createMcpServer(client: SigmaShake, name = 'sigmashake') {
  const tools = createTools(client);
  return createSdkMcpServer(name, { tools });
}

// ---------------------------------------------------------------------------
// Convenience query wrapper
// ---------------------------------------------------------------------------

export interface QueryWithSigmaShakeOptions {
  prompt: string;
  allowedTools?: string[];
  systemPrompt?: string;
  maxTurns?: number;
  permissionMode?: string;
  extraMcpServers?: Record<string, unknown>;
}

export async function* queryWithSigmaShake(
  client: SigmaShake,
  options: QueryWithSigmaShakeOptions,
) {
  const server = createMcpServer(client);
  const mcpServers: Record<string, unknown> = { sigmashake: server };
  if (options.extraMcpServers) {
    Object.assign(mcpServers, options.extraMcpServers);
  }

  const agentOptions: ClaudeAgentOptions = {
    allowedTools: options.allowedTools ?? [],
    mcpServers,
    permissionMode: options.permissionMode ?? 'default',
  } as ClaudeAgentOptions;

  if (options.systemPrompt !== undefined) {
    (agentOptions as Record<string, unknown>).systemPrompt = options.systemPrompt;
  }
  if (options.maxTurns !== undefined) {
    (agentOptions as Record<string, unknown>).maxTurns = options.maxTurns;
  }

  yield* sdkQuery({ prompt: options.prompt, options: agentOptions });
}
