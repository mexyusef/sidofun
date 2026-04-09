import { describe, expect, test } from 'bun:test';
import { BrowserAutomationService } from '../src/services/browser-automation/browser-automation-service.js';
import type { BrowserLaunchOptions, BrowserLaunchResult } from '../src/services/browser/types.js';

describe('BrowserAutomationService', () => {
  test('creates, lists, reads, and closes runtimes', async () => {
    const launches: BrowserLaunchOptions[] = [];
    const closedPids: number[] = [];
    const service = new BrowserAutomationService({
      browserService: {
        launchBrowser(options: BrowserLaunchOptions): BrowserLaunchResult {
          launches.push(options);
          return {
            browserId: options.browserId,
            executablePath: 'C:\\Browser\\browser.exe',
            command: ['C:\\Browser\\browser.exe', 'https://example.com'],
            pid: 4567,
            debugPort: options.debugPort,
            remoteDebuggingUrl: `http://127.0.0.1:${options.debugPort}`
          };
        }
      },
      closeProcess(pid: number) {
        closedPids.push(pid);
      },
      generateId: () => 'browser_rt_test',
      now: () => new Date('2026-03-06T10:00:00.000Z'),
      allocatePort: () => 9444,
      async waitForDebugEndpoint(_remoteDebuggingUrl: string) {}
    });

    const runtime = await service.createRuntime({
      browserId: 'chrome',
      url: 'https://example.com',
      automationMode: 'persistent-debuggable'
    });

    expect(launches).toHaveLength(1);
    expect(launches[0].debugPort).toBe(9444);
    expect(launches[0].automationMode).toBe('persistent-debuggable');
    expect(runtime.id).toBe('browser_rt_test');
    expect(runtime.debugPort).toBe(9444);
    expect(service.listRuntimes()).toHaveLength(1);
    expect(service.getRuntime('browser_rt_test').status).toBe('running');

    const closed = service.closeRuntime('browser_rt_test');
    expect(closed.closed).toBe(true);
    expect(closed.status).toBe('closed');
    expect(closedPids).toEqual([4567]);
  });
});
