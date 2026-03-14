import { errorFromStatus, SigmaShakeError } from './errors.js';

export interface HttpClientConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  headers?: Record<string, string>;
}

interface ApiErrorBody {
  message?: string;
  error?: string;
}

/**
 * Minimal HTTP client built on native fetch. Zero dependencies.
 */
export class HttpClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeout: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: HttpClientConfig) {
    // Strip trailing slash
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30_000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...config.headers,
    };
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        let message: string;
        try {
          const json: ApiErrorBody = JSON.parse(text);
          message = json.message ?? json.error ?? text;
        } catch {
          message = text || `HTTP ${response.status}`;
        }

        const retryAfter = response.headers.get('retry-after');
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;

        throw errorFromStatus(response.status, message, retryAfterMs);
      }

      // 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof SigmaShakeError) {
        throw err;
      }
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new SigmaShakeError(`Request timed out after ${this.timeout}ms`, 408, 'timeout');
      }
      throw new SigmaShakeError(
        err instanceof Error ? err.message : 'Unknown fetch error',
        0,
        'network_error',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }
}
