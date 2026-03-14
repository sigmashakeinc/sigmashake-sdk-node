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
    return this.http.post<TokenResponse>('/v1/auth/token', request);
  }

  /** Revoke an existing token. */
  revokeToken(token: string): Promise<void> {
    return this.http.post<void>('/v1/auth/token/revoke', { token });
  }
}

export class IdentityApi {
  constructor(private readonly http: HttpClient) {}

  /** Issue an agent identity token. */
  issue(request: IssueIdentityRequest): Promise<IdentityTokenResponse> {
    return this.http.post<IdentityTokenResponse>('/v1/identity/issue', request);
  }

  /** Verify an identity token and return its claims. */
  verify(token: string): Promise<IdentityTokenResponse> {
    return this.http.post<IdentityTokenResponse>('/v1/identity/verify', { token });
  }
}
