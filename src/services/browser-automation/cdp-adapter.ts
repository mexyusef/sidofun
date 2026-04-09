import fs from 'node:fs';
import path from 'node:path';
import { WebSocket } from 'ws';
import type { BrowserNetworkEvent } from './types.js';

export interface CdpPageHandle {
  targetId: string;
  sessionId: string;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

interface CdpEventMessage {
  method: string;
  params?: Record<string, unknown>;
  sessionId?: string;
}

interface NetworkEventStore {
  pageId: string;
  events: BrowserNetworkEvent[];
}

export class CdpConnection {
  private readonly ws: WebSocket;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly eventListeners = new Set<(message: CdpEventMessage) => void>();
  private readonly networkEvents = new Map<string, NetworkEventStore>();
  private openPromise: Promise<void>;

  private constructor(ws: WebSocket) {
    this.ws = ws;
    this.openPromise = new Promise((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('error', (error) => reject(error instanceof Error ? error : new Error(String(error))));
    });

    ws.on('message', (raw) => {
      const message = JSON.parse(raw.toString()) as {
        id?: number;
        result?: any;
        error?: { message?: string };
        method?: string;
        params?: Record<string, unknown>;
        sessionId?: string;
      };

      if (typeof message.id === 'number') {
        const pending = this.pending.get(message.id);
        if (!pending) {
          return;
        }
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || 'Unknown CDP error'));
        } else {
          pending.resolve(message.result);
        }
        return;
      }

