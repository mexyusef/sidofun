import { randomUUID } from 'node:crypto';
import type { Browser, BrowserContext, Page } from 'playwright-core';
import type { BrowserAutomationService } from './browser-automation-service.js';
import { CdpConnection, type CdpPageHandle } from './cdp-adapter.js';
import {
  DefaultPlaywrightAdapter,
  type PlaywrightAdapter
} from './playwright-adapter.js';
import type {
  BrowserPageActionResult,
  BrowserPageContentResult,
  BrowserPageDownloadResult,
  BrowserConsoleEvent,
  BrowserNetworkEvent,
  BrowserNetworkWaitResult,
  BrowserPageEvent,
  BrowserPageEventCursorResult,
  BrowserPageEvaluateResult,
  BrowserPageInfo,
  BrowserPageSnapshot,
  BrowserPagePdfResult,
  BrowserPageScreenshotResult,
  BrowserPageWaitResult,
} from './types.js';

interface BrowserPlaywrightServiceOptions {
  automationService: Pick<BrowserAutomationService, 'getRuntime'>;
  adapter?: PlaywrightAdapter;
  generateId?: () => string;
  now?: () => Date;
}

interface RuntimeConnection {
  browser: Browser;
  context: BrowserContext;
}

interface ManagedPage {
  info: BrowserPageInfo;
  page?: Page;
  cdpHandle?: CdpPageHandle;
  kind: 'playwright' | 'cdp';
  runtimeId: string;
  networkEvents: BrowserNetworkEvent[];
  consoleEvents: BrowserConsoleEvent[];
  eventQueue: BrowserPageEvent[];
}

export class BrowserPlaywrightService {
  private readonly automationService: Pick<BrowserAutomationService, 'getRuntime'>;
  private readonly adapter: PlaywrightAdapter;
  private readonly generateId: () => string;
  private readonly now: () => Date;
  private readonly connections = new Map<string, RuntimeConnection>();
  private readonly cdpConnections = new Map<string, CdpConnection>();
  private readonly pages = new Map<string, ManagedPage>();
  private nextEventId = 1;

  constructor(options: BrowserPlaywrightServiceOptions) {
    this.automationService = options.automationService;
    this.adapter = options.adapter || new DefaultPlaywrightAdapter();
    this.generateId = options.generateId || (() => `browser_pg_${randomUUID()}`);
    this.now = options.now || (() => new Date());
  }

  async listPages(runtimeId?: string): Promise<BrowserPageInfo[]> {
    const pages = [...this.pages.values()].map((entry) => entry.info);
    if (!runtimeId) {
      return pages;
    }
    return pages.filter((page) => page.runtimeId === runtimeId);
  }

  snapshotPages(runtimeId?: string): BrowserPageSnapshot[] {
    const pages = [...this.pages.values()].map((managedPage) => this.toSnapshot(managedPage));
    if (!runtimeId) {
      return pages;
    }
    return pages.filter((page) => page.runtimeId === runtimeId);
  }

  pageCount(): number {
    return this.pages.size;
  }

