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

## License

MIT
