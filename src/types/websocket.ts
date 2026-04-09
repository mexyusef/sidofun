/**
 * WebSocket Protocol Type Definitions
 *
 * Defines all interfaces for WebSocket communication between
 * client and server for desktop automation.
 */

// ==============================
// Base Types
// ==============================

export type MessageType =
  | 'action'
  | 'batch'
  | 'subscribe'
  | 'query'
  | 'stream'
  | 'response'
  | 'batch_response'
  | 'event'
  | 'error'
  | 'heartbeat'
  | 'connected';

export type StreamType =
  | 'screenshot'
  | 'window_change'
  | 'clipboard'
  | 'process'
  | 'browserext_tabs'
  | 'browserext_snapshot'
  | 'browserext_screenshot'
  | 'browserext_session_events'
  | 'browserext_network_events'
  | 'browserext_dom_events';

export type QueryType = 'active_window' | 'screen_size' | 'mouse_position';
export interface WSSocketData {
  sessionId?: string;
}

export type WSSocket = Bun.ServerWebSocket<WSSocketData>;

// ==============================
// Base Message Structure
// ==============================

export interface WSMessage {
  id: string;
  type: MessageType;
  timestamp: string;
}

// ==============================
// Client → Server Messages
// ==============================

export interface ActionMessage extends WSMessage {
  type: 'action';
  payload: {
    action: string;
    params: Record<string, any>;
  };
}

export interface BatchMessage extends WSMessage {
  type: 'batch';
  payload: {
    actions: Array<{
      action: string;
      params: Record<string, any>;
    }>;
  };
}

export interface SubscribeMessage extends WSMessage {
  type: 'subscribe';
  payload: {
    events: StreamType[];
  };
}

export interface QueryMessage extends WSMessage {
  type: 'query';
  payload: {
    query: QueryType;
  };
}

export interface StreamMessage extends WSMessage {
  type: 'stream';
  payload: {
    command: 'start' | 'stop';
    stream: StreamType;
    interval?: number;
    params?: Record<string, any>;
  };
}

// ==============================
// Server → Client Messages
// ==============================

export interface ResponsePayload {
  success: boolean;
  result?: any;
  data?: any;
  error?: string;
  subscribed?: StreamType[];
  streamId?: string;
  message?: string;
  filepath?: string;
  width?: number;
  height?: number;
  sessionId?: string;
  sessions?: any[];
  count?: number;
  session?: any;
}

export interface ResponseMessage extends WSMessage {
  type: 'response';
  payload: ResponsePayload;
}

export interface BatchResponseMessage extends WSMessage {
  type: 'batch_response';
  payload: {
    results: Array<{
      success: boolean;
      result?: any;
      error?: string;
    }>;
  };
}

export interface EventMessage extends WSMessage {
  type: 'event';
  payload: {
    event: StreamType;
    data: any;
  };
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: any;
}

export interface ErrorMessage extends WSMessage {
  type: 'error';
  payload: ErrorPayload;
}

export interface HeartbeatPayload {
  serverTime: string;
  uptime: number;
}

export interface HeartbeatMessage extends WSMessage {
  type: 'heartbeat';
  payload: HeartbeatPayload;
}

export interface ConnectedPayload {
  sessionId: string;
  serverTime: string;
  capabilities: {
    actions: string[];
    events: StreamType[];
  };
}

export interface ConnectedMessage extends WSMessage {
  type: 'connected';
  payload: ConnectedPayload;
}

// ==============================
// Session State
// ==============================

export interface WSSession {
  id: string;
  socket: WSSocket;
  connectedAt: Date;
  lastActivity: Date;
  subscriptions: Set<StreamType>;
  activeWindow?: number;
  context?: {
    currentApp?: string;
    commandHistory?: string[];
  };
}

// ==============================
// Union Types for Message Handling
// ==============================

export type ClientMessage =
  | ActionMessage
  | BatchMessage
  | SubscribeMessage
  | QueryMessage
  | StreamMessage;

export type ServerMessage =
  | ResponseMessage
  | BatchResponseMessage
  | EventMessage
  | ErrorMessage
  | HeartbeatMessage
  | ConnectedMessage;
