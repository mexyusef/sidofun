import { describe, expect, test } from 'bun:test';
import { BrowserPageMacroService } from '../src/services/browser-page-query/browser-page-macro-service.js';
import { BrowserPageQueryService } from '../src/services/browser-page-query/browser-page-query-service.js';
import type { BrowserPageInfo } from '../src/services/browser-automation/types.js';

function createPage(id = 'browser_pg_1', url = 'https://example.com/login'): BrowserPageInfo {
  return {
    id,
    runtimeId: 'browser_rt_1',
    url,
    title: 'Example Login',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    status: 'open'
  };
}

function createQueryService(page: BrowserPageInfo, calls: string[]) {
  return new BrowserPageQueryService({
    getPage: async () => page,
    evaluate: async (_pageId, expression) => {
      calls.push(expression);
      if (expression.includes('"operation":"fill"') && expression.includes('"query":"Email"')) {
        return { page, value: { matched: true, match: { selector: '#email', text: '', tagName: 'input', type: 'email', score: 120 }, matches: [] } };
      }
      if (expression.includes('"operation":"fill"') && expression.includes('"query":"Username"')) {
        return { page, value: { matched: true, match: { selector: '#username', text: '', tagName: 'input', type: 'text', score: 120 }, matches: [] } };
      }
      if (expression.includes('"operation":"fill"') && expression.includes('"query":"Password"')) {
        return { page, value: { matched: true, match: { selector: '#password', text: '', tagName: 'input', type: 'password', score: 120 }, matches: [] } };
      }
      if (expression.includes('"operation":"click"') && expression.includes('"query":"Log in"')) {
        return { page, value: { matched: true, match: { selector: '#login', text: 'Log in', tagName: 'button', score: 90 }, matches: [] } };
      }
      if (expression.includes('"operation":"submit"')) {
        return { page, value: { matched: true, match: { selector: 'form', text: '', tagName: 'form', score: 80 }, matches: [] } };
      }
      if (expression.includes('document.body?.innerText')) {
        return { page, value: true };
      }
      return { page, value: { matched: false, matches: [] } };
    },
    waitFor: async (_pageId, waitFor, query) => ({
      page,
      matched: true,
      waitFor,
      query
    })
  });
}

describe('browser page macro service', () => {
  test('auth login fills semantic fields and clicks login fallback', async () => {
    const page = createPage();
    const calls: string[] = [];
    const queries = createQueryService(page, calls);
    const service = new BrowserPageMacroService(queries, {
      openPage: async () => page,
      getPage: async () => page,
      waitFor: async (_pageId, waitFor, query) => ({
        page,
        matched: true,
        waitFor,
        query
      })
    });

    const result = await service.authLogin(page.id, {
      email: 'user@example.com',
      password: 'secret',
      waitUrlIncludes: '/dashboard'
    });

    expect(result.fields).toHaveLength(2);
    expect(result.fields.every((field) => field.matched)).toBe(true);
    expect(result.submit?.matched).toBe(true);
    expect(result.submit?.query).toBe('Log in');
    expect(result.waits.matched).toBe(true);
    expect(calls.some((call) => call.includes('"operation":"fill"') && call.includes('"query":"Email"'))).toBe(true);
    expect(calls.some((call) => call.includes('"operation":"fill"') && call.includes('"query":"Password"'))).toBe(true);
    expect(calls.some((call) => call.includes('"operation":"click"') && call.includes('"query":"Log in"'))).toBe(true);
  });

  test('open workflow opens a page then runs semantic form workflow', async () => {
    const openedPage = createPage('browser_pg_2', 'https://example.com/login');
    const calls: string[] = [];
    const queries = new BrowserPageQueryService({
      getPage: async () => openedPage,
      evaluate: async (_pageId, expression) => {
        calls.push(expression);
        if (expression.includes('"operation":"fill"') && expression.includes('"query":"Username"')) {
          return { page: openedPage, value: { matched: true, match: { selector: '#username', text: '', tagName: 'input', type: 'text', score: 120 }, matches: [] } };
        }
        if (expression.includes('"operation":"fill"') && expression.includes('"query":"Password"')) {
          return { page: openedPage, value: { matched: true, match: { selector: '#password', text: '', tagName: 'input', type: 'password', score: 120 }, matches: [] } };
        }
        if (expression.includes('"operation":"submit"')) {
          return { page: openedPage, value: { matched: true, match: { selector: '#login', text: 'Login', tagName: 'input', type: 'submit', score: 120 }, matches: [] } };
        }
        return { page: openedPage, value: { matched: false, matches: [] } };
      },
      waitFor: async (_pageId, waitFor, query) => ({
        page: openedPage,
        matched: true,
        waitFor,
        query
      })
    });
    const service = new BrowserPageMacroService(queries, {
      openPage: async (_runtimeId, url) => ({ ...openedPage, url: url ?? openedPage.url }),
      getPage: async () => ({ ...openedPage, url: 'https://example.com/app', title: 'Example App' }),
      waitFor: async (_pageId, waitFor, query) => ({
        page: { ...openedPage, url: 'https://example.com/app', title: 'Example App' },
        matched: true,
        waitFor,
        query
      })
    });

    const result = await service.openWorkflow('browser_rt_1', {
      url: 'https://example.com/login',
      fields: [
        { query: 'Username', value: 'demo-user' },
        { query: 'Password', value: 'secret' }
      ],
      submit: true,
      submitQuery: 'Login',
      waitUrlIncludes: '/app'
    });

    expect(result.page.url).toBe('https://example.com/app');
    expect(result.workflow.fields).toHaveLength(2);
    expect(result.workflow.submit?.matched).toBe(true);
    expect(result.workflow.waits.urlIncludes).toBe('/app');
    expect(calls.some((call) => call.includes('"operation":"submit"'))).toBe(true);
  });
});
