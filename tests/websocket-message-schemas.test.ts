import { describe, expect, test } from 'bun:test';
import { safeValidateClientMessage } from '../src/services/websocket/message-schemas.js';

describe('WebSocket message schemas', () => {
  test('accepts browser automation actions in action messages', () => {
    const result = safeValidateClientMessage({
      id: 'msg-1',
      type: 'action',
      timestamp: new Date().toISOString(),
      payload: {
        action: 'browser_page_open',
        params: {
          runtimeId: 'runtime-1',
          url: 'https://example.com'
        }
      }
    });

    expect(result.success).toBe(true);
    expect(result.data?.payload.action).toBe('browser_page_open');
  });

  test('accepts browser automation actions in batch messages', () => {
    const result = safeValidateClientMessage({
      id: 'msg-2',
      type: 'batch',
      timestamp: new Date().toISOString(),
      payload: {
        actions: [
          {
            action: 'browser_runtime_list',
            params: {}
          },
          {
            action: 'browser_page_close',
            params: {
              pageId: 'page-1'
            }
          }
        ]
      }
    });

    expect(result.success).toBe(true);
    expect((result.data as any).payload.actions).toHaveLength(2);
  });

  test('preserves ownerSessionId in websocket action params when provided', () => {
    const result = safeValidateClientMessage({
      id: 'msg-3',
      type: 'action',
      timestamp: new Date().toISOString(),
      payload: {
        action: 'desktop_scope_create',
        params: {
          titleQuery: 'Explorer',
          ownerSessionId: 'client_session_ws_1'
        }
      }
    });

    expect(result.success).toBe(true);
    expect((result.data as any).payload.params.ownerSessionId).toBe('client_session_ws_1');
  });

  test('accepts browserext stream messages with params', () => {
    const result = safeValidateClientMessage({
      id: 'msg-4',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_session_events',
        interval: 750,
        params: {
          sessionId: 'browserext_1',
          limit: 20,
          kind: 'snapshot',
          ok: true
        }
      }
    });

    expect(result.success).toBe(true);
    expect((result.data as any).payload.stream).toBe('browserext_session_events');
    expect((result.data as any).payload.params.sessionId).toBe('browserext_1');
  });

  test('accepts browserext tab and snapshot stream messages', () => {
    const tabsResult = safeValidateClientMessage({
      id: 'msg-5',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_tabs',
        interval: 500,
        params: {
          sessionId: 'browserext_1'
        }
      }
    });
    const snapshotResult = safeValidateClientMessage({
      id: 'msg-6',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_snapshot',
        interval: 800,
        params: {
          sessionId: 'browserext_1',
          timeoutMs: 2000
        }
      }
    });

    expect(tabsResult.success).toBe(true);
    expect((tabsResult.data as any).payload.stream).toBe('browserext_tabs');
    expect(snapshotResult.success).toBe(true);
    expect((snapshotResult.data as any).payload.stream).toBe('browserext_snapshot');
  });

  test('accepts browserext screenshot stream messages', () => {
    const result = safeValidateClientMessage({
      id: 'msg-6b',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_screenshot',
        interval: 1200,
        params: {
          sessionId: 'browserext_1',
          timeoutMs: 2500
        }
      }
    });

    expect(result.success).toBe(true);
    expect((result.data as any).payload.stream).toBe('browserext_screenshot');
    expect((result.data as any).payload.params.timeoutMs).toBe(2500);
  });

  test('accepts browserext DOM event stream messages', () => {
    const result = safeValidateClientMessage({
      id: 'msg-7',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_dom_events',
        interval: 900,
        params: {
          sessionId: 'browserext_1',
          mutationType: 'childList',
          textIncludes: 'Hiring',
          timeoutMs: 2000
        }
      }
    });

    expect(result.success).toBe(true);
    expect((result.data as any).payload.stream).toBe('browserext_dom_events');
    expect((result.data as any).payload.params.mutationType).toBe('childList');
  });
});
