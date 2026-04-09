/**
 * WebSocket Server
 *
 * Main WebSocket server implementation using Bun's native WebSocket support.
 * Integrates with Hono for hybrid HTTP/WebSocket serving.
 */

import type { WSSession, WSSocket } from '../../types/websocket.js';
import { safeValidateClientMessage } from './message-schemas.js';
import { ConnectionManager } from './connection-manager.js';
import { EventManager } from './event-manager.js';
import { MessageRouter } from './message-router.js';
import type { PlatformAdapter } from '../../platforms/platform-adapter.js';
import type { WindowsNutJsService } from '../windows-nutjs.js';
import type { CMDSessionService } from '../cmd/cmd-session-service.js';
import type { CMDTerminalCore } from '../terminal/cmd-terminal-core.js';
import type { SidofunCore } from '../../core/sidofun-core.js';
import type { SessionManagerService } from '../session-manager/session-manager-service.js';
import type { StreamType } from '../../types/websocket.js';

interface RecoverableStreamState {
  streamType: StreamType;
  interval: number;
  params?: Record<string, unknown>;
}

interface RecoverableSessionState {
  subscriptions: StreamType[];
  streams: RecoverableStreamState[];
}

interface WebSocketServerOptions {
  port?: number;
  heartbeatInterval?: number;
  maxConnections?: number;
  cmdService?: CMDSessionService; // Shared CMD service instance
  cmdTerminalCore?: CMDTerminalCore;
  core?: SidofunCore;
  sessionManager?: SessionManagerService;
}

export class WebSocketServer {
  private connectionManager: ConnectionManager;
  private eventManager: EventManager;
  private messageRouter: MessageRouter;
  private heartbeatIntervals: Map<string, ReturnType<typeof setInterval>>;
  private heartbeatInterval: number;
  private sessionManager?: SessionManagerService;
  private recoverableSessions: Map<string, RecoverableSessionState>;

  constructor(
    private platform: PlatformAdapter,
    private windowsNutJs: WindowsNutJsService,
    private options: WebSocketServerOptions = {}
  ) {
    this.connectionManager = new ConnectionManager();
    this.eventManager = new EventManager(this.connectionManager);
    this.messageRouter = new MessageRouter(
      this.platform,
      this.connectionManager,
      this.eventManager,
      this.windowsNutJs,
      options.cmdService,
      options.cmdTerminalCore,
      options.core
    );
    this.heartbeatIntervals = new Map();
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.sessionManager = options.sessionManager;
    this.recoverableSessions = new Map();
  }

