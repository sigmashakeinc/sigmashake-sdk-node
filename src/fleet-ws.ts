import type {
  FleetMessage,
  FleetMessageType,
  ClientHelloPayload,
  ServerHelloPayload,
  HeartbeatPayload,
  MetricsReportPayload,
  FleetToolCallTrace,
  FleetAlertPayload,
  FleetCommandAck,
  AgentStatus,
} from './models.js';
import { FleetMessageType as MsgType } from './models.js';

/** Configuration for the fleet WebSocket connection. */
export interface FleetConnectionConfig {
  /** WebSocket URL (e.g. wss://api.sigmashake.com/v1/fleet/ws). */
  url: string;
  /** JWT Bearer token for authentication. */
  token: string;
  /** Agent identifier. */
  agentId: string;
  /** Agent version string. */
  version: string;
  /** Agent capabilities list. */
  capabilities?: string[];
  /** Max reconnection attempts. Defaults to 10. */
  maxReconnectAttempts?: number;
  /** Initial reconnect delay in ms. Defaults to 1000. */
  reconnectDelayMs?: number;
  /** Max reconnect delay in ms (cap for exponential backoff). Defaults to 30000. */
  maxReconnectDelayMs?: number;
}

type FleetEventMap = {
  /** Fired after ServerHello received. */
  connected: (session: ServerHelloPayload) => void;
  /** Fired when connection closes. */
  disconnected: (code: number, reason: string) => void;
  /** Fired on inbound command from server. */
  command: (commandId: string, commandType: string, payload: Record<string, unknown>) => void;
  /** Fired on inbound config update. */
  configUpdate: (config: Record<string, unknown>) => void;
  /** Fired on inbound capability change. */
  capabilityChange: (capabilities: string[]) => void;
  /** Fired on any error. */
  error: (err: Error) => void;
};

type EventKey = keyof FleetEventMap;

/**
 * WebSocket client for the SigmaShake Fleet Protocol.
 *
 * Handles the full connection lifecycle: ClientHello/ServerHello handshake,
 * automatic heartbeats, periodic metrics reporting, inbound command handling,
 * and reconnection with exponential backoff.
 *
 * ```ts
 * const conn = new FleetConnection({
 *   url: 'wss://api.sigmashake.com/v1/fleet/ws',
 *   token: jwt,
 *   agentId: 'agent-1',
 *   version: '2.1.0',
 * });
 * conn.on('command', (id, type, payload) => { ... });
 * await conn.connect();
 * ```
 */
export class FleetConnection {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private metricsTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private closed = false;
  private readonly listeners = new Map<EventKey, Set<FleetEventMap[EventKey]>>();
  private metricsProvider: (() => Omit<MetricsReportPayload, 'agentId'>) | null = null;

  private readonly config: Required<
    Pick<FleetConnectionConfig, 'maxReconnectAttempts' | 'reconnectDelayMs' | 'maxReconnectDelayMs' | 'capabilities'>
  > &
    FleetConnectionConfig;

  constructor(config: FleetConnectionConfig) {
    this.config = {
      ...config,
      capabilities: config.capabilities ?? [],
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectDelayMs: config.reconnectDelayMs ?? 1000,
      maxReconnectDelayMs: config.maxReconnectDelayMs ?? 30_000,
    };
  }

