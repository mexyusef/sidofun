import { describe, expect, test } from 'bun:test';
import { BrowserPlaywrightService } from '../src/services/browser-automation/browser-playwright-service.js';
import type { BrowserRuntimeInfo } from '../src/services/browser-automation/types.js';

class FakePage {
  private currentUrl = 'about:blank';
  private currentTitle = 'New Page';
  private currentContent = '<html></html>';
  private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  on(event: string, listener: (...args: unknown[]) => void): void {
    const listeners = this.listeners.get(event) || [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) || []) {
      listener(...args);
    }
  }

  async goto(url: string): Promise<void> {
    this.currentUrl = url;
    this.currentTitle = `Title for ${url}`;
    this.currentContent = `<html><body>${url}</body></html>`;
  }

  url(): string {
    return this.currentUrl;
  }

  async title(): Promise<string> {
    return this.currentTitle;
  }

  async click(_selector: string): Promise<void> {}

  async fill(selector: string, value: string): Promise<void> {
    this.currentContent = `<html><body>${selector}:${value}</body></html>`;
  }

  async press(_selector: string, _key: string): Promise<void> {}

  async waitForSelector(_selector: string, _options?: unknown): Promise<void> {}

  async waitForFunction(_fn: unknown, _arg: unknown, _options?: unknown): Promise<void> {}

  async waitForURL(_url: string, _options?: unknown): Promise<void> {}

  async waitForLoadState(_state: string, _options?: unknown): Promise<void> {}

  async evaluate(_fn: unknown, expression: string): Promise<unknown> {
    if (expression === 'document.title') {
      return this.currentTitle;
    }
    return null;
  }

  async content(): Promise<string> {
    return this.currentContent;
  }

  async screenshot(_options: { path?: string; fullPage?: boolean }): Promise<void> {}

  async pdf(_options: { path: string }): Promise<void> {}

  context() {
    return {
      request: {
        async get(_url: string) {
          return {
            ok() {
              return true;
            },
            status() {
              return 200;
            },
            async body() {
              return Buffer.from('download');
            }
          };
        }
      }
    };
  }

  async close(): Promise<void> {}
}

class FakeContext {
  private readonly openPages: FakePage[] = [];

  async newPage(): Promise<FakePage> {
    const page = new FakePage();
    this.openPages.push(page);
    return page;
  }

  pages(): FakePage[] {
    return [...this.openPages];
  }
}

class FakeBrowser {
  private readonly context = new FakeContext();

  contexts(): FakeContext[] {
    return [this.context];
  }

  async close(): Promise<void> {}
}

