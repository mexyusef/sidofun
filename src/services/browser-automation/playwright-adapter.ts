import type { Browser, BrowserContext, Page } from 'playwright-core';

export interface PlaywrightAdapter {
  connectOverCDP(endpointURL: string): Promise<Browser>;
}

export interface PlaywrightPageRef {
  page: Page;
  context: BrowserContext;
  browser: Browser;
}

export class DefaultPlaywrightAdapter implements PlaywrightAdapter {
  async connectOverCDP(endpointURL: string): Promise<Browser> {
    const url = new URL(endpointURL);
    const originalEnv = {
      HTTP_PROXY: process.env.HTTP_PROXY,
      http_proxy: process.env.http_proxy,
      HTTPS_PROXY: process.env.HTTPS_PROXY,
      https_proxy: process.env.https_proxy,
      ALL_PROXY: process.env.ALL_PROXY,
      all_proxy: process.env.all_proxy,
      NO_PROXY: process.env.NO_PROXY,
      no_proxy: process.env.no_proxy
    };

    const noProxyHosts = [url.hostname, '127.0.0.1', 'localhost'];
    process.env.NO_PROXY = [...new Set([process.env.NO_PROXY, ...noProxyHosts].filter(Boolean))].join(',');
    process.env.no_proxy = process.env.NO_PROXY;
    delete process.env.HTTP_PROXY;
    delete process.env.http_proxy;
    delete process.env.HTTPS_PROXY;
    delete process.env.https_proxy;
    delete process.env.ALL_PROXY;
    delete process.env.all_proxy;

    try {
      const { chromium } = await import('playwright-core');
      return await chromium.connectOverCDP(endpointURL);
    } finally {
      for (const [key, value] of Object.entries(originalEnv)) {
        if (value === undefined) {
          delete (process.env as Record<string, string | undefined>)[key];
        } else {
          (process.env as Record<string, string | undefined>)[key] = value;
        }
      }
    }
  }
}