  /**
   * Get the connection manager (for external access if needed)
   */
  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }

  /**
   * Get the event manager (for external access if needed)
   */
  getEventManager(): EventManager {
    return this.eventManager;
  }

  /**
   * Handle WebSocket connection opened
   */
  handleOpen(ws: WSSocket, sessionId?: string): void {
    const requestedSessionId = sessionId || ws.data?.sessionId;
    const generatedId = requestedSessionId || this.generateSessionId();
    const existingConnection = requestedSessionId
      ? this.connectionManager.getConnection(requestedSessionId)
      : undefined;

    if (existingConnection) {
      try {
        existingConnection.socket.close();
      } catch {
        // Best-effort close of superseded socket.
      }
      this.stopHeartbeat(existingConnection.id);
      this.eventManager.stopAllStreamsForSession(existingConnection.id);
      this.connectionManager.removeConnection(existingConnection.id);
    }

    const id = this.resolveSessionId(generatedId);

    const session: WSSession = {
      id,
      socket: ws,
      connectedAt: new Date(),
      lastActivity: new Date(),
      subscriptions: new Set()
    };

    this.connectionManager.addConnection(session);
    this.restoreRecoverableState(id);

    // Send welcome message
    this.messageRouter.sendConnected(ws, id);

    // Start heartbeat
    this.startHeartbeat(id, ws);
  }

  /**
   * Handle WebSocket message received
   */
  handleMessage(ws: WSSocket, message: string | Buffer): void {
    const session = this.connectionManager.findSessionBySocket(ws);
    if (!session) {
      console.warn('⚠️ Received message from unknown session');
      return;
    }

    session.lastActivity = new Date();
    this.sessionManager?.touchSession(session.id);

    try {
      const data = JSON.parse(message.toString());

      // Validate message
      const validation = safeValidateClientMessage(data);
      if (!validation.success) {
        console.error('❌ Invalid message schema:', validation.error?.issues);
        ws.send(JSON.stringify({
          id: this.generateId(),
          type: 'error',
          timestamp: new Date().toISOString(),
          payload: {
            code: 'INVALID_SCHEMA',
            message: 'Message does not match expected schema',
            details: validation.error?.issues
          }
        }));
        return;
      }

      // Route the validated message
      this.messageRouter.handleMessage(session.id, validation.data!, ws);
    } catch (error) {
      console.error(`❌ Failed to parse message:`, error);
      ws.send(JSON.stringify({
        id: this.generateId(),
        type: 'error',
        timestamp: new Date().toISOString(),
        payload: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse message as JSON'
        }
      }));
    }
  }

  /**
   * Handle WebSocket connection closed
   */
  handleClose(ws: WSSocket): void {
    const session = this.connectionManager.findSessionBySocket(ws);
    if (session) {
      this.captureRecoverableState(session.id);

      // Stop heartbeat
      this.stopHeartbeat(session.id);

      // Stop all streams for this session
      this.eventManager.stopAllStreamsForSession(session.id);

      // Remove connection
      this.connectionManager.removeConnection(session.id);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleError(ws: WSSocket, error: Error): void {
    console.error(`❌ WebSocket error:`, error);
    const session = this.connectionManager.findSessionBySocket(ws);
    if (session) {
      console.error(`   Session: ${session.id}`);
    }
  }

  /**
   * Start heartbeat for a session
   */
  private startHeartbeat(sessionId: string, ws: WSSocket): void {
    const intervalId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        this.messageRouter.sendHeartbeat(ws);
      } else {
        this.stopHeartbeat(sessionId);
      }
    }, this.heartbeatInterval);

    this.heartbeatIntervals.set(sessionId, intervalId);
  }

  /**
   * Stop heartbeat for a session
   */
  private stopHeartbeat(sessionId: string): void {
    const intervalId = this.heartbeatIntervals.get(sessionId);
    if (intervalId) {
      clearInterval(intervalId);
      this.heartbeatIntervals.delete(sessionId);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private resolveSessionId(requestedSessionId: string): string {
    if (!this.sessionManager) {
      return requestedSessionId;
    }

    if (this.sessionManager.hasSession(requestedSessionId)) {
      this.sessionManager.touchSession(requestedSessionId);
      return requestedSessionId;
    }

    return this.sessionManager.createSession({
      clientKind: 'websocket',
      name: `ws:${requestedSessionId}`
    }).id;
  }

  private captureRecoverableState(sessionId: string): void {
    const session = this.connectionManager.getConnection(sessionId);
    if (!session) {
      return;
    }

    const streams = this.eventManager.getStreamsForSession(sessionId).map((stream) => ({
      streamType: stream.streamType,
      interval: stream.interval,
      params: stream.params
    }));

    this.recoverableSessions.set(sessionId, {
      subscriptions: [...session.subscriptions],
      streams
    });
  }

  private restoreRecoverableState(sessionId: string): void {
    const recoverable = this.recoverableSessions.get(sessionId);
    if (!recoverable) {
      return;
    }

    for (const subscription of recoverable.subscriptions) {
      this.eventManager.subscribe(sessionId, subscription);
    }

    for (const stream of recoverable.streams) {
      try {
        this.messageRouter.startRecoverableStream(
          sessionId,
          stream.streamType,
          stream.interval,
          stream.params ?? {}
        );
      } catch (error) {
        console.warn(`⚠️ Failed to restore ${stream.streamType} stream for ${sessionId}:`, error);
      }
    }

    this.recoverableSessions.delete(sessionId);
  }

  /**
   * Generate a unique message ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get server statistics
   */
  getStats(): {
    connections: ReturnType<ConnectionManager['getStats']>;
    streams: ReturnType<EventManager['getStats']>;
  } {
    return {
      connections: this.connectionManager.getStats(),
      streams: this.eventManager.getStats()
    };
  }

  /**
   * Cleanup all resources (for shutdown)
   */
  shutdown(): void {
    console.log('🛑 Shutting down WebSocket server...');

    // Stop all heartbeats
    this.heartbeatIntervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this.heartbeatIntervals.clear();

    // Stop all streams
    this.eventManager.stopAllStreams();

    // Close all connections
    this.connectionManager.getAllConnections().forEach(session => {
      try {
        session.socket.close();
      } catch (error) {
        // Ignore errors during shutdown
      }
    });

    console.log('✅ WebSocket server shutdown complete');
  }
}
