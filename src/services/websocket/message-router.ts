/**
 * WebSocket Message Router
 *
 * Routes incoming WebSocket messages to appropriate handlers.
 * Validates messages and executes actions via the platform adapter.
 */

import type { StreamType, QueryType, WSSocket, ResponsePayload } from '../../types/websocket.js';
import type {
  ClientMessage,
  ActionPayload,
  BatchPayload,
  SubscribePayload,
  QueryPayload,
  StreamPayload,
  CMDPayload
} from './message-schemas.js';
import { ErrorCode } from './message-schemas.js';
import { ConnectionManager } from './connection-manager.js';
import { EventManager } from './event-manager.js';
import { CMDSessionService } from '../cmd/cmd-session-service.js';
import { WebSocketCMDHandlers } from './cmd-handlers.js';
import { automationActionValues, streamTypeValues } from '../../core/command-schemas.js';
import type { DesktopActionType } from '../../core/command-schemas.js';
import type { PlatformAdapter } from '../../platforms/platform-adapter.js';
import type { WindowsNutJsService } from '../windows-nutjs.js';
import { CMDTerminalCore } from '../terminal/cmd-terminal-core.js';
import { SidofunCore } from '../../core/sidofun-core.js';
import { BrowserExtensionService } from '../browser-extension/browser-extension-service.js';

const OWNED_AUTOMATION_ACTIONS = new Set([
  'browser_runtime_create',
  'browser_page_open',
  'desktop_scope_create',
  'trace_start',
  'trajectory_start',
  'terminal_spawn'
]);

export class MessageRouter {
  private cmdService: CMDSessionService;
  private cmdHandlers: WebSocketCMDHandlers;
  private terminalCore: CMDTerminalCore;
  private core?: SidofunCore;

  constructor(
    private platform: PlatformAdapter,
    private connectionManager: ConnectionManager,
    private eventManager: EventManager,
    windowsNutJs: WindowsNutJsService,
    cmdService?: CMDSessionService,
    terminalCore?: CMDTerminalCore,
    core?: SidofunCore
  ) {
    // Use provided CMD service or create new one
    this.cmdService = cmdService || new CMDSessionService(windowsNutJs);
    this.terminalCore = terminalCore || new CMDTerminalCore(this.cmdService, windowsNutJs);
    this.cmdHandlers = new WebSocketCMDHandlers(this.terminalCore);
    this.core = core;
  }

  /**
   * Route an incoming message to the appropriate handler
   */
  async handleMessage(sessionId: string, message: ClientMessage, socket: WSSocket): Promise<void> {
    console.log(`📨 Received ${message.type} message from ${sessionId}`);

    try {
      switch (message.type) {
        case 'action':
          await this.handleAction(sessionId, message.id, message.payload, socket);
          break;

        case 'batch':
          await this.handleBatch(sessionId, message.id, message.payload, socket);
          break;

        case 'subscribe':
          await this.handleSubscribe(sessionId, message.id, message.payload, socket);
          break;

        case 'query':
          await this.handleQuery(sessionId, message.id, message.payload, socket);
          break;

        case 'stream':
          await this.handleStream(sessionId, message.id, message.payload, socket);
          break;

        case 'cmd':
          await this.handleCMD(sessionId, message.id, message.payload, socket);
          break;
      }
    } catch (error: any) {
      console.error(`❌ Error handling message:`, error);
      this.sendError(socket, message.id, ErrorCode.INTERNAL_ERROR, error.message);
    }
  }

  /**
   * Handle action message - execute a single action
   */
  private async handleAction(
    sessionId: string,
    messageId: string,
    payload: ActionPayload,
    socket: WSSocket
  ): Promise<void> {
    const { action, params } = payload;

    try {
      const effectiveParams = this.attachOwnerSessionId(action, params, sessionId);
      const result = this.core
        ? await this.core.executeAutomationAction(action, effectiveParams)
        : await this.platform.executeDesktopAction({
          type: action as DesktopActionType,
          ...effectiveParams
        });

      this.sendResponse(socket, messageId, {
        success: true,
        result
      });
    } catch (error: any) {
      this.sendError(socket, messageId, ErrorCode.ACTION_FAILED, error.message);
    }
  }

