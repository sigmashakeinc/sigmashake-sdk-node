// ── Enums (const objects + type unions) ─────────────────────────────

export const Tier = { Free: 'free', Pro: 'pro', Enterprise: 'enterprise' } as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

export const MemberRole = { Owner: 'owner', Admin: 'admin', Member: 'member' } as const;
export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

export const SubscriptionStatus = {
  Active: 'active',
  PastDue: 'past_due',
  Canceled: 'canceled',
  Trialing: 'trialing',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const DataClassification = {
  Public: 'public',
  Internal: 'internal',
  Confidential: 'confidential',
  Restricted: 'restricted',
} as const;
export type DataClassification = (typeof DataClassification)[keyof typeof DataClassification];

export const ColumnType = {
  Uint64: 'uint64',
  Int64: 'int64',
  Float64: 'float64',
  String: 'string',
  Timestamp: 'timestamp',
  Uuid: 'uuid',
  Bool: 'bool',
  Json: 'json',
} as const;
export type ColumnType = (typeof ColumnType)[keyof typeof ColumnType];

export const FilterOp = {
  Eq: 'eq',
  Ne: 'ne',
  Lt: 'lt',
  Le: 'le',
  Gt: 'gt',
  Ge: 'ge',
} as const;
export type FilterOp = (typeof FilterOp)[keyof typeof FilterOp];

export const AggregateType = {
  Count: 'count',
  Sum: 'sum',
  Min: 'min',
  Max: 'max',
  Avg: 'avg',
} as const;
export type AggregateType = (typeof AggregateType)[keyof typeof AggregateType];

export const DistanceMetric = {
  Cosine: 'cosine',
  DotProduct: 'dot_product',
  L2: 'l2',
} as const;
export type DistanceMetric = (typeof DistanceMetric)[keyof typeof DistanceMetric];

export const AgentStatus = {
  Active: 'active',
  Idle: 'idle',
  Busy: 'busy',
  Error: 'error',
} as const;
export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export const AgentPresence = {
  Online: 'online',
  Disconnected: 'disconnected',
  Offline: 'offline',
} as const;
export type AgentPresence = (typeof AgentPresence)[keyof typeof AgentPresence];

export const FleetCommandType = {
  Restart: 'restart',
  UpdateConfig: 'update_config',
  RevokeCredentials: 'revoke_credentials',
  InjectTool: 'inject_tool',
  RemoveTool: 'remove_tool',
  Pause: 'pause',
  Resume: 'resume',
  CollectDiagnostics: 'collect_diagnostics',
  UpdateVersion: 'update_version',
} as const;
export type FleetCommandType = (typeof FleetCommandType)[keyof typeof FleetCommandType];

export const FleetMessageType = {
  ClientHello: 'client_hello',
  ServerHello: 'server_hello',
  Heartbeat: 'heartbeat',
  MetricsReport: 'metrics_report',
  ToolCallTrace: 'tool_call_trace',
  AgentAlert: 'agent_alert',
  CommandAck: 'command_ack',
  Command: 'command',
  ConfigUpdate: 'config_update',
  CapabilityChange: 'capability_change',
} as const;
export type FleetMessageType = (typeof FleetMessageType)[keyof typeof FleetMessageType];

// ── Auth ────────────────────────────────────────────────────────────

export interface TokenRequest {
  agentId: string;
  scopes: string[];
  ttlSecs?: number;
}

export interface TokenResponse {
  token: string;
  expiresAt: string;
  scopes: string[];
}

export interface IssueIdentityRequest {
  agentId: string;
  capabilities: string[];
  ttlSecs: number;
}

export interface AgentIdentityClaims {
  sub: string;
  agentId: string;
  capabilities: string[];
  iat: number;
  exp: number;
}

export interface IdentityTokenResponse {
  token: string;
  expiresAt: string;
  claims: AgentIdentityClaims;
}

// ── Accounts ────────────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  tier: Tier;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  accountId: string;
  tier: Tier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface Seat {
  id: string;
  accountId: string;
  userId: string;
  role: MemberRole;
  createdAt: string;
}

export interface TenantUsage {
  accountId: string;
  period: string;
  apiCalls: number;
  storageBytes: number;
  agentSessions: number;
  scansPerformed: number;
}

export interface CreateAccountBody {
  name: string;
  tier: Tier;
}

export interface UpdateSubscriptionBody {
  tier?: Tier;
  status?: SubscriptionStatus;
}

export interface AddSeatBody {
  userId: string;
  role: MemberRole;
}

// ── Shield ──────────────────────────────────────────────────────────

export interface AgentRegistration {
  agentId: string;
  agentType: string;
  sessionTtlSecs: number;
}

export interface AgentSession {
  sessionId: string;
  agentId: string;
  agentType: string;
  expiresAt: string;
}

export interface Operation {
  name: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface OperationContext {
  sessionId: string;
  agentId: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface ScanRequest {
  agentId: string;
  sessionId: string;
  operation: Operation;
  context?: OperationContext;
}

export interface ScanResult {
  allowed: boolean;
  riskScore: number;
  findings: string[];
  recommendedActions: string[];
}

// ── Documents ───────────────────────────────────────────────────────

export interface Document {
  id: string;
  resource: string;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MutationRequest {
  resource: string;
  action: string;
  payload: Record<string, unknown>;
}

export interface MutationResponse {
  id: string;
  resource: string;
  action: string;
  status: string;
  createdAt: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

export interface SearchResponse {
  results: Document[];
  total: number;
  hasMore: boolean;
}

// ── Memory ──────────────────────────────────────────────────────────

export interface MemoryEntry {
  key: string;
  value: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StoreRequest {
  key: string;
  value: string;
  tags?: string[];
}

export interface MemoryQuery {
  tags?: string[];
  prefix?: string;
  limit?: number;
}

// ── SOC / Observability ─────────────────────────────────────────────

export interface StoredIncident {
  id: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  incidentId: string;
  message: string;
  severity: string;
  timestamp: string;
}

export interface MetricSummary {
  name: string;
  value: number;
  unit: string;
  timestamp: string;
}

export interface AggregateHealth {
  status: string;
  services: Record<string, string>;
  lastChecked: string;
}

export interface PlatformStatus {
  healthy: boolean;
  version: string;
  uptime: number;
  aggregateHealth: AggregateHealth;
}

export interface LlmLogEntry {
  id: string;
  sessionId: string;
  agentId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  timestamp: string;
}

export interface IngestResponse {
  accepted: number;
  rejected: number;
  errors: string[];
}

export interface ProxyTunnelEvent {
  id: string;
  sessionId: string;
  direction: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export interface CorrelatedSession {
  sessionId: string;
  agentId: string;
  events: ProxyTunnelEvent[];
  startedAt: string;
  endedAt?: string;
}

export interface SessionTimeline {
  sessionId: string;
  events: Array<{
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
  }>;
}

export interface HostTrafficSummary {
  host: string;
  requestCount: number;
  bytesIn: number;
  bytesOut: number;
  period: string;
}

export interface SessionCostSummary {
  sessionId: string;
  totalTokens: number;
  totalCostUsd: number;
  breakdown: Array<{
    model: string;
    tokens: number;
    costUsd: number;
  }>;
}

export interface ThreatHeatmapEntry {
  category: string;
  severity: string;
  count: number;
  period: string;
}

// ── Gateway ─────────────────────────────────────────────────────────

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  sessionId: string;
  agentId: string;
}

export interface ToolResult {
  name: string;
  output: Record<string, unknown>;
  sessionId: string;
  agentId: string;
  durationMs: number;
}

export interface InterceptResult {
  allowed: boolean;
  modified: boolean;
  toolCall?: ToolCall;
  reason?: string;
}

// ── Database ────────────────────────────────────────────────────────

export interface ColumnDef {
  name: string;
  colType: ColumnType;
}

export interface ColumnData {
  name: string;
  data: unknown[];
}

export interface Filter {
  column: string;
  op: FilterOp;
  value: unknown;
}

export interface Aggregation {
  column: string;
  aggType: AggregateType;
  alias?: string;
}

export interface CreateTableRequest {
  columns: ColumnDef[];
  primaryKey?: string;
}

export interface InsertRequest {
  columns: ColumnData[];
}

export interface QueryRequest {
  filters?: Filter[];
  columns?: string[];
  aggregations?: Aggregation[];
  limit?: number;
  offset?: number;
  orderBy?: string;
  descending?: boolean;
}

export interface QueryResponse {
  columns: string[];
  rows: unknown[][];
  totalRows: number;
}

export interface VectorSearchRequest {
  vector: number[];
  topK: number;
  metric?: DistanceMetric;
  filters?: Filter[];
}

export interface ScrollQueryRequest {
  filters?: Filter[];
  columns?: string[];
  cursorId?: string;
  pageSize?: number;
}

export interface ScrollQueryResponse {
  columns: string[];
  rows: unknown[][];
  cursorId?: string;
  hasMore: boolean;
}

export interface ClusterInitRequest {
  nodes: number;
  replicationFactor: number;
  shards?: number;
}

export interface ClusterStatusResponse {
  clusterId: string;
  status: string;
  nodes: number;
  replicationFactor: number;
  shards: number;
  healthy: boolean;
}

// ── Fleet ──────────────────────────────────────────────────────────

export interface FleetStatus {
  totalAgents: number;
  onlineAgents: number;
  degradedAgents: number;
  offlineAgents: number;
  shardCount: number;
}

export interface FleetAgentSummary {
  agentId: string;
  status: AgentStatus;
  presence: AgentPresence;
  lastSeen: string;
  version: string;
  cpuPct: number | null;
  llmCostUsd: number | null;
}

export interface ListAgentsParams {
  status?: AgentStatus;
  presence?: AgentPresence;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface AgentListResponse {
  agents: FleetAgentSummary[];
  total: number;
  hasMore: boolean;
}

export interface FleetAgentDetail {
  agentId: string;
  status: AgentStatus;
  presence: AgentPresence;
  version: string;
  capabilities: string[];
  connectedAt: string;
  lastSeen: string;
  lastHeartbeat: string;
  shardId: string;
  metadata: Record<string, unknown>;
}

export interface FleetCommand {
  commandType: FleetCommandType;
  payload?: Record<string, unknown>;
}

export interface FleetCommandAck {
  commandId: string;
  agentId: string;
  success: boolean;
  message?: string;
  timestamp: string;
}

export interface FleetBroadcastResult {
  commandId: string;
  targeted: number;
  acknowledged: number;
}

export interface FleetAgentMetric {
  timestamp: string;
  cpuPct: number;
  memoryMb: number;
  llmTokensIn: number;
  llmTokensOut: number;
  llmCostUsd: number;
}

export interface AgentMetricsParams {
  range?: '1h' | '24h' | '7d';
}

export interface AgentMetricsResponse {
  metrics: FleetAgentMetric[];
}

export interface AgentCommandsParams {
  limit?: number;
  offset?: number;
}

export interface AgentCommandRow {
  id: string;
  commandType: FleetCommandType;
  payload: Record<string, unknown>;
  issuedAt: string;
  acked: boolean;
  ackMessage?: string;
}

export interface AgentCommandsResponse {
  commands: AgentCommandRow[];
  total: number;
  hasMore: boolean;
}

export interface FleetConfig {
  heartbeatIntervalSecs: number;
  metricsIntervalSecs: number;
  maxAgents: number;
  alertThresholds: {
    missedHeartbeats: number;
    errorRatePct: number;
  };
  autoScaleEnabled: boolean;
}

export interface FleetMessage {
  version: number;
  messageType: FleetMessageType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface ClientHelloPayload {
  agentId: string;
  version: string;
  capabilities: string[];
}

export interface ServerHelloPayload {
  sessionId: string;
  heartbeatIntervalMs: number;
  metricsIntervalMs: number;
}

export interface HeartbeatPayload {
  agentId: string;
  status: AgentStatus;
  uptimeSecs: number;
}

export interface MetricsReportPayload {
  agentId: string;
  cpuPct: number;
  memoryMb: number;
  llmTokensIn: number;
  llmTokensOut: number;
  llmCostUsd: number;
  activeTools: number;
  activeSessions: number;
}

export interface FleetToolCallTrace {
  agentId: string;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs: number;
  timestamp: string;
}

export interface FleetAlertPayload {
  agentId: string;
  severity: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface FleetEvent {
  type: string;
  agentId?: string;
  timestamp: string;
  data: Record<string, unknown>;
}
