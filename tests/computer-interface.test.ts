import { describe, expect, test } from 'bun:test';
import { createComputerInterface } from '../src/services/computer/computer-interface.js';

describe('computer interface', () => {
  test('groups stable interface families over existing services', async () => {
    const calls: Array<{ service: string; method: string; args: unknown[] }> = [];
    const computer = createComputerInterface({
      platform: {
        getScreenSize: async () => ({ width: 100, height: 50 }),
        getMousePosition: async () => ({ x: 1, y: 2 }),
        getActiveWindow: async () => ({ title: 'Explorer', handle: 1, rect: { x: 0, y: 0, width: 100, height: 50 } }),
        takeScreenshot: async (options?: unknown) => ({ kind: 'shot', options }),
        screenshotWin32: async (options?: unknown) => ({ kind: 'shot_win32', options }),
        executeDesktopAction: async (action: unknown) => action
      } as any,
      clipboardService: {
        read: async () => 'hello',
        write: async (text: string) => ({ text }),
        clear: async () => ({ cleared: true }),
        status: async () => ({ hasText: true, text: 'hello', length: 5 })
      } as any,
      processWindowService: {
        listWindows: async () => [{ handle: 1 }],
        getWindowInfo: async (windowHandle: number) => ({ handle: windowHandle }),
        focus: async (windowTitle?: string, processName?: string) => ({ windowTitle, processName }),
        move: async (...args: unknown[]) => ({ moved: args }),
        resize: async (...args: unknown[]) => ({ resized: args }),
        show: async (...args: unknown[]) => ({ shown: args }),
        hide: async (...args: unknown[]) => ({ hidden: args }),
        maximize: async (...args: unknown[]) => ({ maximized: args }),
        minimize: async (...args: unknown[]) => ({ minimized: args }),
        restore: async (...args: unknown[]) => ({ restored: args }),
        close: async (...args: unknown[]) => ({ closed: args }),
        dragMove: async (...args: unknown[]) => ({ dragMoved: args }),
        dragResize: async (...args: unknown[]) => ({ dragResized: args }),
        listProcesses: async () => [{ pid: 1 }]
      } as any,
      shellService: {
        run: async (options: unknown) => {
          calls.push({ service: 'shell', method: 'run', args: [options] });
          return { ok: true, options };
        }
      } as any,
      terminalService: {
        spawn: async (options: unknown) => {
          calls.push({ service: 'terminal', method: 'spawn', args: [options] });
          return { ok: true, options };
        },
        list: async (kind?: unknown) => ({ kind }),
        status: async (target: unknown) => ({ target }),
        focus: async (target: unknown) => ({ target }),
        type: async (target: unknown, text: string) => ({ target, text }),
        exec: async (target: unknown, command: string, options?: unknown) => ({ target, command, options }),
        close: async (target: unknown) => ({ target })
      } as any,
      browserService: {
        listBrowsers: () => [{ id: 'chrome' }],
        getBrowserInfo: (browserId: string) => ({ id: browserId }),
        listProfiles: (browserId: string) => [{ browserId }],
        launchBrowser: async (options: unknown) => ({ launched: options })
      } as any,
      browserAutomationService: {
        createRuntime: async (options: unknown) => ({ created: options }),
        listRuntimes: () => [{ id: 'runtime_1' }],
        getRuntime: (runtimeId: string) => ({ id: runtimeId }),
        closeRuntime: (runtimeId: string) => ({ closed: runtimeId })
      } as any,
      browserPlaywrightService: {
        listPages: async (runtimeId?: string) => [{ runtimeId }],
        openPage: async (runtimeId: string, url?: string) => ({ runtimeId, url }),
        getPage: async (pageId: string) => ({ id: pageId }),
        closePage: async (pageId: string) => ({ closed: pageId })
      } as any,
      desktopScopeService: {
        create: async (options: unknown) => ({ created: options }),
        list: async () => ({ scopes: [], count: 0 }),
        getInfo: async (scopeId: string) => ({ id: scopeId }),
        focus: async (scopeId: string) => ({ id: scopeId }),
        screenshot: async (scopeId: string, options?: unknown) => ({ scopeId, options }),
        click: async (scopeId: string, target: unknown, button: string) => ({ scopeId, target, button }),
        type: async (scopeId: string, text: string) => ({ scopeId, text }),
        close: async (scopeId: string) => ({ scopeId, closed: true })
      } as any,
      sessionManagerService: {
        createSession: (options?: unknown) => ({ created: options }),
        listSessions: () => ({ sessions: [], count: 0 }),
        getSession: (sessionId: string) => ({ id: sessionId }),
        touchSession: (sessionId: string) => ({ id: sessionId, touched: true }),
        closeSession: async (sessionId: string, options?: unknown) => ({ id: sessionId, options })
      } as any,
      telemetryService: {
        startTrace: async (options?: unknown) => ({ trace: options }),
        listTraces: async () => ({ traces: [], count: 0 }),
        getTrace: async (traceId: string) => ({ id: traceId }),
        stopTrace: async (traceId: string) => ({ id: traceId, stopped: true }),
        exportTrace: async (traceId: string, targetPath?: string) => ({ id: traceId, targetPath }),
        startTrajectory: async (options?: unknown) => ({ trajectory: options }),
        listTrajectories: async () => ({ trajectories: [], count: 0 }),
        getTrajectory: async (trajectoryId: string) => ({ id: trajectoryId }),
        appendTurn: async (trajectoryId: string, turn: unknown) => ({ trajectoryId, turn }),
        stopTrajectory: async (trajectoryId: string) => ({ id: trajectoryId, stopped: true }),
        exportTrajectory: async (trajectoryId: string, targetPath?: string) => ({ id: trajectoryId, targetPath })
      } as any
    });

    expect(await computer.screen.size()).toEqual({ width: 100, height: 50 });
    expect(await computer.clipboard.read()).toBe('hello');
    expect(await computer.shell.cmd('dir', 'C:\\hapus', 1000)).toEqual({
      ok: true,
      options: { shell: 'cmd', command: 'dir', cwd: 'C:\\hapus', timeoutMs: 1000, env: undefined }
    });
    expect(await computer.terminal.spawn({ kind: 'cmd', title: 'Demo' } as any)).toEqual({
      ok: true,
      options: { kind: 'cmd', title: 'Demo' }
    });
    expect(await computer.telemetry.trajectory.appendTurn('trajectory_1', { turnId: 'turn_1' } as any)).toEqual({
      trajectoryId: 'trajectory_1',
      turn: { turnId: 'turn_1' }
    });
    expect(await computer.window.dragResize(1, 800, 600)).toEqual({ dragResized: [1, 800, 600] });

    expect(calls).toEqual([
      {
        service: 'shell',
        method: 'run',
        args: [{ shell: 'cmd', command: 'dir', cwd: 'C:\\hapus', timeoutMs: 1000, env: undefined }]
      },
      {
        service: 'terminal',
        method: 'spawn',
        args: [{ kind: 'cmd', title: 'Demo' }]
      }
    ]);
  });
});
