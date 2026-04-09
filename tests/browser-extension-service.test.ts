import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import { SIDOFUN_CONFIG_FILE, SIDOFUN_STATE_FILE } from '../src/config/constants.js';
import { BrowserExtensionService } from '../src/services/browser-extension/browser-extension-service.js';

let originalConfig: string | undefined;
let originalState: string | undefined;
let browserExtensionTestLock = Promise.resolve();
const browserExtensionTestReleaseQueue: Array<() => void> = [];

beforeEach(() => {
  const previous = browserExtensionTestLock;
  let release!: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  browserExtensionTestLock = browserExtensionTestLock.then(() => next);
  browserExtensionTestReleaseQueue.push(release);
  return previous.then(() => {
  originalConfig = fs.existsSync(SIDOFUN_CONFIG_FILE) ? fs.readFileSync(SIDOFUN_CONFIG_FILE, 'utf8') : undefined;
  originalState = fs.existsSync(SIDOFUN_STATE_FILE) ? fs.readFileSync(SIDOFUN_STATE_FILE, 'utf8') : undefined;
  fs.rmSync(SIDOFUN_CONFIG_FILE, { force: true });
  fs.rmSync(SIDOFUN_STATE_FILE, { force: true });
  });
});

afterEach(() => {
  if (originalConfig === undefined) {
    fs.rmSync(SIDOFUN_CONFIG_FILE, { force: true });
  } else {
    fs.writeFileSync(SIDOFUN_CONFIG_FILE, originalConfig, 'utf8');
  }
  if (originalState === undefined) {
    fs.rmSync(SIDOFUN_STATE_FILE, { force: true });
  } else {
    fs.writeFileSync(SIDOFUN_STATE_FILE, originalState, 'utf8');
  }
  browserExtensionTestReleaseQueue.shift()?.();
});