  /**
   * Handle batch message - execute multiple actions in sequence
   */
  private async handleBatch(
    sessionId: string,
    messageId: string,
    payload: BatchPayload,
    socket: WSSocket
  ): Promise<void> {
    const { actions } = payload;
    const results: Array<{ success: boolean; result?: any; error?: string }> = [];

    for (const { action, params } of actions) {
      try {
        const effectiveParams = this.attachOwnerSessionId(action, params, sessionId);
        const result = this.core
          ? await this.core.executeAutomationAction(action, effectiveParams)
          : await this.platform.executeDesktopAction({
              type: action as DesktopActionType,
              ...effectiveParams
            });
        results.push({ success: true, result });

        // Stop on first error
        if (!result) {
          break;
        }
      } catch (error: any) {
        results.push({ success: false, error: error.message });
        break; // Stop on first error
      }
    }

    this.sendBatchResponse(socket, messageId, results);
  }

  /**
   * Handle subscribe message - subscribe to event streams
   */
  private async handleSubscribe(
    sessionId: string,
    messageId: string,
    payload: SubscribePayload,
    socket: WSSocket
  ): Promise<void> {
    const { events } = payload;

    events.forEach(event => {
      this.eventManager.subscribe(sessionId, event);
    });

    this.sendResponse(socket, messageId, {
      success: true,
      subscribed: events
    });
  }

  /**
   * Handle query message - query current state
   */
  private async handleQuery(
    sessionId: string,
    messageId: string,
    payload: QueryPayload,
    socket: WSSocket
  ): Promise<void> {
    const { query } = payload;
    let result: any;

    try {
      switch (query) {
        case 'active_window':
          result = await this.platform.executeDesktopAction({ type: 'get_active_window' });
          break;

        case 'screen_size':
          result = await this.platform.getScreenSize();
          break;

        case 'mouse_position':
          result = await this.platform.getMousePosition();
          break;

        default:
          throw new Error(`Unknown query: ${query}`);
      }

      this.sendResponse(socket, messageId, {
        success: true,
        result
      });
    } catch (error: any) {
      this.sendError(socket, messageId, ErrorCode.QUERY_FAILED, error.message);
    }
  }

  /**
   * Handle stream message - start/stop event streams
   */
  private async handleStream(
    sessionId: string,
    messageId: string,
    payload: StreamPayload,
    socket: WSSocket
  ): Promise<void> {
    const { command, stream, interval = 1000, params = {} } = payload;

    if (command === 'start') {
      try {
        const streamId = this.startRecoverableStream(sessionId, stream, interval, params);
        this.sendResponse(socket, messageId, {
          success: true,
          streamId,
          message: `Started ${stream} stream at ${interval}ms interval`
        });
      } catch (error: any) {
        this.sendError(socket, messageId, ErrorCode.UNSUPPORTED_STREAM, error.message);
      }
    } else if (command === 'stop') {
      this.eventManager.stopAllStreamsForSession(sessionId);

      this.sendResponse(socket, messageId, {
        success: true,
        message: 'Stopped all streams for this session'
      });
    }
  }

