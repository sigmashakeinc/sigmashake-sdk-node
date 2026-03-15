// Main client
export { SigmaShake, type SigmaShakeConfig } from './client.js';

// API namespaces
export { AuthApi, IdentityApi } from './auth.js';
export { AccountsApi } from './accounts.js';
export { AgentsApi } from './agents.js';
export { ShieldApi } from './shield.js';
export { DocumentsApi } from './documents.js';
export { MemoryApi } from './memory.js';
export { SocApi, type ListIncidentsParams } from './soc.js';
export { GatewayApi } from './gateway.js';
export { DbApi } from './db.js';
export { FleetApi } from './fleet.js';
export { FleetConnection, type FleetConnectionConfig } from './fleet-ws.js';

// Errors
export {
  SigmaShakeError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
  errorFromStatus,
} from './errors.js';

// HTTP client (for advanced usage)
export { HttpClient, type HttpClientConfig } from './http.js';

// All models and enums
export {
  // Enums
  Tier,
  MemberRole,
  SubscriptionStatus,
  DataClassification,
  ColumnType,
  FilterOp,
  AggregateType,
  DistanceMetric,
  AgentStatus,
  AgentPresence,
  FleetCommandType,
  FleetMessageType,
} from './models.js';

export type {
  // Auth
  TokenRequest,
  TokenResponse,
  IssueIdentityRequest,
  IdentityTokenResponse,
  AgentIdentityClaims,
  // Accounts
  Account,
  Subscription,
  Seat,
  TenantUsage,
  CreateAccountBody,
  UpdateSubscriptionBody,
  AddSeatBody,
  // Shield
  AgentRegistration,
  AgentSession,
  ScanRequest,
  ScanResult,
  Operation,
  OperationContext,
  // Documents
  Document,
  MutationRequest,
  MutationResponse,
  SearchRequest,
  SearchResponse,
  // Memory
  MemoryEntry,
  StoreRequest,
  MemoryQuery,
  // SOC
  StoredIncident,
  Alert,
  MetricSummary,
  AggregateHealth,
  PlatformStatus,
  LlmLogEntry,
  IngestResponse,
  ProxyTunnelEvent,
  CorrelatedSession,
  SessionTimeline,
  HostTrafficSummary,
  SessionCostSummary,
  ThreatHeatmapEntry,
  // Gateway
  ToolCall,
  ToolResult,
  InterceptResult,
  // Database
  ColumnDef,
  ColumnData,
  Filter,
  Aggregation,
  CreateTableRequest,
  InsertRequest,
  QueryRequest,
  QueryResponse,
  VectorSearchRequest,
  ScrollQueryRequest,
  ScrollQueryResponse,
  ClusterInitRequest,
  ClusterStatusResponse,
  // Fleet
  FleetStatus,
  FleetAgentSummary,
  ListAgentsParams,
  AgentListResponse,
  FleetAgentDetail,
  FleetCommand,
  FleetCommandAck,
  FleetBroadcastResult,
  FleetAgentMetric,
  AgentMetricsParams,
  AgentMetricsResponse,
  AgentCommandsParams,
  AgentCommandRow,
  AgentCommandsResponse,
  FleetConfig,
  FleetMessage,
  ClientHelloPayload,
  ServerHelloPayload,
  HeartbeatPayload,
  MetricsReportPayload,
  FleetToolCallTrace,
  FleetAlertPayload,
  FleetEvent,
} from './models.js';
