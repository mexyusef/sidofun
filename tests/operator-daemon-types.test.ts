import { describe, expect, test } from 'bun:test';
import {
  serializeBrowserPage,
  serializeClientSession,
  serializeCmdSession,
  serializeBrowserRuntime,
  serializeDesktopScope,
  serializePwshSession,
  type PersistedDaemonState
} from '../src/operator-daemon/types.js';

describe('operator daemon types', () => {
  test('serializes tracked terminal sessions for persistence', () => {
    const createdAt = new Date('2026-03-28T16:00:00.000Z');
    const lastActivity = new Date('2026-03-28T16:05:00.000Z');

    expect(
      serializeCmdSession({
        id: 'cmd_1',
        handle: 123,
        title: 'Sidofun_1',
        currentDirectory: 'C:\\',
        commandHistory: ['dir'],
        createdAt,
        lastActivity
      })
    ).toEqual({
      id: 'cmd_1',
      handle: 123,
      title: 'Sidofun_1',
      currentDirectory: 'C:\\',
      commandHistory: ['dir'],
      createdAt: createdAt.toISOString(),
      lastActivity: lastActivity.toISOString()
    });

    expect(
      serializePwshSession({
        id: 'pwsh_1',
        handle: 456,
        title: 'Sidofun_PS_1',
        currentDirectory: 'C:\\',
        commandHistory: ['Get-Location'],
        createdAt,
        lastActivity
      })
    ).toEqual({
      id: 'pwsh_1',
      handle: 456,
      title: 'Sidofun_PS_1',
      currentDirectory: 'C:\\',
      commandHistory: ['Get-Location'],
      createdAt: createdAt.toISOString(),
      lastActivity: lastActivity.toISOString()
    });
  });

  test('daemon state shape supports named-pipe metadata', () => {
    const state: PersistedDaemonState = {
      version: 1,
      updatedAt: new Date('2026-03-28T16:10:00.000Z').toISOString(),
      daemon: {
        pid: 999,
        startedAt: new Date('2026-03-28T16:09:00.000Z').toISOString(),
        pipePath: '\\\\.\\pipe\\sidofun-operator'
      },
      clientSessions: [],
      desktopScopes: [],
      browserRuntimes: [],
      browserPages: [],
      cmdSessions: [],
      pwshSessions: []
    };

    expect(state.daemon?.pipePath).toBe('\\\\.\\pipe\\sidofun-operator');
  });

  test('serializes client sessions with owned resources for daemon persistence', () => {
    expect(
      serializeClientSession({
        id: 'client_session_1',
        clientKind: 'mcp',
        name: 'mcp-server',
        createdAt: '2026-03-29T00:00:00.000Z',
        lastActivity: '2026-03-29T00:05:00.000Z',
        shutdown: false,
        resources: [
          {
            type: 'terminal',
            id: 'cmd_1',
            metadata: { kind: 'cmd' },
            ownedAt: '2026-03-29T00:01:00.000Z'
          }
        ]
      })
    ).toEqual({
      id: 'client_session_1',
      clientKind: 'mcp',
      name: 'mcp-server',
      createdAt: '2026-03-29T00:00:00.000Z',
      lastActivity: '2026-03-29T00:05:00.000Z',
      shutdown: false,
      resources: [
        {
          type: 'terminal',
          id: 'cmd_1',
          metadata: { kind: 'cmd' },
          ownedAt: '2026-03-29T00:01:00.000Z'
        }
      ]
    });
  });

  test('serializes desktop scopes for daemon persistence', () => {
    expect(
      serializeDesktopScope({
        id: 'desktop_scope_1',
        name: 'terminal',
        createdAt: '2026-03-29T00:00:00.000Z',
        updatedAt: '2026-03-29T00:01:00.000Z',
        selectors: {
          windowHandles: [12],
          processIds: [34],
          titleQuery: 'Windows Terminal'
        }
      })
    ).toEqual({
      id: 'desktop_scope_1',
      name: 'terminal',
      createdAt: '2026-03-29T00:00:00.000Z',
      updatedAt: '2026-03-29T00:01:00.000Z',
      selectors: {
        windowHandles: [12],
        processIds: [34],
        titleQuery: 'Windows Terminal'
      }
    });
  });

  test('serializes browser runtimes for daemon persistence', () => {
    expect(
      serializeBrowserRuntime({
        id: 'browser_rt_1',
        browserId: 'chrome',
        automationMode: 'debuggable',
        createdAt: '2026-03-29T00:00:00.000Z',
        status: 'running',
        pid: 4321,
        debugPort: 9444,
        remoteDebuggingUrl: 'http://127.0.0.1:9444',
        executablePath: 'C:\\Browser\\chrome.exe',
        command: ['C:\\Browser\\chrome.exe', '--remote-debugging-port=9444'],
        launchResult: {
          browserId: 'chrome',
          executablePath: 'C:\\Browser\\chrome.exe',
          command: ['C:\\Browser\\chrome.exe', '--remote-debugging-port=9444'],
          pid: 4321,
          debugPort: 9444,
          remoteDebuggingUrl: 'http://127.0.0.1:9444'
        }
      } as any)
    ).toEqual({
      id: 'browser_rt_1',
      browserId: 'chrome',
      automationMode: 'debuggable',
      createdAt: '2026-03-29T00:00:00.000Z',
      status: 'running',
      pid: 4321,
      debugPort: 9444,
      remoteDebuggingUrl: 'http://127.0.0.1:9444',
      executablePath: 'C:\\Browser\\chrome.exe',
      command: ['C:\\Browser\\chrome.exe', '--remote-debugging-port=9444'],
      launchResult: {
        browserId: 'chrome',
        executablePath: 'C:\\Browser\\chrome.exe',
        command: ['C:\\Browser\\chrome.exe', '--remote-debugging-port=9444'],
        pid: 4321,
        debugPort: 9444,
        remoteDebuggingUrl: 'http://127.0.0.1:9444'
      }
    });
  });

  test('serializes browser pages for daemon persistence', () => {
    expect(
      serializeBrowserPage({
        id: 'page_1',
        runtimeId: 'runtime_1',
        url: 'https://example.com',
        title: 'Example',
        createdAt: '2026-03-29T00:00:00.000Z',
        status: 'open',
        networkEvents: [],
        consoleEvents: [],
        eventQueue: []
      })
    ).toEqual({
      id: 'page_1',
      runtimeId: 'runtime_1',
      url: 'https://example.com',
      title: 'Example',
      createdAt: '2026-03-29T00:00:00.000Z',
      status: 'open',
      networkEvents: [],
      consoleEvents: [],
      eventQueue: []
    });
  });
});
