# sigmashake

Official TypeScript SDK for the [SigmaShake](https://sigmashake.com) platform API.

## Install

```bash
npm install sigmashake
```

## Quick Start

```typescript
import { SigmaShake } from 'sigmashake';

const client = new SigmaShake({ apiKey: 'sk-...' });

// Auth
const token = await client.auth.createToken({
  agentId: 'agent-1',
  scopes: ['read', 'write'],
});

// Shield — scan an operation for risk
const result = await client.shield.scan({
  agentId: 'agent-1',
  sessionId: 'sess-1',
  operation: { name: 'Bash', input: { command: 'ls' } },
});

// Memory — store and recall agent context
await client.memory.store({ key: 'context', value: '...', tags: ['session-1'] });
const memories = await client.memory.recall({ tags: ['session-1'] });

// Database — columnar storage
await client.db.createTable('events', {
  columns: [
    { name: 'id', colType: 'uint64' },
    { name: 'data', colType: 'string' },
  ],
});
const rows = await client.db.query('events', {
  filters: [{ column: 'id', op: 'gt', value: 1 }],
});
```

## API Namespaces

| Namespace | Description |
|-----------|-------------|
| `client.auth` | Token creation and revocation |
| `client.identity` | Agent identity issuance and verification |
| `client.accounts` | Account, subscription, and seat management |
| `client.agents` | Agent session registration and lifecycle |
| `client.shield` | Operation risk scanning |
| `client.documents` | Document CRUD and search |
| `client.memory` | Agent memory store/recall |
| `client.soc` | Incidents, metrics, timelines, threat heatmaps |
| `client.gateway` | Tool call interception (pre/post) |
| `client.db` | Tables, queries, vector search, scroll, clusters |

## Configuration

```typescript
const client = new SigmaShake({
  apiKey: 'sk-...',                          // required
  baseUrl: 'https://api.sigmashake.com',     // optional (default)
  timeout: 30000,                            // optional, ms (default: 30000)
  headers: { 'X-Custom': 'value' },          // optional extra headers
});
```

## Error Handling

All API errors are typed:

```typescript
import { AuthenticationError, RateLimitError } from 'sigmashake';

try {
  await client.accounts.get('acc-1');
} catch (err) {
  if (err instanceof RateLimitError) {
    console.log(`Retry after ${err.retryAfterMs}ms`);
  }
}
```

## Requirements

- Node.js 18+ (uses native `fetch`)
- Also works in Deno, Bun, and modern browsers

## OpenAPI Drift Detection

Types in `src/models.ts` must match the canonical OpenAPI spec in
`sigmashake-openapi/openapi.yaml`. A drift detector validates that all schemas
and fields in the spec are represented in the SDK.

```bash
# From SDK root (requires sigmashake-openapi as sibling)
python3 scripts/validate_models.py

# JSON output for CI
python3 scripts/validate_models.py --json

# Or from the openapi repo
cd ../sigmashake-openapi
./validate-sdks.sh --node
```

The validator exits non-zero when drift is detected. Run it before submitting
changes to `models.ts` and after any OpenAPI spec updates.

## Key Classes and Methods

### `SigmaShake` — Main Client

```typescript
import { SigmaShake } from 'sigmashake';

const client = new SigmaShake({
  apiKey: 'sk-...',               // required
  baseUrl: 'https://api.sigmashake.com', // optional
  timeout: 30000,                 // optional, ms
  headers: {},                    // optional extra headers
});
```

| Property | Type | Description |
|----------|------|-------------|
| `auth` | `AuthApi` | Token creation and revocation |
| `identity` | `IdentityApi` | Agent identity issuance and verification |
| `accounts` | `AccountsApi` | Account, subscription, and seat management |
| `agents` | `AgentsApi` | Agent session registration and lifecycle |
| `shield` | `ShieldApi` | Operation risk scanning |
| `documents` | `DocumentsApi` | Document CRUD and semantic search |
| `memory` | `MemoryApi` | Agent memory store and recall |
| `soc` | `SocApi` | Incidents, metrics, timelines, threat heatmaps |
| `gateway` | `GatewayApi` | Tool call interception (pre/post) |
| `db` | `DbApi` | Tables, queries, vector search, scroll, clusters |
| `fleet` | `FleetApi` | Fleet status and agent management |
| `pulse` | `PulseApi` | Platform health and bottleneck reporting |

### `AuthApi`

| Method | Signature | Description |
|--------|-----------|-------------|
| `createToken` | `(req: TokenRequest) => Promise<TokenResponse>` | Create a scoped auth token |
| `revokeToken` | `(token: string) => Promise<void>` | Revoke an auth token |

### `ShieldApi`

| Method | Signature | Description |
|--------|-----------|-------------|
| `registerAgent` | `(req) => Promise<AgentSession>` | Register an agent session |
| `scan` | `(req: ScanRequest) => Promise<ScanResult>` | Scan an operation for policy violations |
| `endSession` | `(sessionId: string) => Promise<void>` | End an active agent session |

### `MemoryApi`

| Method | Signature | Description |
|--------|-----------|-------------|
| `store` | `(req: StoreRequest) => Promise<MemoryEntry>` | Store a key-value memory entry |
| `recall` | `(query: MemoryQuery) => Promise<MemoryEntry[]>` | Recall memory entries by tags or key |
| `delete` | `(key: string) => Promise<void>` | Delete a memory entry |

### Error Classes

| Class | Description |
|-------|-------------|
| `SigmaShakeError` | Base class for all SDK errors |
| `AuthenticationError` | Invalid or missing API key (HTTP 401) |
| `AuthorizationError` | Insufficient permissions (HTTP 403) |
| `NotFoundError` | Resource not found (HTTP 404) |
| `ValidationError` | Request validation failure (HTTP 422) |
| `RateLimitError` | Rate limit exceeded (HTTP 429); has `retryAfterMs` |
| `ServerError` | Server-side error (HTTP 5xx) |

## Generating Docs

```bash
npm install
npm run docs
# Output in docs/index.html
```

## License

MIT