  async registerRestoredPages(runtimeId: string, pages: BrowserPageSnapshot[]): Promise<BrowserPageInfo[]> {
    if (pages.length === 0) {
      return [];
    }

    const restored: BrowserPageInfo[] = [];
    this.bumpNextEventIdFromSnapshots(pages);

    for (const closedPage of pages.filter((page) => page.status === 'closed')) {
      this.pages.set(closedPage.id, {
        info: {
          id: closedPage.id,
          runtimeId: closedPage.runtimeId,
          url: closedPage.url,
          title: closedPage.title,
          createdAt: closedPage.createdAt,
          closedAt: closedPage.closedAt,
          status: closedPage.status
        },
        runtimeId,
        kind: 'playwright',
        networkEvents: closedPage.networkEvents.map((event) => ({ ...event })),
        consoleEvents: closedPage.consoleEvents.map((event) => ({ ...event })),
        eventQueue: closedPage.eventQueue.map((event) => ({ ...event }))
      });
      restored.push({
        id: closedPage.id,
        runtimeId: closedPage.runtimeId,
        url: closedPage.url,
        title: closedPage.title,
        createdAt: closedPage.createdAt,
        closedAt: closedPage.closedAt,
        status: closedPage.status
      });
    }

    if (!this.supportsPlaywright(this.automationService.getRuntime(runtimeId).browserId)) {
      return restored;
    }

    const { context } = await this.getConnection(runtimeId);
    const livePages = [...context.pages()];

    for (const persistedPage of pages.filter((page) => page.status === 'open')) {
      const index = livePages.findIndex((page) => this.matchesRestoredPage(page, persistedPage));
      if (index === -1) {
        continue;
      }

      const page = livePages.splice(index, 1)[0];
      const info = await this.buildPageInfo(
        runtimeId,
        page,
        'open',
        persistedPage.id,
        persistedPage.createdAt,
        persistedPage.closedAt
      );
      const managedPage: ManagedPage = {
        info,
        page,
        runtimeId,
        kind: 'playwright',
        networkEvents: persistedPage.networkEvents.map((event) => ({ ...event })),
        consoleEvents: persistedPage.consoleEvents.map((event) => ({ ...event })),
        eventQueue: persistedPage.eventQueue.map((event) => ({ ...event }))
      };
      this.attachPlaywrightNetworkTracking(managedPage);
      this.attachPlaywrightConsoleTracking(managedPage);
      this.pages.set(info.id, managedPage);
      restored.push(info);
    }

    return restored;
  }

  async openPage(runtimeId: string, url?: string): Promise<BrowserPageInfo> {
    const runtime = this.automationService.getRuntime(runtimeId);
    if (!this.supportsPlaywright(runtime.browserId)) {
      throw new Error(`Playwright CDP attach is only supported for Chromium-family runtimes, not ${runtime.browserId}`);
    }

    try {
      const { context } = await this.getConnection(runtimeId);
      const page = await context.newPage();
      if (url) {
        await page.goto(url);
      }

      const info = await this.buildPageInfo(runtimeId, page, 'open');
      const managedPage: ManagedPage = {
        info,
        page,
        runtimeId,
        kind: 'playwright',
        networkEvents: [],
        consoleEvents: [],
        eventQueue: []
      };
      this.attachPlaywrightNetworkTracking(managedPage);
      this.attachPlaywrightConsoleTracking(managedPage);
      this.pages.set(info.id, managedPage);
      return info;
    } catch {
      const connection = await this.getCdpConnection(runtimeId);
      const handle = await connection.createPage(url);
      const info = await this.buildCdpPageInfo(runtimeId, connection, handle, 'open');
      const managedPage: ManagedPage = {
        info,
        cdpHandle: handle,
        runtimeId,
        kind: 'cdp',
        networkEvents: [],
        consoleEvents: [],
        eventQueue: []
      };
      connection.trackNetworkEvents(handle, info.id);
      this.attachCdpConsoleTracking(managedPage);
      this.pages.set(info.id, managedPage);
      return info;
    }
  }