  startRecoverableStream(
    sessionId: string,
    stream: StreamType,
    interval: number,
    params: Record<string, unknown> = {}
  ): string {
    if (stream === 'screenshot') {
      const screenshotFn = () => this.platform.takeScreenshot('png');
      return this.eventManager.startScreenshotStream(sessionId, interval, screenshotFn);
    }

    if (stream === 'browserext_session_events') {
      if (!this.core) {
        throw new Error('Browser extension session event streaming requires SidofunCore');
      }
      const targetSessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
      if (!targetSessionId) {
        throw new Error('browserext_session_events stream requires params.sessionId');
      }
      const seenIds = new Set<string>();
      void this.seedBrowserExtensionEventStream(
        stream,
        targetSessionId,
        seenIds,
        params,
        'browser_extension_session_events',
        (event) => {
          if (typeof params.kind === 'string' && event.kind !== params.kind) {
            return false;
          }
          if (typeof params.ok === 'boolean' && event.ok !== params.ok) {
            return false;
          }
          return true;
        }
      ).catch((error) => {
        console.error('Failed to seed browserext session event stream:', error);
      });
      const stop = BrowserExtensionService.subscribeToProviderStream('session_events', targetSessionId, ({ events }) => {
        this.emitSeededBrowserExtensionEvents(stream, targetSessionId, events, seenIds, (event) => {
          if (typeof params.kind === 'string' && event.kind !== params.kind) {
            return false;
          }
          if (typeof params.ok === 'boolean' && event.ok !== params.ok) {
            return false;
          }
          return true;
        });
      });
      return this.eventManager.startManagedStream(sessionId, stream, stop, params);
    }

    if (stream === 'browserext_tabs') {
      if (!this.core) {
        throw new Error('Browser extension tab streaming requires SidofunCore');
      }
      const targetSessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
      if (!targetSessionId) {
        throw new Error('browserext_tabs stream requires params.sessionId');
      }
      let lastFingerprint = '';
      void this.seedBrowserExtensionSessionStateStream(
        targetSessionId,
        params,
        (session) => {
          const tabs = session.tabs ?? [];
          const activeTabId = typeof session.activeTabId === 'number' ? session.activeTabId : undefined;
          const fingerprint = JSON.stringify({
            activeTabId,
            tabs: tabs.map((tab) => ({
              id: tab.id,
              windowId: tab.windowId,
              url: tab.url,
              title: tab.title,
              active: tab.active
            }))
          });
          if (fingerprint === lastFingerprint) {
            return;
          }
          lastFingerprint = fingerprint;
          this.eventManager.emit(stream, {
            sessionId: targetSessionId,
            count: tabs.length,
            activeTabId,
            tabs
          });
        }
      ).catch((error) => {
        console.error('Failed to seed browserext tabs stream:', error);
      });
      const stop = BrowserExtensionService.subscribeToProviderStream('session_state', targetSessionId, ({ session }) => {
        const tabs = session.tabs ?? [];
        const activeTabId = typeof session.activeTabId === 'number' ? session.activeTabId : undefined;
        const fingerprint = JSON.stringify({
          activeTabId,
          tabs: tabs.map((tab) => ({
            id: tab.id,
            windowId: tab.windowId,
            url: tab.url,
            title: tab.title,
            active: tab.active
          }))
        });
        if (fingerprint === lastFingerprint) {
          return;
        }
        lastFingerprint = fingerprint;
        this.eventManager.emit(stream, {
          sessionId: targetSessionId,
          count: tabs.length,
          activeTabId,
          tabs
        });
      });
      return this.eventManager.startManagedStream(sessionId, stream, stop, params);
    }

    if (stream === 'browserext_snapshot') {
      if (!this.core) {
        throw new Error('Browser extension snapshot streaming requires SidofunCore');
      }
      const targetSessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
      if (!targetSessionId) {
        throw new Error('browserext_snapshot stream requires params.sessionId');
      }
      let lastFingerprint = '';
      void this.seedBrowserExtensionSessionStateStream(
        targetSessionId,
        params,
        (session) => {
          const snapshot = session.lastSnapshot;
          if (!snapshot) {
            return;
          }
          const fingerprint = JSON.stringify({
            title: snapshot.title ?? '',
            url: snapshot.url ?? '',
            text: snapshot.text ?? ''
          });
          if (fingerprint === lastFingerprint) {
            return;
          }
          lastFingerprint = fingerprint;
          this.eventManager.emit(stream, {
            sessionId: targetSessionId,
            snapshot
          });
        }
      ).catch((error) => {
        console.error('Failed to seed browserext snapshot stream:', error);
      });
      const stop = BrowserExtensionService.subscribeToProviderStream('session_state', targetSessionId, ({ session }) => {
        const snapshot = session.lastSnapshot;
        if (!snapshot) {
          return;
        }
        const fingerprint = JSON.stringify({
          title: snapshot.title ?? '',
          url: snapshot.url ?? '',
          text: snapshot.text ?? ''
        });
        if (fingerprint === lastFingerprint) {
          return;
        }
        lastFingerprint = fingerprint;
        this.eventManager.emit(stream, {
          sessionId: targetSessionId,
          snapshot
        });
      });
      return this.eventManager.startManagedStream(sessionId, stream, stop, params);
    }

    if (stream === 'browserext_screenshot') {
      if (!this.core) {
        throw new Error('Browser extension screenshot streaming requires SidofunCore');
      }
      const targetSessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
      if (!targetSessionId) {
        throw new Error('browserext_screenshot stream requires params.sessionId');
      }
      let lastData = '';
      void this.seedBrowserExtensionSessionStateStream(
        targetSessionId,
        params,
        (session) => {
          const screenshot = session.lastScreenshot;
          if (!screenshot?.data) {
            return;
          }
          if (screenshot.data === lastData) {
            return;
          }
          lastData = screenshot.data;
          this.eventManager.emit(stream, {
            sessionId: targetSessionId,
            screenshot
          });
        }
      ).catch((error) => {
        console.error('Failed to seed browserext screenshot stream:', error);
      });
      const stop = BrowserExtensionService.subscribeToProviderStream('session_state', targetSessionId, ({ session }) => {
        const screenshot = session.lastScreenshot;
        if (!screenshot?.data) {
          return;
        }
        if (screenshot.data === lastData) {
          return;
        }
        lastData = screenshot.data;
        this.eventManager.emit(stream, {
          sessionId: targetSessionId,
          screenshot
        });
      });
      return this.eventManager.startManagedStream(sessionId, stream, stop, params);
    }

    if (stream === 'browserext_network_events') {
      if (!this.core) {
        throw new Error('Browser extension network event streaming requires SidofunCore');
      }
      const targetSessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
      if (!targetSessionId) {
        throw new Error('browserext_network_events stream requires params.sessionId');
      }
      const seenIds = new Set<string>();
      void this.seedBrowserExtensionEventStream(
        stream,
        targetSessionId,
        seenIds,
        params,
        'browser_extension_network_events',
        (event) => {
          if (typeof params.urlIncludes === 'string' && !event.url.includes(params.urlIncludes)) {
            return false;
          }
          if (typeof params.stage === 'string' && event.stage !== params.stage) {
            return false;
          }
          if (typeof params.method === 'string' && event.method !== params.method) {
            return false;
          }
          return true;
        }
      ).catch((error) => {
        console.error('Failed to seed browserext network event stream:', error);
      });
      const stop = BrowserExtensionService.subscribeToProviderStream('network_events', targetSessionId, ({ events }) => {
        this.emitSeededBrowserExtensionEvents(stream, targetSessionId, events, seenIds, (event) => {
          if (typeof params.urlIncludes === 'string' && !event.url.includes(params.urlIncludes)) {
            return false;
          }
          if (typeof params.stage === 'string' && event.stage !== params.stage) {
            return false;
          }
          if (typeof params.method === 'string' && event.method !== params.method) {
            return false;
          }
          return true;
        });
      });
      return this.eventManager.startManagedStream(sessionId, stream, stop, params);
    }

    if (stream === 'browserext_dom_events') {
      if (!this.core) {
        throw new Error('Browser extension DOM event streaming requires SidofunCore');
      }
      const targetSessionId = typeof params.sessionId === 'string' ? params.sessionId : '';
      if (!targetSessionId) {
        throw new Error('browserext_dom_events stream requires params.sessionId');
      }
      const seenIds = new Set<string>();
      void this.seedBrowserExtensionEventStream(
        stream,
        targetSessionId,
        seenIds,
        params,
        'browser_extension_dom_events',
        (event) => {
          if (typeof params.mutationType === 'string' && !event.types.includes(params.mutationType as 'childList' | 'attributes' | 'characterData')) {
            return false;
          }
          if (typeof params.textIncludes === 'string' && !(event.textSample ?? '').includes(params.textIncludes)) {
            return false;
          }
          return true;
        }
      ).catch((error) => {
        console.error('Failed to seed browserext DOM event stream:', error);
      });
      const stop = BrowserExtensionService.subscribeToProviderStream('dom_events', targetSessionId, ({ events }) => {
        this.emitSeededBrowserExtensionEvents(stream, targetSessionId, events, seenIds, (event) => {
          if (typeof params.mutationType === 'string' && !event.types.includes(params.mutationType as 'childList' | 'attributes' | 'characterData')) {
            return false;
          }
          if (typeof params.textIncludes === 'string' && !(event.textSample ?? '').includes(params.textIncludes)) {
            return false;
          }
          return true;
        });
      });
      return this.eventManager.startManagedStream(sessionId, stream, stop, params);
    }

    throw new Error(`Stream type not supported yet: ${stream}`);
  }