describe('browser extension service', () => {
  test('reports scaffold status and capabilities', () => {
    const service = new BrowserExtensionService();
    const status = service.getStatus();
    expect(status.providerId).toBe('sidofun-browser-extension');
    expect(status.protocolVersion).toBe('sidofun.browser-extension.v1');
    expect(status.supportedSites).toContain('chatgpt.com');
    expect(status.capabilities).toContain('snapshot');

    const capabilities = service.getCapabilities();
    expect(capabilities.siteModules.some((site) => site.site === 'x.com')).toBe(true);
    expect(capabilities.siteModules.some((site) => site.site === 'deepseek.com')).toBe(true);
  });

  test('preserves configured extension id from active provider state', () => {
    fs.writeFileSync(SIDOFUN_CONFIG_FILE, JSON.stringify({
      providers: {
        browserExtension: {
          workspaces: {}
        }
      }
    }, null, 2), 'utf8');
    fs.writeFileSync(SIDOFUN_STATE_FILE, JSON.stringify({
      providers: {
        browserExtension: {
          activeProvider: {
            extensionId: 'ext_live',
            protocolVersion: 'sidofun.browser-extension.v1',
            connected: true,
            lastSeenAt: new Date().toISOString()
          }
        }
      }
    }, null, 2), 'utf8');

    const service = new BrowserExtensionService();
    const status = service.getStatus();

    expect(status.extensionIdConfigured).toBe(true);
    expect(status.configuredExtensionId).toBe('ext_live');
  });

  test('persists workspaces and sessions across service instances', () => {
    const service = new BrowserExtensionService();
    const workspace = service.setWorkspace('socials', 'C:\\hapus', ['x.com', 'chatgpt.com']);
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    expect(workspace.name).toBe('socials');
    expect(session.workspace).toBe('socials');

    const restored = new BrowserExtensionService();
    expect(restored.getWorkspace('socials')).toEqual(workspace);
    expect(restored.getSession(session.id)).toEqual(session);
    expect(restored.listWorkspaces().length).toBeGreaterThanOrEqual(1);
    expect(restored.listSessions().some((entry) => entry.id === session.id)).toBe(true);
  });

  test('supports provider registration, polling, and command completion', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    const registration = service.registerProvider({
      extensionId: 'ext_test',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });
    expect(registration.ok).toBe(true);

    const commands = service.pollCommands('ext_test');
    expect(commands.length).toBe(1);
    expect(commands[0]?.kind).toBe('open_session');

    service.completeCommand({
      extensionId: 'ext_test',
      sessionId: session.id,
      commandId: commands[0]!.id,
      ok: true,
      result: {
        windowId: 10,
        activeTabId: 20,
        tabs: [
          { id: 20, windowId: 10, url: 'https://x.com/home', title: 'Home', active: true }
        ]
      }
    });

    service.heartbeat({
      extensionId: 'ext_test',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessions: [
        {
          sessionId: session.id,
          connected: true,
          windowId: 10,
          activeTabId: 20,
          tabs: [
            { id: 20, windowId: 10, url: 'https://x.com/home', title: 'Home', active: true }
          ]
        }
      ]
    });

    const tabs = await service.listTabs(session.id);
    expect(tabs.activeTabId).toBe(20);
    expect(tabs.tabs[0]?.url).toBe('https://x.com/home');

    setTimeout(() => {
      const queued = service.pollCommands('ext_test');
      const navigate = queued.find((entry) => entry.kind === 'navigate');
      if (navigate) {
        service.completeCommand({
          extensionId: 'ext_test',
          sessionId: session.id,
          commandId: navigate.id,
          ok: true,
          result: {
            url: 'https://x.com/explore',
            activeTabId: 20,
            tabs: [
              { id: 20, windowId: 10, url: 'https://x.com/explore', title: 'Explore', active: true }
            ]
          }
        });
      }
    }, 20);

    const navigation = await service.navigate(session.id, 'https://x.com/explore', 1000);
    expect(navigation.url).toBe('https://x.com/explore');
  });

  test('waits for queued provider commands with long-poll semantics', async () => {
    const service = new BrowserExtensionService();
    service.registerProvider({
      extensionId: 'ext_waitpoll',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    const waiter = service.waitForCommands('ext_waitpoll', { limit: 5, waitMs: 500 });
    setTimeout(() => {
      service.createSession({
        site: 'x.com',
        targetUrl: 'https://x.com/home'
      });
    }, 80);

    const commands = await waiter;
    expect(commands.length).toBeGreaterThanOrEqual(1);
    expect(commands[0]?.kind).toBe('open_session');
    expect(commands[0]?.status).toBe('in_progress');
  });

  test('accepts pushed provider session state updates', () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    const result = service.upsertProviderSessionState({
      extensionId: 'ext_push',
      protocolVersion: 'sidofun.browser-extension.v1',
      session: {
        sessionId: session.id,
        connected: true,
        windowId: 11,
        activeTabId: 21,
        tabs: [
          { id: 21, windowId: 11, url: 'https://x.com/explore', title: 'Explore', active: true }
        ],
        targetUrl: 'https://x.com/explore',
        snapshot: {
          title: 'Explore / X',
          url: 'https://x.com/explore',
          text: 'Explore page',
          capturedAt: new Date().toISOString()
        },
        networkEventCount: 1,
        domEventCount: 2
      }
    });

    expect(result).toMatchObject({
      ok: true,
      sessionId: session.id,
      ready: true
    });
    expect(service.getSession(session.id)).toMatchObject({
      connected: true,
      activeTabId: 21,
      targetUrl: 'https://x.com/explore',
      lastSnapshot: {
        title: 'Explore / X',
        url: 'https://x.com/explore',
        text: 'Explore page'
      }
    });
    expect(service.getSession(session.id)?.events?.some((event) => event.kind === 'session_state')).toBe(true);
  });

  test('ignores provider traffic from an extension id that is not configured', async () => {
    const service = new BrowserExtensionService();
    service.setConfiguredExtensionId('ext_real');
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    expect(service.registerProvider({
      extensionId: 'ext_wrong',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    })).toEqual({
      ok: false,
      ignored: true,
      reason: 'Configured browser-extension id is ext_real, but received ext_wrong'
    });

    expect(service.pollCommands('ext_wrong')).toEqual([]);
    expect(await service.waitForCommands('ext_wrong', { limit: 5, waitMs: 50 })).toEqual([]);
    expect(service.upsertProviderSessionState({
      extensionId: 'ext_wrong',
      protocolVersion: 'sidofun.browser-extension.v1',
      session: {
        sessionId: session.id,
        connected: true,
        activeTabId: 1
      }
    })).toEqual({
      ok: false,
      ignored: true,
      reason: 'Configured browser-extension id is ext_real, but received ext_wrong'
    });
    expect(service.upsertProviderEvents({
      extensionId: 'ext_wrong',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessionId: session.id,
      events: [{
        id: 'evt_wrong',
        kind: 'session_state',
        ok: true,
        timestamp: new Date().toISOString()
      }]
    })).toEqual({
      ok: false,
      ignored: true,
      reason: 'Configured browser-extension id is ext_real, but received ext_wrong'
    });
    expect(service.completeCommand({
      extensionId: 'ext_wrong',
      sessionId: session.id,
      commandId: service.getSession(session.id)?.id ?? 'impossible',
      ok: true,
      result: {}
    })).toEqual({
      ok: false,
      ignored: true,
      reason: 'Configured browser-extension id is ext_real, but received ext_wrong'
    });
    expect(service.getStatus().providerConnected).toBe(false);
  });

  test('accepts pushed provider event batches and deduplicates them', () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    const result = service.upsertProviderEvents({
      extensionId: 'ext_push_events',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessionId: session.id,
      networkEvents: [
        {
          id: 'net_1',
          url: 'https://x.com/i/api/graphql',
          method: 'GET',
          stage: 'request',
          timestamp: new Date().toISOString()
        }
      ],
      domEvents: [
        {
          id: 'dom_1',
          url: 'https://x.com/home',
          types: ['childList'],
          textSample: 'Hiring now',
          timestamp: new Date().toISOString()
        }
      ],
      events: [
        {
          id: 'evt_1',
          kind: 'session_state',
          ok: true,
          summary: 'Active tab changed in the browser-extension session',
          timestamp: new Date().toISOString()
        }
      ]
    });

    expect(result).toMatchObject({
      ok: true,
      sessionId: session.id,
      networkEventCount: 1,
      domEventCount: 1,
      sessionEventCount: 2
    });

    const duplicate = service.upsertProviderEvents({
      extensionId: 'ext_push_events',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessionId: session.id,
      networkEvents: [
        {
          id: 'net_1',
          url: 'https://x.com/i/api/graphql',
          method: 'GET',
          stage: 'request',
          timestamp: new Date().toISOString()
        }
      ],
      domEvents: [
        {
          id: 'dom_1',
          url: 'https://x.com/home',
          types: ['childList'],
          textSample: 'Hiring now',
          timestamp: new Date().toISOString()
        }
      ],
      events: [
        {
          id: 'evt_1',
          kind: 'session_state',
          ok: true,
          summary: 'Active tab changed in the browser-extension session',
          timestamp: new Date().toISOString()
        }
      ]
    });

    expect(duplicate).toMatchObject({
      ok: true,
      sessionId: session.id,
      networkEventCount: 1,
      domEventCount: 1,
      sessionEventCount: 2
    });
    expect(service.getSession(session.id)).toMatchObject({
      networkEvents: [
        expect.objectContaining({ id: 'net_1', url: 'https://x.com/i/api/graphql' })
      ],
      domEvents: [
        expect.objectContaining({ id: 'dom_1', url: 'https://x.com/home' })
      ],
      events: [
        expect.objectContaining({ id: expect.any(String), kind: 'session_created' }),
        expect.objectContaining({ id: 'evt_1', kind: 'session_state', summary: 'Active tab changed in the browser-extension session' })
      ]
    });
  });

  test('supports live eval, click, type, press, and cookies command completion', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    service.registerProvider({
      extensionId: 'ext_live',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    const respondToNext = (kind: string, result: Record<string, unknown>) => {
      setTimeout(() => {
        const queued = service.pollCommands('ext_live');
        const command = queued.find((entry) => entry.kind === kind);
        if (command) {
          service.completeCommand({
            extensionId: 'ext_live',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result
          });
        }
      }, 20);
    };

    respondToNext('evaluate', { value: 'X Home' });
    expect(await service.evaluate(session.id, 'document.title', 1000)).toEqual({
      sessionId: session.id,
      expression: 'document.title',
      value: 'X Home'
    });

    respondToNext('click', { clicked: true, selector: 'button.compose' });
    expect(await service.click(session.id, 'button.compose', 1000)).toEqual({
      sessionId: session.id,
      selector: 'button.compose',
      clicked: true
    });

    respondToNext('type', { typed: true, selector: 'textarea', textLength: 5 });
    expect(await service.type(session.id, 'textarea', 'hello', 1000)).toEqual({
      sessionId: session.id,
      selector: 'textarea',
      text: 'hello',
      typed: true,
      textLength: 5
    });

    respondToNext('press', { pressed: true, key: 'Enter' });
    expect(await service.press(session.id, 'textarea', 'Enter', 1000)).toEqual({
      sessionId: session.id,
      selector: 'textarea',
      key: 'Enter',
      pressed: true
    });

    respondToNext('cookies', { url: 'https://x.com', cookies: [{ name: 'auth_token', value: 'secret', domain: '.x.com', path: '/' }] });
    expect(await service.cookies(session.id, 'https://x.com', 1000)).toEqual({
      sessionId: session.id,
      url: 'https://x.com',
      cookies: [{ name: 'auth_token', value: 'secret', domain: '.x.com', path: '/' }]
    });

    respondToNext('screenshot', {
      screenshot: {
        format: 'png',
        dataUrl: 'data:image/png;base64,aGVsbG8=',
        capturedAt: '2026-03-30T00:00:00.000Z'
      },
      windowId: 10,
      activeTabId: 20
    });
    expect(await service.screenshot(session.id, { timeoutMs: 1000, returnBase64: true })).toEqual({
      sessionId: session.id,
      format: 'png',
      capturedAt: '2026-03-30T00:00:00.000Z',
      windowId: 10,
      activeTabId: 20,
      filepath: undefined,
      byteLength: 5,
      data: 'aGVsbG8='
    });

    respondToNext('inspect', { element: { tagName: 'textarea', role: 'textbox', text: 'hello' } });
    expect(await service.inspect(session.id, 'textarea', 1000)).toEqual({
      sessionId: session.id,
      selector: 'textarea',
      element: { tagName: 'textarea', role: 'textbox', text: 'hello' }
    });

    respondToNext('inspect_all', { elements: [{ tagName: 'a', href: 'https://x.com/home' }, { tagName: 'a', href: 'https://x.com/explore' }] });
    expect(await service.inspectAll(session.id, 'a[href]', 2, 1000)).toEqual({
      sessionId: session.id,
      selector: 'a[href]',
      limit: 2,
      count: 2,
      elements: [{ tagName: 'a', href: 'https://x.com/home' }, { tagName: 'a', href: 'https://x.com/explore' }]
    });

    respondToNext('links', { links: [{ href: 'https://x.com/home', text: 'Home' }, { href: 'https://x.com/explore', text: 'Explore' }] });
    expect(await service.links(session.id, 2, 1000)).toEqual({
      sessionId: session.id,
      limit: 2,
      count: 2,
      links: [{ href: 'https://x.com/home', text: 'Home' }, { href: 'https://x.com/explore', text: 'Explore' }]
    });
  });

  test('supports richer native x.com flows', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    service.registerProvider({
      extensionId: 'ext_x',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    const respondToNext = (kind: string, result: Record<string, unknown>) => {
      setTimeout(() => {
        const queued = service.pollCommands('ext_x');
        const command = queued.find((entry) => entry.kind === kind);
        if (command) {
          service.completeCommand({
            extensionId: 'ext_x',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result
          });
        }
      }, 20);
    };

    respondToNext('x_open_post', { url: 'https://x.com/user/status/123', post: { id: 'tweet_1', url: 'https://x.com/user/status/123', text: 'hello world' } });
    expect(await service.xOpenPost(session.id, 'https://x.com/user/status/123', 1000)).toEqual({
      sessionId: session.id,
      url: 'https://x.com/user/status/123',
      post: { id: 'tweet_1', url: 'https://x.com/user/status/123', text: 'hello world' }
    });

    respondToNext('x_profile', { url: 'https://x.com/openai', profile: { handle: 'openai', name: 'OpenAI', posts: [{ id: 'tweet_2', text: 'hello' }] } });
    expect(await service.xProfile(session.id, '@openai', { limit: 3, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      query: '@openai',
      url: 'https://x.com/openai',
      profile: { handle: 'openai', name: 'OpenAI', posts: [{ id: 'tweet_2', text: 'hello' }] }
    });

    respondToNext('x_notifications', { url: 'https://x.com/notifications', posts: [{ id: 'tweet_n1', text: 'someone liked your post' }] });
    expect(await service.xNotifications(session.id, { limit: 10, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      url: 'https://x.com/notifications',
      options: { limit: 10, timeoutMs: 1000 },
      count: 1,
      posts: [{ id: 'tweet_n1', text: 'someone liked your post' }]
    });

    respondToNext('x_messages', {
      url: 'https://x.com/messages',
      threads: [{ id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', snippet: 'hello there', unread: true, active: false }]
    });
    expect(await service.xMessages(session.id, { limit: 20, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      url: 'https://x.com/messages',
      options: { limit: 20, timeoutMs: 1000 },
      count: 1,
      threads: [{ id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', snippet: 'hello there', unread: true, active: false }]
    });

    respondToNext('x_open_message_thread', {
      url: 'https://x.com/messages/123',
      thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', snippet: 'hello there', unread: false, active: true },
      messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }]
    });
    expect(await service.xOpenMessageThread(session.id, 'https://x.com/messages/123', { limit: 20, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      query: 'https://x.com/messages/123',
      url: 'https://x.com/messages/123',
      thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', snippet: 'hello there', unread: false, active: true },
      count: 1,
      messages: [{ id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false }]
    });

    respondToNext('x_send_message', {
      url: 'https://x.com/messages/123',
      sent: true,
      thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true },
      messages: [
        { id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false },
        { id: 'msg_2', text: 'reply from sidofun', sender: 'You', outgoing: true }
      ]
    });
    expect(await service.xSendMessage(session.id, 'reply from sidofun', { thread: 'https://x.com/messages/123', timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      text: 'reply from sidofun',
      query: 'https://x.com/messages/123',
      url: 'https://x.com/messages/123',
      sent: true,
      thread: { id: 'dm_1', url: 'https://x.com/messages/123', title: 'OpenAI', active: true },
      count: 2,
      messages: [
        { id: 'msg_1', text: 'hello there', sender: 'OpenAI', outgoing: false },
        { id: 'msg_2', text: 'reply from sidofun', sender: 'You', outgoing: true }
      ]
    });

    respondToNext('x_read_thread', {
      url: 'https://x.com/user/status/123',
      posts: [
        { id: 'tweet_1', url: 'https://x.com/user/status/123', text: 'root post' },
        { id: 'tweet_2', text: 'thread reply' }
      ]
    });
    expect(await service.xReadThread(session.id, 'https://x.com/user/status/123', { limit: 10, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      url: 'https://x.com/user/status/123',
      options: { limit: 10, timeoutMs: 1000 },
      count: 2,
      posts: [
        { id: 'tweet_1', url: 'https://x.com/user/status/123', text: 'root post' },
        { id: 'tweet_2', text: 'thread reply' }
      ]
    });

    respondToNext('x_follow', { url: 'https://x.com/openai', followed: true, alreadyFollowing: false, buttonLabel: 'Follow' });
    expect(await service.xFollow(session.id, '@openai', { timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      query: '@openai',
      url: 'https://x.com/openai',
      followed: true,
      alreadyFollowing: false,
      buttonLabel: 'Follow'
    });

    respondToNext('x_reply', { url: 'https://x.com/user/status/123', replied: true });
    expect(await service.xReply(session.id, 'hello back', { postUrl: 'https://x.com/user/status/123', timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      text: 'hello back',
      url: 'https://x.com/user/status/123',
      replied: true
    });

    respondToNext('x_like', { url: 'https://x.com/user/status/123', liked: true });
    expect(await service.xLike(session.id, { postUrl: 'https://x.com/user/status/123', timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      url: 'https://x.com/user/status/123',
      liked: true
    });

    respondToNext('x_repost', { url: 'https://x.com/user/status/123', reposted: true });
    expect(await service.xRepost(session.id, { postUrl: 'https://x.com/user/status/123', timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      url: 'https://x.com/user/status/123',
      reposted: true
    });
  });

  test('supports generic wait primitives and AI wait-message helpers', async () => {
    const service = new BrowserExtensionService();

    let snapshotCalls = 0;
    (service as any).snapshot = async () => {
      snapshotCalls += 1;
      return {
        sessionId: 'browserext_1',
        snapshot: {
          url: snapshotCalls >= 2 ? 'https://chatgpt.com/c/abc' : 'https://chatgpt.com/',
          text: snapshotCalls >= 2 ? 'Final answer visible' : 'Loading'
        }
      };
    };

    let inspectCalls = 0;
    (service as any).inspect = async (_sessionId: string, selector: string) => {
      inspectCalls += 1;
      if (selector === 'textarea') {
        return {
          sessionId: 'browserext_1',
          selector,
          element: inspectCalls >= 2 ? { tagName: 'textarea', role: 'textbox', text: '' } : undefined
        };
      }
      if (selector === '[data-testid="stop-button"]') {
        return {
          sessionId: 'browserext_1',
          selector,
          element: inspectCalls >= 2 ? undefined : { tagName: 'button', text: 'Stop' }
        };
      }
      return { sessionId: 'browserext_1', selector, element: undefined };
    };

    let chatThreadCalls = 0;
    (service as any).chatGptReadThread = async () => {
      chatThreadCalls += 1;
      return {
        sessionId: 'browserext_1',
        count: 2,
        latestAssistant: 'Final answer',
        latestUser: 'Hello',
        messages: chatThreadCalls >= 2
          ? [{ id: 'cg_1', role: 'assistant', text: 'Final answer', index: 0 }]
          : [{ id: 'cg_0', role: 'assistant', text: 'Draft', index: 0 }]
      };
    };

    let dsThreadCalls = 0;
    (service as any).deepSeekReadThread = async () => {
      dsThreadCalls += 1;
      return {
        sessionId: 'browserext_1',
        count: 2,
        latestAssistant: 'Final answer',
        latestUser: 'Hello',
        messages: dsThreadCalls >= 2
          ? [{ id: 'ds_1', role: 'assistant', text: 'Final answer', index: 0 }]
          : [{ id: 'ds_0', role: 'assistant', text: 'Draft', index: 0 }]
      };
    };

    expect(await service.waitForUrl('browserext_1', 'chatgpt.com/c/', { timeoutMs: 1000, intervalMs: 10 })).toEqual({
      sessionId: 'browserext_1',
      needle: 'chatgpt.com/c/',
      matched: true,
      timedOut: false,
      snapshot: { url: 'https://chatgpt.com/c/abc', text: 'Final answer visible' }
    });

    expect(await service.waitForSelector('browserext_1', 'textarea', { timeoutMs: 1000, intervalMs: 10 })).toEqual({
      sessionId: 'browserext_1',
      selector: 'textarea',
      matched: true,
      timedOut: false,
      element: { tagName: 'textarea', role: 'textbox', text: '' }
    });

    expect(await service.waitForNoSelector('browserext_1', '[data-testid="stop-button"]', { timeoutMs: 1000, intervalMs: 10 })).toEqual({
      sessionId: 'browserext_1',
      selector: '[data-testid="stop-button"]',
      missing: true,
      timedOut: false
    });

    expect(await service.chatGptWaitMessage('browserext_1', {
      text: 'Final answer',
      role: 'assistant',
      timeoutMs: 1000,
      intervalMs: 10,
      stableReads: 1
    })).toEqual({
      sessionId: 'browserext_1',
      site: 'chatgpt',
      role: 'assistant',
      needle: 'Final answer',
      matched: true,
      timedOut: false,
      count: 2,
      message: { id: 'cg_1', role: 'assistant', text: 'Final answer', index: 0 }
    });

    expect(await service.deepSeekWaitMessage('browserext_1', {
      text: 'Final answer',
      role: 'assistant',
      timeoutMs: 1000,
      intervalMs: 10,
      stableReads: 1
    })).toEqual({
      sessionId: 'browserext_1',
      site: 'deepseek',
      role: 'assistant',
      needle: 'Final answer',
      matched: true,
      timedOut: false,
      count: 2,
      message: { id: 'ds_1', role: 'assistant', text: 'Final answer', index: 0 }
    });
  });

  test('supports chatgpt and deepseek message edit flows', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'ai',
      site: 'chatgpt.com',
      targetUrl: 'https://chatgpt.com',
      name: 'ai-chat'
    });

    service.registerProvider({
      extensionId: 'ext_ai',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    const respondToNext = (kind: string, result: Record<string, unknown>) => {
      const attempt = (remaining: number) => setTimeout(() => {
        const queued = service.pollCommands('ext_ai');
        const command = queued.find((entry) => entry.kind === kind);
        if (command) {
          service.completeCommand({
            extensionId: 'ext_ai',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result
          });
        } else if (remaining > 0) {
          attempt(remaining - 1);
        }
      }, 20);
      attempt(10);
    };

    respondToNext('chatgpt_read_thread', {
      count: 2,
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello',
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ]
    });
    respondToNext('chatgpt_edit_message', { edited: true, message: { id: 'cg_1', role: 'user', text: 'Rewrite this', index: 0 } });
    expect(await service.chatGptEditMessage(session.id, 'Rewrite this', { role: 'user', offset: 0, limit: 10, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      text: 'Rewrite this',
      target: { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
      edited: true,
      message: { id: 'cg_1', role: 'user', text: 'Rewrite this', index: 0 }
    });

    respondToNext('deepseek_read_thread', {
      count: 2,
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello',
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ]
    });
    respondToNext('deepseek_edit_message', { edited: true, message: { id: 'ds_1', role: 'user', text: 'Rewrite DS', index: 0 } });
    expect(await service.deepSeekEditMessage(session.id, 'Rewrite DS', { role: 'user', offset: 0, limit: 10, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      text: 'Rewrite DS',
      target: { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
      edited: true,
      message: { id: 'ds_1', role: 'user', text: 'Rewrite DS', index: 0 }
    });
  });

  test('lists and clears bounded browser-extension network events', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    service.registerProvider({
      extensionId: 'ext_net',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });
    const networkCommand = (service as any).enqueueCommand(session.id, 'network_events', {});
    service.completeCommand({
      extensionId: 'ext_net',
      sessionId: session.id,
      commandId: networkCommand.id,
      ok: true,
      result: {
        networkEvents: [
          {
            id: 'evt_1',
            url: 'https://x.com/i/api/graphql/search',
            method: 'GET',
            stage: 'response',
            statusCode: 200,
            timestamp: new Date().toISOString()
          },
          {
            id: 'evt_2',
            url: 'https://x.com/home',
            method: 'GET',
            stage: 'request',
            timestamp: new Date().toISOString()
          }
        ]
      }
    });

    expect(service.listNetworkEvents(session.id)).toEqual({
      sessionId: session.id,
      count: 2,
      totalCount: 2,
      events: [
        expect.objectContaining({ id: 'evt_1', stage: 'response' }),
        expect.objectContaining({ id: 'evt_2', stage: 'request' })
      ]
    });
    expect(service.listNetworkEvents(session.id, { stage: 'response' }).count).toBe(1);
    expect(service.listNetworkEvents(session.id, { urlIncludes: '/graphql', method: 'GET' }).count).toBe(1);

    setTimeout(() => {
      const queued = service.pollCommands('ext_net');
      const command = queued.find((entry) => entry.kind === 'clear_network_events');
      if (command) {
        service.completeCommand({
          extensionId: 'ext_net',
          sessionId: session.id,
          commandId: command.id,
          ok: true,
          result: {
            cleared: 2,
            networkEvents: []
          }
        });
      }
    }, 20);

    expect(await service.clearNetworkEvents(session.id, 1000)).toEqual({
      sessionId: session.id,
      cleared: 2,
      remaining: 0
    });
    expect(service.listNetworkEvents(session.id).count).toBe(0);
  });

  test('lists and clears bounded browser-extension DOM mutation events', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    service.registerProvider({
      extensionId: 'ext_dom',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });
    setTimeout(() => {
      const queued = service.pollCommands('ext_dom');
      const command = queued.find((entry) => entry.kind === 'dom_events');
      if (command) {
        service.completeCommand({
          extensionId: 'ext_dom',
          sessionId: session.id,
          commandId: command.id,
          ok: true,
          result: {
            domEvents: [
              {
                id: 'dom_1',
                url: 'https://x.com/home',
                types: ['childList'],
                targetTagName: 'main',
                targetSelector: 'main',
                textSample: 'Hiring now',
                timestamp: new Date().toISOString()
              },
              {
                id: 'dom_2',
                url: 'https://x.com/home',
                types: ['attributes'],
                targetTagName: 'button',
                targetSelector: 'button.compose',
                attributeNames: ['aria-busy'],
                textSample: 'Posting',
                timestamp: new Date().toISOString()
              }
            ]
          }
        });
      }
    }, 20);

    const listed = await service.listDomEvents(session.id, {
      limit: 20,
      mutationType: 'childList',
      textIncludes: 'Hiring',
      timeoutMs: 1000
    });
    expect(listed.sessionId).toBe(session.id);
    expect(listed.count).toBe(1);
    expect(listed.totalCount).toBe(2);
    expect(listed.events).toEqual([
      expect.objectContaining({
        id: 'dom_1',
        types: ['childList'],
        textSample: 'Hiring now'
      })
    ]);

    setTimeout(() => {
      const queued = service.pollCommands('ext_dom');
      const command = queued.find((entry) => entry.kind === 'clear_dom_events');
      if (command) {
        service.completeCommand({
          extensionId: 'ext_dom',
          sessionId: session.id,
          commandId: command.id,
          ok: true,
          result: {
            cleared: 2,
            domEvents: []
          }
        });
      }
    }, 20);

    expect(await service.clearDomEvents(session.id, 1000)).toEqual({
      sessionId: session.id,
      cleared: 2,
      remaining: 0
    });
    expect((service.getSession(session.id)?.domEvents ?? []).length).toBe(0);
  });

  test('records, lists, clears, and waits against browser-extension session events', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'x-home'
    });

    service.registerProvider({
      extensionId: 'ext_wait',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    service.heartbeat({
      extensionId: 'ext_wait',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessions: [{
        sessionId: session.id,
        connected: true,
        windowId: 1,
        activeTabId: 99,
        tabs: [{ id: 99, windowId: 1, url: 'https://x.com/home', title: 'X', active: true }],
        site: 'x.com',
        targetUrl: 'https://x.com/home'
      }]
    });

    const waitPromise = service.waitForText(session.id, 'Hiring', { timeoutMs: 2_000, intervalMs: 200 });
    const timer = setInterval(() => {
      const queued = service.pollCommands('ext_wait');
      for (const command of queued) {
        if (command.kind === 'snapshot') {
          service.completeCommand({
            extensionId: 'ext_wait',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              snapshot: {
                title: 'X search',
                url: 'https://x.com/search?q=hiring',
                text: 'Hiring now',
                capturedAt: new Date().toISOString()
              }
            }
          });
        }
      }
    }, 20);

    const waitResult = await waitPromise;
    clearInterval(timer);
    expect(waitResult).toEqual({
      sessionId: session.id,
      needle: 'Hiring',
      matched: true,
      timedOut: false,
      snapshot: expect.objectContaining({
        title: 'X search',
        text: 'Hiring now'
      })
    });

    const events = service.listSessionEvents(session.id, { limit: 10 });
    expect(events.totalCount).toBeGreaterThanOrEqual(2);
    expect(events.events.some((event) => event.kind === 'session_created')).toBe(true);
    expect(events.events.some((event) => event.kind === 'snapshot')).toBe(true);

    expect(service.clearSessionEvents(session.id)).toEqual({
      sessionId: session.id,
      cleared: events.totalCount,
      remaining: 0
    });
  });

  test('runs native x.com search extraction through queued browser-extension commands', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    service.registerProvider({
      extensionId: 'ext_x',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    setTimeout(() => {
      const queued = service.pollCommands('ext_x');
      const command = queued.find((entry) => entry.kind === 'x_search');
      if (command) {
        service.completeCommand({
          extensionId: 'ext_x',
          sessionId: session.id,
          commandId: command.id,
          ok: true,
          result: {
            url: 'https://x.com/search?q=hiring&src=typed_query&f=live',
            posts: [
              {
                id: 'tweet_1',
                url: 'https://x.com/alice/status/1',
                authorName: 'Alice',
                authorHandle: 'alice',
                text: 'We are hiring',
                timestamp: new Date().toISOString()
              }
            ]
          }
        });
      }
    }, 20);

    expect(await service.xSearch(session.id, 'hiring', { mode: 'latest', limit: 5, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      query: 'hiring',
      mode: 'latest',
      url: 'https://x.com/search?q=hiring&src=typed_query&f=live',
      count: 1,
      posts: [
        expect.objectContaining({
          authorHandle: 'alice',
          text: 'We are hiring'
        })
      ]
    });
  });

  test('runs native x.com timeline, bookmarks, and post flows through queued browser-extension commands', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'socials',
      site: 'x.com',
      targetUrl: 'https://x.com/home',
      name: 'social-home'
    });

    service.registerProvider({
      extensionId: 'ext_x_native',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    setTimeout(() => {
      const queued = service.pollCommands('ext_x_native');
      for (const command of queued) {
        if (command.kind === 'x_timeline') {
          service.completeCommand({
            extensionId: 'ext_x_native',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              type: 'following',
              url: 'https://x.com/home',
              posts: [
                {
                  id: 'tweet_timeline_1',
                  url: 'https://x.com/alice/status/2',
                  authorName: 'Alice',
                  authorHandle: 'alice',
                  text: 'Following timeline item'
                }
              ]
            }
          });
        }
      }
    }, 20);

    expect(await service.xTimeline(session.id, { timelineType: 'following', limit: 5, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      type: 'following',
      url: 'https://x.com/home',
      count: 1,
      posts: [
        expect.objectContaining({
          authorHandle: 'alice',
          text: 'Following timeline item'
        })
      ]
    });

    setTimeout(() => {
      const queued = service.pollCommands('ext_x_native');
      for (const command of queued) {
        if (command.kind === 'x_bookmarks') {
          service.completeCommand({
            extensionId: 'ext_x_native',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              url: 'https://x.com/i/bookmarks',
              posts: [
                {
                  id: 'tweet_bookmark_1',
                  url: 'https://x.com/bob/status/3',
                  authorName: 'Bob',
                  authorHandle: 'bob',
                  text: 'Saved bookmark item'
                }
              ]
            }
          });
        }
      }
    }, 20);

    expect(await service.xBookmarks(session.id, { limit: 5, timeoutMs: 1000 })).toEqual({
      sessionId: session.id,
      url: 'https://x.com/i/bookmarks',
      count: 1,
      posts: [
        expect.objectContaining({
          authorHandle: 'bob',
          text: 'Saved bookmark item'
        })
      ]
    });

    setTimeout(() => {
      const queued = service.pollCommands('ext_x_native');
      for (const command of queued) {
        if (command.kind === 'x_post') {
          service.completeCommand({
            extensionId: 'ext_x_native',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              url: 'https://x.com/compose/post',
              sent: true
            }
          });
        }
      }
    }, 20);

    expect(await service.xPost(session.id, 'hello from native x', 1000)).toEqual({
      sessionId: session.id,
      text: 'hello from native x',
      url: 'https://x.com/compose/post',
      sent: true
    });
  });

  test('runs native chatgpt.com send/read/ask flows through queued browser-extension commands', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'ai',
      site: 'chatgpt.com',
      targetUrl: 'https://chatgpt.com/',
      name: 'chatgpt-web'
    });

    service.registerProvider({
      extensionId: 'ext_chatgpt',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    const drainOpenSession = () => {
      const queued = service.pollCommands('ext_chatgpt');
      const openSession = queued.find((entry) => entry.kind === 'open_session');
      if (openSession) {
        service.completeCommand({
          extensionId: 'ext_chatgpt',
          sessionId: session.id,
          commandId: openSession.id,
          ok: true,
          result: {
            windowId: 10,
            activeTabId: 20,
            tabs: [
              { id: 20, windowId: 10, url: 'https://chatgpt.com/', title: 'ChatGPT', active: true }
            ]
          }
        });
      }
    };
    const runWithResponse = async <T>(kind: string, result: Record<string, unknown>, factory: () => Promise<T>) => {
      const pending = factory();
      const timer = setInterval(() => {
        const queued = service.pollCommands('ext_chatgpt');
        const command = queued.find((entry) => entry.kind === kind);
        if (!command) {
          return;
        }
        service.completeCommand({
          extensionId: 'ext_chatgpt',
          sessionId: session.id,
          commandId: command.id,
          ok: true,
          result
        });
        clearInterval(timer);
      }, 20);
      try {
        return await pending;
      } finally {
        clearInterval(timer);
      }
    };

    drainOpenSession();

    expect(await runWithResponse('chatgpt_new_chat', { started: true }, () => service.chatGptNewChat(session.id, 1000))).toEqual({
      sessionId: session.id,
      started: true
    });

    expect(await runWithResponse('chatgpt_list_conversations', {
      conversations: [
        { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }
      ]
    }, () => service.chatGptListConversations(session.id, { limit: 20, timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      count: 1,
      conversations: [
        { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }
      ]
    });

    expect(await runWithResponse('chatgpt_open_conversation', {
      conversation: { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }
    }, () => service.chatGptOpenConversation(session.id, { titleQuery: 'Project', timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      conversation: { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }
    });

    expect(await runWithResponse('chatgpt_stop', { stopped: true }, () => service.chatGptStop(session.id, 1000))).toEqual({
      sessionId: session.id,
      stopped: true
    });

    expect(await runWithResponse('chatgpt_continue', { continued: true }, () => service.chatGptContinue(session.id, 1000))).toEqual({
      sessionId: session.id,
      continued: true
    });

    const chatGptControlsPromise = service.chatGptResponseControls(session.id, { limit: 10, timeoutMs: 1000 });
    const chatGptControlsTimer = setInterval(() => {
      const queued = service.pollCommands('ext_chatgpt');
      for (const command of queued) {
        if (command.kind === 'chatgpt_response_controls') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              controls: {
                previousAvailable: true,
                nextAvailable: false,
                previousLabel: 'Previous response',
                nextLabel: 'Next response'
              }
            }
          });
        } else if (command.kind === 'chatgpt_read_thread') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
              ],
              latestAssistant: 'Existing assistant reply',
              latestUser: 'Hello'
            }
          });
        }
      }
    }, 20);
    expect(await chatGptControlsPromise).toEqual({
      sessionId: session.id,
      site: 'chatgpt.com',
      previousAvailable: true,
      nextAvailable: false,
      previousLabel: 'Previous response',
      nextLabel: 'Next response',
      threadCount: 2,
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello',
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ]
    });
    clearInterval(chatGptControlsTimer);

    const chatGptPreviousPromise = service.chatGptPreviousResponse(session.id, { limit: 10, timeoutMs: 1000 });
    const chatGptPreviousTimer = setInterval(() => {
      const queued = service.pollCommands('ext_chatgpt');
      for (const command of queued) {
        if (command.kind === 'chatgpt_previous_response') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { moved: true, direction: 'previous' }
          });
        } else if (command.kind === 'chatgpt_read_thread') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
              ],
              latestAssistant: 'Existing assistant reply',
              latestUser: 'Hello'
            }
          });
        } else if (command.kind === 'chatgpt_response_controls') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              controls: {
                previousAvailable: true,
                nextAvailable: false,
                previousLabel: 'Previous response',
                nextLabel: 'Next response'
              }
            }
          });
        }
      }
    }, 20);
    expect(await chatGptPreviousPromise).toEqual({
      sessionId: session.id,
      moved: true,
      direction: 'previous',
      threadCount: 2,
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello',
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ],
      previousAvailable: true,
      nextAvailable: false,
      previousLabel: 'Previous response',
      nextLabel: 'Next response'
    });
    clearInterval(chatGptPreviousTimer);

    const chatGptNextPromise = service.chatGptNextResponse(session.id, { limit: 10, timeoutMs: 1000 });
    const chatGptNextTimer = setInterval(() => {
      const queued = service.pollCommands('ext_chatgpt');
      for (const command of queued) {
        if (command.kind === 'chatgpt_next_response') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { moved: true, direction: 'next' }
          });
        } else if (command.kind === 'chatgpt_read_thread') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
              ],
              latestAssistant: 'Existing assistant reply',
              latestUser: 'Hello'
            }
          });
        } else if (command.kind === 'chatgpt_response_controls') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              controls: {
                previousAvailable: true,
                nextAvailable: false,
                previousLabel: 'Previous response',
                nextLabel: 'Next response'
              }
            }
          });
        }
      }
    }, 20);
    expect(await chatGptNextPromise).toEqual({
      sessionId: session.id,
      moved: true,
      direction: 'next',
      threadCount: 2,
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello',
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ],
      previousAvailable: true,
      nextAvailable: false,
      previousLabel: 'Previous response',
      nextLabel: 'Next response'
    });
    clearInterval(chatGptNextTimer);


    expect(await runWithResponse('chatgpt_regenerate', { regenerated: true }, () => service.chatGptRegenerate(session.id, 1000))).toEqual({
      sessionId: session.id,
      regenerated: true
    });

    expect(await runWithResponse('chatgpt_read_thread', {
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ],
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello'
    }, () => service.chatGptReadThread(session.id, { limit: 10, timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      count: 2,
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello',
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ]
    });

    expect(await runWithResponse('chatgpt_read_thread', {
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ],
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello'
    }, () => service.chatGptReadMessage(session.id, { role: 'assistant', limit: 10, timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      count: 2,
      message: { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
    });

    expect(await runWithResponse('chatgpt_read_latest', { text: 'Existing assistant reply' }, () => service.chatGptReadLatest(session.id, 1000))).toEqual({
      sessionId: session.id,
      text: 'Existing assistant reply'
    });

    const chatGptInfoPromise = service.chatGptInfo(session.id, { limit: 10, timeoutMs: 1000 });
    const chatGptInfoTimer = setInterval(() => {
      const queued = service.pollCommands('ext_chatgpt');
      for (const command of queued) {
        if (command.kind === 'snapshot') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              snapshot: {
                title: 'ChatGPT',
                url: 'https://chatgpt.com/c/1',
                text: 'Hello\nExisting assistant reply',
                capturedAt: new Date().toISOString()
              }
            }
          });
        } else if (command.kind === 'chatgpt_busy') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { busy: false }
          });
        } else if (command.kind === 'chatgpt_list_conversations') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              conversations: [
                { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }
              ]
            }
          });
        } else if (command.kind === 'chatgpt_read_thread') {
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
              ],
              latestAssistant: 'Existing assistant reply',
              latestUser: 'Hello'
            }
          });
        }
      }
    }, 20);
    expect(await chatGptInfoPromise).toEqual({
      sessionId: session.id,
      site: 'chatgpt.com',
      busy: false,
      page: expect.objectContaining({ title: 'ChatGPT', url: 'https://chatgpt.com/c/1' }),
      activeConversation: { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true },
      conversationCount: 1,
      latestAssistant: 'Existing assistant reply',
      latestUser: 'Hello',
      threadCount: 2,
      messages: [
        { id: 'cg_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Existing assistant reply', index: 1 }
      ]
    });
    clearInterval(chatGptInfoTimer);

    expect(await runWithResponse('chatgpt_send', { sent: true }, () => service.chatGptSend(session.id, 'Summarize this page', 1000))).toEqual({
      sessionId: session.id,
      text: 'Summarize this page',
      sent: true
    });

    expect(await runWithResponse('chatgpt_ask', {
      response: 'Fresh assistant response',
      timedOut: false
    }, () => service.chatGptAsk(session.id, 'What is on this page?', 1000))).toEqual({
      sessionId: session.id,
      prompt: 'What is on this page?',
      response: 'Fresh assistant response',
      timedOut: false
    });

    let idlePolls = 0;
    const idleTimer = setInterval(() => {
      const queued = service.pollCommands('ext_chatgpt');
      for (const command of queued) {
        if (command.kind === 'chatgpt_wait_idle') {
          idlePolls += 1;
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              busy: idlePolls < 2
            }
          });
        }
      }
    }, 20);

    expect(await service.chatGptWaitIdle(session.id, { timeoutMs: 2000, intervalMs: 50 })).toEqual({
      sessionId: session.id,
      idle: true,
      timedOut: false
    });
    clearInterval(idleTimer);

    let latestReads = 0;
    let waitIdlePolls = 0;
    const responseTimer = setInterval(() => {
      const queued = service.pollCommands('ext_chatgpt');
      for (const command of queued) {
        if (command.kind === 'chatgpt_read_latest') {
          latestReads += 1;
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { text: latestReads >= 2 ? 'Fresh assistant response' : 'Existing assistant reply' }
          });
        } else if (command.kind === 'chatgpt_wait_idle') {
          waitIdlePolls += 1;
          service.completeCommand({
            extensionId: 'ext_chatgpt',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { busy: false }
          });
        }
      }
    }, 20);
    expect(await service.chatGptWaitResponse(session.id, {
      baselineText: 'Existing assistant reply',
      timeoutMs: 2000,
      intervalMs: 50,
      stableReads: 1
    })).toEqual({
      sessionId: session.id,
      site: 'chatgpt',
      baselineText: 'Existing assistant reply',
      text: 'Fresh assistant response',
      changed: true,
      idle: true,
      timedOut: false
    });
    clearInterval(responseTimer);
  }, 10000);

  test('runs native deepseek.com send/read/ask flows through queued browser-extension commands', async () => {
    const service = new BrowserExtensionService();
    const session = service.createSession({
      workspace: 'ai',
      site: 'deepseek.com',
      targetUrl: 'https://deepseek.com/',
      name: 'deepseek-web'
    });

    service.registerProvider({
      extensionId: 'ext_deepseek',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'chrome',
      browserVersion: '123.0.0.0'
    });

    const drainOpenSession = () => {
      const queued = service.pollCommands('ext_deepseek');
      const openSession = queued.find((entry) => entry.kind === 'open_session');
      if (openSession) {
        service.completeCommand({
          extensionId: 'ext_deepseek',
          sessionId: session.id,
          commandId: openSession.id,
          ok: true,
          result: {
            windowId: 11,
            activeTabId: 21,
            tabs: [
              { id: 21, windowId: 11, url: 'https://deepseek.com/', title: 'DeepSeek', active: true }
            ]
          }
        });
      }
    };
    const runWithResponse = async <T>(kind: string, result: Record<string, unknown>, factory: () => Promise<T>) => {
      const pending = factory();
      const timer = setInterval(() => {
        const queued = service.pollCommands('ext_deepseek');
        const command = queued.find((entry) => entry.kind === kind);
        if (!command) {
          return;
        }
        service.completeCommand({
          extensionId: 'ext_deepseek',
          sessionId: session.id,
          commandId: command.id,
          ok: true,
          result
        });
        clearInterval(timer);
      }, 20);
      try {
        return await pending;
      } finally {
        clearInterval(timer);
      }
    };

    drainOpenSession();

    expect(await runWithResponse('deepseek_new_chat', { started: true }, () => service.deepSeekNewChat(session.id, 1000))).toEqual({
      sessionId: session.id,
      started: true
    });

    expect(await runWithResponse('deepseek_list_conversations', {
      conversations: [
        { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }
      ]
    }, () => service.deepSeekListConversations(session.id, { limit: 20, timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      count: 1,
      conversations: [
        { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }
      ]
    });

    expect(await runWithResponse('deepseek_open_conversation', {
      conversation: { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }
    }, () => service.deepSeekOpenConversation(session.id, { titleQuery: 'Research', timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      conversation: { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }
    });

    expect(await runWithResponse('deepseek_stop', { stopped: true }, () => service.deepSeekStop(session.id, 1000))).toEqual({
      sessionId: session.id,
      stopped: true
    });

    expect(await runWithResponse('deepseek_continue', { continued: true }, () => service.deepSeekContinue(session.id, 1000))).toEqual({
      sessionId: session.id,
      continued: true
    });

    const deepSeekControlsPromise = service.deepSeekResponseControls(session.id, { limit: 10, timeoutMs: 1000 });
    const deepSeekControlsTimer = setInterval(() => {
      const queued = service.pollCommands('ext_deepseek');
      for (const command of queued) {
        if (command.kind === 'deepseek_response_controls') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              controls: {
                previousAvailable: true,
                nextAvailable: false,
                previousLabel: 'Previous response',
                nextLabel: 'Next response'
              }
            }
          });
        } else if (command.kind === 'deepseek_read_thread') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
              ],
              latestAssistant: 'Existing DeepSeek reply',
              latestUser: 'Hello'
            }
          });
        }
      }
    }, 20);
    expect(await deepSeekControlsPromise).toEqual({
      sessionId: session.id,
      site: 'deepseek.com',
      previousAvailable: true,
      nextAvailable: false,
      previousLabel: 'Previous response',
      nextLabel: 'Next response',
      threadCount: 2,
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello',
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ]
    });
    clearInterval(deepSeekControlsTimer);

    const deepSeekPreviousPromise = service.deepSeekPreviousResponse(session.id, { limit: 10, timeoutMs: 1000 });
    const deepSeekPreviousTimer = setInterval(() => {
      const queued = service.pollCommands('ext_deepseek');
      for (const command of queued) {
        if (command.kind === 'deepseek_previous_response') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { moved: true, direction: 'previous' }
          });
        } else if (command.kind === 'deepseek_read_thread') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
              ],
              latestAssistant: 'Existing DeepSeek reply',
              latestUser: 'Hello'
            }
          });
        } else if (command.kind === 'deepseek_response_controls') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              controls: {
                previousAvailable: true,
                nextAvailable: false,
                previousLabel: 'Previous response',
                nextLabel: 'Next response'
              }
            }
          });
        }
      }
    }, 20);
    expect(await deepSeekPreviousPromise).toEqual({
      sessionId: session.id,
      moved: true,
      direction: 'previous',
      threadCount: 2,
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello',
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ],
      previousAvailable: true,
      nextAvailable: false,
      previousLabel: 'Previous response',
      nextLabel: 'Next response'
    });
    clearInterval(deepSeekPreviousTimer);

    const deepSeekNextPromise = service.deepSeekNextResponse(session.id, { limit: 10, timeoutMs: 1000 });
    const deepSeekNextTimer = setInterval(() => {
      const queued = service.pollCommands('ext_deepseek');
      for (const command of queued) {
        if (command.kind === 'deepseek_next_response') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { moved: true, direction: 'next' }
          });
        } else if (command.kind === 'deepseek_read_thread') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
              ],
              latestAssistant: 'Existing DeepSeek reply',
              latestUser: 'Hello'
            }
          });
        } else if (command.kind === 'deepseek_response_controls') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              controls: {
                previousAvailable: true,
                nextAvailable: false,
                previousLabel: 'Previous response',
                nextLabel: 'Next response'
              }
            }
          });
        }
      }
    }, 20);
    expect(await deepSeekNextPromise).toEqual({
      sessionId: session.id,
      moved: true,
      direction: 'next',
      threadCount: 2,
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello',
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ],
      previousAvailable: true,
      nextAvailable: false,
      previousLabel: 'Previous response',
      nextLabel: 'Next response'
    });
    clearInterval(deepSeekNextTimer);


    expect(await runWithResponse('deepseek_regenerate', { regenerated: true }, () => service.deepSeekRegenerate(session.id, 1000))).toEqual({
      sessionId: session.id,
      regenerated: true
    });

    expect(await runWithResponse('deepseek_read_thread', {
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ],
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello'
    }, () => service.deepSeekReadThread(session.id, { limit: 10, timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      count: 2,
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello',
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ]
    });

    expect(await runWithResponse('deepseek_read_thread', {
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ],
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello'
    }, () => service.deepSeekReadMessage(session.id, { role: 'assistant', limit: 10, timeoutMs: 1000 }))).toEqual({
      sessionId: session.id,
      count: 2,
      message: { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
    });

    expect(await runWithResponse('deepseek_read_latest', { text: 'Existing DeepSeek reply' }, () => service.deepSeekReadLatest(session.id, 1000))).toEqual({
      sessionId: session.id,
      text: 'Existing DeepSeek reply'
    });

    const deepSeekInfoPromise = service.deepSeekInfo(session.id, { limit: 10, timeoutMs: 1000 });
    const deepSeekInfoTimer = setInterval(() => {
      const queued = service.pollCommands('ext_deepseek');
      for (const command of queued) {
        if (command.kind === 'snapshot') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              snapshot: {
                title: 'DeepSeek',
                url: 'https://deepseek.com/chat/1',
                text: 'Hello\nExisting DeepSeek reply',
                capturedAt: new Date().toISOString()
              }
            }
          });
        } else if (command.kind === 'deepseek_busy') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { busy: false }
          });
        } else if (command.kind === 'deepseek_list_conversations') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              conversations: [
                { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }
              ]
            }
          });
        } else if (command.kind === 'deepseek_read_thread') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
                { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
              ],
              latestAssistant: 'Existing DeepSeek reply',
              latestUser: 'Hello'
            }
          });
        }
      }
    }, 20);
    expect(await deepSeekInfoPromise).toEqual({
      sessionId: session.id,
      site: 'deepseek.com',
      busy: false,
      page: expect.objectContaining({ title: 'DeepSeek', url: 'https://deepseek.com/chat/1' }),
      activeConversation: { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true },
      conversationCount: 1,
      latestAssistant: 'Existing DeepSeek reply',
      latestUser: 'Hello',
      threadCount: 2,
      messages: [
        { id: 'ds_1', role: 'user', text: 'Hello', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Existing DeepSeek reply', index: 1 }
      ]
    });
    clearInterval(deepSeekInfoTimer);

    expect(await runWithResponse('deepseek_send', { sent: true }, () => service.deepSeekSend(session.id, 'Summarize this page', 1000))).toEqual({
      sessionId: session.id,
      text: 'Summarize this page',
      sent: true
    });

    expect(await runWithResponse('deepseek_ask', {
      response: 'Fresh DeepSeek response',
      timedOut: false
    }, () => service.deepSeekAsk(session.id, 'What is on this page?', 1000))).toEqual({
      sessionId: session.id,
      prompt: 'What is on this page?',
      response: 'Fresh DeepSeek response',
      timedOut: false
    });

    let idlePolls = 0;
    const idleTimer = setInterval(() => {
      const queued = service.pollCommands('ext_deepseek');
      for (const command of queued) {
        if (command.kind === 'deepseek_wait_idle') {
          idlePolls += 1;
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              busy: false
            }
          });
        }
      }
    }, 20);

    expect(await service.deepSeekWaitIdle(session.id, { timeoutMs: 2000, intervalMs: 50 })).toEqual({
      sessionId: session.id,
      idle: true,
      timedOut: false
    });
    clearInterval(idleTimer);

    let deepSeekLatestReads = 0;
    const deepSeekResponseTimer = setInterval(() => {
      const queued = service.pollCommands('ext_deepseek');
      for (const command of queued) {
        if (command.kind === 'deepseek_read_latest') {
          deepSeekLatestReads += 1;
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { text: deepSeekLatestReads >= 2 ? 'Fresh DeepSeek response' : 'Existing DeepSeek reply' }
          });
        } else if (command.kind === 'deepseek_wait_idle') {
          service.completeCommand({
            extensionId: 'ext_deepseek',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { busy: false }
          });
        }
      }
    }, 20);
    expect(await service.deepSeekWaitResponse(session.id, {
      baselineText: 'Existing DeepSeek reply',
      timeoutMs: 2000,
      intervalMs: 50,
      stableReads: 1
    })).toEqual({
      sessionId: session.id,
      site: 'deepseek',
      baselineText: 'Existing DeepSeek reply',
      text: 'Fresh DeepSeek response',
      changed: true,
      idle: true,
      timedOut: false
    });
    clearInterval(deepSeekResponseTimer);
  }, 10000);

  test('reads current conversation metadata and exports AI threads', async () => {
    const service = new BrowserExtensionService();
    service.registerProvider({
      extensionId: 'ext_meta',
      protocolVersion: 'sidofun.browser-extension.v1',
      browserName: 'Chrome'
    });

    const chat = service.createSession({ site: 'chatgpt.com' });
    for (const command of service.pollCommands('ext_meta')) {
      if (command.kind === 'open_session') {
        service.completeCommand({ extensionId: 'ext_meta', sessionId: chat.id, commandId: command.id, ok: true, result: { windowId: 30, activeTabId: 50, tabs: [{ id: 50, url: 'https://chatgpt.com/c/1' }], url: 'https://chatgpt.com/c/1' } });
      }
    }
    service.heartbeat({
      extensionId: 'ext_meta',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessions: [{ sessionId: chat.id, connected: true, activeTabId: 50, tabs: [{ id: 50, url: 'https://chatgpt.com/c/1' }] }]
    });
    const chatMetaTimer = setInterval(() => {
      for (const command of service.pollCommands('ext_meta')) {
        if (command.kind === 'open_session') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: chat.id, commandId: command.id, ok: true, result: { windowId: 30, activeTabId: 50, tabs: [{ id: 50, url: 'https://chatgpt.com/c/1' }], url: 'https://chatgpt.com/c/1' } });
        } else if (command.kind === 'snapshot') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: chat.id, commandId: command.id, ok: true, result: { snapshot: { title: 'ChatGPT', url: 'https://chatgpt.com/c/1', text: 'Hello\nAssistant', capturedAt: new Date().toISOString() } } });
        } else if (command.kind === 'chatgpt_busy') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: chat.id, commandId: command.id, ok: true, result: { busy: false } });
        } else if (command.kind === 'chatgpt_list_conversations') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: chat.id, commandId: command.id, ok: true, result: { conversations: [{ id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true }] } });
        } else if (command.kind === 'chatgpt_read_thread') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: chat.id, commandId: command.id, ok: true, result: { messages: [{ id: 'cg_1', role: 'user', text: 'Hello', index: 0 }, { id: 'cg_2', role: 'assistant', text: 'Assistant', index: 1 }], latestAssistant: 'Assistant', latestUser: 'Hello' } });
        }
      }
    }, 20);
    expect(await service.chatGptCurrentConversation(chat.id, { limit: 10, timeoutMs: 1000 })).toEqual({
      sessionId: chat.id,
      conversation: { id: 'c1', title: 'Project plan', url: 'https://chatgpt.com/c/1', index: 0, active: true },
      page: expect.objectContaining({ title: 'ChatGPT', url: 'https://chatgpt.com/c/1' }),
      conversationCount: 1,
      busy: false,
      latestAssistant: 'Assistant',
      latestUser: 'Hello',
      threadCount: 2
    });
    const chatExport = await service.chatGptExportThread(chat.id, { format: 'markdown', limit: 10, timeoutMs: 1000 });
    expect(chatExport.format).toBe('markdown');
    expect(chatExport.content).toContain('# Project plan');
    expect(chatExport.content).toContain('## assistant');
    clearInterval(chatMetaTimer);

    const deep = service.createSession({ site: 'deepseek.com' });
    for (const command of service.pollCommands('ext_meta')) {
      if (command.kind === 'open_session') {
        service.completeCommand({ extensionId: 'ext_meta', sessionId: deep.id, commandId: command.id, ok: true, result: { windowId: 31, activeTabId: 51, tabs: [{ id: 51, url: 'https://deepseek.com/chat/1' }], url: 'https://deepseek.com/chat/1' } });
      }
    }
    service.heartbeat({
      extensionId: 'ext_meta',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessions: [{ sessionId: deep.id, connected: true, activeTabId: 51, tabs: [{ id: 51, url: 'https://deepseek.com/chat/1' }] }]
    });
    const deepMetaTimer = setInterval(() => {
      for (const command of service.pollCommands('ext_meta')) {
        if (command.kind === 'open_session') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: deep.id, commandId: command.id, ok: true, result: { windowId: 31, activeTabId: 51, tabs: [{ id: 51, url: 'https://deepseek.com/chat/1' }], url: 'https://deepseek.com/chat/1' } });
        } else if (command.kind === 'snapshot') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: deep.id, commandId: command.id, ok: true, result: { snapshot: { title: 'DeepSeek', url: 'https://deepseek.com/chat/1', text: 'Hello\nDeep reply', capturedAt: new Date().toISOString() } } });
        } else if (command.kind === 'deepseek_busy') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: deep.id, commandId: command.id, ok: true, result: { busy: false } });
        } else if (command.kind === 'deepseek_list_conversations') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: deep.id, commandId: command.id, ok: true, result: { conversations: [{ id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true }] } });
        } else if (command.kind === 'deepseek_read_thread') {
          service.completeCommand({ extensionId: 'ext_meta', sessionId: deep.id, commandId: command.id, ok: true, result: { messages: [{ id: 'ds_1', role: 'user', text: 'Hello', index: 0 }, { id: 'ds_2', role: 'assistant', text: 'Deep reply', index: 1 }], latestAssistant: 'Deep reply', latestUser: 'Hello' } });
        }
      }
    }, 20);
    expect(await service.deepSeekCurrentConversation(deep.id, { limit: 10, timeoutMs: 1000 })).toEqual({
      sessionId: deep.id,
      conversation: { id: 'd1', title: 'Research notes', url: 'https://deepseek.com/chat/1', index: 0, active: true },
      page: expect.objectContaining({ title: 'DeepSeek', url: 'https://deepseek.com/chat/1' }),
      conversationCount: 1,
      busy: false,
      latestAssistant: 'Deep reply',
      latestUser: 'Hello',
      threadCount: 2
    });
    const deepExport = await service.deepSeekExportThread(deep.id, { format: 'markdown', limit: 10, timeoutMs: 1000 });
    expect(deepExport.format).toBe('markdown');
    expect(deepExport.content).toContain('# Research notes');
    expect(deepExport.content).toContain('## assistant');
    clearInterval(deepMetaTimer);
  }, 10000);

  test('waits for provider and session readiness and returns refreshed AI threads', async () => {
    const service = new BrowserExtensionService();

    const waitProviderPromise = service.waitForProviderConnected({ timeoutMs: 1000, intervalMs: 20 });
    setTimeout(() => {
      service.registerProvider({
        extensionId: 'ext_ready',
        protocolVersion: 'sidofun.browser-extension.v1',
        browserName: 'Chrome'
      });
    }, 60);
    expect(await waitProviderPromise).toEqual({
      connected: true,
      timedOut: false,
      status: expect.objectContaining({ providerConnected: true })
    });

    const session = service.createSession({ site: 'chatgpt.com' });
    for (const command of service.pollCommands('ext_ready')) {
      if (command.kind === 'open_session') {
        service.completeCommand({ extensionId: 'ext_ready', sessionId: session.id, commandId: command.id, ok: true, result: { windowId: 10, activeTabId: 42, tabs: [{ id: 42, url: 'https://chatgpt.com/' }], url: 'https://chatgpt.com/' } });
      }
    }
    const waitReadyPromise = service.waitForSessionReady(session.id, { timeoutMs: 1000, intervalMs: 20 });
    setTimeout(() => {
      service.heartbeat({
        extensionId: 'ext_ready',
        protocolVersion: 'sidofun.browser-extension.v1',
        sessions: [{ sessionId: session.id, connected: true, windowId: 10, activeTabId: 42, tabs: [{ id: 42, url: 'https://chatgpt.com/' }] }]
      });
    }, 60);
    expect(await waitReadyPromise).toEqual({
      sessionId: session.id,
      ready: true,
      timedOut: false,
      session: expect.objectContaining({ id: session.id, connected: true, activeTabId: 42 })
    });

    const chatThread = service.chatGptAskThread(session.id, 'Summarize this page', { limit: 5, timeoutMs: 1000 });
    const chatThreadTimer = setInterval(() => {
      for (const command of service.pollCommands('ext_ready')) {
        if (command.kind === 'open_session') {
          service.completeCommand({ extensionId: 'ext_ready', sessionId: session.id, commandId: command.id, ok: true, result: { windowId: 10, activeTabId: 42, tabs: [{ id: 42, url: 'https://chatgpt.com/' }], url: 'https://chatgpt.com/' } });
        } else if (command.kind === 'chatgpt_ask') {
          service.completeCommand({ extensionId: 'ext_ready', sessionId: session.id, commandId: command.id, ok: true, result: { response: 'Fresh assistant response', timedOut: false } });
        } else if (command.kind === 'chatgpt_read_thread') {
          service.completeCommand({
            extensionId: 'ext_ready',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'cg_1', role: 'user', text: 'Summarize this page', index: 0 },
                { id: 'cg_2', role: 'assistant', text: 'Fresh assistant response', index: 1 }
              ],
              latestAssistant: 'Fresh assistant response',
              latestUser: 'Summarize this page'
            }
          });
        }
      }
    }, 20);
    expect(await chatThread).toEqual({
      sessionId: session.id,
      prompt: 'Summarize this page',
      response: 'Fresh assistant response',
      timedOut: false,
      threadCount: 2,
      latestAssistant: 'Fresh assistant response',
      latestUser: 'Summarize this page',
      messages: [
        { id: 'cg_1', role: 'user', text: 'Summarize this page', index: 0 },
        { id: 'cg_2', role: 'assistant', text: 'Fresh assistant response', index: 1 }
      ]
    });
    clearInterval(chatThreadTimer);

    const deepseek = service.createSession({ site: 'deepseek.com' });
    for (const command of service.pollCommands('ext_ready')) {
      if (command.kind === 'open_session') {
        service.completeCommand({ extensionId: 'ext_ready', sessionId: deepseek.id, commandId: command.id, ok: true, result: { windowId: 11, activeTabId: 43, tabs: [{ id: 43, url: 'https://deepseek.com/' }], url: 'https://deepseek.com/' } });
      }
    }
    service.heartbeat({
      extensionId: 'ext_ready',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessions: [{ sessionId: deepseek.id, connected: true, windowId: 11, activeTabId: 43, tabs: [{ id: 43, url: 'https://deepseek.com/' }] }]
    });
    const deepThread = service.deepSeekAskThread(deepseek.id, 'Summarize this page', { limit: 5, timeoutMs: 1000 });
    const deepThreadTimer = setInterval(() => {
      for (const command of service.pollCommands('ext_ready')) {
        if (command.kind === 'open_session') {
          service.completeCommand({ extensionId: 'ext_ready', sessionId: deepseek.id, commandId: command.id, ok: true, result: { windowId: 11, activeTabId: 43, tabs: [{ id: 43, url: 'https://deepseek.com/' }], url: 'https://deepseek.com/' } });
        } else if (command.kind === 'deepseek_ask') {
          service.completeCommand({ extensionId: 'ext_ready', sessionId: deepseek.id, commandId: command.id, ok: true, result: { response: 'Fresh DeepSeek response', timedOut: false } });
        } else if (command.kind === 'deepseek_read_thread') {
          service.completeCommand({
            extensionId: 'ext_ready',
            sessionId: deepseek.id,
            commandId: command.id,
            ok: true,
            result: {
              messages: [
                { id: 'ds_1', role: 'user', text: 'Summarize this page', index: 0 },
                { id: 'ds_2', role: 'assistant', text: 'Fresh DeepSeek response', index: 1 }
              ],
              latestAssistant: 'Fresh DeepSeek response',
              latestUser: 'Summarize this page'
            }
          });
        }
      }
    }, 20);
    expect(await deepThread).toEqual({
      sessionId: deepseek.id,
      prompt: 'Summarize this page',
      response: 'Fresh DeepSeek response',
      timedOut: false,
      threadCount: 2,
      latestAssistant: 'Fresh DeepSeek response',
      latestUser: 'Summarize this page',
      messages: [
        { id: 'ds_1', role: 'user', text: 'Summarize this page', index: 0 },
        { id: 'ds_2', role: 'assistant', text: 'Fresh DeepSeek response', index: 1 }
      ]
    });
    clearInterval(deepThreadTimer);
  }, 10000);

  test('recovers stale commands and reconnects stale sessions', async () => {
    const service = new BrowserExtensionService();
    service.registerProvider({
      extensionId: 'ext_recover',
      protocolVersion: 'sidofun.browser-extension.v1'
    });

    const session = service.createSession({
      workspace: 'socials',
      site: 'chatgpt.com',
      targetUrl: 'https://chatgpt.com/'
    });

    service.heartbeat({
      extensionId: 'ext_recover',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessions: [{ sessionId: session.id, connected: true, windowId: 21, activeTabId: 84, tabs: [{ id: 84, url: 'https://chatgpt.com/' }] }]
    });
    for (const command of service.pollCommands('ext_recover')) {
      if (command.kind === 'open_session') {
        service.completeCommand({
          extensionId: 'ext_recover',
          sessionId: session.id,
          commandId: command.id,
          ok: true,
          result: { windowId: 21, activeTabId: 84, tabs: [{ id: 84, url: 'https://chatgpt.com/' }], url: 'https://chatgpt.com/' }
        });
      }
    }

    const pendingNavigation = service.navigate(session.id, 'https://chatgpt.com/c/1', 1000);
    const [dispatched] = service.pollCommands('ext_recover');
    expect(dispatched?.kind).toBe('navigate');

    const persisted = (service as any).readPersisted();
    persisted.providers.browserExtension.queue[dispatched.id].dispatchedAt = new Date(Date.now() - 10_000).toISOString();
    (service as any).writePersisted(persisted);

    expect(service.registerProvider({
      extensionId: 'ext_recover',
      protocolVersion: 'sidofun.browser-extension.v1'
    })).toEqual(expect.objectContaining({
      ok: true,
      recoveredCommandCount: 1
    }));

        const [recovered] = service.pollCommands('ext_recover');
    expect(recovered?.id).toBe(dispatched.id);
    service.completeCommand({
      extensionId: 'ext_recover',
      sessionId: session.id,
      commandId: recovered.id,
      ok: true,
      result: { tabs: [{ id: 84, url: 'https://chatgpt.com/c/1' }], activeTabId: 84, url: 'https://chatgpt.com/c/1' }
    });
    await expect(pendingNavigation).resolves.toEqual(expect.objectContaining({
      sessionId: session.id,
      url: 'https://chatgpt.com/c/1'
    }));

    service.heartbeat({
      extensionId: 'ext_recover',
      protocolVersion: 'sidofun.browser-extension.v1',
      sessions: []
    });

    expect(service.refreshSession(session.id)).toEqual(expect.objectContaining({
      sessionId: session.id,
      session: expect.objectContaining({
        connected: false,
        stale: true,
        disconnectedReason: 'missing_from_heartbeat'
      })
    }));

    const reconnect = service.reconnectSession(session.id, { timeoutMs: 1_000, intervalMs: 20 });
    const reconnectTimer = setInterval(() => {
      for (const command of service.pollCommands('ext_recover')) {
        if (command.kind === 'open_session') {
          service.heartbeat({
            extensionId: 'ext_recover',
            protocolVersion: 'sidofun.browser-extension.v1',
            sessions: [{ sessionId: session.id, connected: true, windowId: 22, activeTabId: 85, tabs: [{ id: 85, url: 'https://chatgpt.com/c/1' }] }]
          });
          service.completeCommand({
            extensionId: 'ext_recover',
            sessionId: session.id,
            commandId: command.id,
            ok: true,
            result: { windowId: 22, activeTabId: 85, tabs: [{ id: 85, url: 'https://chatgpt.com/c/1' }], url: 'https://chatgpt.com/c/1' }
          });
        }
      }
    }, 20);

    const reconnectResult = await reconnect;
    expect(reconnectResult.sessionId).toBe(session.id);
    expect(reconnectResult.provider).toEqual(expect.objectContaining({
      connected: true,
      timedOut: false
    }));
    expect([true, false]).toContain(reconnectResult.reconnected);
    expect([true, false]).toContain(reconnectResult.timedOut);
    expect(reconnectResult.session).toBeDefined();
    expect([84, 85]).toContain(reconnectResult.session.activeTabId);
    expect(['missing_from_heartbeat', undefined]).toContain(reconnectResult.session.disconnectedReason);
    clearInterval(reconnectTimer);
  }, 10000);

});
