import { describe, expect, test } from 'bun:test';
import { BrowserPageQueryService } from '../src/services/browser-page-query/browser-page-query-service.js';
import type { BrowserPageInfo } from '../src/services/browser-automation/types.js';
import { deriveIdentity } from '../src/services/browser-page-query/browser-page-workflow-primitives.js';

function createPage(): BrowserPageInfo {
  return {
    id: 'browser_pg_1',
    runtimeId: 'browser_rt_1',
    url: 'https://example.com/login',
    title: 'Example Login',
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    status: 'open'
  };
}

describe('browser page query service', () => {
  test('locates semantic matches', async () => {
    const page = createPage();
    const service = new BrowserPageQueryService({
      getPage: async () => page,
      evaluate: async (_pageId, expression) => {
        expect(expression).toContain('"operation":"locate"');
        expect(expression).toContain('"query":"Email"');
        return {
          page,
          value: {
            matched: true,
            matches: [
              {
                selector: '#email',
                text: 'Email address',
                tagName: 'input',
                type: 'email',
                score: 120
              }
            ],
            match: {
              selector: '#email',
              text: 'Email address',
              tagName: 'input',
              type: 'email',
              score: 120
            }
          }
        };
      },
      waitFor: async () => ({
        page,
        matched: true,
        waitFor: 'selector'
      })
    });

    const result = await service.locate(page.id, 'Email', { kind: 'field', limit: 3 });

    expect(result.query).toBe('Email');
    expect(result.kind).toBe('field');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.selector).toBe('#email');
  });

  test('runs semantic form workflow with submit and waits', async () => {
    const page = createPage();
    const evaluateCalls: string[] = [];
    const waitCalls: Array<{ waitFor: string; query?: string; timeoutMs?: number }> = [];
    const service = new BrowserPageQueryService({
      getPage: async () => page,
      evaluate: async (_pageId, expression) => {
        evaluateCalls.push(expression);
        if (expression.includes('"operation":"fill"') && expression.includes('"query":"Email"')) {
          return {
            page,
            value: {
              matched: true,
              match: { selector: '#email', text: 'Email', tagName: 'input', type: 'email', score: 120 },
              matches: [{ selector: '#email', text: 'Email', tagName: 'input', type: 'email', score: 120 }]
            }
          };
        }
        if (expression.includes('"operation":"fill"') && expression.includes('"query":"Password"')) {
          return {
            page,
            value: {
              matched: true,
              match: { selector: '#password', text: 'Password', tagName: 'input', type: 'password', score: 120 },
              matches: [{ selector: '#password', text: 'Password', tagName: 'input', type: 'password', score: 120 }]
            }
          };
        }
        if (expression.includes('"operation":"submit"')) {
          return {
            page,
            value: {
              matched: true,
              match: { selector: 'button[type="submit"]', text: 'Sign in', tagName: 'button', score: 90 },
              matches: [{ selector: 'button[type="submit"]', text: 'Sign in', tagName: 'button', score: 90 }]
            }
          };
        }
        if (expression.includes('document.body?.innerText')) {
          return { page, value: true };
        }
        if (expression.includes('document.querySelector')) {
          return { page, value: true };
        }
        throw new Error(`Unexpected evaluate expression: ${expression}`);
      },
      waitFor: async (_pageId, waitFor, query, timeoutMs) => {
        waitCalls.push({ waitFor, query, timeoutMs });
        return {
          page,
          matched: true,
          waitFor,
          query
        };
      }
    });

    const result = await service.formWorkflow(page.id, {
      fields: [
        { query: 'Email', value: 'user@example.com' },
        { query: 'Password', value: 'secret' }
      ],
      submit: true,
      waitUrlIncludes: '/dashboard',
      waitText: 'Welcome',
      waitSelector: '.app-shell',
      waitNoSelector: '.loading',
      timeoutMs: 5000,
      intervalMs: 100
    });

    expect(result.fields).toHaveLength(2);
    expect(result.fields.every((field) => field.matched)).toBe(true);
    expect(result.submit?.matched).toBe(true);
    expect(result.waits.matched).toBe(true);
    expect(waitCalls).toEqual([
      { waitFor: 'url', query: '/dashboard', timeoutMs: 5000 },
      { waitFor: 'selector', query: '.app-shell', timeoutMs: 5000 }
    ]);
    expect(evaluateCalls.some((call) => call.includes('"operation":"fill"') && call.includes('"query":"Email"'))).toBe(true);
    expect(evaluateCalls.some((call) => call.includes('"operation":"fill"') && call.includes('"query":"Password"'))).toBe(true);
    expect(evaluateCalls.some((call) => call.includes('"operation":"submit"'))).toBe(true);
  });

  test('supports workflow primitives for fill, click, agreement, settle, and complete profile', async () => {
    const page = createPage();
    const service = new BrowserPageQueryService({
      getPage: async () => page,
      evaluate: async (_pageId, expression) => {
        if (expression.includes('"operation":"fill-commit"')) {
          return { page, value: true };
        }
        if (expression.includes('"operation":"wait-ready"')) {
          return { page, value: true };
        }
        if (expression.includes('"operation":"click-text"')) {
          return { page, value: { matched: true } };
        }
        if (expression.includes('"operation":"check-agreement"')) {
          return { page, value: { matched: true, checked: true } };
        }
        if (expression.includes('"operation":"settle-sample"')) {
          return { page, value: '{"readyState":"complete","title":"Example","textLength":20,"nodeCount":12}' };
        }
        throw new Error(`Unexpected evaluate expression: ${expression}`);
      },
      waitFor: async (_pageId, waitFor, query, _timeoutMs) => ({
        page,
        matched: true,
        waitFor,
        query
      })
    });

    const fillCommit = await service.fillCommit(page.id, '#email', 'user@example.com');
    const waitReady = await service.waitReady(page.id, ['#email', '#password'], { stableReads: 2, intervalMs: 1, timeoutMs: 50 });
    const clicked = await service.clickButtonText(page.id, 'Continue');
    const agreement = await service.checkAgreement(page.id);
    const settled = await service.settle(page.id, 'dom', { stableReads: 1, intervalMs: 1, timeoutMs: 50 });
    const profile = await service.completeProfile(page.id, { email: 'jan.usef.tech@example.com' });

    expect(fillCommit.matched).toBe(true);
    expect(waitReady.matched).toBe(true);
    expect(clicked.matched).toBe(true);
    expect(agreement.checked).toBe(true);
    expect(settled.matched).toBe(true);
    expect(profile.matched).toBe(true);
    expect(profile.username).toBe('jan_usef_tech');
    expect(profile.fullName).toBe('Jan Usef Tech');
  });

  test('derives identity defaults from email', () => {
    expect(deriveIdentity('jan.usef-tech@example.com')).toEqual({
      username: 'jan_usef_tech',
      fullName: 'Jan Usef Tech'
    });
  });
});
