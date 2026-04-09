import type {
  SidofunBrowserExtensionDomEvent,
  SidofunBrowserExtensionNetworkEvent,
  SidofunBrowserProviderQueuedCommand,
} from '../protocol.js';

interface TabLike {
  url?: string;
}

interface SessionRecordLike {
  targetUrl?: string;
  networkEvents?: SidofunBrowserExtensionNetworkEvent[];
  domEvents?: SidofunBrowserExtensionDomEvent[];
}

interface SessionContextLike<TSession extends SessionRecordLike> {
  session: TSession;
  tabId?: number;
}

interface BrowserStateCommandDeps<TSession extends SessionRecordLike, TState> {
  getSessionContext: (sessionId: string, existing?: TSession) => Promise<SessionContextLike<TSession>>;
  getTabInfo: (tabId: number) => Promise<TabLike | undefined>;
  findDownloads: (payload: Record<string, unknown>) => Promise<Array<Record<string, any>>>;
  summarizeCookie: (cookie: chrome.cookies.Cookie | null | undefined) => Record<string, unknown> | undefined;
  getState: () => Promise<TState>;
  setState: (state: TState) => Promise<void>;
  updateSession: (state: TState, sessionId: string, updater: (session: TSession) => TSession) => TState;
}

function resolveTargetUrl<TSession extends SessionRecordLike>(
  payload: Record<string, unknown>,
  context: SessionContextLike<TSession>,
  tab?: TabLike
) {
  return typeof payload.targetUrl === 'string' && payload.targetUrl.length > 0
    ? payload.targetUrl
    : tab?.url ?? context.session.targetUrl;
}