      if (message.method) {
        this.recordNetworkEvent(message.method, message.params, message.sessionId);
        const eventMessage: CdpEventMessage = {
          method: message.method,
          params: message.params,
          sessionId: message.sessionId
        };
        for (const listener of this.eventListeners) {
          listener(eventMessage);
        }
      }
    });
  }

  static async connect(remoteDebuggingUrl: string): Promise<CdpConnection> {
    const versionResponse = await fetch(`${remoteDebuggingUrl}/json/version`);
    if (!versionResponse.ok) {
      throw new Error(`Failed to fetch CDP version metadata from ${remoteDebuggingUrl}`);
    }

    const version = await versionResponse.json() as {
      webSocketDebuggerUrl?: string;
    };
    if (!version.webSocketDebuggerUrl) {
      throw new Error(`No webSocketDebuggerUrl found at ${remoteDebuggingUrl}`);
    }

    const ws = new WebSocket(version.webSocketDebuggerUrl);
    const connection = new CdpConnection(ws);
    await connection.waitUntilOpen();
    return connection;
  }

  async waitUntilOpen(): Promise<void> {
    await this.openPromise;
  }

  async send(method: string, params?: Record<string, unknown>, sessionId?: string): Promise<any> {
    await this.waitUntilOpen();
    const id = this.nextId++;

    const payload: Record<string, unknown> = {
      id,
      method
    };
    if (params) {
      payload.params = params;
    }
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    const promise = new Promise<any>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.ws.send(JSON.stringify(payload));
    return promise;
  }

  onEvent(listener: (message: CdpEventMessage) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  async createPage(url?: string): Promise<CdpPageHandle> {
    const createResult = await this.send('Target.createTarget', { url: url || 'about:blank' });
    const targetId = createResult.targetId as string;
    const attachResult = await this.send('Target.attachToTarget', {
      targetId,
      flatten: true
    });
    const sessionId = attachResult.sessionId as string;
    await this.send('Page.enable', undefined, sessionId);
    await this.send('Runtime.enable', undefined, sessionId);
    await this.send('Network.enable', undefined, sessionId);
    if (url) {
      await this.waitForLoad(sessionId);
    }
    return { targetId, sessionId };
  }

  trackNetworkEvents(handle: CdpPageHandle, pageId: string): void {
    this.networkEvents.set(handle.sessionId, { pageId, events: [] });
  }

  getNetworkEvents(handle: CdpPageHandle): BrowserNetworkEvent[] {
    return [...(this.networkEvents.get(handle.sessionId)?.events || [])];
  }

  clearNetworkEvents(handle: CdpPageHandle): void {
    const store = this.networkEvents.get(handle.sessionId);
    if (store) {
      store.events = [];
    }
  }

  async navigate(handle: CdpPageHandle, url: string): Promise<void> {
    await this.send('Page.navigate', { url }, handle.sessionId);
    await this.waitForLoad(handle.sessionId);
  }

  async waitFor(
    handle: CdpPageHandle,
    kind: 'load' | 'selector' | 'title' | 'url',
    query?: string,
    timeoutMs = 10000
  ): Promise<boolean> {
    const started = Date.now();
    if (kind === 'load') {
      await this.waitForLoad(handle.sessionId, timeoutMs);
      return true;
    }

    while (Date.now() - started < timeoutMs) {
      if (kind === 'selector' && query) {
        if (await this.evaluate(handle, `Boolean(document.querySelector(${JSON.stringify(query)}))`)) {
          return true;
        }
      }

      if (kind === 'title' && query) {
        const title = await this.evaluate(handle, 'document.title');
        if (typeof title === 'string' && title.includes(query)) {
          return true;
        }
      }

      if (kind === 'url' && query) {
        const info = await this.getPageInfo(handle);
        if (info.url.includes(query)) {
          return true;
        }
      }

      await this.delay(250);
    }

    return false;
  }

  async getPageInfo(handle: CdpPageHandle): Promise<{ url: string; title: string }> {
    const targetInfoResult = await this.send('Target.getTargetInfo', { targetId: handle.targetId });
    const url = (targetInfoResult.targetInfo?.url as string | undefined) || 'about:blank';
    const title = await this.evaluate(handle, 'document.title');
    return {
      url,
      title: typeof title === 'string' ? title : ''
    };
  }

  async click(handle: CdpPageHandle, selector: string): Promise<void> {
    await this.evaluateBoolean(
      handle,
      `
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
      })()
      `
    );
  }

  async fill(handle: CdpPageHandle, selector: string, value: string): Promise<void> {
    await this.evaluateBoolean(
      handle,
      `
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        const input = el;
        input.focus();
        input.value = ${JSON.stringify(value)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
      `
    );
  }

  async press(handle: CdpPageHandle, selector: string, key: string): Promise<void> {
    await this.evaluateBoolean(
      handle,
      `
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.focus();
        const down = new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true });
        const up = new KeyboardEvent('keyup', { key: ${JSON.stringify(key)}, bubbles: true });
        el.dispatchEvent(down);
        el.dispatchEvent(up);
        return true;
      })()
      `
    );
  }

  async evaluate(handle: CdpPageHandle, expression: string): Promise<unknown> {
    const result = await this.send(
      'Runtime.evaluate',
      {
        expression,
        awaitPromise: true,
        returnByValue: true
      },
      handle.sessionId
    );
    return result.result?.value;
  }

  async content(handle: CdpPageHandle): Promise<string> {
    const value = await this.evaluate(handle, 'document.documentElement.outerHTML');
    return typeof value === 'string' ? value : '';
  }

  async screenshot(handle: CdpPageHandle, targetPath?: string, fullPage = false): Promise<void> {
    const result = await this.send(
      'Page.captureScreenshot',
      {
        captureBeyondViewport: fullPage,
        fromSurface: true
      },
      handle.sessionId
    );
    const data = result.data as string | undefined;
    if (data && targetPath) {
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, Buffer.from(data, 'base64'));
    }
  }

  async printToPdf(handle: CdpPageHandle, targetPath: string): Promise<void> {
    const result = await this.send('Page.printToPDF', {}, handle.sessionId);
    const data = result.data as string | undefined;
    if (!data) {
      throw new Error('CDP PDF generation returned no data');
    }
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, Buffer.from(data, 'base64'));
  }

  async downloadUrl(handle: CdpPageHandle, url: string, targetPath: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Download failed for ${url} with status ${response.status}`);
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, Buffer.from(bytes));
  }

  async closePage(handle: CdpPageHandle): Promise<void> {
    await this.send('Target.closeTarget', { targetId: handle.targetId });
  }

  async close(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.ws.once('close', () => resolve());
      this.ws.close();
    });
  }

  private async evaluateBoolean(handle: CdpPageHandle, expression: string): Promise<void> {
    const result = await this.evaluate(handle, expression);
    if (!result) {
      throw new Error('Selector interaction failed');
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async waitForLoad(sessionId: string, timeoutMs = 10000): Promise<void> {
    await new Promise<void>((resolve) => {
      let settled = false;
      const unsubscribe = this.onEvent((message) => {
        if (message.sessionId === sessionId && message.method === 'Page.loadEventFired' && !settled) {
          settled = true;
          unsubscribe();
          resolve();
        }
      });

      setTimeout(() => {
        if (!settled) {
          settled = true;
          unsubscribe();
          resolve();
        }
      }, timeoutMs);
    });
  }

  private recordNetworkEvent(
    method: string,
    params?: Record<string, unknown>,
    sessionId?: string
  ): void {
    if (!sessionId) {
      return;
    }
    const store = this.networkEvents.get(sessionId);
    if (!store) {
      return;
    }

    const timestamp = new Date().toISOString();

    if (method === 'Network.requestWillBeSent') {
      const request = params?.request as { url?: string; method?: string } | undefined;
      store.events.push({
        pageId: store.pageId,
        kind: 'request',
        url: request?.url || '',
        method: request?.method,
        timestamp
      });
      return;
    }

    if (method === 'Network.responseReceived') {
      const response = params?.response as { url?: string; status?: number } | undefined;
      store.events.push({
        pageId: store.pageId,
        kind: 'response',
        url: response?.url || '',
        status: response?.status,
        timestamp
      });
      return;
    }

    if (method === 'Network.loadingFinished') {
      store.events.push({
        pageId: store.pageId,
        kind: 'request-finished',
        url: '',
        timestamp
      });
      return;
    }

    if (method === 'Network.loadingFailed') {
      store.events.push({
        pageId: store.pageId,
        kind: 'request-failed',
        url: '',
        timestamp,
        errorText: typeof params?.errorText === 'string' ? params.errorText : undefined
      });
    }
  }
}
