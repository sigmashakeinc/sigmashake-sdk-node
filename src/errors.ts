/**
 * Base error for all SigmaShake API errors.
 */
export class SigmaShakeError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'SigmaShakeError';
    this.statusCode = statusCode;
    this.code = code;
    // Restore prototype chain (needed for instanceof checks with TS transpilation)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 401 — invalid or missing credentials. */
export class AuthenticationError extends SigmaShakeError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'authentication_error');
    this.name = 'AuthenticationError';
  }
}

/** 403 — valid credentials but insufficient permissions. */
export class AuthorizationError extends SigmaShakeError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'authorization_error');
    this.name = 'AuthorizationError';
  }
}

/** 404 — resource not found. */
export class NotFoundError extends SigmaShakeError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'not_found');
    this.name = 'NotFoundError';
  }
}

/** 400/422 — invalid request parameters. */
export class ValidationError extends SigmaShakeError {
  constructor(message = 'Validation failed') {
    super(message, 400, 'validation_error');
    this.name = 'ValidationError';
  }
}

/** 429 — rate limit exceeded. */
export class RateLimitError extends SigmaShakeError {
  readonly retryAfterMs: number | undefined;

  constructor(message = 'Rate limit exceeded', retryAfterMs?: number) {
    super(message, 429, 'rate_limit_error');
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** 500+ — server-side failure. */
export class ServerError extends SigmaShakeError {
  constructor(message = 'Internal server error', statusCode = 500) {
    super(message, statusCode, 'server_error');
    this.name = 'ServerError';
  }
}

/**
 * Maps an HTTP status code to the appropriate error class.
 */
export function errorFromStatus(statusCode: number, message: string, retryAfterMs?: number): SigmaShakeError {
  switch (statusCode) {
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 400:
    case 422:
      return new ValidationError(message);
    case 429:
      return new RateLimitError(message, retryAfterMs);
    default:
      if (statusCode >= 500) {
        return new ServerError(message, statusCode);
      }
      return new SigmaShakeError(message, statusCode, 'unknown_error');
  }
}
