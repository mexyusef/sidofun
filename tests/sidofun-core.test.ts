import { describe, expect, test } from 'bun:test';
import { SidofunCore } from '../src/core/sidofun-core.js';

describe('SidofunCore', () => {
  test('routes browser runtime and page actions through shared services', async () => {
    const ownedResources: Array<{ sessionId: string; resource: Record<string, unknown> }> = [];
    const browserAutomationService = {
      createRuntime: (params: Record<string, unknown>) => ({ kind: 'runtime', params }),
      listRuntimes: () => [{ id: 'runtime-1' }],
      getRuntime: (runtimeId: string) => ({ id: runtimeId }),
      closeRuntime: (runtimeId: string) => ({ closed: runtimeId })
    };
    const browserPlaywrightService = {
      listPages: async (runtimeId: string) => [{ id: `page:${runtimeId}` }],
      openPage: async (runtimeId: string, url: string) => ({ id: 'page-1', runtimeId, url }),
      getPage: async (pageId: string) => ({ id: pageId }),
      navigate: async (pageId: string, url: string) => ({ pageId, url }),
      click: async () => ({}),
      fill: async () => ({}),
      press: async () => ({}),
      waitFor: async () => ({}),
      evaluate: async () => ({}),
      content: async () => '<html></html>',
      screenshot: async () => ({ path: 'shot.png' }),
      pdf: async () => ({ path: 'page.pdf' }),
      downloadUrl: async () => ({ path: 'download.bin' }),
      networkEvents: async () => [],
      pageEvents: async () => [],
      consoleEvents: async () => [],
      clearEvents: async () => ({ cleared: true }),
      waitForNetwork: async () => ({ ok: true }),
      closePage: async () => ({ closed: true })
    };
    const browserExtensionService = {
      getStatus: () => ({ available: true, providerId: 'sidofun-browser-extension' }),
      getCapabilities: () => ({ providerId: 'sidofun-browser-extension', primitives: ['navigate'] }),
      listSites: () => [{ site: 'x.com', status: 'scaffolded', commands: ['twitter.search'] }],
      waitForProviderConnected: async (options?: Record<string, unknown>) => ({ connected: true, timedOut: false, status: { providerConnected: true }, options }),
      listWorkspaces: () => [{ name: 'socials', path: 'C:\\hapus' }],
      getWorkspace: (name: string) => ({ name, path: 'C:\\hapus' }),
      setWorkspace: (name: string, workspacePath: string, sites?: string[]) => ({ name, path: workspacePath, sites }),
      clearWorkspace: (name: string) => ({ name, removed: true }),
      createSession: (options?: Record<string, unknown>) => ({ id: 'browserext_1', provider: 'chrome-extension', connected: false, ...options }),
      listSessions: () => [{ id: 'browserext_1', provider: 'chrome-extension', connected: false }],
      getSession: (sessionId: string) => ({ id: sessionId, provider: 'chrome-extension', connected: false }),
      refreshSession: (sessionId: string) => ({ sessionId, providerConnected: true, queuedCommandCount: 0, session: { id: sessionId, provider: 'chrome-extension', connected: false, stale: true } }),
      reconnectSession: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, reconnected: true, timedOut: false, provider: { connected: true }, session: { id: sessionId, provider: 'chrome-extension', connected: true, ready: true, activeTabId: 20 }, options }),
      waitForSessionReady: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, ready: true, timedOut: false, session: { id: sessionId, connected: true, activeTabId: 20 }, options }),
      closeSession: (sessionId: string) => ({ sessionId, removed: true }),
      nukeSessions: (options?: Record<string, unknown>) => ({ removedSessionCount: 2, removedSessionIds: ['browserext_1', 'browserext_2'], removedQueueCount: 3, filters: options }),
      clearQueuedCommands: (options?: Record<string, unknown>) => ({ removedCommandCount: 2, removedCommandIds: ['browserextcmd_1', 'browserextcmd_2'], filters: options }),
      listTabs: async (sessionId: string) => ({ sessionId, tabs: [{ id: 20, url: 'https://x.com/home' }], activeTabId: 20 }),
      navigate: async (sessionId: string, targetUrl: string) => ({ sessionId, url: targetUrl }),
      focusTab: async (sessionId: string, tabId: number) => ({ sessionId, tabId }),
      snapshot: async (sessionId: string) => ({ sessionId, snapshot: { title: 'X', url: 'https://x.com/home', text: 'hello' } }),
      screenshot: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, format: 'png', filepath: options?.filename, byteLength: 5 }),
      inspect: async (sessionId: string, selector: string) => ({ sessionId, selector, element: { tagName: 'textarea', role: 'textbox', text: 'hello' } }),
      inspectAll: async (sessionId: string, selector: string, limit?: number) => ({ sessionId, selector, limit, count: 2, elements: [{ tagName: 'a', href: 'https://x.com/home' }, { tagName: 'a', href: 'https://x.com/explore' }] }),
      links: async (sessionId: string, limit?: number) => ({ sessionId, limit, count: 2, links: [{ href: 'https://x.com/home', text: 'Home' }, { href: 'https://x.com/explore', text: 'Explore' }] }),
      evaluate: async (sessionId: string, expression: string) => ({ sessionId, expression, value: 'X' }),
      click: async (sessionId: string, selector: string) => ({ sessionId, selector, clicked: true }),
      type: async (sessionId: string, selector: string, text: string) => ({ sessionId, selector, text, typed: true }),
      press: async (sessionId: string, selector: string | undefined, key: string) => ({ sessionId, selector, key, pressed: true }),
      formFillInFrames: async (sessionId: string, selector: string, value: string, frameSelectors?: string[]) => ({ sessionId, selector, value, frameSelectors, filled: true, field: { selector, tagName: 'input', value, filled: true } }),
      formFillHuman: async (sessionId: string, selector: string, value: string, options?: Record<string, unknown>) => ({ sessionId, selector, value, frameSelectors: options?.frameSelectors, delayMs: options?.delayMs, jitterMs: options?.jitterMs, filled: true, field: { selector, tagName: 'input', value, filled: true, humanLike: true } }),
      formFillMany: async (sessionId: string, fields: Array<{ selector: string; value: string }>, frameSelectors?: string[]) => ({ sessionId, frameSelectors, count: fields.length, fields: fields.map((entry) => ({ selector: entry.selector, tagName: 'input', value: entry.value, filled: true })), requested: fields }),
      listFormFields: async (sessionId: string, frameSelectors?: string[], limit?: number) => ({ sessionId, frameSelectors, count: 1, fields: [{ selector: 'input[name="email"]', fieldType: 'input', tagName: 'input', labels: ['Email'] }], limit }),
      findFormField: async (sessionId: string, query: string, frameSelectors?: string[], exact?: boolean) => ({ sessionId, query, frameSelectors, exact, field: { selector: 'input[name="email"]', fieldType: 'input', tagName: 'input', labels: ['Email'], matchedBy: 'label' } }),
      listFormOptions: async (sessionId: string, selector: string, frameSelectors?: string[], limit?: number) => ({ sessionId, selector, frameSelectors, options: [{ index: 0, text: 'Indonesia', value: 'id', selected: true }], limit }),
      fillFormFieldByLabel: async (sessionId: string, query: string, value: string, frameSelectors?: string[], exact?: boolean) => ({ sessionId, query, value, frameSelectors, exact, filled: true, field: { selector: 'input[name="email"]', tagName: 'input', value, filled: true, matchedBy: 'label', query } }),
      selectFormOption: async (sessionId: string, selector: string, value: string, by?: string, frameSelectors?: string[]) => ({ sessionId, selector, optionQuery: value, by, frameSelectors, filled: true, field: { selector, tagName: 'select', value: 'id', filled: true }, option: { index: 0, text: 'Indonesia', value: 'id', selected: true } }),
      uploadFormFile: async (sessionId: string, selector: string, filepath: string, options?: Record<string, unknown>) => ({ sessionId, selector, filepath, frameSelectors: options?.frameSelectors, filename: options?.filename, mimeType: options?.mimeType, uploaded: true, field: { selector, tagName: 'input', type: 'file', filled: true, uploadedFile: { name: 'resume.pdf', size: 42, type: 'application/pdf' } }, uploadedFile: { name: 'resume.pdf', size: 42, type: 'application/pdf' } }),
      listFormComboboxOptions: async (sessionId: string, selector: string, opts?: Record<string, unknown>) => ({ sessionId, selector, opts, options: [{ index: 0, text: 'Indonesia', value: 'id', selected: true }] }),
      selectFormComboboxOption: async (sessionId: string, selector: string, value: string, options?: Record<string, unknown>) => ({ sessionId, selector, optionQuery: value, options, filled: true, field: { selector, tagName: 'input', value, filled: true }, option: { index: 0, text: 'Indonesia', value: 'id', selected: true } }),
      formSubmit: async (sessionId: string, selector?: string, _timeoutMs?: number, frameSelectors?: string[]) => ({ sessionId, selector, frameSelectors, submitted: true, method: 'click', resolvedSelector: selector ?? 'button[type="submit"]', formAction: 'https://example.com/submit' }),
      formSubmitAndWait: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, ...options, submitted: true, method: 'click', resolvedSelector: options?.selector ?? 'button[type="submit"]', formAction: 'https://example.com/submit', matched: { text: true }, snapshot: { title: 'Thanks', url: 'https://example.com/thanks', text: 'Thanks', capturedAt: '2026-03-31T00:00:00.000Z' } }),
      authLogin: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, submitted: options?.skipSubmit ? false : true, steps: [{ kind: 'identity' }, { kind: 'password' }], submit: options?.skipSubmit ? undefined : { submitted: true } }),
      authSignup: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, submitted: options?.skipSubmit ? false : true, steps: [{ kind: 'email' }, { kind: 'password' }], submit: options?.skipSubmit ? undefined : { submitted: true } }),
      cookies: async (sessionId: string, targetUrl?: string) => ({ sessionId, targetUrl, cookies: [] }),
      chatGptNewChat: async (sessionId: string) => ({ sessionId, started: true }),
      chatGptInfo: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', busy: false, conversationCount: 1, threadCount: 2, options }),
      chatGptListConversations: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, conversations: [{ id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }], options }),
      chatGptOpenConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }, options }),
      chatGptStop: async (sessionId: string) => ({ sessionId, stopped: true }),
      chatGptContinue: async (sessionId: string) => ({ sessionId, continued: true }),
      chatGptResponseControls: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', threadCount: 2, latestAssistant: 'Existing assistant reply', latestUser: 'Hello', messages: [], options }),
      chatGptPreviousResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'previous', threadCount: 2, latestAssistant: 'Older assistant reply', latestUser: 'Hello', messages: [], previousAvailable: false, nextAvailable: true, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      chatGptNextResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'next', threadCount: 2, latestAssistant: 'Newer assistant reply', latestUser: 'Hello', messages: [], previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      chatGptListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      chatGptSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      chatGptListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      chatGptSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      chatGptListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      chatGptSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      chatGptListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      chatGptSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      chatGptListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      chatGptSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      chatGptRegenerate: async (sessionId: string) => ({ sessionId, regenerated: true }),
      chatGptEditMessage: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, target: { role: options?.role, offset: options?.offset, message: { id: 'cg_1', role: 'user', text: 'Hello', index: 0 } }, edited: true, message: { id: 'cg_1', role: 'user', text, index: 0 } }),
      chatGptReadThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, latestAssistant: 'Existing assistant reply', latestUser: 'Hello', messages: [{ id: 'cg_1', role: 'user', text: 'Hello', index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }], options }),
      chatGptReadMessage: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, message: { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }, options }),
      chatGptCurrentConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'c1', title: 'Project plan' }, conversationCount: 1, busy: false, latestAssistant: 'Existing assistant reply', latestUser: 'Hello', threadCount: 2, options }),
      chatGptExportThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, format: options?.format ?? 'json', content: '# Project plan', count: 2, messages: [] }),
      chatGptReadLatest: async (sessionId: string) => ({ sessionId, text: 'Existing assistant reply' }),
      chatGptSend: async (sessionId: string, text: string) => ({ sessionId, text, sent: true }),
      chatGptAsk: async (sessionId: string, text: string) => ({ sessionId, prompt: text, response: 'Fresh assistant response', timedOut: false }),
      chatGptAskThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, prompt: text, response: 'Fresh assistant response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh assistant response', latestUser: text, messages: [{ id: 'cg_1', role: 'user', text, index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Fresh assistant response', index: 1 }], options }),
      chatGptRewriteThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, edited: true, target: { role: options?.role, offset: options?.offset, message: { id: 'cg_1', role: 'user', text: 'Hello', index: 0 } }, response: 'Fresh assistant response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh assistant response', latestUser: text, messages: [{ id: 'cg_1', role: 'user', text, index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Fresh assistant response', index: 1 }] }),
      chatGptWaitIdle: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, idle: true, timedOut: false, options }),
      chatGptWaitResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt', baselineText: options?.baselineText, text: 'Fresh assistant response', changed: true, idle: true, timedOut: false }),
      deepSeekNewChat: async (sessionId: string) => ({ sessionId, started: true }),
      deepSeekInfo: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', busy: false, conversationCount: 1, threadCount: 2, options }),
      deepSeekListConversations: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, conversations: [{ id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }], options }),
      deepSeekOpenConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }, options }),
      deepSeekStop: async (sessionId: string) => ({ sessionId, stopped: true }),
      deepSeekContinue: async (sessionId: string) => ({ sessionId, continued: true }),
      deepSeekResponseControls: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', threadCount: 2, latestAssistant: 'Existing DeepSeek reply', latestUser: 'Hello', messages: [], options }),
      deepSeekPreviousResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'previous', threadCount: 2, latestAssistant: 'Older DeepSeek reply', latestUser: 'Hello', messages: [], previousAvailable: false, nextAvailable: true, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      deepSeekNextResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'next', threadCount: 2, latestAssistant: 'Newer DeepSeek reply', latestUser: 'Hello', messages: [], previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      deepSeekListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      deepSeekSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      deepSeekListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      deepSeekSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      deepSeekListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      deepSeekSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      deepSeekListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      deepSeekSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      deepSeekListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      deepSeekSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      deepSeekRegenerate: async (sessionId: string) => ({ sessionId, regenerated: true }),
      deepSeekEditMessage: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, target: { role: options?.role, offset: options?.offset, message: { id: 'ds_1', role: 'user', text: 'Hello', index: 0 } }, edited: true, message: { id: 'ds_1', role: 'user', text, index: 0 } }),
      deepSeekReadThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, latestAssistant: 'Existing DeepSeek reply', latestUser: 'Hello', messages: [{ id: 'ds_1', role: 'user', text: 'Hello', index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }], options }),
      deepSeekReadMessage: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, message: { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }, options }),
      deepSeekCurrentConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'd1', title: 'Research notes' }, conversationCount: 1, busy: false, latestAssistant: 'Existing DeepSeek reply', latestUser: 'Hello', threadCount: 2, options }),
      deepSeekExportThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, format: options?.format ?? 'json', content: '# Research notes', count: 2, messages: [] }),
      deepSeekReadLatest: async (sessionId: string) => ({ sessionId, text: 'Existing DeepSeek reply' }),
      deepSeekSend: async (sessionId: string, text: string) => ({ sessionId, text, sent: true }),
      deepSeekAsk: async (sessionId: string, text: string) => ({ sessionId, prompt: text, response: 'Fresh DeepSeek response', timedOut: false }),
      deepSeekAskThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, prompt: text, response: 'Fresh DeepSeek response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh DeepSeek response', latestUser: text, messages: [{ id: 'ds_1', role: 'user', text, index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Fresh DeepSeek response', index: 1 }], options }),
      deepSeekRewriteThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, edited: true, target: { role: options?.role, offset: options?.offset, message: { id: 'ds_1', role: 'user', text: 'Hello', index: 0 } }, response: 'Fresh DeepSeek response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh DeepSeek response', latestUser: text, messages: [{ id: 'ds_1', role: 'user', text, index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Fresh DeepSeek response', index: 1 }] }),
      deepSeekWaitIdle: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, idle: true, timedOut: false, options }),
      deepSeekWaitResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek', baselineText: options?.baselineText, text: 'Fresh DeepSeek response', changed: true, idle: true, timedOut: false }),
      xSearch: async (sessionId: string, query: string, options?: Record<string, unknown>) => ({ sessionId, query, options, count: 1, posts: [{ id: 'tweet_1', text: 'hello' }] }),
      xNotifications: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, options, count: 1, posts: [{ id: 'tweet_n1', text: 'notification' }] }),
      xMessages: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, options, count: 1, threads: [{ id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', snippet: 'hello there', unread: true, active: false }] }),
      xOpenMessageThread: async (sessionId: string, thread: string, options?: Record<string, unknown>) => ({ sessionId, query: thread, url: 'https://x.com/messages/123', thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true }, count: 1, messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }], options }),
      xSendMessage: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, query: options?.thread, url: 'https://x.com/messages/123', sent: true, thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true }, count: 2, messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }, { id: 'msg_2', text, sender: 'You', outgoing: true }], options }),
      xReadThread: async (sessionId: string, postUrl: string, options?: Record<string, unknown>) => ({ sessionId, url: postUrl, options, count: 2, posts: [{ id: 'tweet_1', url: postUrl, text: 'root' }, { id: 'tweet_2', text: 'reply' }] }),
      xOpenPost: async (sessionId: string, postUrl: string, timeoutMs?: number) => ({ sessionId, url: postUrl, timeoutMs, post: { id: 'tweet_1', url: postUrl, text: 'hello' } }),
      xProfile: async (sessionId: string, handleOrUrl: string, options?: Record<string, unknown>) => ({ sessionId, query: handleOrUrl, url: 'https://x.com/openai', profile: { handle: 'openai', name: 'OpenAI' }, options }),
      xFollow: async (sessionId: string, handleOrUrl: string, options?: Record<string, unknown>) => ({ sessionId, query: handleOrUrl, url: 'https://x.com/openai', followed: true, alreadyFollowing: false, buttonLabel: 'Follow', options }),
      xReply: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, url: options?.postUrl, replied: true }),
      xLike: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, url: options?.postUrl, liked: true }),
      xRepost: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, url: options?.postUrl, reposted: true }),
      listSessionEvents: (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, totalCount: 1, events: [{ id: 'evt_1', kind: 'snapshot', ok: true, options }] }),
      clearSessionEvents: (sessionId: string) => ({ sessionId, cleared: 1, remaining: 0 }),
      waitForText: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, needle: text, matched: true, timedOut: false, snapshot: { text, options } }),
      listNetworkEvents: (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, totalCount: 1, events: [{ id: 'evt_1', url: 'https://x.com', stage: 'response' }], options }),
      listDomEvents: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, totalCount: 1, events: [{ id: 'dom_1', types: ['childList'], textSample: 'Hiring' }], options }),
      clearNetworkEvents: async (sessionId: string) => ({ sessionId, cleared: 1, remaining: 0 }),
      clearDomEvents: async (sessionId: string) => ({ sessionId, cleared: 1, remaining: 0 }),
      registerProvider: (payload: Record<string, unknown>) => ({ ok: true, payload }),
      heartbeat: (payload: Record<string, unknown>) => ({ ok: true, payload }),
      upsertProviderSessionState: (payload: Record<string, unknown>) => ({ ok: true, payload }),
      waitForCommands: async (extensionId: string, options?: Record<string, unknown>) => [{ id: 'cmd_1', sessionId: 'browserext_1', kind: 'list_tabs', payload: {}, extensionId, ...options }],
      pollCommands: (extensionId: string, limit?: number) => [{ id: 'cmd_1', sessionId: 'browserext_1', kind: 'list_tabs', payload: {}, extensionId, limit }],
      completeCommand: (payload: Record<string, unknown>) => ({ ok: true, payload })
    };
    const hfPapersService = {
      getStatus: async () => ({ available: true, defaultBackend: 'api', cli: { available: true, notes: [] }, pythonApi: { available: true, methods: ['list_papers'], notes: [] }, notes: [] }),
      doctor: async (options?: Record<string, unknown>) => ({ ok: true, backend: options?.backend ?? 'api' }),
      search: async (options: Record<string, unknown>) => ({ query: options.query, backend: options.backend ?? 'api', count: 1, papers: [{ id: '2601.15621', title: 'Qwen3-TTS Technical Report' }] }),
      info: async (options: Record<string, unknown>) => ({ id: options.paperId, title: 'Qwen3-TTS Technical Report', paperUrl: 'https://huggingface.co/papers/2601.15621', arxivUrl: 'https://arxiv.org/abs/2601.15621', authors: ['X'], authorDetails: [] }),
      read: async (options: Record<string, unknown>) => ({ id: options.paperId, backend: options.backend ?? 'api', markdown: '# Qwen3-TTS Technical Report', charCount: 28, wordCount: 4, paperUrl: 'https://huggingface.co/papers/2601.15621', arxivUrl: 'https://arxiv.org/abs/2601.15621', savedTo: options.savePath }),
      listDaily: async (options?: Record<string, unknown>) => ({ backend: options?.backend ?? 'api', count: 1, filters: { sort: options?.sort }, papers: [{ id: '2603.23582', title: 'AI Generalisation Gap', authors: ['A'], authorDetails: [], paperUrl: 'https://huggingface.co/papers/2603.23582', arxivUrl: 'https://arxiv.org/abs/2603.23582' }] })
    };

    const core = new SidofunCore(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {
        ownResource: (sessionId: string, resource: Record<string, unknown>) => {
          ownedResources.push({ sessionId, resource });
          return { id: sessionId, resource };
        }
      } as any,
      {} as any,
      {} as any,
      {
        execute: async (action: string, params: Record<string, unknown>) => {
          switch (action) {
            case 'browser_runtime_create':
              return browserAutomationService.createRuntime(params);
            case 'browser_page_open':
              return browserPlaywrightService.openPage(params.runtimeId as string, params.url as string);
            case 'browser_page_close':
              return browserPlaywrightService.closePage(params.pageId as string);
            default:
              return {};
          }
        }
      } as any,
      browserExtensionService as any,
      {} as any,
      hfPapersService as any,
      {} as any,
      {} as any
    );

    expect(await core.executeAutomationAction('browser_runtime_create', { browser: 'chrome' })).toEqual({
      kind: 'runtime',
      params: { browser: 'chrome' }
    });
    expect(await core.executeAutomationAction('browser_page_open', {
      runtimeId: 'runtime-1',
      url: 'https://example.com',
      ownerSessionId: 'client_session_1'
    })).toEqual({
      id: 'page-1',
      runtimeId: 'runtime-1',
      url: 'https://example.com'
    });
    expect(await core.executeAutomationAction('browser_page_close', { pageId: 'page-1' })).toEqual({
      closed: true
    });
    expect(ownedResources).toEqual([
      {
        sessionId: 'client_session_1',
        resource: {
          type: 'browser_page',
          id: 'page-1',
          metadata: { runtimeId: 'runtime-1' }
        }
      }
    ]);
  });

  test('routes desktop and cmd actions through shared adapters', async () => {
    const calls: Array<{ kind: string; payload: any }> = [];
    const ownedResources: Array<{ sessionId: string; resource: Record<string, unknown> }> = [];
    const clipboardService = {
      read: async () => 'clipboard-text',
      write: async (text: string) => ({ message: 'Clipboard updated', length: text.length }),
      clear: async () => ({ message: 'Clipboard cleared' }),
      status: async () => ({ text: 'clipboard-text', length: 14, hasText: true })
    };
    const desktopScopeService = {
      create: async (options: Record<string, unknown>) => ({ id: 'desktop_scope_1', created: true, options }),
      list: async () => ({ scopes: [{ id: 'desktop_scope_1' }], count: 1 }),
      getInfo: async (scopeId: string) => ({ id: scopeId, alive: true }),
      focus: async (scopeId: string) => ({ scope: { id: scopeId }, message: 'focused scope' }),
      screenshot: async (scopeId: string, options: Record<string, unknown>) => ({ scopeId, filepath: options.filename || 'scope.png' }),
      click: async (scopeId: string, target: Record<string, unknown>, button: string) => ({ scopeId, target, button }),
      type: async (scopeId: string, text: string) => ({ scopeId, text }),
      close: async (scopeId: string) => ({ id: scopeId, closed: true })
    };
    const sessionManagerService = {
      createSession: (options: Record<string, unknown>) => ({ id: 'client_session_1', clientKind: options.clientKind ?? 'internal', name: options.name, resources: [] }),
      listSessions: () => ({ sessions: [{ id: 'client_session_1' }], count: 1 }),
      getSession: (sessionId: string) => ({ id: sessionId, resources: [] }),
      touchSession: (sessionId: string) => ({ id: sessionId, touched: true }),
      ownResource: (sessionId: string, resource: Record<string, unknown>) => {
        ownedResources.push({ sessionId, resource });
        return { id: sessionId, resource };
      },
      releaseResource: (sessionId: string, type: string, id: string) => ({ id: sessionId, released: [type, id] }),
      closeSession: async (sessionId: string, options: Record<string, unknown>) => ({ id: sessionId, closed: true, cleanup: options.cleanupOwnedResources })
    };
    const telemetryService = {
      startTrace: async (options: Record<string, unknown>) => ({ id: 'trace_1', name: options.name ?? 'trace_1' }),
      listTraces: () => ({ traces: [{ id: 'trace_1' }], count: 1 }),
      getTrace: (traceId: string) => ({ id: traceId }),
      addTraceMetadata: async (traceId: string, metadata: Record<string, unknown>) => ({ id: traceId, metadata }),
      appendTrace: async (traceId: string, record: Record<string, unknown>) => ({ traceId, record, appended: true }),
      stopTrace: async (traceId: string) => ({ id: traceId, stopped: true }),
      startTrajectory: async (options: Record<string, unknown>) => ({ id: 'trajectory_1', name: options.name ?? 'trajectory_1' }),
      listTrajectories: () => ({ trajectories: [{ id: 'trajectory_1' }], count: 1 }),
      getTrajectory: (trajectoryId: string) => ({ id: trajectoryId }),
      appendTurn: async (trajectoryId: string, turn: Record<string, unknown>) => ({ trajectoryId, turn, appended: true }),
      stopTrajectory: async (trajectoryId: string) => ({ id: trajectoryId, stopped: true })
    };
    const shellService = {
      run: async (options: Record<string, unknown>) => ({ shell: options.shell || 'pwsh', command: options.command, success: true })
    };
    const terminalService = {
      spawn: async (options: Record<string, unknown>) => ({ kind: options.kind, sessionId: `${options.kind}_1`, message: 'spawned' }),
      list: async (kind?: string) => ({ sessions: [{ kind: kind || 'cmd', session: { id: `${kind || 'cmd'}_1` } }], count: 1 }),
      status: async (target: Record<string, unknown>) => ({ session: { id: target.sessionId, kind: target.kind } }),
      focus: async (target: Record<string, unknown>) => ({ session: { id: target.sessionId, kind: target.kind }, message: 'focused' }),
      type: async (target: Record<string, unknown>, text: string) => ({ session: { id: target.sessionId, kind: target.kind }, text }),
      exec: async (target: Record<string, unknown>, command: string) => ({ session: { id: target.sessionId, kind: target.kind }, command, ok: true }),
      close: async (target: Record<string, unknown>) => ({ session: { id: target.sessionId, kind: target.kind }, closed: true })
    };
    const processWindowService = {
      listProcesses: async () => [{ pid: 1, processName: 'explorer', hasWindow: true, isVisible: true }],
      listWindows: async () => [{ handle: 12, title: 'Explorer', visible: true, isForeground: false, rect: { x: 1, y: 2, width: 3, height: 4 } }],
      getWindowInfo: async (windowHandle: number) => ({ handle: windowHandle, title: 'Explorer', visible: true, isForeground: false, rect: { x: 1, y: 2, width: 3, height: 4 } }),
      focus: async (options: Record<string, unknown>) => ({ focused: options }),
      show: async (windowHandle: number) => `show ${windowHandle}`,
      hide: async (windowHandle: number) => `hide ${windowHandle}`,
      close: async (windowHandle: number) => `close ${windowHandle}`,
      dragMove: async (windowHandle: number, x: number, y: number) => ({ draggedMove: [windowHandle, x, y] }),
      dragResize: async (windowHandle: number, width: number, height: number) => ({ draggedResize: [windowHandle, width, height] })
    };
    const openCliService = {
      getStatus: () => ({ available: true, mode: 'binary', twitterAvailable: true }),
      doctor: async (options: Record<string, unknown>) => ({ ok: true, workspace: options.workspace }),
      listSites: () => [{ site: 'twitter', commands: ['search'] }],
      listCommands: (site: string) => site === 'twitter' ? ['search'] : [],
      listWorkspaces: () => [{ name: 'socials', path: 'C:\\hapus' }],
      getWorkspace: (name: string) => name === 'socials' ? { name, path: 'C:\\hapus' } : undefined,
      setWorkspace: (name: string, workspacePath: string) => ({ name, path: workspacePath }),
      clearWorkspace: (name: string) => ({ name, removed: true }),
      bindSessionWorkspace: (sessionId: string, workspace: string) => ({ sessionId, workspace, path: 'C:\\hapus' }),
      unbindSessionWorkspace: (sessionId: string) => ({ sessionId, removed: true }),
      getSessionWorkspace: (sessionId: string) => ({ sessionId, workspace: 'socials', path: 'C:\\hapus' }),
      run: async (options: Record<string, unknown>) => ({ site: options.site, command: options.command, args: options.args ?? [], success: true }),
      twitterSearch: async (options: Record<string, unknown>) => ({ provider: 'opencli', operation: 'search', query: options.query }),
      twitterTimeline: async (options: Record<string, unknown>) => ({ provider: 'opencli', operation: 'timeline', type: options.type }),
      twitterBookmarks: async (options: Record<string, unknown>) => ({ provider: 'opencli', operation: 'bookmarks', limit: options.limit }),
      twitterPost: async (options: Record<string, unknown>) => ({ provider: 'opencli', operation: 'post', text: options.text })
    };
    const hfPapersService = {
      getStatus: async () => ({ available: true, defaultBackend: 'api', cli: { available: true, notes: [] }, pythonApi: { available: true, methods: ['list_papers'], notes: [] }, notes: [] }),
      doctor: async (options?: Record<string, unknown>) => ({ ok: true, backend: options?.backend ?? 'api' }),
      search: async (options: Record<string, unknown>) => ({ query: options.query, backend: options.backend ?? 'api', count: 1, papers: [{ id: '2601.15621', title: 'Qwen3-TTS Technical Report' }] }),
      info: async (options: Record<string, unknown>) => ({ id: options.paperId, title: 'Qwen3-TTS Technical Report', paperUrl: 'https://huggingface.co/papers/2601.15621', arxivUrl: 'https://arxiv.org/abs/2601.15621', authors: ['X'], authorDetails: [] }),
      read: async (options: Record<string, unknown>) => ({ id: options.paperId, backend: options.backend ?? 'api', markdown: '# Qwen3-TTS Technical Report', charCount: 28, wordCount: 4, paperUrl: 'https://huggingface.co/papers/2601.15621', arxivUrl: 'https://arxiv.org/abs/2601.15621', savedTo: options.savePath }),
      listDaily: async (options?: Record<string, unknown>) => ({ backend: options?.backend ?? 'api', count: 1, filters: { sort: options?.sort }, papers: [{ id: '2603.23582', title: 'AI Generalisation Gap', authors: ['A'], authorDetails: [], paperUrl: 'https://huggingface.co/papers/2603.23582', arxivUrl: 'https://arxiv.org/abs/2603.23582' }] })
    };
    const browserExtensionService = {
      getStatus: () => ({ available: true, providerId: 'sidofun-browser-extension' }),
      getCapabilities: () => ({ providerId: 'sidofun-browser-extension', primitives: ['navigate'] }),
      listSites: () => [{ site: 'x.com', status: 'scaffolded', commands: ['twitter.search'] }],
      waitForProviderConnected: async (options?: Record<string, unknown>) => ({ connected: true, timedOut: false, status: { providerConnected: true }, options }),
      listWorkspaces: () => [{ name: 'socials', path: 'C:\\hapus' }],
      getWorkspace: (name: string) => name === 'socials' ? { name, path: 'C:\\hapus' } : undefined,
      setWorkspace: (name: string, workspacePath: string, sites?: string[]) => ({ name, path: workspacePath, sites }),
      clearWorkspace: (name: string) => ({ name, removed: true }),
      createSession: (options?: Record<string, unknown>) => ({ id: 'browserext_1', provider: 'chrome-extension', connected: false, ...options }),
      listSessions: () => [{ id: 'browserext_1', provider: 'chrome-extension', connected: false }],
      getSession: (sessionId: string) => ({ id: sessionId, provider: 'chrome-extension', connected: false }),
      refreshSession: (sessionId: string) => ({ sessionId, providerConnected: true, queuedCommandCount: 0, session: { id: sessionId, provider: 'chrome-extension', connected: false, stale: true } }),
      reconnectSession: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, reconnected: true, timedOut: false, provider: { connected: true }, session: { id: sessionId, provider: 'chrome-extension', connected: true, ready: true, activeTabId: 20 }, options }),
      waitForSessionReady: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, ready: true, timedOut: false, session: { id: sessionId, connected: true, activeTabId: 20 }, options }),
      closeSession: (sessionId: string) => ({ sessionId, removed: true }),
      nukeSessions: (options?: Record<string, unknown>) => ({ removedSessionCount: 2, removedSessionIds: ['browserext_1', 'browserext_2'], removedQueueCount: 3, filters: options }),
      clearQueuedCommands: (options?: Record<string, unknown>) => ({ removedCommandCount: 2, removedCommandIds: ['browserextcmd_1', 'browserextcmd_2'], filters: options }),
      listTabs: async (sessionId: string) => ({ sessionId, tabs: [{ id: 20, url: 'https://x.com/home' }], activeTabId: 20 }),
      navigate: async (sessionId: string, targetUrl: string) => ({ sessionId, url: targetUrl }),
      focusTab: async (sessionId: string, tabId: number) => ({ sessionId, tabId }),
      snapshot: async (sessionId: string) => ({ sessionId, snapshot: { title: 'X', url: 'https://x.com/home', text: 'hello' } }),
      screenshot: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, format: 'png', filepath: options?.filename, byteLength: 5 }),
      inspect: async (sessionId: string, selector: string) => ({ sessionId, selector, element: { tagName: 'textarea', role: 'textbox', text: 'hello' } }),
      inspectAll: async (sessionId: string, selector: string, limit?: number) => ({ sessionId, selector, limit, count: 2, elements: [{ tagName: 'a', href: 'https://x.com/home' }, { tagName: 'a', href: 'https://x.com/explore' }] }),
      links: async (sessionId: string, limit?: number) => ({ sessionId, limit, count: 2, links: [{ href: 'https://x.com/home', text: 'Home' }, { href: 'https://x.com/explore', text: 'Explore' }] }),
      evaluate: async (sessionId: string, expression: string) => ({ sessionId, expression, value: 'X' }),
      click: async (sessionId: string, selector: string) => ({ sessionId, selector, clicked: true }),
      type: async (sessionId: string, selector: string, text: string) => ({ sessionId, selector, text, typed: true }),
      press: async (sessionId: string, selector: string | undefined, key: string) => ({ sessionId, selector, key, pressed: true }),
      formFillInFrames: async (sessionId: string, selector: string, value: string, frameSelectors?: string[]) => ({ sessionId, selector, value, frameSelectors, filled: true, field: { selector, tagName: 'input', value, filled: true } }),
      formFillHuman: async (sessionId: string, selector: string, value: string, options?: Record<string, unknown>) => ({ sessionId, selector, value, frameSelectors: options?.frameSelectors, delayMs: options?.delayMs, jitterMs: options?.jitterMs, filled: true, field: { selector, tagName: 'input', value, filled: true, humanLike: true } }),
      formFillMany: async (sessionId: string, fields: Array<{ selector: string; value: string }>, frameSelectors?: string[]) => ({ sessionId, frameSelectors, count: fields.length, fields: fields.map((entry) => ({ selector: entry.selector, tagName: 'input', value: entry.value, filled: true })), requested: fields }),
      listFormFields: async (sessionId: string, frameSelectors?: string[], limit?: number) => ({ sessionId, frameSelectors, count: 1, fields: [{ selector: 'input[name="email"]', fieldType: 'input', tagName: 'input', labels: ['Email'] }], limit }),
      findFormField: async (sessionId: string, query: string, frameSelectors?: string[], exact?: boolean) => ({ sessionId, query, frameSelectors, exact, field: { selector: 'input[name="email"]', fieldType: 'input', tagName: 'input', labels: ['Email'], matchedBy: 'label' } }),
      listFormOptions: async (sessionId: string, selector: string, frameSelectors?: string[], limit?: number) => ({ sessionId, selector, frameSelectors, options: [{ index: 0, text: 'Indonesia', value: 'id', selected: true }], limit }),
      fillFormFieldByLabel: async (sessionId: string, query: string, value: string, frameSelectors?: string[], exact?: boolean) => ({ sessionId, query, value, frameSelectors, exact, filled: true, field: { selector: 'input[name="email"]', tagName: 'input', value, filled: true, matchedBy: 'label', query } }),
      selectFormOption: async (sessionId: string, selector: string, value: string, by?: string, frameSelectors?: string[]) => ({ sessionId, selector, optionQuery: value, by, frameSelectors, filled: true, field: { selector, tagName: 'select', value: 'id', filled: true }, option: { index: 0, text: 'Indonesia', value: 'id', selected: true } }),
      uploadFormFile: async (sessionId: string, selector: string, filepath: string, options?: Record<string, unknown>) => ({ sessionId, selector, filepath, frameSelectors: options?.frameSelectors, filename: options?.filename, mimeType: options?.mimeType, uploaded: true, field: { selector, tagName: 'input', type: 'file', filled: true, uploadedFile: { name: 'resume.pdf', size: 42, type: 'application/pdf' } }, uploadedFile: { name: 'resume.pdf', size: 42, type: 'application/pdf' } }),
      listFormComboboxOptions: async (sessionId: string, selector: string, opts?: Record<string, unknown>) => ({ sessionId, selector, opts, options: [{ index: 0, text: 'Indonesia', value: 'id', selected: true }] }),
      selectFormComboboxOption: async (sessionId: string, selector: string, value: string, options?: Record<string, unknown>) => ({ sessionId, selector, optionQuery: value, options, filled: true, field: { selector, tagName: 'input', value, filled: true }, option: { index: 0, text: 'Indonesia', value: 'id', selected: true } }),
      formSubmit: async (sessionId: string, selector?: string, _timeoutMs?: number, frameSelectors?: string[]) => ({ sessionId, selector, frameSelectors, submitted: true, method: 'click', resolvedSelector: selector ?? 'button[type="submit"]', formAction: 'https://example.com/submit' }),
      formSubmitAndWait: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, ...options, submitted: true, method: 'click', resolvedSelector: options?.selector ?? 'button[type="submit"]', formAction: 'https://example.com/submit', matched: { text: true }, snapshot: { title: 'Thanks', url: 'https://example.com/thanks', text: 'Thanks', capturedAt: '2026-03-31T00:00:00.000Z' } }),
      authLogin: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, submitted: options?.skipSubmit ? false : true, steps: [{ kind: 'identity' }, { kind: 'password' }], submit: options?.skipSubmit ? undefined : { submitted: true } }),
      authSignup: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, submitted: options?.skipSubmit ? false : true, steps: [{ kind: 'email' }, { kind: 'password' }], submit: options?.skipSubmit ? undefined : { submitted: true } }),
      cookies: async (sessionId: string, targetUrl?: string) => ({ sessionId, targetUrl, cookies: [] }),
      chatGptNewChat: async (sessionId: string) => ({ sessionId, started: true }),
      chatGptInfo: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', busy: false, conversationCount: 1, threadCount: 2, options }),
      chatGptListConversations: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, conversations: [{ id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }], options }),
      chatGptOpenConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }, options }),
      chatGptStop: async (sessionId: string) => ({ sessionId, stopped: true }),
      chatGptContinue: async (sessionId: string) => ({ sessionId, continued: true }),
      chatGptResponseControls: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', threadCount: 2, latestAssistant: 'Existing assistant reply', latestUser: 'Hello', messages: [], options }),
      chatGptPreviousResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'previous', threadCount: 2, latestAssistant: 'Older assistant reply', latestUser: 'Hello', messages: [], previousAvailable: false, nextAvailable: true, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      chatGptNextResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'next', threadCount: 2, latestAssistant: 'Newer assistant reply', latestUser: 'Hello', messages: [], previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      chatGptListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      chatGptSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      chatGptRegenerate: async (sessionId: string) => ({ sessionId, regenerated: true }),
      chatGptEditMessage: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, target: { role: options?.role, offset: options?.offset, message: { id: 'cg_1', role: 'user', text: 'Hello', index: 0 } }, edited: true, message: { id: 'cg_1', role: 'user', text, index: 0 } }),
      chatGptReadThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, latestAssistant: 'Existing assistant reply', latestUser: 'Hello', messages: [{ id: 'cg_1', role: 'user', text: 'Hello', index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }], options }),
      chatGptReadMessage: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, message: { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }, options }),
      chatGptCurrentConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'c1', title: 'Project plan' }, conversationCount: 1, busy: false, latestAssistant: 'Existing assistant reply', latestUser: 'Hello', threadCount: 2, options }),
      chatGptExportThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, format: options?.format ?? 'json', content: '# Project plan', count: 2, messages: [] }),
      chatGptReadLatest: async (sessionId: string) => ({ sessionId, text: 'Existing assistant reply' }),
      chatGptSend: async (sessionId: string, text: string) => ({ sessionId, text, sent: true }),
      chatGptAsk: async (sessionId: string, text: string) => ({ sessionId, prompt: text, response: 'Fresh assistant response', timedOut: false }),
      chatGptAskThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, prompt: text, response: 'Fresh assistant response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh assistant response', latestUser: text, messages: [{ id: 'cg_1', role: 'user', text, index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Fresh assistant response', index: 1 }], options }),
      chatGptRewriteThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, edited: true, target: { role: options?.role, offset: options?.offset, message: { id: 'cg_1', role: 'user', text: 'Hello', index: 0 } }, response: 'Fresh assistant response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh assistant response', latestUser: text, messages: [{ id: 'cg_1', role: 'user', text, index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Fresh assistant response', index: 1 }] }),
      chatGptWaitIdle: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, idle: true, timedOut: false, options }),
      chatGptWaitResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'chatgpt', baselineText: options?.baselineText, text: 'Fresh assistant response', changed: true, idle: true, timedOut: false }),
      deepSeekNewChat: async (sessionId: string) => ({ sessionId, started: true }),
      deepSeekInfo: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', busy: false, conversationCount: 1, threadCount: 2, options }),
      deepSeekListConversations: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, conversations: [{ id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }], options }),
      deepSeekOpenConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }, options }),
      deepSeekStop: async (sessionId: string) => ({ sessionId, stopped: true }),
      deepSeekContinue: async (sessionId: string) => ({ sessionId, continued: true }),
      deepSeekResponseControls: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', threadCount: 2, latestAssistant: 'Existing DeepSeek reply', latestUser: 'Hello', messages: [], options }),
      deepSeekPreviousResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'previous', threadCount: 2, latestAssistant: 'Older DeepSeek reply', latestUser: 'Hello', messages: [], previousAvailable: false, nextAvailable: true, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      deepSeekNextResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, moved: true, direction: 'next', threadCount: 2, latestAssistant: 'Newer DeepSeek reply', latestUser: 'Hello', messages: [], previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', options }),
      deepSeekListResponseVersions: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options }),
      deepSeekSelectResponseVersion: async (sessionId: string, index: number, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek.com', currentIndex: index, selectedIndex: index, selected: { index, current: true }, count: 2, versions: [{ index: 0, current: index === 0 }, { index: 1, current: index === 1 }], options }),
      deepSeekRegenerate: async (sessionId: string) => ({ sessionId, regenerated: true }),
      deepSeekEditMessage: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, target: { role: options?.role, offset: options?.offset, message: { id: 'ds_1', role: 'user', text: 'Hello', index: 0 } }, edited: true, message: { id: 'ds_1', role: 'user', text, index: 0 } }),
      deepSeekReadThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, latestAssistant: 'Existing DeepSeek reply', latestUser: 'Hello', messages: [{ id: 'ds_1', role: 'user', text: 'Hello', index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }], options }),
      deepSeekReadMessage: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 2, message: { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }, options }),
      deepSeekCurrentConversation: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, conversation: { id: 'd1', title: 'Research notes' }, conversationCount: 1, busy: false, latestAssistant: 'Existing DeepSeek reply', latestUser: 'Hello', threadCount: 2, options }),
      deepSeekExportThread: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, format: options?.format ?? 'json', content: '# Research notes', count: 2, messages: [] }),
      deepSeekReadLatest: async (sessionId: string) => ({ sessionId, text: 'Existing DeepSeek reply' }),
      deepSeekSend: async (sessionId: string, text: string) => ({ sessionId, text, sent: true }),
      deepSeekAsk: async (sessionId: string, text: string) => ({ sessionId, prompt: text, response: 'Fresh DeepSeek response', timedOut: false }),
      deepSeekAskThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, prompt: text, response: 'Fresh DeepSeek response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh DeepSeek response', latestUser: text, messages: [{ id: 'ds_1', role: 'user', text, index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Fresh DeepSeek response', index: 1 }], options }),
      deepSeekRewriteThread: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, edited: true, target: { role: options?.role, offset: options?.offset, message: { id: 'ds_1', role: 'user', text: 'Hello', index: 0 } }, response: 'Fresh DeepSeek response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh DeepSeek response', latestUser: text, messages: [{ id: 'ds_1', role: 'user', text, index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Fresh DeepSeek response', index: 1 }] }),
      deepSeekWaitIdle: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, idle: true, timedOut: false, options }),
      deepSeekWaitResponse: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, site: 'deepseek', baselineText: options?.baselineText, text: 'Fresh DeepSeek response', changed: true, idle: true, timedOut: false }),
      xSearch: async (sessionId: string, query: string, options?: Record<string, unknown>) => ({ sessionId, query, options, count: 1, posts: [{ id: 'tweet_1', text: 'hello' }] }),
      xNotifications: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, options, count: 1, posts: [{ id: 'tweet_n1', text: 'notification' }] }),
      xMessages: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, options, count: 1, threads: [{ id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', snippet: 'hello there', unread: true, active: false }] }),
      xOpenMessageThread: async (sessionId: string, thread: string, options?: Record<string, unknown>) => ({ sessionId, query: thread, url: 'https://x.com/messages/123', thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true }, count: 1, messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }], options }),
      xSendMessage: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, query: options?.thread, url: 'https://x.com/messages/123', sent: true, thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true }, count: 2, messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }, { id: 'msg_2', text, sender: 'You', outgoing: true }], options }),
      xReadThread: async (sessionId: string, postUrl: string, options?: Record<string, unknown>) => ({ sessionId, url: postUrl, options, count: 2, posts: [{ id: 'tweet_1', url: postUrl, text: 'root' }, { id: 'tweet_2', text: 'reply' }] }),
      xOpenPost: async (sessionId: string, postUrl: string, timeoutMs?: number) => ({ sessionId, url: postUrl, timeoutMs, post: { id: 'tweet_1', url: postUrl, text: 'hello' } }),
      xProfile: async (sessionId: string, handleOrUrl: string, options?: Record<string, unknown>) => ({ sessionId, query: handleOrUrl, url: 'https://x.com/openai', profile: { handle: 'openai', name: 'OpenAI' }, options }),
      xFollow: async (sessionId: string, handleOrUrl: string, options?: Record<string, unknown>) => ({ sessionId, query: handleOrUrl, url: 'https://x.com/openai', followed: true, alreadyFollowing: false, buttonLabel: 'Follow', options }),
      xReply: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, text, url: options?.postUrl, replied: true }),
      xLike: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, url: options?.postUrl, liked: true }),
      xRepost: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, url: options?.postUrl, reposted: true }),
      listSessionEvents: (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, totalCount: 1, events: [{ id: 'evt_1', kind: 'snapshot', ok: true, options }] }),
      clearSessionEvents: (sessionId: string) => ({ sessionId, cleared: 1, remaining: 0 }),
      waitForText: async (sessionId: string, text: string, options?: Record<string, unknown>) => ({ sessionId, needle: text, matched: true, timedOut: false, snapshot: { text, options } }),
      listNetworkEvents: (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, totalCount: 1, events: [{ id: 'evt_1', url: 'https://x.com', stage: 'response' }], options }),
      listDomEvents: async (sessionId: string, options?: Record<string, unknown>) => ({ sessionId, count: 1, totalCount: 1, events: [{ id: 'dom_1', types: ['childList'], textSample: 'Hiring' }], options }),
      clearNetworkEvents: async (sessionId: string) => ({ sessionId, cleared: 1, remaining: 0 }),
      clearDomEvents: async (sessionId: string) => ({ sessionId, cleared: 1, remaining: 0 }),
      registerProvider: (payload: Record<string, unknown>) => ({ ok: true, payload }),
      heartbeat: (payload: Record<string, unknown>) => ({ ok: true, payload }),
      upsertProviderSessionState: (payload: Record<string, unknown>) => ({ ok: true, payload }),
      waitForCommands: async (extensionId: string, options?: Record<string, unknown>) => [{ id: 'cmd_1', sessionId: 'browserext_1', kind: 'list_tabs', payload: {}, extensionId, ...options }],
      pollCommands: (extensionId: string, limit?: number) => [{ id: 'cmd_1', sessionId: 'browserext_1', kind: 'list_tabs', payload: {}, extensionId, limit }],
      completeCommand: (payload: Record<string, unknown>) => ({ ok: true, payload })
    };
    const localCoderAppsService = {
      listApps: () => [{ id: 'codex', installed: true }],
      getStatus: async (appId: string) => ({ id: appId, running: true }),
      open: async (appId: string, options: Record<string, unknown>) => ({ id: appId, opened: true, prompt: options.initialPrompt, workingDirectory: options.workingDirectory }),
      focus: async (appId: string) => ({ id: appId, focused: true }),
      close: async (appId: string) => ({ id: appId, closed: true }),
      maximize: async (appId: string) => ({ id: appId, maximized: true }),
      minimize: async (appId: string) => ({ id: appId, minimized: true }),
      restore: async (appId: string) => ({ id: appId, restored: true }),
      move: async (appId: string, x: number, y: number) => ({ id: appId, moved: [x, y] }),
      resize: async (appId: string, width: number, height: number) => ({ id: appId, resized: [width, height] }),
      run: async (appId: string, options: Record<string, unknown>) => ({ id: appId, ran: options.prompt, workingDirectory: options.workingDirectory })
    };
    const core = new SidofunCore(
      {
        executeDesktopAction: async (action) => {
          calls.push({ kind: 'desktop', payload: action });
          return action;
        },
        getScreenSize: async () => ({ width: 100, height: 50 }),
        getMousePosition: async () => ({ x: 1, y: 2 }),
        takeScreenshot: async () => ({ filepath: 'screen.png', width: 100, height: 50, format: 'png' }),
        screenshotWin32: async () => ({ filepath: 'win.png', width: 80, height: 40, format: 'png' })
      },
      {
        listTabs: async () => ({ sessions: [], count: 0 }),
        findSessionsByTitle: async (titleQuery: string) => ({ sessions: [{ id: `match:${titleQuery}` }], count: 1 }),
        focus: async (sessionId: string) => ({ session: { id: sessionId }, message: `Focused session: ${sessionId}` }),
        activateSessionByTitle: async (titleQuery: string) => ({ session: { id: `match:${titleQuery}` }, message: `Activated ${titleQuery}` }),
        exec: async (sessionId: string, command: string, options: Record<string, unknown>) => {
          calls.push({ kind: 'cmd', payload: { sessionId, command, options } });
          return { ok: true };
        },
        executeShortcut: async () => ({ message: 'done', sessionId: 's1' })
      } as any,
      clipboardService as any,
      desktopScopeService as any,
      shellService as any,
      sessionManagerService as any,
      telemetryService as any,
      terminalService as any,
      {} as any,
      browserExtensionService as any,
      localCoderAppsService as any,
      hfPapersService as any,
      openCliService as any,
      processWindowService as any
    );

    expect(await core.executeAutomationAction('move_window', { windowHandle: 12, x: 5, y: 7 })).toEqual({
      type: 'move_window',
      windowHandle: 12,
      x: 5,
      y: 7
    });
    expect(await core.executeAutomationAction('screenshot_raw', { format: 'png', returnBase64: false })).toEqual({
      type: 'screenshot_raw',
      format: 'png',
      filename: undefined,
      returnBase64: false
    });
    expect(await core.executeAutomationAction('screen_size', {})).toEqual({ width: 100, height: 50 });
    expect(await core.executeAutomationAction('get_screen_size', {})).toEqual({ width: 100, height: 50 });
    expect(await core.executeAutomationAction('get_mouse_position', {})).toEqual({ x: 1, y: 2 });
    expect(await core.executeAutomationAction('list_processes', {})).toEqual([{ pid: 1, processName: 'explorer', hasWindow: true, isVisible: true }]);
    expect(await core.executeAutomationAction('list_windows', {})).toEqual([{ handle: 12, title: 'Explorer', visible: true, isForeground: false, rect: { x: 1, y: 2, width: 3, height: 4 } }]);
    expect(await core.executeAutomationAction('get_window_info', { windowHandle: 12 })).toEqual({ handle: 12, title: 'Explorer', visible: true, isForeground: false, rect: { x: 1, y: 2, width: 3, height: 4 } });
    expect(await core.executeAutomationAction('local_coder_list', {})).toEqual([{ id: 'codex', installed: true }]);
    expect(await core.executeAutomationAction('local_coder_status', { appId: 'codex' })).toEqual({ id: 'codex', running: true });
    expect(await core.executeAutomationAction('local_coder_open', { appId: 'codex', prompt: 'hello', workingDirectory: 'C:\\hapus\\test-codex' })).toEqual({ id: 'codex', opened: true, prompt: 'hello', workingDirectory: 'C:\\hapus\\test-codex' });
    expect(await core.executeAutomationAction('local_coder_focus', { appId: 'codex' })).toEqual({ id: 'codex', focused: true });
    expect(await core.executeAutomationAction('local_coder_close', { appId: 'codex' })).toEqual({ id: 'codex', closed: true });
    expect(await core.executeAutomationAction('local_coder_maximize', { appId: 'codex' })).toEqual({ id: 'codex', maximized: true });
    expect(await core.executeAutomationAction('local_coder_minimize', { appId: 'codex' })).toEqual({ id: 'codex', minimized: true });
    expect(await core.executeAutomationAction('local_coder_restore', { appId: 'codex' })).toEqual({ id: 'codex', restored: true });
    expect(await core.executeAutomationAction('local_coder_move', { appId: 'codex', x: 10, y: 20 })).toEqual({ id: 'codex', moved: [10, 20] });
    expect(await core.executeAutomationAction('local_coder_resize', { appId: 'codex', width: 1200, height: 900 })).toEqual({ id: 'codex', resized: [1200, 900] });
    expect(await core.executeAutomationAction('local_coder_run', { appId: 'codex', prompt: 'hello', workingDirectory: 'C:\\hapus\\test-codex' })).toEqual({ id: 'codex', ran: 'hello', workingDirectory: 'C:\\hapus\\test-codex' });
    expect(await core.executeAutomationAction('clipboard_read', {})).toEqual('clipboard-text');
    expect(await core.executeAutomationAction('clipboard_write', { text: 'hello' })).toEqual({ message: 'Clipboard updated', length: 5 });
    expect(await core.executeAutomationAction('clipboard_clear', {})).toEqual({ message: 'Clipboard cleared' });
    expect(await core.executeAutomationAction('clipboard_status', {})).toEqual({ text: 'clipboard-text', length: 14, hasText: true });
    expect(await core.executeAutomationAction('session_create', { clientKind: 'operator', name: 'demo' })).toEqual({ id: 'client_session_1', clientKind: 'operator', name: 'demo', resources: [] });
    expect(await core.executeAutomationAction('session_list', {})).toEqual({ sessions: [{ id: 'client_session_1' }], count: 1 });
    expect(await core.executeAutomationAction('session_info', { sessionId: 'client_session_1' })).toEqual({ id: 'client_session_1', resources: [] });
    expect(await core.executeAutomationAction('session_touch', { sessionId: 'client_session_1' })).toEqual({ id: 'client_session_1', touched: true });
    expect(await core.executeAutomationAction('desktop_scope_create', { titleQuery: 'Explorer', name: 'explorer' })).toEqual({ id: 'desktop_scope_1', created: true, options: { windowHandles: undefined, processIds: undefined, titleQuery: 'Explorer', name: 'explorer' } });
    expect(await core.executeAutomationAction('desktop_scope_list', {})).toEqual({ scopes: [{ id: 'desktop_scope_1' }], count: 1 });
    expect(await core.executeAutomationAction('desktop_scope_info', { scopeId: 'desktop_scope_1' })).toEqual({ id: 'desktop_scope_1', alive: true });
    expect(await core.executeAutomationAction('desktop_scope_focus', { scopeId: 'desktop_scope_1' })).toEqual({ scope: { id: 'desktop_scope_1' }, message: 'focused scope' });
    expect(await core.executeAutomationAction('desktop_scope_screenshot', { scopeId: 'desktop_scope_1', filename: 'scope.png' })).toEqual({ scopeId: 'desktop_scope_1', filepath: 'scope.png' });
    expect(await core.executeAutomationAction('desktop_scope_click', { scopeId: 'desktop_scope_1', x: 10, y: 20, button: 'right' })).toEqual({ scopeId: 'desktop_scope_1', target: { x: 10, y: 20 }, button: 'right' });
    expect(await core.executeAutomationAction('desktop_scope_type', { scopeId: 'desktop_scope_1', text: 'hello' })).toEqual({ scopeId: 'desktop_scope_1', text: 'hello' });
    expect(await core.executeAutomationAction('desktop_scope_close', { scopeId: 'desktop_scope_1' })).toEqual({ id: 'desktop_scope_1', closed: true });
    expect(await core.executeAutomationAction('session_own_resource', { sessionId: 'client_session_1', resourceType: 'desktop_scope', resourceId: 'desktop_scope_1' })).toEqual({ id: 'client_session_1', resource: { type: 'desktop_scope', id: 'desktop_scope_1', metadata: undefined } });
    expect(await core.executeAutomationAction('session_release_resource', { sessionId: 'client_session_1', resourceType: 'desktop_scope', resourceId: 'desktop_scope_1' })).toEqual({ id: 'client_session_1', released: ['desktop_scope', 'desktop_scope_1'] });
    expect(await core.executeAutomationAction('session_close', { sessionId: 'client_session_1', cleanupOwnedResources: false })).toEqual({ id: 'client_session_1', closed: true, cleanup: false });
    expect(await core.executeAutomationAction('trace_start', { name: 'desktop-debug' })).toEqual({ id: 'trace_1', name: 'desktop-debug' });
    expect(await core.executeAutomationAction('trace_list', {})).toEqual({ traces: [{ id: 'trace_1' }], count: 1 });
    expect(await core.executeAutomationAction('trace_info', { traceId: 'trace_1' })).toEqual({ id: 'trace_1' });
    expect(await core.executeAutomationAction('trace_add_metadata', { traceId: 'trace_1', metadata: { env: 'test' } })).toEqual({ id: 'trace_1', metadata: { env: 'test' } });
    expect(await core.executeAutomationAction('trace_record', { traceId: 'trace_1', source: 'platform', operation: 'click', status: 'success' })).toEqual({ traceId: 'trace_1', record: { timestamp: undefined, source: 'platform', operation: 'click', status: 'success', durationMs: 0, input: undefined, output: undefined, error: undefined, metadata: undefined }, appended: true });
    expect(await core.executeAutomationAction('trace_stop', { traceId: 'trace_1' })).toEqual({ id: 'trace_1', stopped: true });
    expect(await core.executeAutomationAction('trajectory_start', { name: 'agent-run' })).toEqual({ id: 'trajectory_1', name: 'agent-run' });
    expect(await core.executeAutomationAction('trajectory_list', {})).toEqual({ trajectories: [{ id: 'trajectory_1' }], count: 1 });
    expect(await core.executeAutomationAction('trajectory_info', { trajectoryId: 'trajectory_1' })).toEqual({ id: 'trajectory_1' });
    expect(await core.executeAutomationAction('trajectory_append_turn', { trajectoryId: 'trajectory_1', turnId: 'turn_1', prompt: 'hi' })).toEqual({ trajectoryId: 'trajectory_1', turn: { timestamp: undefined, turnId: 'turn_1', role: undefined, prompt: 'hi', response: undefined, actions: undefined, screenshots: undefined, metadata: undefined }, appended: true });
    expect(await core.executeAutomationAction('trajectory_stop', { trajectoryId: 'trajectory_1' })).toEqual({ id: 'trajectory_1', stopped: true });
    expect(await core.executeAutomationAction('shell_run', { command: 'echo hi' })).toEqual({ shell: 'pwsh', command: 'echo hi', success: true });
    expect(await core.executeAutomationAction('shell_run_cmd', { command: 'dir' })).toEqual({ shell: 'cmd', command: 'dir', success: true });
    expect(await core.executeAutomationAction('shell_run_pwsh', { command: 'Get-Date' })).toEqual({ shell: 'pwsh', command: 'Get-Date', success: true });
    expect(await core.executeAutomationAction('browser_extension_status', {})).toEqual({ available: true, providerId: 'sidofun-browser-extension' });
    expect(await core.executeAutomationAction('browser_extension_capabilities', {})).toEqual({ providerId: 'sidofun-browser-extension', primitives: ['navigate'] });
    expect(await core.executeAutomationAction('browser_extension_sites', {})).toEqual([{ site: 'x.com', status: 'scaffolded', commands: ['twitter.search'] }]);
    expect(await core.executeAutomationAction('browser_extension_workspace_list', {})).toEqual([{ name: 'socials', path: 'C:\\hapus' }]);
    expect(await core.executeAutomationAction('browser_extension_workspace_get', { name: 'socials' })).toEqual({ name: 'socials', path: 'C:\\hapus' });
    expect(await core.executeAutomationAction('browser_extension_workspace_set', { name: 'socials', path: 'C:\\hapus', sites: ['x.com', 'chatgpt.com'] })).toEqual({ name: 'socials', path: 'C:\\hapus', sites: ['x.com', 'chatgpt.com'] });
    expect(await core.executeAutomationAction('browser_extension_workspace_clear', { name: 'socials' })).toEqual({ name: 'socials', removed: true });
    expect(await core.executeAutomationAction('browser_extension_session_create', { workspace: 'socials', site: 'x.com', privateMode: true })).toEqual({ id: 'browserext_1', provider: 'chrome-extension', connected: false, workspace: 'socials', site: 'x.com', privateMode: true });
    expect(await core.executeAutomationAction('browser_extension_session_list', {})).toEqual([{ id: 'browserext_1', provider: 'chrome-extension', connected: false }]);
    expect(await core.executeAutomationAction('browser_extension_session_info', { sessionId: 'browserext_1' })).toEqual({ id: 'browserext_1', provider: 'chrome-extension', connected: false });
    expect(await core.executeAutomationAction('browser_extension_session_refresh', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', providerConnected: true, queuedCommandCount: 0, session: { id: 'browserext_1', provider: 'chrome-extension', connected: false, stale: true } });
    expect(await core.executeAutomationAction('browser_extension_session_reconnect', { sessionId: 'browserext_1', timeoutMs: 30000, intervalMs: 1000 })).toEqual({ sessionId: 'browserext_1', reconnected: true, timedOut: false, provider: { connected: true }, session: { id: 'browserext_1', provider: 'chrome-extension', connected: true, ready: true, activeTabId: 20 }, options: { timeoutMs: 30000, intervalMs: 1000 } });
    expect(await core.executeAutomationAction('browser_extension_session_close', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', removed: true });
    expect(await core.executeAutomationAction('browser_extension_session_nuke', { site: 'x.com', staleOnly: true, queue: 'matching' })).toEqual({ removedSessionCount: 2, removedSessionIds: ['browserext_1', 'browserext_2'], removedQueueCount: 3, filters: { site: 'x.com', staleOnly: true, connectedOnly: undefined, disconnectedOnly: undefined, queue: 'matching' } });
    expect(await core.executeAutomationAction('browser_extension_queue_clear', { sessionId: 'browserext_1', status: 'in_progress' })).toEqual({ removedCommandCount: 2, removedCommandIds: ['browserextcmd_1', 'browserextcmd_2'], filters: { sessionId: 'browserext_1', site: undefined, status: 'in_progress' } });
    expect(await core.executeAutomationAction('browser_extension_tabs', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', tabs: [{ id: 20, url: 'https://x.com/home' }], activeTabId: 20 });
    expect(await core.executeAutomationAction('browser_extension_navigate', { sessionId: 'browserext_1', targetUrl: 'https://x.com/explore' })).toEqual({ sessionId: 'browserext_1', url: 'https://x.com/explore' });
    expect(await core.executeAutomationAction('browser_extension_focus_tab', { sessionId: 'browserext_1', tabId: 20 })).toEqual({ sessionId: 'browserext_1', tabId: 20 });
    expect(await core.executeAutomationAction('browser_extension_snapshot', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', snapshot: { title: 'X', url: 'https://x.com/home', text: 'hello' } });
    expect(await core.executeAutomationAction('browser_extension_screenshot', { sessionId: 'browserext_1', filename: 'browserext-shot.png' })).toEqual({ sessionId: 'browserext_1', format: 'png', filepath: 'browserext-shot.png', byteLength: 5 });
    expect(await core.executeAutomationAction('browser_extension_inspect', { sessionId: 'browserext_1', selector: 'textarea' })).toEqual({ sessionId: 'browserext_1', selector: 'textarea', element: { tagName: 'textarea', role: 'textbox', text: 'hello' } });
    expect(await core.executeAutomationAction('browser_extension_inspect_all', { sessionId: 'browserext_1', selector: 'a[href]', count: 2 })).toEqual({ sessionId: 'browserext_1', selector: 'a[href]', limit: 2, count: 2, elements: [{ tagName: 'a', href: 'https://x.com/home' }, { tagName: 'a', href: 'https://x.com/explore' }] });
    expect(await core.executeAutomationAction('browser_extension_links', { sessionId: 'browserext_1', count: 2 })).toEqual({ sessionId: 'browserext_1', limit: 2, count: 2, links: [{ href: 'https://x.com/home', text: 'Home' }, { href: 'https://x.com/explore', text: 'Explore' }] });
    expect(await core.executeAutomationAction('browser_extension_evaluate', { sessionId: 'browserext_1', expression: 'document.title' })).toEqual({ sessionId: 'browserext_1', expression: 'document.title', value: 'X' });
    expect(await core.executeAutomationAction('browser_extension_click', { sessionId: 'browserext_1', selector: 'button.compose' })).toEqual({ sessionId: 'browserext_1', selector: 'button.compose', clicked: true });
    expect(await core.executeAutomationAction('browser_extension_type', { sessionId: 'browserext_1', selector: 'textarea', text: 'hello' })).toEqual({ sessionId: 'browserext_1', selector: 'textarea', text: 'hello', typed: true });
    expect(await core.executeAutomationAction('browser_extension_press', { sessionId: 'browserext_1', selector: 'textarea', key: 'Enter' })).toEqual({ sessionId: 'browserext_1', selector: 'textarea', key: 'Enter', pressed: true });
    expect(await core.executeAutomationAction('browser_extension_form_fill', { sessionId: 'browserext_1', selector: 'input[name=\"email\"]', text: 'usef@example.com' })).toEqual({
      sessionId: 'browserext_1',
      selector: 'input[name="email"]',
      value: 'usef@example.com',
      frameSelectors: undefined,
      filled: true,
      field: { selector: 'input[name="email"]', tagName: 'input', value: 'usef@example.com', filled: true }
    });
    expect(await core.executeAutomationAction('browser_extension_form_fill_human', { sessionId: 'browserext_1', selector: 'input[name=\"email\"]', text: 'usef@example.com', delayMs: 70, jitterMs: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      selector: 'input[name="email"]',
      value: 'usef@example.com',
      frameSelectors: undefined,
      delayMs: 70,
      jitterMs: 10,
      filled: true,
      field: { selector: 'input[name="email"]', tagName: 'input', value: 'usef@example.com', filled: true, humanLike: true }
    });
    expect(await core.executeAutomationAction('browser_extension_form_fill_many', {
      sessionId: 'browserext_1',
      fields: [
        { selector: 'input[name="email"]', value: 'usef@example.com' },
        { selector: 'input[name="password"]', value: 'secret' }
      ]
    })).toEqual({
      sessionId: 'browserext_1',
      frameSelectors: undefined,
      count: 2,
      fields: [
        { selector: 'input[name="email"]', tagName: 'input', value: 'usef@example.com', filled: true },
        { selector: 'input[name="password"]', tagName: 'input', value: 'secret', filled: true }
      ],
      requested: [
        { selector: 'input[name="email"]', value: 'usef@example.com' },
        { selector: 'input[name="password"]', value: 'secret' }
      ]
    });
    expect(await core.executeAutomationAction('browser_extension_form_fields', { sessionId: 'browserext_1', frameSelectors: ['iframe[name=\"checkout\"]'], limit: 10 })).toEqual({
      sessionId: 'browserext_1',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      count: 1,
      fields: [{ selector: 'input[name="email"]', fieldType: 'input', tagName: 'input', labels: ['Email'] }]
    });
    expect(await core.executeAutomationAction('browser_extension_form_find_field', { sessionId: 'browserext_1', query: 'Email', frameSelectors: ['iframe[name=\"checkout\"]'], exact: true })).toEqual({
      sessionId: 'browserext_1',
      query: 'Email',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: true,
      field: { selector: 'input[name="email"]', fieldType: 'input', tagName: 'input', labels: ['Email'], matchedBy: 'label' }
    });
    expect(await core.executeAutomationAction('browser_extension_form_options', { sessionId: 'browserext_1', selector: 'select[name=\"country\"]', frameSelectors: ['iframe[name=\"checkout\"]'], limit: 10 })).toEqual({
      sessionId: 'browserext_1',
      selector: 'select[name="country"]',
      frameSelectors: ['iframe[name="checkout"]'],
      limit: 10,
      options: [{ index: 0, text: 'Indonesia', value: 'id', selected: true }]
    });
    expect(await core.executeAutomationAction('browser_extension_form_fill_label', { sessionId: 'browserext_1', query: 'Email', value: 'usef@example.com', frameSelectors: ['iframe[name=\"checkout\"]'], exact: false })).toEqual({
      sessionId: 'browserext_1',
      query: 'Email',
      value: 'usef@example.com',
      frameSelectors: ['iframe[name="checkout"]'],
      exact: false,
      filled: true,
      field: { selector: 'input[name="email"]', tagName: 'input', value: 'usef@example.com', filled: true, matchedBy: 'label', query: 'Email' }
    });
    expect(await core.executeAutomationAction('browser_extension_form_select', { sessionId: 'browserext_1', selector: 'select[name=\"country\"]', value: 'Indonesia', by: 'text', frameSelectors: ['iframe[name=\"checkout\"]'] })).toEqual({
      sessionId: 'browserext_1',
      selector: 'select[name="country"]',
      optionQuery: 'Indonesia',
      by: 'text',
      frameSelectors: ['iframe[name="checkout"]'],
      filled: true,
      field: { selector: 'select[name="country"]', tagName: 'select', value: 'id', filled: true },
      option: { index: 0, text: 'Indonesia', value: 'id', selected: true }
    });
    expect(await core.executeAutomationAction('browser_extension_form_upload', { sessionId: 'browserext_1', selector: 'input[type=\"file\"]', filepath: 'C:\\temp\\resume.pdf', fileName: 'resume.pdf', mimeType: 'application/pdf' })).toEqual({
      sessionId: 'browserext_1',
      selector: 'input[type="file"]',
      filepath: 'C:\\temp\\resume.pdf',
      frameSelectors: undefined,
      filename: 'resume.pdf',
      mimeType: 'application/pdf',
      uploaded: true,
      field: { selector: 'input[type="file"]', tagName: 'input', type: 'file', filled: true, uploadedFile: { name: 'resume.pdf', size: 42, type: 'application/pdf' } },
      uploadedFile: { name: 'resume.pdf', size: 42, type: 'application/pdf' }
    });
    expect(await core.executeAutomationAction('browser_extension_form_combobox_options', { sessionId: 'browserext_1', selector: '[role=\"combobox\"]', limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      selector: '[role="combobox"]',
      opts: { frameSelectors: undefined, limit: 10, timeoutMs: 5000 },
      options: [{ index: 0, text: 'Indonesia', value: 'id', selected: true }]
    });
    expect(await core.executeAutomationAction('browser_extension_form_combobox_select', { sessionId: 'browserext_1', selector: '[role=\"combobox\"]', value: 'Indonesia', match: 'exact', frameSelectors: ['iframe[name=\"picker\"]'], timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      selector: '[role="combobox"]',
      optionQuery: 'Indonesia',
      options: { match: 'exact', timeoutMs: 5000, frameSelectors: ['iframe[name="picker"]'] },
      filled: true,
      field: { selector: '[role="combobox"]', tagName: 'input', value: 'Indonesia', filled: true },
      option: { index: 0, text: 'Indonesia', value: 'id', selected: true }
    });
    expect(await core.executeAutomationAction('browser_extension_form_submit', { sessionId: 'browserext_1', selector: 'button[type=\"submit\"]' })).toEqual({
      sessionId: 'browserext_1',
      selector: 'button[type="submit"]',
      frameSelectors: undefined,
      submitted: true,
      method: 'click',
      resolvedSelector: 'button[type="submit"]',
      formAction: 'https://example.com/submit'
    });
    expect(await core.executeAutomationAction('browser_extension_form_submit_wait', { sessionId: 'browserext_1', waitText: 'Thanks', waitNoSelector: '.loading', intervalMs: 300, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      selector: undefined,
      frameSelectors: undefined,
      waitUrlIncludes: undefined,
      waitText: 'Thanks',
      waitSelector: undefined,
      waitNoSelector: '.loading',
      timeoutMs: 5000,
      intervalMs: 300,
      submitted: true,
      method: 'click',
      resolvedSelector: 'button[type="submit"]',
      formAction: 'https://example.com/submit',
      matched: { text: true },
      snapshot: { title: 'Thanks', url: 'https://example.com/thanks', text: 'Thanks', capturedAt: '2026-03-31T00:00:00.000Z' }
    });
    expect(await core.executeAutomationAction('browser_extension_auth_login', { sessionId: 'browserext_1', email: 'usef@example.com', password: 'secret', delayMs: 60, jitterMs: 20, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      submitted: true,
      steps: [{ kind: 'identity' }, { kind: 'password' }],
      submit: { submitted: true }
    });
    expect(await core.executeAutomationAction('browser_extension_auth_signup', { sessionId: 'browserext_1', fullName: 'Usef Test', email: 'usef@example.com', password: 'secret', confirmPassword: 'secret', skipSubmit: true, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      submitted: false,
      steps: [{ kind: 'email' }, { kind: 'password' }],
      submit: undefined
    });
    expect(await core.executeAutomationAction('browser_extension_cookies', { sessionId: 'browserext_1', targetUrl: 'https://x.com' })).toEqual({ sessionId: 'browserext_1', targetUrl: 'https://x.com', cookies: [] });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_new_chat', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', started: true });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_info', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'chatgpt.com', busy: false, conversationCount: 1, threadCount: 2, options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_list_conversations', { sessionId: 'browserext_1', limit: 20, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', count: 1, conversations: [{ id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }], options: { limit: 20, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_open_conversation', { sessionId: 'browserext_1', targetUrl: 'Project', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', conversation: { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }, options: { titleQuery: 'Project', url: undefined, index: undefined, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_stop', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', stopped: true });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_continue', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', continued: true });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_response_controls', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'chatgpt.com', previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', threadCount: 2, latestAssistant: 'Existing assistant reply', latestUser: 'Hello', messages: [], options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_previous_response', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', moved: true, direction: 'previous', threadCount: 2, latestAssistant: 'Older assistant reply', latestUser: 'Hello', messages: [], previousAvailable: false, nextAvailable: true, previousLabel: 'Previous response', nextLabel: 'Next response', options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_next_response', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', moved: true, direction: 'next', threadCount: 2, latestAssistant: 'Newer assistant reply', latestUser: 'Hello', messages: [], previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_list_response_versions', { sessionId: 'browserext_1', limit: 10, maxVersions: 6, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'chatgpt.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options: { limit: 10, maxVersions: 6, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_select_response_version', { sessionId: 'browserext_1', count: 0, limit: 10, maxVersions: 6, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'chatgpt.com', currentIndex: 0, selectedIndex: 0, selected: { index: 0, current: true }, count: 2, versions: [{ index: 0, current: true }, { index: 1, current: false }], options: { limit: 10, maxVersions: 6, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_regenerate', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', regenerated: true });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_edit_message', { sessionId: 'browserext_1', text: 'Rewrite this', role: 'user', offset: 0, limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      text: 'Rewrite this',
      target: { role: 'user', offset: 0, message: { id: 'cg_1', role: 'user', text: 'Hello', index: 0 } },
      edited: true,
      message: { id: 'cg_1', role: 'user', text: 'Rewrite this', index: 0 }
    });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_read_thread', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      count: 2,
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello',
      options: { limit: 10, timeoutMs: 5000 },
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ]
    });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_read_message', { sessionId: 'browserext_1', role: 'assistant', offset: 1, limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      count: 2,
      message: { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 },
      options: { index: undefined, role: 'assistant', offset: 1, limit: 10, timeoutMs: 5000 }
    });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_read_latest', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', text: 'Existing assistant reply' });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_send', { sessionId: 'browserext_1', text: 'Summarize this page' })).toEqual({ sessionId: 'browserext_1', text: 'Summarize this page', sent: true });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_ask', { sessionId: 'browserext_1', text: 'What is on this page?', timeoutMs: 45000 })).toEqual({ sessionId: 'browserext_1', prompt: 'What is on this page?', response: 'Fresh assistant response', timedOut: false });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_rewrite_thread', { sessionId: 'browserext_1', text: 'Rewrite this', role: 'user', offset: 0, limit: 10, timeoutMs: 45000 })).toEqual({ sessionId: 'browserext_1', text: 'Rewrite this', edited: true, target: { role: 'user', offset: 0, message: { id: 'cg_1', role: 'user', text: 'Hello', index: 0 } }, response: 'Fresh assistant response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh assistant response', latestUser: 'Rewrite this', messages: [{ id: 'cg_1', role: 'user', text: 'Rewrite this', index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Fresh assistant response', index: 1 }] });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_wait_idle', { sessionId: 'browserext_1', timeoutMs: 45000, intervalMs: 1000 })).toEqual({ sessionId: 'browserext_1', idle: true, timedOut: false, options: { timeoutMs: 45000, intervalMs: 1000 } });
    expect(await core.executeAutomationAction('browser_extension_chatgpt_wait_response', { sessionId: 'browserext_1', text: 'Existing assistant reply', timeoutMs: 45000, intervalMs: 1000, count: 2 })).toEqual({ sessionId: 'browserext_1', site: 'chatgpt', baselineText: 'Existing assistant reply', text: 'Fresh assistant response', changed: true, idle: true, timedOut: false });
    expect(await core.executeAutomationAction('browser_extension_deepseek_new_chat', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', started: true });
    expect(await core.executeAutomationAction('browser_extension_deepseek_info', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'deepseek.com', busy: false, conversationCount: 1, threadCount: 2, options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_list_conversations', { sessionId: 'browserext_1', limit: 20, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', count: 1, conversations: [{ id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }], options: { limit: 20, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_open_conversation', { sessionId: 'browserext_1', targetUrl: 'Research', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', conversation: { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }, options: { titleQuery: 'Research', url: undefined, index: undefined, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_stop', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', stopped: true });
    expect(await core.executeAutomationAction('browser_extension_deepseek_continue', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', continued: true });
    expect(await core.executeAutomationAction('browser_extension_deepseek_response_controls', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'deepseek.com', previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', threadCount: 2, latestAssistant: 'Existing DeepSeek reply', latestUser: 'Hello', messages: [], options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_previous_response', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', moved: true, direction: 'previous', threadCount: 2, latestAssistant: 'Older DeepSeek reply', latestUser: 'Hello', messages: [], previousAvailable: false, nextAvailable: true, previousLabel: 'Previous response', nextLabel: 'Next response', options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_next_response', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', moved: true, direction: 'next', threadCount: 2, latestAssistant: 'Newer DeepSeek reply', latestUser: 'Hello', messages: [], previousAvailable: true, nextAvailable: false, previousLabel: 'Previous response', nextLabel: 'Next response', options: { limit: 10, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_list_response_versions', { sessionId: 'browserext_1', limit: 10, maxVersions: 6, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'deepseek.com', currentIndex: 1, count: 2, versions: [{ index: 0, current: false }, { index: 1, current: true }], options: { limit: 10, maxVersions: 6, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_select_response_version', { sessionId: 'browserext_1', count: 0, limit: 10, maxVersions: 6, timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', site: 'deepseek.com', currentIndex: 0, selectedIndex: 0, selected: { index: 0, current: true }, count: 2, versions: [{ index: 0, current: true }, { index: 1, current: false }], options: { limit: 10, maxVersions: 6, timeoutMs: 5000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_regenerate', { sessionId: 'browserext_1', timeoutMs: 5000 })).toEqual({ sessionId: 'browserext_1', regenerated: true });
    expect(await core.executeAutomationAction('browser_extension_deepseek_edit_message', { sessionId: 'browserext_1', text: 'Rewrite this', role: 'user', offset: 0, limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      text: 'Rewrite this',
      target: { role: 'user', offset: 0, message: { id: 'ds_1', role: 'user', text: 'Hello', index: 0 } },
      edited: true,
      message: { id: 'ds_1', role: 'user', text: 'Rewrite this', index: 0 }
    });
    expect(await core.executeAutomationAction('browser_extension_deepseek_read_thread', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      count: 2,
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello',
      options: { limit: 10, timeoutMs: 5000 },
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ]
    });
    expect(await core.executeAutomationAction('browser_extension_deepseek_read_message', { sessionId: 'browserext_1', role: 'assistant', offset: 1, limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      count: 2,
      message: { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 },
      options: { index: undefined, role: 'assistant', offset: 1, limit: 10, timeoutMs: 5000 }
    });
    expect(await core.executeAutomationAction('browser_extension_deepseek_read_latest', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', text: 'Existing DeepSeek reply' });
    expect(await core.executeAutomationAction('browser_extension_deepseek_send', { sessionId: 'browserext_1', text: 'Summarize this page' })).toEqual({ sessionId: 'browserext_1', text: 'Summarize this page', sent: true });
    expect(await core.executeAutomationAction('browser_extension_deepseek_ask', { sessionId: 'browserext_1', text: 'What is on this page?', timeoutMs: 45000 })).toEqual({ sessionId: 'browserext_1', prompt: 'What is on this page?', response: 'Fresh DeepSeek response', timedOut: false });
    expect(await core.executeAutomationAction('browser_extension_deepseek_rewrite_thread', { sessionId: 'browserext_1', text: 'Rewrite this', role: 'user', offset: 0, limit: 10, timeoutMs: 45000 })).toEqual({ sessionId: 'browserext_1', text: 'Rewrite this', edited: true, target: { role: 'user', offset: 0, message: { id: 'ds_1', role: 'user', text: 'Hello', index: 0 } }, response: 'Fresh DeepSeek response', timedOut: false, threadCount: 2, latestAssistant: 'Fresh DeepSeek response', latestUser: 'Rewrite this', messages: [{ id: 'ds_1', role: 'user', text: 'Rewrite this', index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Fresh DeepSeek response', index: 1 }] });
    expect(await core.executeAutomationAction('browser_extension_deepseek_wait_idle', { sessionId: 'browserext_1', timeoutMs: 45000, intervalMs: 1000 })).toEqual({ sessionId: 'browserext_1', idle: true, timedOut: false, options: { timeoutMs: 45000, intervalMs: 1000 } });
    expect(await core.executeAutomationAction('browser_extension_deepseek_wait_response', { sessionId: 'browserext_1', text: 'Existing DeepSeek reply', timeoutMs: 45000, intervalMs: 1000, count: 2 })).toEqual({ sessionId: 'browserext_1', site: 'deepseek', baselineText: 'Existing DeepSeek reply', text: 'Fresh DeepSeek response', changed: true, idle: true, timedOut: false });
    expect(await core.executeAutomationAction('browser_extension_x_search', { sessionId: 'browserext_1', query: 'hiring', mode: 'latest', limit: 5 })).toEqual({
      sessionId: 'browserext_1',
      query: 'hiring',
      options: { mode: 'latest', limit: 5, timeoutMs: undefined },
      count: 1,
      posts: [{ id: 'tweet_1', text: 'hello' }]
    });
    expect(await core.executeAutomationAction('browser_extension_x_notifications', { sessionId: 'browserext_1', limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      options: { limit: 10, timeoutMs: 5000 },
      count: 1,
      posts: [{ id: 'tweet_n1', text: 'notification' }]
    });
    expect(await core.executeAutomationAction('browser_extension_x_messages', { sessionId: 'browserext_1', limit: 20, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      options: { limit: 20, timeoutMs: 5000 },
      count: 1,
      threads: [{ id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', snippet: 'hello there', unread: true, active: false }]
    });
    expect(await core.executeAutomationAction('browser_extension_x_open_message_thread', { sessionId: 'browserext_1', targetUrl: 'https://x.com/messages/123', limit: 20, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      query: 'https://x.com/messages/123',
      url: 'https://x.com/messages/123',
      options: { limit: 20, timeoutMs: 5000 },
      thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true },
      count: 1,
      messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }]
    });
    expect(await core.executeAutomationAction('browser_extension_x_send_message', { sessionId: 'browserext_1', text: 'hello from sidofun', targetUrl: 'https://x.com/messages/123', timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      text: 'hello from sidofun',
      query: 'https://x.com/messages/123',
      url: 'https://x.com/messages/123',
      options: { thread: 'https://x.com/messages/123', timeoutMs: 5000 },
      sent: true,
      thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true },
      count: 2,
      messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }, { id: 'msg_2', text: 'hello from sidofun', sender: 'You', outgoing: true }]
    });
    expect(await core.executeAutomationAction('browser_extension_x_read_thread', { sessionId: 'browserext_1', targetUrl: 'https://x.com/user/status/123', limit: 10, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      url: 'https://x.com/user/status/123',
      options: { limit: 10, timeoutMs: 5000 },
      count: 2,
      posts: [{ id: 'tweet_1', url: 'https://x.com/user/status/123', text: 'root' }, { id: 'tweet_2', text: 'reply' }]
    });
    expect(await core.executeAutomationAction('browser_extension_x_open_post', { sessionId: 'browserext_1', targetUrl: 'https://x.com/user/status/123', timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      url: 'https://x.com/user/status/123',
      timeoutMs: 5000,
      post: { id: 'tweet_1', url: 'https://x.com/user/status/123', text: 'hello' }
    });
    expect(await core.executeAutomationAction('browser_extension_x_profile', { sessionId: 'browserext_1', targetUrl: '@openai', limit: 3, timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      query: '@openai',
      url: 'https://x.com/openai',
      profile: { handle: 'openai', name: 'OpenAI' },
      options: { limit: 3, timeoutMs: 5000 }
    });
    expect(await core.executeAutomationAction('browser_extension_x_follow', { sessionId: 'browserext_1', targetUrl: '@openai', timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      query: '@openai',
      url: 'https://x.com/openai',
      followed: true,
      alreadyFollowing: false,
      buttonLabel: 'Follow',
      options: { timeoutMs: 5000 }
    });
    expect(await core.executeAutomationAction('browser_extension_x_reply', { sessionId: 'browserext_1', text: 'hello', targetUrl: 'https://x.com/user/status/123', timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      text: 'hello',
      url: 'https://x.com/user/status/123',
      replied: true
    });
    expect(await core.executeAutomationAction('browser_extension_x_like', { sessionId: 'browserext_1', targetUrl: 'https://x.com/user/status/123', timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      url: 'https://x.com/user/status/123',
      liked: true
    });
    expect(await core.executeAutomationAction('browser_extension_x_repost', { sessionId: 'browserext_1', targetUrl: 'https://x.com/user/status/123', timeoutMs: 5000 })).toEqual({
      sessionId: 'browserext_1',
      url: 'https://x.com/user/status/123',
      reposted: true
    });
    expect(await core.executeAutomationAction('browser_extension_session_events', { sessionId: 'browserext_1', count: 20, kind: 'snapshot', ok: true })).toEqual({
      sessionId: 'browserext_1',
      count: 1,
      totalCount: 1,
      events: [{ id: 'evt_1', kind: 'snapshot', ok: true, options: { limit: 20, kind: 'snapshot', ok: true } }]
    });
    expect(await core.executeAutomationAction('browser_extension_clear_session_events', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', cleared: 1, remaining: 0 });
    expect(await core.executeAutomationAction('browser_extension_wait_text', { sessionId: 'browserext_1', text: 'Hiring', timeoutMs: 30000, intervalMs: 1000 })).toEqual({
      sessionId: 'browserext_1',
      needle: 'Hiring',
      matched: true,
      timedOut: false,
      snapshot: { text: 'Hiring', options: { timeoutMs: 30000, intervalMs: 1000 } }
    });
    expect(await core.executeAutomationAction('browser_extension_network_events', { sessionId: 'browserext_1', count: 20, targetUrl: '/graphql', status: 'response', text: 'GET' })).toEqual({
      sessionId: 'browserext_1',
      count: 1,
      totalCount: 1,
      events: [{ id: 'evt_1', url: 'https://x.com', stage: 'response' }],
      options: { limit: 20, urlIncludes: '/graphql', stage: 'response', method: 'GET' }
    });
    expect(await core.executeAutomationAction('browser_extension_dom_events', { sessionId: 'browserext_1', count: 20, mutationType: 'childList', textIncludes: 'Hiring', timeoutMs: 3000 })).toEqual({
      sessionId: 'browserext_1',
      count: 1,
      totalCount: 1,
      events: [{ id: 'dom_1', types: ['childList'], textSample: 'Hiring' }],
      options: { limit: 20, mutationType: 'childList', textIncludes: 'Hiring', timeoutMs: 3000 }
    });
    expect(await core.executeAutomationAction('browser_extension_clear_network_events', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', cleared: 1, remaining: 0 });
    expect(await core.executeAutomationAction('browser_extension_clear_dom_events', { sessionId: 'browserext_1' })).toEqual({ sessionId: 'browserext_1', cleared: 1, remaining: 0 });
    expect(await core.executeAutomationAction('browser_extension_provider_register', { extensionId: 'ext_1', protocolVersion: 'sidofun.browser-extension.v1' })).toEqual({
      ok: true,
      payload: { extensionId: 'ext_1', protocolVersion: 'sidofun.browser-extension.v1', browserName: undefined, browserVersion: undefined, userAgent: undefined }
    });
    expect(await core.executeAutomationAction('browser_extension_provider_heartbeat', { extensionId: 'ext_1', protocolVersion: 'sidofun.browser-extension.v1', sessions: [] })).toEqual({
      ok: true,
      payload: { extensionId: 'ext_1', protocolVersion: 'sidofun.browser-extension.v1', sessions: [] }
    });
    expect(await core.executeAutomationAction('browser_extension_provider_state_upsert', {
      extensionId: 'ext_1',
      protocolVersion: 'sidofun.browser-extension.v1',
      session: { sessionId: 'browserext_1', connected: true, activeTabId: 20 }
    })).toEqual({
      ok: true,
      payload: {
        extensionId: 'ext_1',
        protocolVersion: 'sidofun.browser-extension.v1',
        session: { sessionId: 'browserext_1', connected: true, activeTabId: 20 }
      }
    });
    expect(await core.executeAutomationAction('browser_extension_provider_poll', { extensionId: 'ext_1', limit: 5 })).toEqual([{ id: 'cmd_1', sessionId: 'browserext_1', kind: 'list_tabs', payload: {}, extensionId: 'ext_1', limit: 5 }]);
    expect(await core.executeAutomationAction('browser_extension_provider_command_result', { extensionId: 'ext_1', sessionId: 'browserext_1', commandId: 'cmd_1', ok: true, result: { ok: true } })).toEqual({
      ok: true,
      payload: { extensionId: 'ext_1', sessionId: 'browserext_1', commandId: 'cmd_1', ok: true, result: { ok: true }, error: undefined }
    });
    expect(await core.executeAutomationAction('opencli_status', {})).toEqual({ available: true, mode: 'binary', twitterAvailable: true });
    expect(await core.executeAutomationAction('opencli_doctor', { workspace: 'socials' })).toEqual({ ok: true, workspace: 'socials' });
    expect(await core.executeAutomationAction('opencli_sites', {})).toEqual([{ site: 'twitter', commands: ['search'] }]);
    expect(await core.executeAutomationAction('opencli_commands', { site: 'twitter' })).toEqual(['search']);
    expect(await core.executeAutomationAction('opencli_workspace_list', {})).toEqual([{ name: 'socials', path: 'C:\\hapus' }]);
    expect(await core.executeAutomationAction('opencli_workspace_get', { name: 'socials' })).toEqual({ name: 'socials', path: 'C:\\hapus' });
    expect(await core.executeAutomationAction('opencli_workspace_set', { name: 'notes', path: 'C:\\notes' })).toEqual({ name: 'notes', path: 'C:\\notes' });
    expect(await core.executeAutomationAction('opencli_workspace_bind_session', { sessionId: 'client_session_1', workspace: 'socials' })).toEqual({ sessionId: 'client_session_1', workspace: 'socials', path: 'C:\\hapus' });
    expect(await core.executeAutomationAction('opencli_workspace_unbind_session', { sessionId: 'client_session_1' })).toEqual({ sessionId: 'client_session_1', removed: true });
    expect(await core.executeAutomationAction('opencli_run', { site: 'hackernews', command: 'top', args: ['--limit', '1'] })).toEqual({ site: 'hackernews', command: 'top', args: ['--limit', '1'], success: true });
    expect(await core.executeAutomationAction('hf_papers_status', {})).toEqual({ available: true, defaultBackend: 'api', cli: { available: true, notes: [] }, pythonApi: { available: true, methods: ['list_papers'], notes: [] }, notes: [] });
    expect(await core.executeAutomationAction('hf_papers_doctor', { backend: 'cli' })).toEqual({ ok: true, backend: 'cli' });
    expect(await core.executeAutomationAction('hf_papers_search', { query: 'llm reasoning', backend: 'api' })).toEqual({ query: 'llm reasoning', backend: 'api', count: 1, papers: [{ id: '2601.15621', title: 'Qwen3-TTS Technical Report' }] });
    expect(await core.executeAutomationAction('hf_papers_info', { paperId: '2601.15621' })).toEqual({ id: '2601.15621', title: 'Qwen3-TTS Technical Report', paperUrl: 'https://huggingface.co/papers/2601.15621', arxivUrl: 'https://arxiv.org/abs/2601.15621', authors: ['X'], authorDetails: [] });
    expect(await core.executeAutomationAction('hf_papers_read', { paperId: '2601.15621', savePath: 'C:\\tmp\\paper.md' })).toEqual({ id: '2601.15621', backend: 'api', markdown: '# Qwen3-TTS Technical Report', charCount: 28, wordCount: 4, paperUrl: 'https://huggingface.co/papers/2601.15621', arxivUrl: 'https://arxiv.org/abs/2601.15621', savedTo: 'C:\\tmp\\paper.md' });
    expect(await core.executeAutomationAction('hf_papers_list_daily', { sort: 'trending', backend: 'cli' })).toEqual({ backend: 'cli', count: 1, filters: { sort: 'trending' }, papers: [{ id: '2603.23582', title: 'AI Generalisation Gap', authors: ['A'], authorDetails: [], paperUrl: 'https://huggingface.co/papers/2603.23582', arxivUrl: 'https://arxiv.org/abs/2603.23582' }] });
    expect(await core.executeAutomationAction('twitter_search', { query: 'rust lang' })).toEqual({ provider: 'opencli', operation: 'search', query: 'rust lang' });
    expect(await core.executeAutomationAction('twitter_timeline', { timelineType: 'following' })).toEqual({ provider: 'opencli', operation: 'timeline', type: 'following' });
    expect(await core.executeAutomationAction('twitter_bookmarks', { limit: 5 })).toEqual({ provider: 'opencli', operation: 'bookmarks', limit: 5 });
    expect(await core.executeAutomationAction('twitter_post', { text: 'hello from sidofun' })).toEqual({ provider: 'opencli', operation: 'post', text: 'hello from sidofun' });
    expect(await core.executeAutomationAction('terminal_spawn', { kind: 'cmd', title: 'Test' })).toEqual({ kind: 'cmd', sessionId: 'cmd_1', message: 'spawned' });
    expect(await core.executeAutomationAction('terminal_list', { kind: 'pwsh' })).toEqual({ sessions: [{ kind: 'pwsh', session: { id: 'pwsh_1' } }], count: 1 });
    expect(await core.executeAutomationAction('terminal_status', { kind: 'cmd', sessionId: 'cmd_1' })).toEqual({ session: { id: 'cmd_1', kind: 'cmd' } });
    expect(await core.executeAutomationAction('terminal_focus', { kind: 'pwsh', sessionId: 'pwsh_1' })).toEqual({ session: { id: 'pwsh_1', kind: 'pwsh' }, message: 'focused' });
    expect(await core.executeAutomationAction('terminal_type', { kind: 'cmd', sessionId: 'cmd_1', text: 'echo hi' })).toEqual({ session: { id: 'cmd_1', kind: 'cmd' }, text: 'echo hi' });
    expect(await core.executeAutomationAction('terminal_exec', { kind: 'pwsh', sessionId: 'pwsh_1', command: 'Get-Location' })).toEqual({ session: { id: 'pwsh_1', kind: 'pwsh' }, command: 'Get-Location', ok: true });
    expect(await core.executeAutomationAction('terminal_close', { kind: 'cmd', sessionId: 'cmd_1' })).toEqual({ session: { id: 'cmd_1', kind: 'cmd' }, closed: true });
    expect(await core.executeAutomationAction('focus_window', { windowTitle: 'Explorer' })).toEqual({ focused: { windowTitle: 'Explorer', processName: undefined } });
    expect(await core.executeAutomationAction('show_window', { windowHandle: 12 })).toBe('show 12');
    expect(await core.executeAutomationAction('hide_window', { windowHandle: 12 })).toBe('hide 12');
    expect(await core.executeAutomationAction('close_window', { windowHandle: 12 })).toBe('close 12');
    expect(await core.executeAutomationAction('drag_window_move', { windowHandle: 12, x: 20, y: 30 })).toEqual({ draggedMove: [12, 20, 30] });
    expect(await core.executeAutomationAction('drag_window_resize', { windowHandle: 12, width: 640, height: 480 })).toEqual({ draggedResize: [12, 640, 480] });
    expect(await core.executeAutomationAction('trace_start', { name: 'owned-trace', ownerSessionId: 'client_session_1' })).toEqual({ id: 'trace_1', name: 'owned-trace' });
    expect(await core.executeAutomationAction('trajectory_start', { name: 'owned-trajectory', ownerSessionId: 'client_session_1' })).toEqual({ id: 'trajectory_1', name: 'owned-trajectory' });
    expect(await core.executeCMDAction('cmd_tabs', {})).toEqual({ sessions: [], count: 0 });
    expect(await core.executeCMDAction('cmd_find', { titleQuery: 'sidofun' })).toEqual({ sessions: [{ id: 'match:sidofun' }], count: 1 });
    expect(await core.executeCMDAction('cmd_focus', { sessionId: 's1' })).toEqual({ session: { id: 's1' }, message: 'Focused session: s1' });
    expect(await core.executeCMDAction('cmd_activate_by_title', { titleQuery: 'sidofun' })).toEqual({ session: { id: 'match:sidofun' }, message: 'Activated sidofun' });
    expect(await core.executeCMDAction('cmd_exec', { sessionId: 's1', command: 'dir', wait: true })).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        kind: 'desktop',
        payload: { type: 'move_window', windowHandle: 12, x: 5, y: 7 }
      },
      {
        kind: 'desktop',
        payload: { type: 'screenshot_raw', format: 'png', filename: undefined, returnBase64: false }
      },
      {
        kind: 'cmd',
        payload: { sessionId: 's1', command: 'dir', options: { wait: true, timeout: undefined, screenshot: undefined } }
      }
    ]);
    expect(ownedResources).toEqual([
      { sessionId: 'client_session_1', resource: { type: 'desktop_scope', id: 'desktop_scope_1', metadata: undefined } },
      { sessionId: 'client_session_1', resource: { type: 'trace', id: 'trace_1' } },
      { sessionId: 'client_session_1', resource: { type: 'trajectory', id: 'trajectory_1' } }
    ]);
  });
});
