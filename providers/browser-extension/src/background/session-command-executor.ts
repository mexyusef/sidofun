import type {
  SidofunBrowserProviderQueuedCommand,
} from '../protocol.js';
import type {
  ProviderSessionRecord,
} from './types.js';
import type { CommandRouterDeps } from './command-router-deps.js';

export function createSessionCommandExecutor(deps: CommandRouterDeps) {
  const {
    getState,
    setState,
    getWindowTabs,
    getSessionContext,
    waitForTabComplete,
    syncSessionFromWindow,
    refreshSessionState,
    pushSessionState,
    getTabInfo,
    executeStorageScript,
    snapshotActiveTab,
    getSessionRecord,
  } = deps;

  return async function executeSessionCommand(command: SidofunBrowserProviderQueuedCommand, existing: ProviderSessionRecord) {
    const state = await getState();
    const result = await (async () => {
      switch (command.kind) {

    case 'open_session': {
      const targetUrl = typeof command.payload.targetUrl === 'string' && command.payload.targetUrl.length > 0
        ? command.payload.targetUrl
        : 'https://x.com/home';
      const privateMode = command.payload.privateMode === true;
      const created = await chrome.windows.create({
        url: targetUrl,
        focused: true,
        type: 'normal',
        incognito: privateMode
      });
      const tabs = await getWindowTabs(created.id);
      const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];
      if (activeTab?.id) {
        await waitForTabComplete(activeTab.id).catch(() => undefined);
      }
      const refreshedActiveTab = await syncSessionFromWindow(command.sessionId, created.id);
      const nextRecord: ProviderSessionRecord = {
        ...existing,
        connected: true,
        site: typeof command.payload.site === 'string' ? command.payload.site : existing.site,
        targetUrl,
        privateMode,
        windowId: created.id,
        activeTabId: refreshedActiveTab?.id ?? activeTab?.id,
        tabs: await getWindowTabs(created.id),
        networkEvents: existing.networkEvents ?? [],
        domEvents: existing.domEvents ?? [],
        updatedAt: new Date().toISOString()
      };
      state.sessions[command.sessionId] = nextRecord;
      await setState(state);
      void pushSessionState(command.sessionId);
      return {
        windowId: nextRecord.windowId,
        activeTabId: nextRecord.activeTabId,
        tabs
      };
    }

    case 'navigate': {
      const targetUrl = String(command.payload.url || '');
      const { tabId } = await getSessionContext(command.sessionId, existing);
      await chrome.tabs.update(tabId, { url: targetUrl, active: true });
      await refreshSessionState(command.sessionId);
      void pushSessionState(command.sessionId);
      const nextState = await getState();
      const nextRecord = nextState.sessions[command.sessionId];
      return {
        url: targetUrl,
        windowId: nextRecord?.windowId,
        activeTabId: nextRecord?.activeTabId,
        tabs: nextRecord?.tabs ?? []
      };
    }

    case 'go_back': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      await chrome.tabs.goBack(tabId).catch(() => undefined);
      await refreshSessionState(command.sessionId);
      void pushSessionState(command.sessionId);
      const nextState = await getState();
      const nextRecord = nextState.sessions[command.sessionId];
      const tab = tabId ? await getTabInfo(tabId).catch(() => undefined) : undefined;
      return {
        url: tab?.url ?? nextRecord?.targetUrl,
        title: tab?.title,
        windowId: nextRecord?.windowId,
        activeTabId: nextRecord?.activeTabId,
        tabs: nextRecord?.tabs ?? []
      };
    }

    case 'go_forward': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      await chrome.tabs.goForward(tabId).catch(() => undefined);
      await refreshSessionState(command.sessionId);
      void pushSessionState(command.sessionId);
      const nextState = await getState();
      const nextRecord = nextState.sessions[command.sessionId];
      const tab = tabId ? await getTabInfo(tabId).catch(() => undefined) : undefined;
      return {
        url: tab?.url ?? nextRecord?.targetUrl,
        title: tab?.title,
        windowId: nextRecord?.windowId,
        activeTabId: nextRecord?.activeTabId,
        tabs: nextRecord?.tabs ?? []
      };
    }

    case 'reload': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      await chrome.tabs.reload(tabId).catch(() => undefined);
      await refreshSessionState(command.sessionId);
      void pushSessionState(command.sessionId);
      const nextState = await getState();
      const nextRecord = nextState.sessions[command.sessionId];
      const tab = tabId ? await getTabInfo(tabId).catch(() => undefined) : undefined;
      return {
        url: tab?.url ?? nextRecord?.targetUrl,
        title: tab?.title,
        windowId: nextRecord?.windowId,
        activeTabId: nextRecord?.activeTabId,
        tabs: nextRecord?.tabs ?? []
      };
    }

    case 'metadata': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const [result] = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const metaElements = Array.from(document.querySelectorAll('meta'));
          const metas: Record<string, string> = {};
          for (const meta of metaElements) {
            const key = meta.getAttribute('name')
              ?? meta.getAttribute('property')
              ?? meta.getAttribute('http-equiv')
              ?? undefined;
            if (!key) {
              continue;
            }
            const value = meta.getAttribute('content') ?? '';
            if (!(key in metas)) {
              metas[key] = value;
            }
          }
          const canonicalUrl = document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? undefined;
          return {
            title: document.title || undefined,
            url: window.location.href,
            description: metas.description ?? metas['og:description'] ?? metas['twitter:description'] ?? undefined,
            canonicalUrl,
            language: document.documentElement.lang || undefined,
            metas
          };
        }
      }).catch(() => []);
      return result?.result ?? { metas: {} };
    }

    case 'storage_list': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const scope = command.payload.scope === 'session' ? 'session' : 'local';
      const limit = Number.parseInt(String(command.payload.limit ?? '100'), 10);
      const response = await executeStorageScript<{ count: number; entries: Array<{ scope: 'local' | 'session'; key: string; value: string }> }>(
        tabId,
        { scope, limit: Number.isNaN(limit) ? 100 : Math.max(1, limit) },
        'list'
      );
      return response;
    }

    case 'storage_get': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const scope = command.payload.scope === 'session' ? 'session' : 'local';
      const key = String(command.payload.key || '');
      if (!key) {
        throw new Error('A non-empty storage key is required');
      }
      return await executeStorageScript<{ found: boolean; entry?: { scope: 'local' | 'session'; key: string; value: string } }>(
        tabId,
        { scope, key },
        'get'
      );
    }

    case 'storage_set': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const scope = command.payload.scope === 'session' ? 'session' : 'local';
      const key = String(command.payload.key || '');
      if (!key) {
        throw new Error('A non-empty storage key is required');
      }
      return await executeStorageScript<{ updated: boolean; entry?: { scope: 'local' | 'session'; key: string; value: string } }>(
        tabId,
        { scope, key, value: String(command.payload.value ?? '') },
        'set'
      );
    }

    case 'storage_remove': {
      const { tabId } = await getSessionContext(command.sessionId, existing);
      const scope = command.payload.scope === 'session' ? 'session' : 'local';
      const key = String(command.payload.key || '');
      if (!key) {
        throw new Error('A non-empty storage key is required');
      }
      return await executeStorageScript<{ removed: boolean; key: string }>(
        tabId,
        { scope, key },
        'remove'
      );
    }

    case 'list_tabs': {
      await refreshSessionState(command.sessionId);
      const nextState = await getState();
      const nextRecord = nextState.sessions[command.sessionId];
      return {
        windowId: nextRecord?.windowId,
        activeTabId: nextRecord?.activeTabId,
        tabs: nextRecord?.tabs ?? []
      };
    }

        default:
          return { handled: false };
      }
    })();
    if (result && typeof result === 'object' && 'handled' in result) {
      return result;
    }
    return {
      handled: true as const,
      result
    };
  };
}
