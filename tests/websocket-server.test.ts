import { describe, expect, test } from 'bun:test';
import { WebSocketServer } from '../src/services/websocket/websocket-server.js';

describe('WebSocketServer', () => {
  test('reuses requested websocket session id when it already exists', () => {
    const sent: unknown[] = [];
    const sessionManager = {
      hasSession(sessionId: string) {
        return sessionId === 'client_session_ws_1';
      },
      touchSession() {
        return undefined;
      },
      createSession() {
        throw new Error('should not create session');
      }
    };

    const server = new WebSocketServer({} as any, {} as any, {
      sessionManager: sessionManager as any
    });

    const socket = {
      data: { sessionId: 'client_session_ws_1' },
      send(data: string) {
        sent.push(JSON.parse(data));
      },
      close() {
        return undefined;
      },
      readyState: WebSocket.OPEN
    } as any;

    server.handleOpen(socket, socket.data.sessionId);

    expect((sent[0] as any).payload.sessionId).toBe('client_session_ws_1');
  });

  test('does not close managed session-manager session on websocket disconnect', async () => {
    const calls: string[] = [];
    const sessionManager = {
      hasSession() {
        return false;
      },
      createSession() {
        return { id: 'client_session_ws_2' };
      },
      touchSession() {
        calls.push('touch');
        return undefined;
      },
      closeSession() {
        calls.push('close');
        return Promise.resolve({ closed: true });
      }
    };

    const server = new WebSocketServer({} as any, {} as any, {
      sessionManager: sessionManager as any
    });

    const socket = {
      data: {},
      send() {
        return undefined;
      },
      close() {
        return undefined;
      },
      readyState: WebSocket.OPEN
    } as any;

    server.handleOpen(socket);
    server.handleClose(socket);

    expect(calls).not.toContain('close');
  });

  test('restores subscriptions and screenshot streams on websocket reconnect', () => {
    const sessionManager = {
      hasSession(sessionId: string) {
        return sessionId === 'client_session_ws_3';
      },
      touchSession() {
        return undefined;
      },
      createSession() {
        throw new Error('should not create session');
      }
    };

    const platform = {
      takeScreenshot: async () => ({ format: 'png', data: 'stub' })
    };

    const server = new WebSocketServer(platform as any, {} as any, {
      sessionManager: sessionManager as any
    });

    const firstSocket = {
      data: { sessionId: 'client_session_ws_3' },
      send() {
        return undefined;
      },
      close() {
        return undefined;
      },
      readyState: WebSocket.OPEN
    } as any;

    server.handleOpen(firstSocket, firstSocket.data.sessionId);
    server.getEventManager().subscribe('client_session_ws_3', 'clipboard');
    server.getEventManager().startScreenshotStream('client_session_ws_3', 250, async () => ({ ok: true }));

    server.handleClose(firstSocket);

    expect(server.getEventManager().getStreamsForSession('client_session_ws_3')).toHaveLength(0);

    const secondSocket = {
      data: { sessionId: 'client_session_ws_3' },
      send() {
        return undefined;
      },
      close() {
        return undefined;
      },
      readyState: WebSocket.OPEN
    } as any;

    server.handleOpen(secondSocket, secondSocket.data.sessionId);

    expect(server.getConnectionManager().getConnection('client_session_ws_3')?.subscriptions.has('clipboard')).toBe(true);
    expect(server.getEventManager().getStreamsForSession('client_session_ws_3')).toHaveLength(1);

    server.shutdown();
  });

  test('restores browserext streams with params on websocket reconnect', () => {
    const sessionManager = {
      hasSession(sessionId: string) {
        return sessionId === 'client_session_ws_browserext_restore';
      },
      touchSession() {
        return undefined;
      },
      createSession() {
        throw new Error('should not create session');
      }
    };

    const platform = {
      takeScreenshot: async () => ({ format: 'png', data: 'stub' })
    };

    const server = new WebSocketServer(platform as any, {} as any, {
      sessionManager: sessionManager as any,
      core: {
        executeAutomationAction: async () => ({ events: [] })
      } as any
    });

    const firstSocket = {
      data: { sessionId: 'client_session_ws_browserext_restore' },
      send() {
        return undefined;
      },
      close() {
        return undefined;
      },
      readyState: WebSocket.OPEN
    } as any;

    server.handleOpen(firstSocket, firstSocket.data.sessionId);
    server.getEventManager().startStream(
      'client_session_ws_browserext_restore',
      'browserext_session_events',
      900,
      async () => undefined,
      {
        sessionId: 'browserext_1',
        limit: 10,
        kind: 'snapshot'
      }
    );
    server.getEventManager().startStream(
      'client_session_ws_browserext_restore',
      'browserext_screenshot',
      1500,
      async () => undefined,
      {
        sessionId: 'browserext_1',
        timeoutMs: 2500
      }
    );

    server.handleClose(firstSocket);

    const secondSocket = {
      data: { sessionId: 'client_session_ws_browserext_restore' },
      send() {
        return undefined;
      },
      close() {
        return undefined;
      },
      readyState: WebSocket.OPEN
    } as any;

    server.handleOpen(secondSocket, secondSocket.data.sessionId);

    const restored = server.getEventManager().getStreamsForSession('client_session_ws_browserext_restore');
    expect(restored).toHaveLength(2);
    expect(restored[0]?.streamType).toBe('browserext_session_events');
    expect(restored[0]?.params).toEqual({
      sessionId: 'browserext_1',
      limit: 10,
      kind: 'snapshot'
    });
    expect(restored[1]?.streamType).toBe('browserext_screenshot');
    expect(restored[1]?.params).toEqual({
      sessionId: 'browserext_1',
      timeoutMs: 2500
    });

    server.shutdown();
  });

  test('touches managed session on each websocket message', () => {
    const calls: string[] = [];
    const sessionManager = {
      hasSession(sessionId: string) {
        return sessionId === 'client_session_ws_4';
      },
      touchSession(sessionId: string) {
        calls.push(sessionId);
        return undefined;
      },
      createSession() {
        throw new Error('should not create session');
      }
    };

    const server = new WebSocketServer({
      executeDesktopAction: async () => ({ ok: true }),
      getScreenSize: async () => ({ width: 100, height: 50 }),
      getMousePosition: async () => ({ x: 1, y: 2 }),
      takeScreenshot: async () => ({ format: 'png', data: 'stub' })
    } as any, {} as any, {
      sessionManager: sessionManager as any
    });

    const socket = {
      data: { sessionId: 'client_session_ws_4' },
      send() {
        return undefined;
      },
      close() {
        return undefined;
      },
      readyState: WebSocket.OPEN
    } as any;

    server.handleOpen(socket, socket.data.sessionId);
    server.handleMessage(socket, JSON.stringify({
      id: '1',
      type: 'query',
      timestamp: new Date().toISOString(),
      payload: { query: 'screen_size' }
    }));

    expect(calls).toContain('client_session_ws_4');
  });
});