export function createBrowserStateCommandExecutor<TSession extends SessionRecordLike, TState>(
  deps: BrowserStateCommandDeps<TSession, TState>
) {
  return async function executeBrowserStateCommand(command: SidofunBrowserProviderQueuedCommand, existing: TSession) {
    switch (command.kind) {
      case 'cookies': {
        const context = await deps.getSessionContext(command.sessionId, existing);
        const tab = context.tabId ? await deps.getTabInfo(context.tabId) : undefined;
        const targetUrl = resolveTargetUrl(command.payload, context, tab);
        if (!targetUrl) {
          throw new Error(`No target URL is available for browser-extension session ${command.sessionId}`);
        }
        const cookies = await chrome.cookies.getAll({ url: targetUrl });
        return {
          handled: true,
          result: {
            url: targetUrl,
            cookies: cookies.map((cookie) => deps.summarizeCookie(cookie))
          }
        };
      }

      case 'cookie_get': {
        const context = await deps.getSessionContext(command.sessionId, existing);
        const tab = context.tabId ? await deps.getTabInfo(context.tabId) : undefined;
        const targetUrl = resolveTargetUrl(command.payload, context, tab);
        const name = String(command.payload.name || '').trim();
        if (!targetUrl) {
          throw new Error(`No target URL is available for browser-extension session ${command.sessionId}`);
        }
        if (!name) {
          throw new Error('A non-empty cookie name is required');
        }
        const cookie = await chrome.cookies.get({ url: targetUrl, name });
        return {
          handled: true,
          result: {
            url: targetUrl,
            found: Boolean(cookie),
            cookie: deps.summarizeCookie(cookie)
          }
        };
      }

      case 'cookie_set': {
        const context = await deps.getSessionContext(command.sessionId, existing);
        const tab = context.tabId ? await deps.getTabInfo(context.tabId) : undefined;
        const targetUrl = resolveTargetUrl(command.payload, context, tab);
        const name = String(command.payload.name || '').trim();
        if (!targetUrl) {
          throw new Error(`No target URL is available for browser-extension session ${command.sessionId}`);
        }
        if (!name) {
          throw new Error('A non-empty cookie name is required');
        }
        const sameSite = command.payload.sameSite === 'lax'
          || command.payload.sameSite === 'strict'
          || command.payload.sameSite === 'no_restriction'
          || command.payload.sameSite === 'unspecified'
          ? command.payload.sameSite
          : undefined;
        const cookie = await chrome.cookies.set({
          url: targetUrl,
          name,
          value: String(command.payload.value ?? ''),
          domain: typeof command.payload.domain === 'string' && command.payload.domain.length > 0 ? command.payload.domain : undefined,
          path: typeof command.payload.path === 'string' && command.payload.path.length > 0 ? command.payload.path : undefined,
          secure: command.payload.secure === true ? true : undefined,
          httpOnly: command.payload.httpOnly === true ? true : undefined,
          sameSite,
          expirationDate: typeof command.payload.expirationDate === 'number' ? command.payload.expirationDate : undefined
        });
        return {
          handled: true,
          result: {
            url: targetUrl,
            updated: Boolean(cookie),
            cookie: deps.summarizeCookie(cookie)
          }
        };
      }

      case 'cookie_remove': {
        const context = await deps.getSessionContext(command.sessionId, existing);
        const tab = context.tabId ? await deps.getTabInfo(context.tabId) : undefined;
        const targetUrl = resolveTargetUrl(command.payload, context, tab);
        const name = String(command.payload.name || '').trim();
        if (!targetUrl) {
          throw new Error(`No target URL is available for browser-extension session ${command.sessionId}`);
        }
        if (!name) {
          throw new Error('A non-empty cookie name is required');
        }
        const removed = await chrome.cookies.remove({ url: targetUrl, name });
        return {
          handled: true,
          result: {
            url: targetUrl,
            name,
            removed: Boolean(removed)
          }
        };
      }

      case 'downloads': {
        const downloads = await deps.findDownloads(command.payload);
        return {
          handled: true,
          result: {
            count: downloads.length,
            downloads
          }
        };
      }

      case 'download_cancel': {
        const [download] = await deps.findDownloads({
          ...command.payload,
          limit: 1,
          state: 'in_progress'
        });
        if (!download) {
          return { handled: true, result: { cancelled: false } };
        }
        await chrome.downloads.cancel(download.id).catch(() => undefined);
        return {
          handled: true,
          result: {
            cancelled: true,
            download
          }
        };
      }

      case 'download_erase': {
        const [download] = await deps.findDownloads({
          ...command.payload,
          limit: 1
        });
        if (!download) {
          return { handled: true, result: { erased: false, erasedCount: 0 } };
        }
        const erasedIds = await chrome.downloads.erase({ id: download.id }).catch(() => []);
        return {
          handled: true,
          result: {
            erased: erasedIds.length > 0,
            erasedCount: erasedIds.length,
            download
          }
        };
      }

      case 'network_events':
        return {
          handled: true,
          result: {
            networkEvents: [...(existing.networkEvents ?? [])]
          }
        };

      case 'dom_events':
        return {
          handled: true,
          result: {
            domEvents: [...(existing.domEvents ?? [])]
          }
        };

      case 'clear_network_events': {
        const state = await deps.getState();
        const updatedState = deps.updateSession(state, command.sessionId, (session) => ({
          ...session,
          networkEvents: [],
          domEvents: session.domEvents ?? [],
          updatedAt: new Date().toISOString()
        }));
        await deps.setState(updatedState);
        return {
          handled: true,
          result: {
            cleared: existing.networkEvents?.length ?? 0,
            networkEvents: []
          }
        };
      }

      case 'clear_dom_events': {
        const state = await deps.getState();
        const updatedState = deps.updateSession(state, command.sessionId, (session) => ({
          ...session,
          networkEvents: session.networkEvents ?? [],
          domEvents: [],
          updatedAt: new Date().toISOString()
        }));
        await deps.setState(updatedState);
        return {
          handled: true,
          result: {
            cleared: existing.domEvents?.length ?? 0,
            domEvents: []
          }
        };
      }

      default:
        return { handled: false };
    }
  };
}
