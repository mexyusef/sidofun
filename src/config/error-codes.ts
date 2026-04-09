/**
 * Error Code Constants
 *
 * Standardized error codes for the desktop automation API.
 */

export const ERROR_CODE = {
  // Message/Parse Errors
  PARSE_ERROR: 'PARSE_ERROR',
  INVALID_SCHEMA: 'INVALID_SCHEMA',

  // Action Errors
  UNKNOWN_ACTION: 'UNKNOWN_ACTION',
  INVALID_ACTION: 'INVALID_ACTION',
  ACTION_FAILED: 'ACTION_FAILED',
  INVALID_PARAMS: 'INVALID_PARAMS',

  // CMD Errors
  SPAWN_FAILED: 'SPAWN_FAILED',
  ATTACH_FAILED: 'ATTACH_FAILED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  EXEC_FAILED: 'EXEC_FAILED',
  TYPE_FAILED: 'TYPE_FAILED',
  PRESS_FAILED: 'PRESS_FAILED',
  SCREENSHOT_FAILED: 'SCREENSHOT_FAILED',
  BREAK_FAILED: 'BREAK_FAILED',
  CLOSE_FAILED: 'CLOSE_FAILED',

  // Event Errors
  SUBSCRIBE_FAILED: 'SUBSCRIBE_FAILED',
  UNSUPPORTED_EVENT: 'UNSUPPORTED_EVENT',
  STREAM_FAILED: 'STREAM_FAILED',
  UNSUPPORTED_STREAM: 'UNSUPPORTED_STREAM',

  // Query Errors
  UNKNOWN_QUERY: 'UNKNOWN_QUERY',
  QUERY_FAILED: 'QUERY_FAILED',

  // General Errors
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODE[keyof typeof ERROR_CODE];

/**
 * Map error message to error code
 */
export function mapErrorToCode(message: string): ErrorCode {
  if (message.includes('Session') && (message.includes('not found') || message.includes('out of range'))) {
    return ERROR_CODE.SESSION_NOT_FOUND;
  }
  if (message.includes('spawn') || message.includes('Failed to detect')) {
    return ERROR_CODE.SPAWN_FAILED;
  }
  if (message.includes('attach')) {
    return ERROR_CODE.ATTACH_FAILED;
  }
  if (message.includes('type') || message.includes('typing')) {
    return ERROR_CODE.TYPE_FAILED;
  }
  if (message.includes('press') || message.includes('key')) {
    return ERROR_CODE.PRESS_FAILED;
  }
  if (message.includes('screenshot')) {
    return ERROR_CODE.SCREENSHOT_FAILED;
  }
  if (message.includes('break') || message.includes('Ctrl+C')) {
    return ERROR_CODE.BREAK_FAILED;
  }
  if (message.includes('close') || message.includes('exit')) {
    return ERROR_CODE.CLOSE_FAILED;
  }
  if (message.includes('Unknown')) {
    return ERROR_CODE.UNKNOWN_ACTION;
  }
  if (message.includes('required') || message.includes('invalid')) {
    return ERROR_CODE.INVALID_PARAMS;
  }
  if (message.includes('timeout')) {
    return ERROR_CODE.TIMEOUT;
  }
  return ERROR_CODE.ACTION_FAILED;
}