describe('BrowserPlaywrightService', () => {
  test('opens and manipulates a page through a runtime', async () => {
    const runtime: BrowserRuntimeInfo = {
      id: 'runtime_1',
      browserId: 'chrome',
      automationMode: 'debuggable',
      createdAt: '2026-03-06T10:00:00.000Z',
      status: 'running',
      debugPort: 9222,
      remoteDebuggingUrl: 'http://127.0.0.1:9222',
      executablePath: 'C:\\Browser\\chrome.exe',
      command: ['chrome.exe'],
      launchResult: {
        browserId: 'chrome',
        executablePath: 'C:\\Browser\\chrome.exe',
        command: ['chrome.exe'],
        debugPort: 9222,
        remoteDebuggingUrl: 'http://127.0.0.1:9222'
      }
    };

    const service = new BrowserPlaywrightService({
      automationService: {
        getRuntime(runtimeId: string) {
          expect(runtimeId).toBe('runtime_1');
          return runtime;
        }
      },
      adapter: {
        async connectOverCDP(endpointURL: string) {
          expect(endpointURL).toBe('http://127.0.0.1:9222');
          return new FakeBrowser() as any;
        }
      },
      generateId: () => 'page_1',
      now: () => new Date('2026-03-06T10:01:00.000Z')
    });

    const page = await service.openPage('runtime_1', 'https://example.com');
    expect(page.id).toBe('page_1');
    expect(page.url).toBe('https://example.com');

    const navigated = await service.navigate('page_1', 'https://example.org');
    expect(navigated.page.url).toBe('https://example.org');

    const filled = await service.fill('page_1', '#email', 'user@example.com');
    expect(filled.page.id).toBe('page_1');

    const content = await service.content('page_1');
    expect(content.content).toContain('user@example.com');

    const pressed = await service.press('page_1', '#email', 'Enter');
    expect(pressed.page.id).toBe('page_1');

    const waited = await service.waitFor('page_1', 'selector', '#email', 500);
    expect(waited.matched).toBe(true);

    const evaluated = await service.evaluate('page_1', 'document.title');
    expect(evaluated.page.id).toBe('page_1');

    (service as any).pages.get('page_1').page.emit('console', {
      type() {
        return 'log';
      },
      text() {
        return 'sidofun console smoke';
      }
    });

    const consoleEvents = await service.consoleEvents('page_1');
    expect(consoleEvents[0]?.text).toBe('sidofun console smoke');

    const queuedEvents = await service.pageEvents('page_1');
    expect(queuedEvents.events[0]?.category).toBe('console');
    expect(queuedEvents.nextCursor).toBe(1);

    const cleared = await service.clearEvents('page_1');
    expect(cleared.page.id).toBe('page_1');

    const queuedEventsAfterClear = await service.pageEvents('page_1');
    expect(queuedEventsAfterClear.events).toHaveLength(0);
    expect(queuedEventsAfterClear.nextCursor).toBe(0);

    const pdf = await service.pdf('page_1', 'test.pdf');
    expect(pdf.path).toBe('test.pdf');

    const downloaded = await service.downloadUrl('page_1', 'https://example.com/file.txt', 'file.txt');
    expect(downloaded.path).toBe('file.txt');

    const events = await service.networkEvents('page_1');
    expect(Array.isArray(events)).toBe(true);

    const shot = await service.screenshot('page_1', 'test.png', true);
    expect(shot.path).toBe('test.png');

    const closed = await service.closePage('page_1');
    expect(closed.status).toBe('closed');
  });

  test('restores persisted open pages by runtime and url', async () => {
    const runtime: BrowserRuntimeInfo = {
      id: 'runtime_1',
      browserId: 'chrome',
      automationMode: 'debuggable',
      createdAt: '2026-03-06T10:00:00.000Z',
      status: 'running',
      debugPort: 9222,
      remoteDebuggingUrl: 'http://127.0.0.1:9222',
      executablePath: 'C:\\Browser\\chrome.exe',
      command: ['chrome.exe'],
      launchResult: {
        browserId: 'chrome',
        executablePath: 'C:\\Browser\\chrome.exe',
        command: ['chrome.exe'],
        debugPort: 9222,
        remoteDebuggingUrl: 'http://127.0.0.1:9222'
      }
    };

    const browser = new FakeBrowser();
    const livePage = await browser.contexts()[0].newPage();
    await livePage.goto('https://example.com/restored');

    const service = new BrowserPlaywrightService({
      automationService: {
        getRuntime() {
          return runtime;
        }
      },
      adapter: {
        async connectOverCDP() {
          return browser as any;
        }
      },
      now: () => new Date('2026-03-06T10:01:00.000Z')
    });

    const restored = await service.registerRestoredPages('runtime_1', [
      {
        id: 'page_restored_1',
        runtimeId: 'runtime_1',
        url: 'https://example.com/restored',
        title: 'Title for https://example.com/restored',
        createdAt: '2026-03-06T10:00:00.000Z',
        status: 'open',
        networkEvents: [],
        consoleEvents: [
          {
            pageId: 'page_restored_1',
            type: 'log',
            text: 'before restore',
            timestamp: '2026-03-06T10:00:00.000Z'
          }
        ],
        eventQueue: [
          {
            id: 5,
            pageId: 'page_restored_1',
            category: 'console',
            timestamp: '2026-03-06T10:00:00.000Z',
            payload: {
              pageId: 'page_restored_1',
              type: 'log',
              text: 'before restore',
              timestamp: '2026-03-06T10:00:00.000Z'
            }
          }
        ]
      }
    ]);

    expect(restored).toHaveLength(1);
    expect(restored[0].id).toBe('page_restored_1');
    expect((await service.getPage('page_restored_1')).url).toBe('https://example.com/restored');
    expect((await service.consoleEvents('page_restored_1'))[0]?.text).toBe('before restore');

    (service as any).pages.get('page_restored_1').page.emit('console', {
      type() {
        return 'log';
      },
      text() {
        return 'after restore';
      }
    });

    const queuedEvents = await service.pageEvents('page_restored_1');
    expect(queuedEvents.nextCursor).toBe(6);
    expect(queuedEvents.events).toHaveLength(2);
    expect(queuedEvents.events[1]?.payload).toEqual({
      pageId: 'page_restored_1',
      type: 'log',
      text: 'after restore',
      timestamp: '2026-03-06T10:01:00.000Z'
    });
  });

  test('removes tracked pages when a runtime is closed', async () => {
    const runtime: BrowserRuntimeInfo = {
      id: 'runtime_1',
      browserId: 'chrome',
      automationMode: 'debuggable',
      createdAt: '2026-03-06T10:00:00.000Z',
      status: 'running',
      debugPort: 9222,
      remoteDebuggingUrl: 'http://127.0.0.1:9222',
      executablePath: 'C:\\Browser\\chrome.exe',
      command: ['chrome.exe'],
      launchResult: {
        browserId: 'chrome',
        executablePath: 'C:\\Browser\\chrome.exe',
        command: ['chrome.exe'],
        debugPort: 9222,
        remoteDebuggingUrl: 'http://127.0.0.1:9222'
      }
    };

    const service = new BrowserPlaywrightService({
      automationService: {
        getRuntime() {
          return runtime;
        }
      },
      adapter: {
        async connectOverCDP() {
          return new FakeBrowser() as any;
        }
      },
      generateId: () => 'page_1',
      now: () => new Date('2026-03-06T10:01:00.000Z')
    });

    await service.openPage('runtime_1', 'https://example.com');
    const result = await service.closeRuntimePages('runtime_1');

    expect(result.closedPageIds).toEqual(['page_1']);
    expect(await service.listPages()).toHaveLength(0);
  });
});
