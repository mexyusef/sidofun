/**
 * WebSocket Message Schemas (Zod Validation)
 *
 * Provides Zod schemas for validating all WebSocket messages
 * exchanged between client and server.
 */

import { z } from 'zod';
import {
  AutomationActionEnum,
  CMDActionEnum,
  QueryTypeEnum,
  StreamTypeEnum
} from '../../core/command-schemas.js';

// ==============================
// Base Message Schema
// ==============================

export const WSMessageSchema = z.object({
  id: z.string(),
  type: z.enum([
    'action',
    'batch',
    'subscribe',
    'query',
    'stream',
    'cmd'
  ]),
  timestamp: z.string().datetime()
});

// ==============================
// Client → Server Schemas
// ==============================

export const ActionMessageSchema = WSMessageSchema.extend({
  type: z.literal('action'),
  payload: z.object({
    action: AutomationActionEnum,
    params: z.record(z.any()).optional().default({})
  })
});

export const BatchMessageSchema = WSMessageSchema.extend({
  type: z.literal('batch'),
  payload: z.object({
    actions: z.array(z.object({
      action: AutomationActionEnum,
      params: z.record(z.any()).optional().default({})
    })).min(1)
  })
});

export const SubscribeMessageSchema = WSMessageSchema.extend({
  type: z.literal('subscribe'),
  payload: z.object({
    events: z.array(StreamTypeEnum).min(1)
  })
});

export const QueryMessageSchema = WSMessageSchema.extend({
  type: z.literal('query'),
  payload: z.object({
    query: QueryTypeEnum
  })
});

export const StreamMessageSchema = WSMessageSchema.extend({
  type: z.literal('stream'),
  payload: z.object({
    command: z.enum(['start', 'stop']),
    stream: StreamTypeEnum,
    interval: z.number().positive().optional(),
    params: z.record(z.any()).optional().default({})
  })
});

export const CMDMessageSchema = WSMessageSchema.extend({
  type: z.literal('cmd'),
  payload: z.object({
    action: CMDActionEnum,
    params: z.record(z.any()).optional().default({})
  })
});

// Union of all client message schemas for validation
export const ClientMessageSchema = z.union([
  ActionMessageSchema,
  BatchMessageSchema,
  SubscribeMessageSchema,
  QueryMessageSchema,
  StreamMessageSchema,
  CMDMessageSchema
]);

// ==============================
// Server → Client Schemas (for reference/validation)
// ==============================

export const ResponseMessageSchema = z.object({
  id: z.string(),
  type: z.literal('response'),
  timestamp: z.string().datetime(),
  payload: z.object({
    success: z.boolean(),
    result: z.any().optional(),
    data: z.any().optional(),
    error: z.string().optional(),
    subscribed: z.array(z.string()).optional(),
    streamId: z.string().optional(),
    message: z.string().optional()
  })
});

export const BatchResponseMessageSchema = z.object({
  id: z.string(),
  type: z.literal('batch_response'),
  timestamp: z.string().datetime(),
  payload: z.object({
    results: z.array(z.object({
      success: z.boolean(),
      result: z.any().optional(),
      error: z.string().optional()
    }))
  })
});

export const EventMessageSchema = z.object({
  id: z.string(),
  type: z.literal('event'),
  timestamp: z.string().datetime(),
  payload: z.object({
    event: StreamTypeEnum,
    data: z.any()
  })
});

export const ErrorMessageSchema = z.object({
  id: z.string(),
  type: z.literal('error'),
  timestamp: z.string().datetime(),
  payload: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional()
  })
});

export const HeartbeatMessageSchema = z.object({
  id: z.string(),
  type: z.literal('heartbeat'),
  timestamp: z.string().datetime(),
  payload: z.object({
    serverTime: z.string().datetime(),
    uptime: z.number()
  })
});

export const ConnectedMessageSchema = z.object({
  id: z.string(),
  type: z.literal('connected'),
  timestamp: z.string().datetime(),
  payload: z.object({
    sessionId: z.string(),
    serverTime: z.string().datetime(),
    capabilities: z.object({
      actions: z.array(z.string()),
      events: z.array(z.string())
    })
  })
});

// ==============================
// Error Codes
// ==============================

export enum ErrorCode {
  // Parse errors
  PARSE_ERROR = 'PARSE_ERROR',
  INVALID_JSON = 'INVALID_JSON',

  // Validation errors
  INVALID_SCHEMA = 'INVALID_SCHEMA',
  MISSING_FIELD = 'MISSING_FIELD',
  INVALID_TYPE = 'INVALID_TYPE',

  // Action errors
  UNKNOWN_ACTION = 'UNKNOWN_ACTION',
  ACTION_FAILED = 'ACTION_FAILED',

  // Batch errors
  BATCH_FAILED = 'BATCH_FAILED',

  // Subscription errors
  SUBSCRIBE_FAILED = 'SUBSCRIBE_FAILED',
  UNSUPPORTED_EVENT = 'UNSUPPORTED_EVENT',

  // Query errors
  UNKNOWN_QUERY = 'UNKNOWN_QUERY',
  QUERY_FAILED = 'QUERY_FAILED',

  // Stream errors
  UNSUPPORTED_STREAM = 'UNSUPPORTED_STREAM',
  STREAM_FAILED = 'STREAM_FAILED',

  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_INITIALIZED = 'NOT_INITIALIZED'
}

// ==============================
// Validation Helpers
// ==============================

/**
 * Validate a client message
 * @throws {z.ZodError} If validation fails
 */
export function validateClientMessage(data: unknown): ClientMessage {
  return ClientMessageSchema.parse(data);
}

/**
 * Safely validate a client message
 * @returns { success: true, data: ClientMessage } or { success: false, error: z.ZodError }
 */
export function safeValidateClientMessage(data: unknown): {
  success: boolean;
  data?: ClientMessage;
  error?: z.ZodError;
} {
  const result = ClientMessageSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

// Type exports
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
export type ActionPayload = z.infer<typeof ActionMessageSchema>['payload'];
export type BatchPayload = z.infer<typeof BatchMessageSchema>['payload'];
export type SubscribePayload = z.infer<typeof SubscribeMessageSchema>['payload'];
export type QueryPayload = z.infer<typeof QueryMessageSchema>['payload'];
export type StreamPayload = z.infer<typeof StreamMessageSchema>['payload'];
export type CMDPayload = z.infer<typeof CMDMessageSchema>['payload'];