  /**
   * Handle CMD message - CMD.exe automation operations
   */
  private async handleCMD(
    sessionId: string,
    messageId: string,
    payload: CMDPayload,
    socket: WSSocket
  ): Promise<void> {
    const { action, params = {} } = payload;

    switch (action) {
      case 'spawn':
        await this.cmdHandlers.handleSpawn(socket, messageId, params as { title?: string });
        break;

      case 'attach':
        await this.cmdHandlers.handleAttach(socket, messageId, params as { titlePattern: string });
        break;

      case 'exec':
        await this.cmdHandlers.handleExec(socket, messageId, params as {
          sessionId: string;
          command: string;
          options?: import('../cmd/cmd-session-service.js').ExecOptions;
        });
        break;

      case 'type':
        await this.cmdHandlers.handleType(socket, messageId, params as { sessionId: string; text: string });
        break;

      case 'press':
        await this.cmdHandlers.handlePress(socket, messageId, params as { sessionId: string; key: string });
        break;

      case 'screenshot':
        await this.cmdHandlers.handleScreenshot(socket, messageId, params as {
          sessionId: string;
          filename?: string;
          returnBase64?: boolean;
        });
        break;

      case 'break':
        await this.cmdHandlers.handleBreak(socket, messageId, params as { sessionId: string });
        break;

      case 'eof':
        await this.cmdHandlers.handleEOF(socket, messageId, params as { sessionId: string });
        break;

      case 'close':
        await this.cmdHandlers.handleClose(socket, messageId, params as { sessionId: string });
        break;

      case 'list':
        await this.cmdHandlers.handleList(socket, messageId);
        break;

      case 'get_info':
        await this.cmdHandlers.handleGetInfo(socket, messageId, params as { sessionId: string });
        break;

      // Terminal shortcuts
      case 'new_tab':
        await this.cmdHandlers.handleNewTab(socket, messageId, params as { sessionId: string });
        break;

      case 'next_tab':
        await this.cmdHandlers.handleNextTab(socket, messageId, params as { sessionId: string });
        break;

      case 'prev_tab':
        await this.cmdHandlers.handlePrevTab(socket, messageId, params as { sessionId: string });
        break;

      case 'split_vertical':
        await this.cmdHandlers.handleSplitVertical(socket, messageId, params as { sessionId: string });
        break;

      case 'split_horizontal':
        await this.cmdHandlers.handleSplitHorizontal(socket, messageId, params as { sessionId: string });
        break;

      case 'pane_up':
        await this.cmdHandlers.handlePaneUp(socket, messageId, params as { sessionId: string });
        break;

      case 'pane_down':
        await this.cmdHandlers.handlePaneDown(socket, messageId, params as { sessionId: string });
        break;

      case 'pane_left':
        await this.cmdHandlers.handlePaneLeft(socket, messageId, params as { sessionId: string });
        break;

      case 'pane_right':
        await this.cmdHandlers.handlePaneRight(socket, messageId, params as { sessionId: string });
        break;

      default:
        this.sendError(socket, messageId, ErrorCode.UNKNOWN_ACTION, `Unknown CMD action: ${action}`);
    }
  }

