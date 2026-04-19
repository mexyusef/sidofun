import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadBrowserPageProfilesFromFile } from '../src/services/browser-page-query/browser-page-profile-file-service.js';
import { BrowserPageProfileService } from '../src/services/browser-page-query/browser-page-profile-service.js';
import { BrowserPageQueryService } from '../src/services/browser-page-query/browser-page-query-service.js';
import type { BrowserPageInfo } from '../src/services/browser-automation/types.js';

function createPage(id = 'browser_pg_1', url = 'https://chatgpt.com/'): BrowserPageInfo {
  return {
    id,
    runtimeId: 'browser_rt_1',
    url,
    title: 'Page',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    status: 'open'
  };
}

describe('browser page profile service', () => {
  test('lists builtin profiles', () => {
    const page = createPage();
    const queries = new BrowserPageQueryService({
      getPage: async () => page,
      evaluate: async () => ({ page, value: { matched: false, matches: [] } }),
      waitFor: async (_pageId, waitFor, query) => ({ page, matched: true, waitFor, query })
    });
    const service = new BrowserPageProfileService(queries, {
      openPage: async () => page,
      getPage: async () => page,
      waitFor: async (_pageId, waitFor, query) => ({ page, matched: true, waitFor, query })
    });

    const profiles = service.listProfiles();

    expect(profiles.some((profile) => profile.id === 'chatgpt')).toBe(true);
  });

  test('runs chatgpt profile login flow', async () => {
    const page = createPage();
    const queries = new BrowserPageQueryService({
      getPage: async () => page,
      evaluate: async (_pageId, expression) => {
        if (expression.includes('"operation":"click"') && expression.includes('"query":"Log in"')) {
          return { page, value: { matched: true, match: { selector: '#login', text: 'Log in', tagName: 'button', score: 120 }, matches: [] } };
        }
        if (expression.includes('"operation":"fill"') && expression.includes('"query":"Email"')) {
          return { page, value: { matched: true, match: { selector: '#email', text: '', tagName: 'input', type: 'email', score: 120 }, matches: [] } };
        }
        if (expression.includes('"operation":"fill"') && expression.includes('"query":"Password"')) {
          return { page, value: { matched: true, match: { selector: '#password', text: '', tagName: 'input', type: 'password', score: 120 }, matches: [] } };
        }
        if (expression.includes('"operation":"click"') && expression.includes('"query":"Continue"')) {
          return { page, value: { matched: true, match: { selector: '#continue', text: 'Continue', tagName: 'button', score: 120 }, matches: [] } };
        }
        return { page, value: { matched: false, matches: [] } };
      },
      waitFor: async (_pageId, waitFor, query) => ({
        page: { ...page, url: 'https://chatgpt.com/auth', title: 'ChatGPT' },
        matched: true,
        waitFor,
        query
      })
    });
    const service = new BrowserPageProfileService(queries, {
      openPage: async () => page,
      getPage: async () => ({ ...page, url: 'https://chatgpt.com/auth', title: 'ChatGPT' }),
      waitFor: async (_pageId, waitFor, query) => ({
        page: { ...page, url: 'https://chatgpt.com/auth', title: 'ChatGPT' },
        matched: true,
        waitFor,
        query
      })
    });

    const result = await service.login('browser_rt_1', 'chatgpt', {
      email: 'user@example.com',
      password: 'secret'
    });

    expect(result.profile.id).toBe('chatgpt');
    expect(result.page.url).toBe('https://chatgpt.com/auth');
    expect(result.steps.every((step) => step.ok)).toBe(true);
  });

  test('loads external profiles from json file', () => {
    const tempFile = path.join(os.tmpdir(), `sidofun-browser-page-profiles-${Date.now()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify({
      profiles: [
        {
          id: 'external-demo',
          name: 'External Demo',
          description: 'External profile',
          defaultUrl: 'https://example.com/login',
          login: {
            steps: [
              { kind: 'fill', query: 'Email', valueFrom: 'email' },
              { kind: 'click', query: 'Continue', queryKind: 'button' }
            ]
          }
        }
      ]
    }, null, 2));

    try {
      const profiles = loadBrowserPageProfilesFromFile(tempFile);
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.id).toBe('external-demo');
    } finally {
      fs.rmSync(tempFile, { force: true });
    }
  });
});
