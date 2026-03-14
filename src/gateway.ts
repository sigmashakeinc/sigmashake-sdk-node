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
}