  /**
   * Send a response message
   */
  sendResponse(socket: WSSocket, messageId: string, payload: ResponsePayload): void {
    const response = {
      id: messageId,
      type: 'response' as const,
      timestamp: new Date().toISOString(),
      payload
    };

    socket.send(JSON.stringify(response));
  }

  /**
   * Send a batch response message
   */
  sendBatchResponse(
    socket: WSSocket,
    messageId: string,
    results: Array<{ success: boolean; result?: any; error?: string }>
  ): void {
    const response = {
      id: messageId,
      type: 'batch_response' as const,
      timestamp: new Date().toISOString(),
      payload: { results }
    };

    socket.send(JSON.stringify(response));
  }

  /**
   * Send an error message
   */
  sendError(
    socket: WSSocket,
    messageId: string,
    code: ErrorCode,
    message: string,
    details?: any
  ): void {
    const error = {
      id: messageId,
      type: 'error' as const,
      timestamp: new Date().toISOString(),
      payload: {
        code,
        message,
        details
      }
    };

    socket.send(JSON.stringify(error));
  }

  /**
   * Send a connected message (welcome message)
   */
  sendConnected(socket: WSSocket, sessionId: string): void {
    const message = {
      id: this.generateId(),
      type: 'connected' as const,
      timestamp: new Date().toISOString(),
      payload: {
          sessionId,
          serverTime: new Date().toISOString(),
          capabilities: {
          actions: [...automationActionValues],
          events: [...streamTypeValues]
        }
      }
    };

    socket.send(JSON.stringify(message));
  }