  /** Register an event listener. */
  on<K extends EventKey>(event: K, handler: FleetEventMap[K]): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as FleetEventMap[EventKey]);
    return this;
  }

  /** Remove an event listener. */
  off<K extends EventKey>(event: K, handler: FleetEventMap[K]): this {
    this.listeners.get(event)?.delete(handler as FleetEventMap[EventKey]);
    return this;
  }

  /** Set a provider function that returns current metrics for periodic reporting. */
  setMetricsProvider(provider: () => Omit<MetricsReportPayload, 'agentId'>): this {
    this.metricsProvider = provider;
    return this;
  }

  /** Open the WebSocket connection. Resolves after ServerHello is received. */
  connect(): Promise<ServerHelloPayload> {
    if (this.closed) {
      return Promise.reject(new Error('FleetConnection has been closed'));
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.config.url, ['fleet-v1']);

      ws.addEventListener('open', () => {
        this.ws = ws;
        this.sendMessage(MsgType.ClientHello, {
          agentId: this.config.agentId,
          version: this.config.version,
          capabilities: this.config.capabilities,
        } satisfies ClientHelloPayload);
      });

      ws.addEventListener('message', (event) => {
        const msg = this.parseMessage(event.data);
        if (!msg) return;

        if (msg.messageType === MsgType.ServerHello) {
          const payload = msg.payload as unknown as ServerHelloPayload;
          this.sessionId = payload.sessionId;
          this.reconnectAttempt = 0;
          this.startHeartbeat(payload.heartbeatIntervalMs);
          this.startMetrics(payload.metricsIntervalMs);
          this.emit('connected', payload);
          resolve(payload);
        }
      });

      ws.addEventListener('message', (event) => {
        const msg = this.parseMessage(event.data);
        if (!msg) return;
        this.handleMessage(msg);
      });

      ws.addEventListener('close', (event) => {
        this.stopTimers();
        this.emit('disconnected', event.code, event.reason);
        if (!this.closed) {
          this.scheduleReconnect();
        }
      });

      ws.addEventListener('error', () => {
        const err = new Error('WebSocket connection error');
        this.emit('error', err);
        if (!this.sessionId) {
          reject(err);
        }
      });
    });
  }

  /** Send a heartbeat manually. Usually handled automatically. */
  sendHeartbeat(status: AgentStatus, uptimeSecs: number): void {
    this.sendMessage(MsgType.Heartbeat, {
      agentId: this.config.agentId,
      status,
      uptimeSecs,
    } satisfies HeartbeatPayload);
  }

  /** Send a metrics report. Usually handled automatically via metricsProvider. */
  sendMetrics(metrics: Omit<MetricsReportPayload, 'agentId'>): void {
    this.sendMessage(MsgType.MetricsReport, {
      agentId: this.config.agentId,
      ...metrics,
    } satisfies MetricsReportPayload);
  }

  /** Send a tool call trace. */
  sendToolCallTrace(trace: Omit<FleetToolCallTrace, 'agentId'>): void {
    this.sendMessage(MsgType.ToolCallTrace, {
      agentId: this.config.agentId,
      ...trace,
    } satisfies FleetToolCallTrace);
  }

  /** Send an alert. */
  sendAlert(alert: Omit<FleetAlertPayload, 'agentId'>): void {
    this.sendMessage(MsgType.AgentAlert, {
      agentId: this.config.agentId,
      ...alert,
    } satisfies FleetAlertPayload);
  }

  /** Acknowledge a command. */
  acknowledgeCommand(commandId: string, success: boolean, message?: string): void {
    this.sendMessage(MsgType.CommandAck, {
      commandId,
      agentId: this.config.agentId,
      success,
      message,
      timestamp: new Date().toISOString(),
    } satisfies FleetCommandAck);
  }

  /** Close the connection permanently (no reconnect). */
  close(): void {
    this.closed = true;
    this.stopTimers();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'client_close');
    }
    this.ws = null;
    this.sessionId = null;
  }

  /** Whether the connection is currently open. */
  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /** Current session ID (set after ServerHello). */
  get currentSessionId(): string | null {
    return this.sessionId;
  }

  // ── Internal ─────────────────────────────────────────────────────

  private sendMessage(messageType: FleetMessageType, payload: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const msg: FleetMessage = {
      version: 1,
      messageType,
      timestamp: new Date().toISOString(),
      payload,
    };
    this.ws.send(JSON.stringify(msg));
  }

  private parseMessage(data: unknown): FleetMessage | null {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data) as FleetMessage;
      }
      return null;
    } catch {
      return null;
    }
  }

  private handleMessage(msg: FleetMessage): void {
    switch (msg.messageType) {
      case MsgType.Command: {
        const { commandId, commandType, ...rest } = msg.payload as {
          commandId: string;
          commandType: string;
          [key: string]: unknown;
        };
        this.emit('command', commandId, commandType, rest);
        break;
      }
      case MsgType.ConfigUpdate:
        this.emit('configUpdate', msg.payload);
        break;
      case MsgType.CapabilityChange: {
        const capabilities = (msg.payload as { capabilities: string[] }).capabilities;
        this.emit('capabilityChange', capabilities);
        break;
      }
      // ServerHello handled in connect()
      default:
        break;
    }
  }

  private emit<K extends EventKey>(event: K, ...args: Parameters<FleetEventMap[K]>): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      try {
        (handler as (...a: unknown[]) => void)(...args);
      } catch {
        // Swallow listener errors to prevent breaking the event loop
      }
    }
  }

  private startHeartbeat(intervalMs: number): void {
    this.stopTimer('heartbeat');
    const startTime = Date.now();
    this.heartbeatTimer = setInterval(() => {
      const uptimeSecs = Math.floor((Date.now() - startTime) / 1000);
      this.sendHeartbeat('active', uptimeSecs);
    }, intervalMs);
  }

  private startMetrics(intervalMs: number): void {
    this.stopTimer('metrics');
    if (!this.metricsProvider) return;
    this.metricsTimer = setInterval(() => {
      if (this.metricsProvider) {
        this.sendMetrics(this.metricsProvider());
      }
    }, intervalMs);
  }

  private stopTimers(): void {
    this.stopTimer('heartbeat');
    this.stopTimer('metrics');
  }

  private stopTimer(which: 'heartbeat' | 'metrics'): void {
    const ref = which === 'heartbeat' ? 'heartbeatTimer' : 'metricsTimer';
    if (this[ref]) {
      clearInterval(this[ref]);
      this[ref] = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempt >= this.config.maxReconnectAttempts) {
      this.emit('error', new Error(
        `Reconnection exhausted after ${this.config.maxReconnectAttempts} attempts`,
      ));
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelayMs * Math.pow(2, this.reconnectAttempt),
      this.config.maxReconnectDelayMs,
    );
    this.reconnectAttempt++;

    setTimeout(() => {
      if (!this.closed) {
        this.connect().catch((err) => {
          this.emit('error', err instanceof Error ? err : new Error(String(err)));
        });
      }
    }, delay);
  }
}
