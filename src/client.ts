import { HttpClient, type HttpClientConfig } from './http.js';
import { AuthApi, IdentityApi } from './auth.js';
import { AccountsApi } from './accounts.js';
import { AgentsApi } from './agents.js';
import { ShieldApi } from './shield.js';
import { DocumentsApi } from './documents.js';
import { MemoryApi } from './memory.js';
import { SocApi } from './soc.js';
import { GatewayApi } from './gateway.js';
import { DbApi } from './db.js';
import { FleetApi } from './fleet.js';

export interface SigmaShakeConfig {
  /** API key (sk-...) */
  apiKey: string;
  /** Base URL of the SigmaShake API. Defaults to https://api.sigmashake.com */
  baseUrl?: string;
  /** Request timeout in milliseconds. Defaults to 30000. */
  timeout?: number;
  /** Additional headers to include in every request. */
  headers?: Record<string, string>;
}

/**
 * Main entry point for the SigmaShake SDK.
 *
 * ```ts
 * const client = new SigmaShake({ apiKey: 'sk-...' });
 * const token = await client.auth.createToken({ agentId: 'a1', scopes: ['read'] });
 * ```
 */
export class SigmaShake {
  readonly auth: AuthApi;
  readonly identity: IdentityApi;
  readonly accounts: AccountsApi;
  readonly agents: AgentsApi;
  readonly shield: ShieldApi;
  readonly documents: DocumentsApi;
  readonly memory: MemoryApi;
  readonly soc: SocApi;
  readonly gateway: GatewayApi;
  readonly db: DbApi;
  readonly fleet: FleetApi;

  constructor(config: SigmaShakeConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey is required');
    }

    const httpConfig: HttpClientConfig = {
      baseUrl: config.baseUrl ?? 'https://api.sigmashake.com',
      apiKey: config.apiKey,
      timeout: config.timeout,
      headers: config.headers,
    };

    const http = new HttpClient(httpConfig);

    this.auth = new AuthApi(http);
    this.identity = new IdentityApi(http);
    this.accounts = new AccountsApi(http);
    this.agents = new AgentsApi(http);
    this.shield = new ShieldApi(http);
    this.documents = new DocumentsApi(http);
    this.memory = new MemoryApi(http);
    this.soc = new SocApi(http);
    this.gateway = new GatewayApi(http);
    this.db = new DbApi(http);
    this.fleet = new FleetApi(http);
  }
}