  /**
   * Send a heartbeat message
   */
  sendHeartbeat(socket: WSSocket): void {
    const message = {
      id: this.generateId(),
      type: 'heartbeat' as const,
      timestamp: new Date().toISOString(),
      payload: {
        serverTime: new Date().toISOString(),
        uptime: process.uptime()
      }
    };

    socket.send(JSON.stringify(message));
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private attachOwnerSessionId(action: string, params: Record<string, any> | undefined, sessionId: string): Record<string, any> {
    const payload = { ...(params || {}) };
    if (OWNED_AUTOMATION_ACTIONS.has(action) && !payload.ownerSessionId) {
      payload.ownerSessionId = sessionId;
    }
    return payload;
  }

  private async seedBrowserExtensionEventStream(
    stream: StreamType,
    targetSessionId: string,
    seenIds: Set<string>,
    params: Record<string, unknown>,
    action: 'browser_extension_session_events' | 'browser_extension_network_events' | 'browser_extension_dom_events',
    matches: (event: any) => boolean
  ): Promise<void> {
    if (!this.core || typeof this.core.executeAutomationAction !== 'function') {
      return;
    }
    const result = await this.core.executeAutomationAction(action, {
      sessionId: targetSessionId,
      count: typeof params.limit === 'number' ? params.limit : 50,
      kind: params.kind,
      ok: params.ok,
      targetUrl: params.urlIncludes,
      status: params.stage,
      text: params.method,
      mutationType: params.mutationType,
      textIncludes: params.textIncludes,
      timeoutMs: params.timeoutMs
    }) as { events?: any[] };
    const events = (result?.events ?? []).filter(matches);
    this.emitSeededBrowserExtensionEvents(stream, targetSessionId, events, seenIds);
  }

  private emitSeededBrowserExtensionEvents(
    stream: StreamType,
    targetSessionId: string,
    events: Array<{ id?: string }>,
    seenIds: Set<string>,
    matches: (event: any) => boolean = () => true
  ): void {
    const filtered = events.filter((event) => {
      if (!matches(event)) {
        return false;
      }
      if (!event?.id) {
        return true;
      }
      if (seenIds.has(event.id)) {
        return false;
      }
      seenIds.add(event.id);
      return true;
    });
    if (filtered.length === 0) {
      return;
    }
    this.eventManager.emit(stream, {
      sessionId: targetSessionId,
      count: filtered.length,
      events: filtered
    });
  }

  private async seedBrowserExtensionSessionStateStream(
    targetSessionId: string,
    params: Record<string, unknown>,
    emit: (session: {
      tabs?: Array<Record<string, unknown>>;
      activeTabId?: number;
      lastSnapshot?: { title?: string; url?: string; text?: string; capturedAt?: string };
      lastScreenshot?: { data?: string; mimeType?: string; capturedAt?: string; width?: number; height?: number };
    }) => void
  ): Promise<void> {
    if (!this.core || typeof this.core.executeAutomationAction !== 'function') {
      return;
    }
    const session = await this.core.executeAutomationAction('browser_extension_session_info', {
      sessionId: targetSessionId,
      timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined
    }) as {
      tabs?: Array<Record<string, unknown>>;
      activeTabId?: number;
      lastSnapshot?: { title?: string; url?: string; text?: string; capturedAt?: string };
      lastScreenshot?: { data?: string; mimeType?: string; capturedAt?: string; width?: number; height?: number };
    };
    emit(session);
  }
}
