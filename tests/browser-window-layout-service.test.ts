import { describe, expect, test } from 'bun:test';
import { BrowserWindowLayoutService } from '../src/services/browser-window-layout/browser-window-layout-service.js';
import type { BrowserRuntimeInfo } from '../src/services/browser-automation/types.js';

describe('BrowserWindowLayoutService', () => {
  test('binds a runtime to a visible browser window by pid', () => {
    const runtime: BrowserRuntimeInfo = {
      id: 'runtime_1',
      browserId: 'chrome',
      automationMode: 'debuggable',
      createdAt: '2026-04-13T00:00:00.000Z',
      status: 'running',
      pid: 4321,
      debugPort: 9222,
      remoteDebuggingUrl: 'http://127.0.0.1:9222',
      executablePath: 'C:\\Chrome\\chrome.exe',
      command: ['chrome.exe'],
      launchResult: {
        browserId: 'chrome',
        executablePath: 'C:\\Chrome\\chrome.exe',
        command: ['chrome.exe'],
        debugPort: 9222,
        remoteDebuggingUrl: 'http://127.0.0.1:9222'
      }
    };

    let registeredRuntime: BrowserRuntimeInfo | undefined;
    const service = new BrowserWindowLayoutService({
      browserService: {
        listWindows: () => [{
          handle: 99,
          title: 'ChatGPT - Google Chrome',
          processName: 'chrome',
          pid: 4321,
          browserId: 'chrome',
          bounds: { x: 10, y: 20, width: 800, height: 600 }
        }]
      },
      browserAutomationService: {
        listRuntimes: () => [runtime],
        getRuntime: () => runtime,
        registerRuntime: (updatedRuntime: BrowserRuntimeInfo) => {
          registeredRuntime = updatedRuntime;
          return updatedRuntime;
        }
      },
      processWindowService: {
        move: async () => 'moved',
        resize: async () => 'resized',
        restore: async () => 'restored'
      },
      screenSize: async () => ({ width: 1920, height: 1080 }),
      now: () => new Date('2026-04-13T01:02:03.000Z')
    });

    const binding = service.bindRuntimeWindow('runtime_1');

    expect(binding.matched).toBe(true);
    expect(binding.matchKind).toBe('pid');
    expect(binding.window?.handle).toBe(99);
    expect(registeredRuntime?.windowHandle).toBe(99);
    expect(registeredRuntime?.windowTitle).toBe('ChatGPT - Google Chrome');
    expect(registeredRuntime?.windowBounds).toEqual({ x: 10, y: 20, width: 800, height: 600 });
    expect(registeredRuntime?.windowBindingUpdatedAt).toBe('2026-04-13T01:02:03.000Z');
  });

  test('tiles runtime windows into a grid', async () => {
    const runtimes: BrowserRuntimeInfo[] = [
      {
        id: 'runtime_1',
        browserId: 'chrome',
        automationMode: 'debuggable',
        createdAt: '2026-04-13T00:00:00.000Z',
        status: 'running',
        pid: 1001,
        debugPort: 9222,
        remoteDebuggingUrl: 'http://127.0.0.1:9222',
        executablePath: 'C:\\Chrome\\chrome.exe',
        command: ['chrome.exe'],
        launchResult: {
          browserId: 'chrome',
          executablePath: 'C:\\Chrome\\chrome.exe',
          command: ['chrome.exe'],
          debugPort: 9222,
          remoteDebuggingUrl: 'http://127.0.0.1:9222'
        }
      },
      {
        id: 'runtime_2',
        browserId: 'chrome',
        automationMode: 'debuggable',
        createdAt: '2026-04-13T00:00:00.000Z',
        status: 'running',
        pid: 1002,
        debugPort: 9223,
        remoteDebuggingUrl: 'http://127.0.0.1:9223',
        executablePath: 'C:\\Chrome\\chrome.exe',
        command: ['chrome.exe'],
        launchResult: {
          browserId: 'chrome',
          executablePath: 'C:\\Chrome\\chrome.exe',
          command: ['chrome.exe'],
          debugPort: 9223,
          remoteDebuggingUrl: 'http://127.0.0.1:9223'
        }
      }
    ];
    const operations: Array<{ kind: string; args: number[] }> = [];

    const service = new BrowserWindowLayoutService({
      browserService: {
        listWindows: () => [
          { handle: 11, title: 'A', processName: 'chrome', pid: 1001, browserId: 'chrome', bounds: { x: 0, y: 0, width: 400, height: 300 } },
          { handle: 12, title: 'B', processName: 'chrome', pid: 1002, browserId: 'chrome', bounds: { x: 0, y: 0, width: 400, height: 300 } }
        ]
      },
      browserAutomationService: {
        listRuntimes: () => runtimes,
        getRuntime: (runtimeId: string) => runtimes.find((runtime) => runtime.id === runtimeId)!,
        registerRuntime: (runtime: BrowserRuntimeInfo) => runtime
      },
      processWindowService: {
        restore: async (windowHandle: number) => {
          operations.push({ kind: 'restore', args: [windowHandle] });
          return 'restored';
        },
        move: async (windowHandle: number, x: number, y: number) => {
          operations.push({ kind: 'move', args: [windowHandle, x, y] });
          return 'moved';
        },
        resize: async (windowHandle: number, width: number, height: number) => {
          operations.push({ kind: 'resize', args: [windowHandle, width, height] });
          return 'resized';
        }
      },
      screenSize: async () => ({ width: 1200, height: 800 })
    });

    const result = await service.tileRuntimeWindows({ columns: 2, gap: 20 });

    expect(result.columns).toBe(2);
    expect(result.rows).toBe(1);
    expect(result.windows).toEqual([
      { runtimeId: 'runtime_1', windowHandle: 11, x: 0, y: 0, width: 590, height: 800 },
      { runtimeId: 'runtime_2', windowHandle: 12, x: 610, y: 0, width: 590, height: 800 }
    ]);
    expect(operations).toEqual([
      { kind: 'restore', args: [11] },
      { kind: 'move', args: [11, 0, 0] },
      { kind: 'resize', args: [11, 590, 800] },
      { kind: 'restore', args: [12] },
      { kind: 'move', args: [12, 610, 0] },
      { kind: 'resize', args: [12, 590, 800] }
    ]);
  });

  test('tiles five runtime windows with the newsroom-5 preset', async () => {
    const runtimes: BrowserRuntimeInfo[] = Array.from({ length: 5 }, (_, index) => ({
      id: `runtime_${index + 1}`,
      browserId: 'chrome',
      automationMode: 'debuggable',
      createdAt: '2026-04-13T00:00:00.000Z',
      status: 'running',
      pid: 2000 + index,
      debugPort: 9222 + index,
      remoteDebuggingUrl: `http://127.0.0.1:${9222 + index}`,
      executablePath: 'C:\\Chrome\\chrome.exe',
      command: ['chrome.exe'],
      launchResult: {
        browserId: 'chrome',
        executablePath: 'C:\\Chrome\\chrome.exe',
        command: ['chrome.exe'],
        debugPort: 9222 + index,
        remoteDebuggingUrl: `http://127.0.0.1:${9222 + index}`
      }
    }));

    const service = new BrowserWindowLayoutService({
      browserService: {
        listWindows: () => runtimes.map((runtime, index) => ({
          handle: 100 + index,
          title: `Window ${index + 1}`,
          processName: 'chrome',
          pid: runtime.pid!,
          browserId: 'chrome',
          bounds: { x: 0, y: 0, width: 400, height: 300 }
        }))
      },
      browserAutomationService: {
        listRuntimes: () => runtimes,
        getRuntime: (runtimeId: string) => runtimes.find((runtime) => runtime.id === runtimeId)!,
        registerRuntime: (runtime: BrowserRuntimeInfo) => runtime
      },
      processWindowService: {
        restore: async () => 'restored',
        move: async () => 'moved',
        resize: async () => 'resized'
      },
      screenSize: async () => ({ width: 1500, height: 900 })
    });

    const result = await service.tileRuntimeWindows({ preset: 'newsroom-5', gap: 20 });

    expect(result.columns).toBe(3);
    expect(result.rows).toBe(2);
    expect(result.windows).toEqual([
      { runtimeId: 'runtime_1', windowHandle: 100, x: 0, y: 0, width: 858, height: 900 },
      { runtimeId: 'runtime_2', windowHandle: 101, x: 878, y: 0, width: 301, height: 440 },
      { runtimeId: 'runtime_3', windowHandle: 102, x: 1199, y: 0, width: 301, height: 440 },
      { runtimeId: 'runtime_4', windowHandle: 103, x: 878, y: 460, width: 301, height: 440 },
      { runtimeId: 'runtime_5', windowHandle: 104, x: 1199, y: 460, width: 301, height: 440 }
    ]);
  });
});
