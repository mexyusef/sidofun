import { describe, expect, test } from 'bun:test';
import {
  assertBrowserExtensionWorkflowOwnership,
  resolveBrowserExtensionWorkflowOwnership
} from '../src/services/browser-extension/workflows/browserext-workflow-ownership.js';

describe('browserext workflow ownership', () => {
  test('prefers pinned tab and reports diagnostics', () => {
    const ownership = resolveBrowserExtensionWorkflowOwnership('session_1', [
      { id: 1, url: 'https://example.com/a', active: false },
      { id: 2, url: 'https://example.com/b', active: true }
    ], {
      targetUrl: 'https://example.com/a',
      targetHost: 'example.com',
      preferredTabId: 1,
      matchesUrl: (tabUrl, targetUrl) => tabUrl === targetUrl
    });
    expect(ownership.pinnedTabId).toBe(1);
    expect(ownership.matchedBy).toBe('pinned-tab');
    expect(ownership.availableTabIds).toEqual([1, 2]);
    expect(ownership.availableTabs[0]?.url).toBe('https://example.com/a');
  });

  test('hard-fails on ownership degradation', () => {
    const expected = {
      sessionId: 'session_1',
      pinnedTabId: 7,
      targetUrl: 'https://example.com/a'
    };
    const refreshed = resolveBrowserExtensionWorkflowOwnership('session_1', [
      { id: 9, url: 'https://example.com/a', active: true }
    ], {
      targetUrl: 'https://example.com/a',
      targetHost: 'example.com',
      matchesUrl: (tabUrl, targetUrl) => tabUrl === targetUrl
    });
    expect(() => assertBrowserExtensionWorkflowOwnership('session_1', expected, refreshed)).toThrow(/https:\/\/example.com\/a/);
  });
});
