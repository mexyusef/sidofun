import { describe, expect, test } from 'bun:test';
import { MessageRouter } from '../src/services/websocket/message-router.js';
import { BrowserExtensionService } from '../src/services/browser-extension/browser-extension-service.js';

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('MessageRouter', () => {
  test('injects websocket session id as owner for resource-creating actions', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    const sent: unknown[] = [];
    const router = new MessageRouter(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return { ok: true };
        }
      } as any
    );

    const socket = {
      send(data: string) {
        sent.push(JSON.parse(data));
      }
    } as any;

    await router.handleMessage('client_session_ws_1', {
      id: 'msg-1',
      type: 'action',
      timestamp: new Date().toISOString(),
      payload: {
        action: 'desktop_scope_create',
        params: { titleQuery: 'Explorer' }
      }
    } as any, socket);

    expect(calls).toEqual([
      {
        action: 'desktop_scope_create',
        params: { titleQuery: 'Explorer', ownerSessionId: 'client_session_ws_1' }
      }
    ]);
    expect((sent[0] as any).payload.success).toBe(true);
  });

  test('injects websocket session id for browser page creation', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    const router = new MessageRouter(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return { id: 'page_1' };
        }
      } as any
    );

    await router.handleMessage('client_session_ws_2', {
      id: 'msg-2',
      type: 'action',
      timestamp: new Date().toISOString(),
      payload: {
        action: 'browser_page_open',
        params: { runtimeId: 'runtime_1', url: 'https://example.com' }
      }
    } as any, { send() {} } as any);

    expect(calls).toEqual([
      {
        action: 'browser_page_open',
        params: {
          runtimeId: 'runtime_1',
          url: 'https://example.com',
          ownerSessionId: 'client_session_ws_2'
        }
      }
    ]);
  });

  test('injects websocket session id for trace start', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    const router = new MessageRouter(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return { id: 'trace_1' };
        }
      } as any
    );

    await router.handleMessage('client_session_ws_3', {
      id: 'msg-3',
      type: 'action',
      timestamp: new Date().toISOString(),
      payload: {
        action: 'trace_start',
        params: { name: 'demo-trace' }
      }
    } as any, { send() {} } as any);

    expect(calls).toEqual([
      {
        action: 'trace_start',
        params: {
          name: 'demo-trace',
          ownerSessionId: 'client_session_ws_3'
        }
      }
    ]);
  });

  test('starts browserext session event streams and emits unseen events', async () => {
    const emitted: Array<{ event: string; data: unknown }> = [];
    const started: Array<{ sessionId: string; streamType: string; params?: Record<string, unknown> }> = [];
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    let stopFn: (() => void) | undefined;

    const router = new MessageRouter(
      {} as any,
      {} as any,
      {
        emit(event: string, data: unknown) {
          emitted.push({ event, data });
        },
        startManagedStream(sessionId: string, streamType: string, stop: () => void, params?: Record<string, unknown>) {
          started.push({ sessionId, streamType, params });
          stopFn = stop;
          return 'stream_browserext_1';
        }
      } as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return {
            events: [
              { id: 'evt-seed-1', kind: 'snapshot', ok: true },
              { id: 'evt-seed-2', kind: 'snapshot', ok: false }
            ]
          };
        }
      } as any
    );

    const socket = {
      send() {
        return undefined;
      }
    } as any;

    await router.handleMessage('client_session_ws_browserext_1', {
      id: 'msg-browserext-1',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_session_events',
        interval: 750,
        params: {
          sessionId: 'browserext_1',
          limit: 25,
          kind: 'snapshot',
          ok: true
        }
      }
    } as any, socket);

    expect(started).toEqual([
      {
        sessionId: 'client_session_ws_browserext_1',
        streamType: 'browserext_session_events',
        params: {
          sessionId: 'browserext_1',
          limit: 25,
          kind: 'snapshot',
          ok: true
        }
      }
    ]);
    await flushMicrotasks();
    expect(calls).toEqual([
      {
        action: 'browser_extension_session_events',
        params: {
          sessionId: 'browserext_1',
          count: 25,
          kind: 'snapshot',
          ok: true,
          targetUrl: undefined,
          status: undefined,
          text: undefined,
          mutationType: undefined,
          textIncludes: undefined,
          timeoutMs: undefined
        }
      }
    ]);

    BrowserExtensionService.subscribeToProviderStream('session_events', 'browserext_1', ({ events }) => {
      // no-op extra listener to verify publish path remains safe
      void events;
    })();
    (BrowserExtensionService as any).emitProviderStream('session_events', {
      sessionId: 'browserext_1',
      events: [
        { id: 'evt-1', kind: 'snapshot', ok: true },
        { id: 'evt-2', kind: 'snapshot', ok: true },
        { id: 'evt-3', kind: 'snapshot', ok: false }
      ]
    });

    expect(emitted).toEqual([
      {
        event: 'browserext_session_events',
        data: {
          sessionId: 'browserext_1',
          count: 1,
          events: [
            { id: 'evt-seed-1', kind: 'snapshot', ok: true }
          ]
        }
      },
      {
        event: 'browserext_session_events',
        data: {
          sessionId: 'browserext_1',
          count: 2,
          events: [
            { id: 'evt-1', kind: 'snapshot', ok: true },
            { id: 'evt-2', kind: 'snapshot', ok: true }
          ]
        }
      }
    ]);
    stopFn?.();
  });

  test('starts browserext DOM event streams and emits unseen events', async () => {
    const emitted: Array<{ event: string; data: unknown }> = [];
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    let stopFn: (() => void) | undefined;

    const router = new MessageRouter(
      {} as any,
      {} as any,
      {
        emit(event: string, data: unknown) {
          emitted.push({ event, data });
        },
        startManagedStream(_sessionId: string, _streamType: string, stop: () => void) {
          stopFn = stop;
          return 'stream_browserext_dom_1';
        }
      } as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return {
            events: [
              { id: 'dom-seed-1', types: ['childList'], textSample: 'Hiring seed' },
              { id: 'dom-seed-2', types: ['attributes'], textSample: 'Ignore me' }
            ]
          };
        }
      } as any
    );

    await router.handleMessage('client_session_ws_browserext_dom_1', {
      id: 'msg-browserext-dom-1',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_dom_events',
        interval: 850,
        params: {
          sessionId: 'browserext_1',
          limit: 25,
          mutationType: 'childList',
          textIncludes: 'Hiring',
          timeoutMs: 2000
        }
      }
    } as any, { send() {} } as any);
    await flushMicrotasks();
    expect(calls).toEqual([
      {
        action: 'browser_extension_dom_events',
        params: {
          sessionId: 'browserext_1',
          count: 25,
          kind: undefined,
          ok: undefined,
          targetUrl: undefined,
          status: undefined,
          text: undefined,
          mutationType: 'childList',
          textIncludes: 'Hiring',
          timeoutMs: 2000
        }
      }
    ]);

    (BrowserExtensionService as any).emitProviderStream('dom_events', {
      sessionId: 'browserext_1',
      events: [
        { id: 'dom-1', types: ['childList'], textSample: 'Hiring now' },
        { id: 'dom-2', types: ['attributes'], textSample: 'Posting' }
      ]
    });
    expect(emitted).toEqual([
      {
        event: 'browserext_dom_events',
        data: {
          sessionId: 'browserext_1',
          count: 1,
          events: [
            { id: 'dom-seed-1', types: ['childList'], textSample: 'Hiring seed' }
          ]
        }
      },
      {
        event: 'browserext_dom_events',
        data: {
          sessionId: 'browserext_1',
          count: 1,
          events: [
            { id: 'dom-1', types: ['childList'], textSample: 'Hiring now' }
          ]
        }
      }
    ]);
    stopFn?.();
  });

  test('starts browserext network event streams, seeds history, and emits unseen events', async () => {
    const emitted: Array<{ event: string; data: unknown }> = [];
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    let stopFn: (() => void) | undefined;

    const router = new MessageRouter(
      {} as any,
      {} as any,
      {
        emit(event: string, data: unknown) {
          emitted.push({ event, data });
        },
        startManagedStream(_sessionId: string, _streamType: string, stop: () => void) {
          stopFn = stop;
          return 'stream_browserext_network_1';
        }
      } as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return {
            events: [
              { id: 'net-seed-1', url: 'https://x.com/i/api/graphql', stage: 'response', method: 'GET' },
              { id: 'net-seed-2', url: 'https://x.com/home', stage: 'request', method: 'POST' }
            ]
          };
        }
      } as any
    );

    await router.handleMessage('client_session_ws_browserext_network_1', {
      id: 'msg-browserext-network-1',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_network_events',
        interval: 900,
        params: {
          sessionId: 'browserext_1',
          limit: 10,
          urlIncludes: '/graphql',
          stage: 'response',
          method: 'GET'
        }
      }
    } as any, { send() {} } as any);
    await flushMicrotasks();

    expect(calls).toEqual([
      {
        action: 'browser_extension_network_events',
        params: {
          sessionId: 'browserext_1',
          count: 10,
          kind: undefined,
          ok: undefined,
          targetUrl: '/graphql',
          status: 'response',
          text: 'GET',
          mutationType: undefined,
          textIncludes: undefined,
          timeoutMs: undefined
        }
      }
    ]);

    (BrowserExtensionService as any).emitProviderStream('network_events', {
      sessionId: 'browserext_1',
      events: [
        { id: 'net-seed-1', url: 'https://x.com/i/api/graphql', stage: 'response', method: 'GET' },
        { id: 'net-live-1', url: 'https://x.com/i/api/graphql', stage: 'response', method: 'GET' },
        { id: 'net-live-2', url: 'https://x.com/home', stage: 'response', method: 'GET' }
      ]
    });

    expect(emitted).toEqual([
      {
        event: 'browserext_network_events',
        data: {
          sessionId: 'browserext_1',
          count: 1,
          events: [
            { id: 'net-seed-1', url: 'https://x.com/i/api/graphql', stage: 'response', method: 'GET' }
          ]
        }
      },
      {
        event: 'browserext_network_events',
        data: {
          sessionId: 'browserext_1',
          count: 1,
          events: [
            { id: 'net-live-1', url: 'https://x.com/i/api/graphql', stage: 'response', method: 'GET' }
          ]
        }
      }
    ]);
    stopFn?.();
  });

  test('starts browserext tab and snapshot streams and emits only changed state', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    const emitted: Array<{ event: string; data: unknown }> = [];
    const started: Array<{ sessionId: string; streamType: string; params?: Record<string, unknown> }> = [];
    const stopFns: Array<() => void> = [];

    const router = new MessageRouter(
      {} as any,
      {} as any,
      {
        emit(event: string, data: unknown) {
          emitted.push({ event, data });
        },
        startManagedStream(sessionId: string, streamType: string, stop: () => void, params?: Record<string, unknown>) {
          started.push({ sessionId, streamType, params });
          stopFns.push(stop);
          return `stream_${streamType}`;
        }
      } as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return {
            id: params.sessionId,
            activeTabId: action === 'browser_extension_session_info' && params.sessionId === 'browserext_tabs_1' ? 12 : undefined,
            tabs: action === 'browser_extension_session_info' && params.sessionId === 'browserext_tabs_1'
              ? [{ id: 12, windowId: 1, url: 'https://x.com/home', title: 'X', active: true }]
              : undefined,
            lastSnapshot: action === 'browser_extension_session_info' && params.sessionId === 'browserext_snapshot_1'
              ? { title: 'Home', url: 'https://chatgpt.com/', text: 'Hello', capturedAt: '2026-03-30T00:00:00.000Z' }
              : undefined
          };
        }
      } as any
    );

    const socket = { send() { return undefined; } } as any;

    await router.handleMessage('client_session_ws_browserext_2', {
      id: 'msg-browserext-tabs',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_tabs',
        interval: 600,
        params: {
          sessionId: 'browserext_tabs_1'
        }
      }
    } as any, socket);

    await router.handleMessage('client_session_ws_browserext_2', {
      id: 'msg-browserext-snapshot',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_snapshot',
        interval: 900,
        params: {
          sessionId: 'browserext_snapshot_1',
          timeoutMs: 2000
        }
      }
    } as any, socket);

    expect(started).toEqual([
      {
        sessionId: 'client_session_ws_browserext_2',
        streamType: 'browserext_tabs',
        params: { sessionId: 'browserext_tabs_1' }
      },
      {
        sessionId: 'client_session_ws_browserext_2',
        streamType: 'browserext_snapshot',
        params: { sessionId: 'browserext_snapshot_1', timeoutMs: 2000 }
      }
    ]);
    await flushMicrotasks();

    (BrowserExtensionService as any).emitProviderStream('session_state', {
      sessionId: 'browserext_tabs_1',
      session: {
        id: 'browserext_tabs_1',
        lastHeartbeatAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
        createdAt: '2026-03-30T00:00:00.000Z',
        provider: 'chrome-extension',
        connected: true,
        activeTabId: 12,
        tabs: [{ id: 12, windowId: 1, url: 'https://x.com/home', title: 'X', active: true }]
      }
    });
    (BrowserExtensionService as any).emitProviderStream('session_state', {
      sessionId: 'browserext_tabs_1',
      session: {
        id: 'browserext_tabs_1',
        lastHeartbeatAt: '2026-03-30T00:00:01.000Z',
        updatedAt: '2026-03-30T00:00:01.000Z',
        createdAt: '2026-03-30T00:00:00.000Z',
        provider: 'chrome-extension',
        connected: true,
        activeTabId: 13,
        tabs: [{ id: 13, windowId: 1, url: 'https://x.com/explore', title: 'Explore', active: true }]
      }
    });
    (BrowserExtensionService as any).emitProviderStream('session_state', {
      sessionId: 'browserext_snapshot_1',
      session: {
        id: 'browserext_snapshot_1',
        lastHeartbeatAt: '2026-03-30T00:00:01.000Z',
        updatedAt: '2026-03-30T00:00:01.000Z',
        createdAt: '2026-03-30T00:00:00.000Z',
        provider: 'chrome-extension',
        connected: true,
        lastSnapshot: { title: 'Home', url: 'https://chatgpt.com/', text: 'Hello', capturedAt: '2026-03-30T00:00:00.000Z' }
      }
    });
    (BrowserExtensionService as any).emitProviderStream('session_state', {
      sessionId: 'browserext_snapshot_1',
      session: {
        id: 'browserext_snapshot_1',
        lastHeartbeatAt: '2026-03-30T00:00:02.000Z',
        updatedAt: '2026-03-30T00:00:02.000Z',
        createdAt: '2026-03-30T00:00:00.000Z',
        provider: 'chrome-extension',
        connected: true,
        lastSnapshot: { title: 'Home', url: 'https://chatgpt.com/', text: 'Hello again', capturedAt: '2026-03-30T00:00:01.000Z' }
      }
    });

    expect(calls).toEqual([
      { action: 'browser_extension_session_info', params: { sessionId: 'browserext_tabs_1', timeoutMs: undefined } },
      { action: 'browser_extension_session_info', params: { sessionId: 'browserext_snapshot_1', timeoutMs: 2000 } }
    ]);
    expect(emitted).toEqual([
      {
        event: 'browserext_tabs',
        data: {
          sessionId: 'browserext_tabs_1',
          count: 1,
          activeTabId: 12,
          tabs: [
            { id: 12, windowId: 1, url: 'https://x.com/home', title: 'X', active: true }
          ]
        }
      },
      {
        event: 'browserext_snapshot',
        data: {
          sessionId: 'browserext_snapshot_1',
          snapshot: {
            title: 'Home',
            url: 'https://chatgpt.com/',
            text: 'Hello',
            capturedAt: '2026-03-30T00:00:00.000Z'
          }
        }
      },
      {
        event: 'browserext_tabs',
        data: {
          sessionId: 'browserext_tabs_1',
          count: 1,
          activeTabId: 13,
          tabs: [
            { id: 13, windowId: 1, url: 'https://x.com/explore', title: 'Explore', active: true }
          ]
        }
      },
      {
        event: 'browserext_snapshot',
        data: {
          sessionId: 'browserext_snapshot_1',
          snapshot: {
            title: 'Home',
            url: 'https://chatgpt.com/',
            text: 'Hello again',
            capturedAt: '2026-03-30T00:00:01.000Z'
          }
        }
      }
    ]);
    for (const stop of stopFns) {
      stop();
    }
  });

  test('starts browserext screenshot streams and emits only changed images', async () => {
    const calls: Array<{ action: string; params: Record<string, unknown> }> = [];
    const emitted: Array<{ event: string; data: unknown }> = [];
    let stopFn: (() => void) | undefined;

    const router = new MessageRouter(
      {} as any,
      {} as any,
      {
        emit(event: string, data: unknown) {
          emitted.push({ event, data });
        },
        startManagedStream(_sessionId: string, _streamType: string, stop: () => void) {
          stopFn = stop;
          return 'stream_browserext_screenshot_1';
        }
      } as any,
      {} as any,
      undefined,
      undefined,
      {
        executeAutomationAction: async (action: string, params: Record<string, unknown>) => {
          calls.push({ action, params });
          return {
            id: params.sessionId,
            lastScreenshot: {
              data: 'img-one',
              mimeType: 'image/png',
              capturedAt: '2026-03-30T01:00:00.000Z',
              width: 1280,
              height: 720
            }
          };
        }
      } as any
    );

    await router.handleMessage('client_session_ws_browserext_screenshot_1', {
      id: 'msg-browserext-screenshot-1',
      type: 'stream',
      timestamp: new Date().toISOString(),
      payload: {
        command: 'start',
        stream: 'browserext_screenshot',
        interval: 1400,
        params: {
          sessionId: 'browserext_screenshot_1',
          timeoutMs: 2500
        }
      }
    } as any, { send() {} } as any);
    await flushMicrotasks();

    (BrowserExtensionService as any).emitProviderStream('session_state', {
      sessionId: 'browserext_screenshot_1',
      session: {
        id: 'browserext_screenshot_1',
        lastHeartbeatAt: '2026-03-30T01:00:00.000Z',
        updatedAt: '2026-03-30T01:00:00.000Z',
        createdAt: '2026-03-30T01:00:00.000Z',
        provider: 'chrome-extension',
        connected: true,
        lastScreenshot: {
          data: 'img-one',
          mimeType: 'image/png',
          capturedAt: '2026-03-30T01:00:00.000Z',
          width: 1280,
          height: 720
        }
      }
    });
    (BrowserExtensionService as any).emitProviderStream('session_state', {
      sessionId: 'browserext_screenshot_1',
      session: {
        id: 'browserext_screenshot_1',
        lastHeartbeatAt: '2026-03-30T01:00:01.000Z',
        updatedAt: '2026-03-30T01:00:01.000Z',
        createdAt: '2026-03-30T01:00:00.000Z',
        provider: 'chrome-extension',
        connected: true,
        lastScreenshot: {
          data: 'img-two',
          mimeType: 'image/png',
          capturedAt: '2026-03-30T01:00:01.000Z',
          width: 1280,
          height: 720
        }
      }
    });

    expect(calls).toEqual([
      {
        action: 'browser_extension_session_info',
        params: {
          sessionId: 'browserext_screenshot_1',
          timeoutMs: 2500,
        }
      }
    ]);
    expect(emitted).toEqual([
      {
        event: 'browserext_screenshot',
        data: {
          sessionId: 'browserext_screenshot_1',
          screenshot: {
            data: 'img-one',
            mimeType: 'image/png',
            capturedAt: '2026-03-30T01:00:00.000Z',
            width: 1280,
            height: 720
          }
        }
      },
      {
        event: 'browserext_screenshot',
        data: {
          sessionId: 'browserext_screenshot_1',
          screenshot: {
            data: 'img-two',
            mimeType: 'image/png',
            capturedAt: '2026-03-30T01:00:01.000Z',
            width: 1280,
            height: 720
          }
        }
      }
    ]);
    stopFn?.();
  });
});