  async getPage(pageId: string): Promise<BrowserPageInfo> {
    const managedPage = this.requirePage(pageId);
    if (managedPage.kind === 'playwright') {
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt,
        managedPage.info.closedAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt,
        managedPage.info.closedAt
      );
    }
    return managedPage.info;
  }

  async navigate(pageId: string, url: string): Promise<BrowserPageActionResult> {
    const managedPage = this.requireOpenPage(pageId);
    if (managedPage.kind === 'playwright') {
      await managedPage.page!.goto(url);
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      await connection.navigate(managedPage.cdpHandle!, url);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info };
  }

  async click(pageId: string, selector: string): Promise<BrowserPageActionResult> {
    const managedPage = this.requireOpenPage(pageId);
    if (managedPage.kind === 'playwright') {
      await managedPage.page!.click(selector);
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      await connection.click(managedPage.cdpHandle!, selector);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info };
  }

  async fill(pageId: string, selector: string, value: string): Promise<BrowserPageActionResult> {
    const managedPage = this.requireOpenPage(pageId);
    if (managedPage.kind === 'playwright') {
      await managedPage.page!.fill(selector, value);
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      await connection.fill(managedPage.cdpHandle!, selector, value);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info };
  }

  async content(pageId: string): Promise<BrowserPageContentResult> {
    const managedPage = this.requireOpenPage(pageId);
    let content: string;
    if (managedPage.kind === 'playwright') {
      content = await managedPage.page!.content();
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      content = await connection.content(managedPage.cdpHandle!);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return {
      page: managedPage.info,
      content
    };
  }

  async press(pageId: string, selector: string, key: string): Promise<BrowserPageActionResult> {
    const managedPage = this.requireOpenPage(pageId);
    if (managedPage.kind === 'playwright') {
      await managedPage.page!.press(selector, key);
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      await connection.press(managedPage.cdpHandle!, selector, key);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info };
  }

  async waitFor(
    pageId: string,
    waitFor: 'load' | 'selector' | 'title' | 'url',
    query?: string,
    timeoutMs = 10000
  ): Promise<BrowserPageWaitResult> {
    const managedPage = this.requireOpenPage(pageId);
    let matched = false;
    if (managedPage.kind === 'playwright') {
      if (waitFor === 'load') {
        await managedPage.page!.waitForLoadState('load', { timeout: timeoutMs });
        matched = true;
      } else if (waitFor === 'selector' && query) {
        await managedPage.page!.waitForSelector(query, { timeout: timeoutMs });
        matched = true;
      } else if (waitFor === 'title' && query) {
        await managedPage.page!.waitForFunction(
          (titleQuery) => (globalThis as any).document.title.includes(titleQuery),
          query,
          { timeout: timeoutMs }
        );
        matched = true;
      } else if (waitFor === 'url' && query) {
        await managedPage.page!.waitForURL(`**/*${query}*`, { timeout: timeoutMs });
        matched = true;
      }
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      matched = await connection.waitFor(managedPage.cdpHandle!, waitFor, query, timeoutMs);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info, matched, waitFor, query };
  }

  async evaluate(pageId: string, expression: string): Promise<BrowserPageEvaluateResult> {
    const managedPage = this.requireOpenPage(pageId);
    let value: unknown;
    if (managedPage.kind === 'playwright') {
      value = await managedPage.page!.evaluate((expr) => {
        // eslint-disable-next-line no-eval
        return eval(expr);
      }, expression);
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      value = await connection.evaluate(managedPage.cdpHandle!, expression);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info, value };
  }

  async pdf(pageId: string, targetPath: string): Promise<BrowserPagePdfResult> {
    const managedPage = this.requireOpenPage(pageId);
    if (managedPage.kind === 'playwright') {
      await managedPage.page!.pdf({ path: targetPath });
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      await connection.printToPdf(managedPage.cdpHandle!, targetPath);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info, path: targetPath };
  }

  async downloadUrl(pageId: string, url: string, targetPath: string): Promise<BrowserPageDownloadResult> {
    const managedPage = this.requireOpenPage(pageId);
    if (managedPage.kind === 'playwright') {
      const response = await managedPage.page!.context().request.get(url);
      if (!response.ok()) {
        throw new Error(`Download failed for ${url} with status ${response.status()}`);
      }
      const buffer = await response.body();
      await Bun.write(targetPath, buffer);
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      await connection.downloadUrl(managedPage.cdpHandle!, url, targetPath);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return { page: managedPage.info, path: targetPath, url };
  }

  async networkEvents(pageId: string): Promise<BrowserNetworkEvent[]> {
    const managedPage = this.requirePage(pageId);
    if (managedPage.kind === 'playwright') {
      return [...managedPage.networkEvents];
    }
    const connection = await this.getCdpConnection(managedPage.runtimeId);
    return connection.getNetworkEvents(managedPage.cdpHandle!);
  }

  async consoleEvents(pageId: string): Promise<BrowserConsoleEvent[]> {
    const managedPage = this.requirePage(pageId);
    return [...managedPage.consoleEvents];
  }

  async pageEvents(pageId: string, sinceId = 0): Promise<BrowserPageEventCursorResult> {
    const managedPage = this.requirePage(pageId);
    const events = managedPage.eventQueue.filter((event) => event.id > sinceId);
    const nextCursor = managedPage.eventQueue.length > 0
      ? managedPage.eventQueue[managedPage.eventQueue.length - 1].id
      : sinceId;
    return {
      page: await this.getPage(pageId),
      events,
      nextCursor
    };
  }

  async clearEvents(pageId: string): Promise<BrowserPageActionResult> {
    const managedPage = this.requirePage(pageId);
    managedPage.networkEvents = [];
    managedPage.consoleEvents = [];
    managedPage.eventQueue = [];
    if (managedPage.kind === 'cdp') {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      connection.clearNetworkEvents(managedPage.cdpHandle!);
    }
    return { page: managedPage.info };
  }

  async waitForNetwork(
    pageId: string,
    urlIncludes?: string,
    kind?: BrowserNetworkEvent['kind'],
    status?: number,
    timeoutMs = 10000
  ): Promise<BrowserNetworkWaitResult> {
    const managedPage = this.requirePage(pageId);
    const started = Date.now();
    let matched = false;

    while (Date.now() - started < timeoutMs) {
      const events = await this.networkEvents(pageId);
      matched = events.some((event) => {
        if (urlIncludes && !event.url.includes(urlIncludes)) {
          return false;
        }
        if (kind && event.kind !== kind) {
          return false;
        }
        if (typeof status === 'number' && event.status !== status) {
          return false;
        }
        return true;
      });
      if (matched) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return {
      page: await this.getPage(pageId),
      matched,
      urlIncludes,
      kind,
      status
    };
  }

  async screenshot(pageId: string, targetPath?: string, fullPage = false): Promise<BrowserPageScreenshotResult> {
    const managedPage = this.requireOpenPage(pageId);
    if (managedPage.kind === 'playwright') {
      await managedPage.page!.screenshot({
        path: targetPath,
        fullPage
      });
      managedPage.info = await this.buildPageInfo(
        managedPage.runtimeId,
        managedPage.page!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    } else {
      const connection = await this.getCdpConnection(managedPage.runtimeId);
      await connection.screenshot(managedPage.cdpHandle!, targetPath, fullPage);
      managedPage.info = await this.buildCdpPageInfo(
        managedPage.runtimeId,
        connection,
        managedPage.cdpHandle!,
        managedPage.info.status,
        managedPage.info.id,
        managedPage.info.createdAt
      );
    }
    return {
      page: managedPage.info,
      path: targetPath
    };
  }

  async closePage(pageId: string): Promise<BrowserPageInfo> {
    const managedPage = this.requirePage(pageId);
    if (managedPage.info.status === 'open') {
      if (managedPage.kind === 'playwright') {
        await managedPage.page!.close();
      } else {
        const connection = await this.getCdpConnection(managedPage.runtimeId);
        await connection.closePage(managedPage.cdpHandle!);
      }
      managedPage.info.status = 'closed';
      managedPage.info.closedAt = this.now().toISOString();
    }
    return managedPage.info;
  }

  async closeRuntimePages(runtimeId: string): Promise<{ runtimeId: string; closedPageIds: string[] }> {
    const pageIds = [...this.pages.values()]
      .filter((managedPage) => managedPage.runtimeId === runtimeId)
      .map((managedPage) => managedPage.info.id);

    for (const pageId of pageIds) {
      try {
        await this.closePage(pageId);
      } catch {
        // Runtime shutdown may already have invalidated the underlying page handle.
      }
      this.pages.delete(pageId);
    }

    this.connections.delete(runtimeId);
    const cdpConnection = this.cdpConnections.get(runtimeId);
    if (cdpConnection) {
      try {
        await cdpConnection.close();
      } catch {
        // Ignore connection close failures during runtime teardown.
      }
      this.cdpConnections.delete(runtimeId);
    }

    return {
      runtimeId,
      closedPageIds: pageIds
    };
  }

  async shutdown(): Promise<void> {
    for (const managedPage of this.pages.values()) {
      if (managedPage.info.status === 'open') {
        try {
          if (managedPage.kind === 'playwright') {
            await managedPage.page!.close();
          } else {
            const connection = this.cdpConnections.get(managedPage.runtimeId);
            if (connection && managedPage.cdpHandle) {
              await connection.closePage(managedPage.cdpHandle);
            }
          }
        } catch {
          // Ignore shutdown failures.
        }
      }
    }
    this.pages.clear();

    for (const connection of this.connections.values()) {
      try {
        await connection.browser.close();
      } catch {
        // Ignore shutdown failures.
      }
    }
    this.connections.clear();

    for (const connection of this.cdpConnections.values()) {
      try {
        await connection.close();
      } catch {
        // Ignore shutdown failures.
      }
    }
    this.cdpConnections.clear();
  }

  private async getConnection(runtimeId: string): Promise<RuntimeConnection> {
    const existing = this.connections.get(runtimeId);
    if (existing) {
      return existing;
    }

    const runtime = this.automationService.getRuntime(runtimeId);
    if (!this.supportsPlaywright(runtime.browserId)) {
      throw new Error(`Playwright CDP attach is only supported for Chromium-family runtimes, not ${runtime.browserId}`);
    }

    const browser = await this.connectWithRetry(runtime.remoteDebuggingUrl);
    const context = browser.contexts()[0] || await browser.newContext();
    const connection = { browser, context };
    this.connections.set(runtimeId, connection);
    return connection;
  }

  private requirePage(pageId: string): ManagedPage {
    const managedPage = this.pages.get(pageId);
    if (!managedPage) {
      throw new Error(`Browser page not found: ${pageId}`);
    }
    return managedPage;
  }

  private attachPlaywrightNetworkTracking(managedPage: ManagedPage): void {
    if (!managedPage.page) {
      return;
    }
    managedPage.page.on('request', (request) => {
      const event: BrowserNetworkEvent = {
        pageId: managedPage.info.id,
        kind: 'request',
        url: request.url(),
        method: request.method(),
        timestamp: this.now().toISOString()
      };
      managedPage.networkEvents.push(event);
      this.pushPageEvent(managedPage, 'network', event);
    });
    managedPage.page.on('response', (response) => {
      const event: BrowserNetworkEvent = {
        pageId: managedPage.info.id,
        kind: 'response',
        url: response.url(),
        status: response.status(),
        timestamp: this.now().toISOString()
      };
      managedPage.networkEvents.push(event);
      this.pushPageEvent(managedPage, 'network', event);
    });
    managedPage.page.on('requestfinished', (request) => {
      const event: BrowserNetworkEvent = {
        pageId: managedPage.info.id,
        kind: 'request-finished',
        url: request.url(),
        method: request.method(),
        timestamp: this.now().toISOString()
      };
      managedPage.networkEvents.push(event);
      this.pushPageEvent(managedPage, 'network', event);
    });
    managedPage.page.on('requestfailed', (request) => {
      const event: BrowserNetworkEvent = {
        pageId: managedPage.info.id,
        kind: 'request-failed',
        url: request.url(),
        method: request.method(),
        timestamp: this.now().toISOString(),
        errorText: request.failure()?.errorText
      };
      managedPage.networkEvents.push(event);
      this.pushPageEvent(managedPage, 'network', event);
    });
  }

  private attachPlaywrightConsoleTracking(managedPage: ManagedPage): void {
    if (!managedPage.page) {
      return;
    }
    managedPage.page.on('console', (message) => {
      const event: BrowserConsoleEvent = {
        pageId: managedPage.info.id,
        type: message.type(),
        text: message.text(),
        timestamp: this.now().toISOString()
      };
      managedPage.consoleEvents.push(event);
      this.pushPageEvent(managedPage, 'console', event);
    });
  }

  private attachCdpConsoleTracking(managedPage: ManagedPage): void {
    const handle = managedPage.cdpHandle;
    if (!handle) {
      return;
    }
    void this.getCdpConnection(managedPage.runtimeId).then((connection) => {
      connection.onEvent((message) => {
        if (message.sessionId !== handle.sessionId || message.method !== 'Runtime.consoleAPICalled') {
          return;
        }
        const params = message.params || {};
        const args = Array.isArray(params.args) ? params.args : [];
        const text = args
          .map((arg) => {
            if (arg && typeof arg === 'object' && 'value' in arg) {
              return String((arg as { value?: unknown }).value ?? '');
            }
            return '';
          })
          .join(' ')
          .trim();
        const event: BrowserConsoleEvent = {
          pageId: managedPage.info.id,
          type: typeof params.type === 'string' ? params.type : 'log',
          text,
          timestamp: this.now().toISOString()
        };
        managedPage.consoleEvents.push(event);
        this.pushPageEvent(managedPage, 'console', event);
      });
    });
  }

  private pushPageEvent(
    managedPage: ManagedPage,
    category: BrowserPageEvent['category'],
    payload: BrowserNetworkEvent | BrowserConsoleEvent
  ): void {
    managedPage.eventQueue.push({
      id: this.nextEventId++,
      pageId: managedPage.info.id,
      category,
      timestamp: payload.timestamp,
      payload
    });
  }

  private requireOpenPage(pageId: string): ManagedPage {
    const managedPage = this.requirePage(pageId);
    if (managedPage.info.status !== 'open') {
      throw new Error(`Browser page is closed: ${pageId}`);
    }
    return managedPage;
  }

  private async getCdpConnection(runtimeId: string): Promise<CdpConnection> {
    const existing = this.cdpConnections.get(runtimeId);
    if (existing) {
      return existing;
    }

    const runtime = this.automationService.getRuntime(runtimeId);
    const connection = await CdpConnection.connect(runtime.remoteDebuggingUrl);
    this.cdpConnections.set(runtimeId, connection);
    return connection;
  }

  private async buildPageInfo(
    runtimeId: string,
    page: Page,
    status: 'open' | 'closed',
    id = this.generateId(),
    createdAt = this.now().toISOString(),
    closedAt?: string
  ): Promise<BrowserPageInfo> {
    return {
      id,
      runtimeId,
      url: page.url(),
      title: await page.title(),
      createdAt,
      closedAt,
      status
    };
  }

  private async buildCdpPageInfo(
    runtimeId: string,
    connection: CdpConnection,
    handle: CdpPageHandle,
    status: 'open' | 'closed',
    id = this.generateId(),
    createdAt = this.now().toISOString(),
    closedAt?: string
  ): Promise<BrowserPageInfo> {
    const pageInfo = await connection.getPageInfo(handle);
    return {
      id,
      runtimeId,
      url: pageInfo.url,
      title: pageInfo.title,
      createdAt,
      closedAt,
      status
    };
  }

  private supportsPlaywright(browserId: string): boolean {
    return ['chrome', 'edge', 'brave', 'opera', 'vivaldi', 'chromium', 'maxthon', 'min', 'midori'].includes(browserId);
  }

  private toSnapshot(managedPage: ManagedPage): BrowserPageSnapshot {
    return {
      ...managedPage.info,
      networkEvents: managedPage.networkEvents.map((event) => ({ ...event })),
      consoleEvents: managedPage.consoleEvents.map((event) => ({ ...event })),
      eventQueue: managedPage.eventQueue.map((event) => ({ ...event }))
    };
  }

  private bumpNextEventIdFromSnapshots(pages: BrowserPageSnapshot[]): void {
    const nextId = pages.reduce((maxId, page) => {
      const pageMax = page.eventQueue.reduce((innerMax, event) => Math.max(innerMax, event.id), 0);
      return Math.max(maxId, pageMax);
    }, 0);
    this.nextEventId = Math.max(this.nextEventId, nextId + 1);
  }

  private matchesRestoredPage(page: Page, persistedPage: BrowserPageInfo): boolean {
    const liveUrl = page.url();
    if (persistedPage.url && liveUrl === persistedPage.url) {
      return true;
    }
    if (persistedPage.url && persistedPage.url !== 'about:blank' && liveUrl.includes(persistedPage.url)) {
      return true;
    }
    return false;
  }

  private async connectWithRetry(endpointURL: string): Promise<Browser> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        return await this.adapter.connectOverCDP(endpointURL);
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
