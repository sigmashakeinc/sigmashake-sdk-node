import { HttpClient } from './http.js';
import type { ToolCall, ToolResult, InterceptResult } from './models.js';

export class GatewayApi {
  constructor(private readonly http: HttpClient) {}

  /** Pre-intercept: evaluate a tool call before execution. */
  interceptPre(toolCall: ToolCall): Promise<InterceptResult> {
    return this.http.post<InterceptResult>('/v1/gateway/intercept/pre', toolCall);
  }

  /** Post-intercept: evaluate a tool result after execution. */
  interceptPost(toolResult: ToolResult): Promise<InterceptResult> {
    return this.http.post<InterceptResult>('/v1/gateway/intercept/post', toolResult);
  }

  /**
   * Wrap a callable so every invocation is intercepted by the SigmaShake gateway.
   *
   * The wrapped function behaves identically to the original — gateway
   * interception is transparent and non-fatal (if the gateway is unreachable,
   * the function still executes normally).
   *
   * Usage (3 commands to first event):
   * ```ts
   * import { SigmaShake } from 'sigmashake';
   * const client = new SigmaShake({ apiKey: 'sk-...' });
   * const monitoredFn = client.gateway.wrap(myAgentTool);
   * ```
   */
  wrap<A extends unknown[], R>(
    fn: (...args: A) => R | Promise<R>,
    opts?: { agentId?: string; sessionId?: string },
  ): (...args: A) => Promise<R> {
    const agentId = opts?.agentId ?? 'default';
    const sessionId = opts?.sessionId ?? crypto.randomUUID();
    const self = this;

    const wrapped = async function (...args: A): Promise<R> {
      const name = fn.name || 'unknown_tool';
      const input: Record<string, unknown> = { args };
      try {
        await self.interceptPre({ name, input, sessionId, agentId });
      } catch {
        // non-fatal — gateway unreachable, continue anyway
      }
      const result = await Promise.resolve(fn(...args));
      try {
        const output =
          result !== null && typeof result === 'object'
            ? (result as Record<string, unknown>)
            : { value: result };
        await self.interceptPost({ name, output, sessionId, agentId, durationMs: 0 });
      } catch {
        // non-fatal
      }
      return result;
    };

    // Preserve function name for debugging
    Object.defineProperty(wrapped, 'name', { value: fn.name || 'unknown_tool' });

    return wrapped;
  }
}
