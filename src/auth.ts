import { HttpClient } from './http.js';
import type {
  TokenRequest,
  TokenResponse,
  IssueIdentityRequest,
  IdentityTokenResponse,
} from './models.js';

export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  /** Create an API token with specified scopes. */
  createToken(request: TokenRequest): Promise<TokenResponse> {
    return this.http.post<TokenResponse>('/api/auth/token', request);
  }

  /** Revoke an existing token. */
  revokeToken(token: string): Promise<void> {
    return this.http.post<void>('/api/auth/token/revoke', { token });
  }
}

export class IdentityApi {
  constructor(private readonly http: HttpClient) {}

  /** Issue an agent identity token. */
  issue(_request: IssueIdentityRequest): Promise<IdentityTokenResponse> {
    return Promise.reject(new Error('Not yet implemented'));
  }

  /** Verify an identity token and return its claims. */
  verify(_token: string): Promise<IdentityTokenResponse> {
    return Promise.reject(new Error('Not yet implemented'));
  }
}
