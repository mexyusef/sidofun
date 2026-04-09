import type { SidofunBrowserExtensionTab } from '../protocol.js';
import { getSessionSiteHosts, getWindowTabs } from './tab-state.js';

export interface ProviderSessionRecordLike {
  sessionId: string;
  windowId?: number;
  activeTabId?: number;
  tabs?: SidofunBrowserExtensionTab[];
  site?: string;
  targetUrl?: string;
  privateMode?: boolean;
  connected: boolean;
  updatedAt: string;
}

export interface ProviderStorageStateLike<TSession extends ProviderSessionRecordLike> {
  sessions: Record<string, TSession>;
}

type GetState<TSession extends ProviderSessionRecordLike> = () => Promise<ProviderStorageStateLike<TSession>>;
type SetState<TSession extends ProviderSessionRecordLike> = (state: ProviderStorageStateLike<TSession>) => Promise<void>;
type PushSessionState = (sessionId: string) => Promise<void>;
type WaitForTabComplete = (tabId: number, timeoutMs?: number) => Promise<chrome.tabs.Tab | undefined>;

function normalizeWorkflowUrl(rawUrl?: string) {
  if (!rawUrl) {
    return undefined;
  }
  try {
    const parsed = new URL(rawUrl);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function matchesSessionTargetUrl(tabUrl: string | undefined, targetUrl: string | undefined) {
  if (!tabUrl || !targetUrl) {
    return false;
  }
  const normalizedTab = normalizeWorkflowUrl(tabUrl);
  const normalizedTarget = normalizeWorkflowUrl(targetUrl);
  if (normalizedTab && normalizedTarget && normalizedTab === normalizedTarget) {
    return true;
  }
  try {
    const tab = new URL(tabUrl);
    const target = new URL(targetUrl);
    return tab.hostname.toLowerCase() === target.hostname.toLowerCase()
      && tab.pathname === target.pathname
      && (target.search ? tab.search === target.search : true);
  } catch {
    return false;
  }
}

export async function refreshSessionState<TSession extends ProviderSessionRecordLike>(
  sessionId: string,
  getState: GetState<TSession>,
  setState: SetState<TSession>
) {
  const state = await getState();
  const record = state.sessions[sessionId];
  if (!record) {
    return;
  }
  const tabs = await getWindowTabs(record.windowId);
  const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];
  state.sessions[sessionId] = {
    ...record,
    tabs,
    activeTabId: activeTab?.id,
    connected: tabs.length > 0,
    updatedAt: new Date().toISOString()
  };
  await setState(state);
}

export async function syncSessionFromWindow<TSession extends ProviderSessionRecordLike>(
  sessionId: string,
  windowId: number | undefined,
  getState: GetState<TSession>,
  setState: SetState<TSession>,
  pushSessionState: PushSessionState
) {
  if (!windowId) {
    return undefined;
  }
  const tabs = await getWindowTabs(windowId);
  const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];
  const state = await getState();
  const existing = state.sessions[sessionId];
  if (existing) {
    state.sessions[sessionId] = {
      ...existing,
      tabs,
      activeTabId: activeTab?.id,
      targetUrl: existing.targetUrl ?? activeTab?.url,
      connected: tabs.length > 0,
      updatedAt: new Date().toISOString()
    };
    await setState(state);
    void pushSessionState(sessionId);
  }
  return activeTab;
}

export async function getSessionRecord<TSession extends ProviderSessionRecordLike>(
  sessionId: string,
  getState: GetState<TSession>,
  fallback?: TSession
) {
  const state = await getState();
  return state.sessions[sessionId] ?? fallback ?? {
    sessionId,
    connected: false,
    updatedAt: new Date().toISOString()
  };
}

export async function getTrackedActiveTabId<TSession extends ProviderSessionRecordLike>(
  existing: TSession,
  sessionId: string,
  getState: GetState<TSession>,
  setState: SetState<TSession>,
  pushSessionState: PushSessionState
) {
  const state = await getState();
  const session = state.sessions[sessionId] ?? existing;
  const fallbackHosts = getSessionSiteHosts(session);
  const targetUrl = typeof session.targetUrl === 'string' ? session.targetUrl : undefined;
  const trackedMatchingTab = session.tabs?.find((tab) => {
    if (!tab?.id || !tab.url || fallbackHosts.length === 0) {
      return false;
    }
    try {
      return fallbackHosts.includes(new URL(tab.url).hostname.toLowerCase());
    } catch {
      return false;
    }
  });
  const exactTrackedTab = session.tabs?.find((tab) => matchesSessionTargetUrl(tab.url, targetUrl));
  const initialTabId = exactTrackedTab?.id ?? trackedMatchingTab?.id ?? session.activeTabId ?? session.tabs?.find((tab) => tab.active)?.id;
  if (initialTabId) {
    const tab = await chrome.tabs.get(initialTabId).catch(() => undefined);
    const matchesHost = !tab?.url || fallbackHosts.length === 0
      ? true
      : (() => {
          try {
            return fallbackHosts.includes(new URL(tab.url).hostname.toLowerCase());
          } catch {
            return false;
          }
        })();
    if (tab?.id && matchesHost) {
      return tab.id;
    }
  }

  if (session.windowId) {
    const tabs = await getWindowTabs(session.windowId);
    const exactTab = tabs.find((tab) => matchesSessionTargetUrl(tab.url, targetUrl));
    const matchingTab = tabs.find((tab) => {
      if (!tab?.url || fallbackHosts.length === 0) {
        return false;
      }
      try {
        return fallbackHosts.includes(new URL(tab.url).hostname.toLowerCase());
      } catch {
        return false;
      }
    });
    const activeTab = exactTab ?? matchingTab ?? tabs.find((tab) => tab.active) ?? tabs[0];
    if (activeTab?.id) {
      const nextState = await getState();
      const nextSession = nextState.sessions[sessionId];
      if (nextSession) {
        nextState.sessions[sessionId] = {
          ...nextSession,
          tabs,
          activeTabId: activeTab.id,
          connected: tabs.length > 0,
          updatedAt: new Date().toISOString()
        };
        await setState(nextState);
        void pushSessionState(sessionId);
      }
      return activeTab.id;
    }
  }
  if (fallbackHosts.length > 0) {
    const candidateTabs = await chrome.tabs.query({});
    const matchingTabs = candidateTabs.filter((tab): tab is chrome.tabs.Tab & { id: number; windowId: number } => {
      if (typeof tab.id !== 'number' || typeof tab.windowId !== 'number' || !tab.url) {
        return false;
      }
      try {
        const hostname = new URL(tab.url).hostname.toLowerCase();
        return fallbackHosts.includes(hostname);
      } catch {
        return false;
      }
    });
    const recoveredExactTab = matchingTabs.find((tab) => matchesSessionTargetUrl(tab.url, targetUrl));
    const recoveredTab = recoveredExactTab ?? matchingTabs.find((tab) => tab.active) ?? matchingTabs[0];
    if (recoveredTab?.id) {
      const tabs = await getWindowTabs(recoveredTab.windowId);
      const nextState = await getState();
      const nextSession = nextState.sessions[sessionId];
      if (nextSession) {
        nextState.sessions[sessionId] = {
          ...nextSession,
          windowId: recoveredTab.windowId,
          tabs,
          activeTabId: recoveredTab.id,
          targetUrl: nextSession.targetUrl ?? recoveredTab.url,
          connected: tabs.length > 0,
          updatedAt: new Date().toISOString()
        };
        await setState(nextState);
        void pushSessionState(sessionId);
      }
      return recoveredTab.id;
    }
  }

  throw new Error(`No active tab is tracked for browser-extension session ${sessionId}`);
}

export async function ensureSessionTabReady<TSession extends ProviderSessionRecordLike>(
  sessionId: string,
  existing: TSession,
  waitForTabComplete: WaitForTabComplete,
  syncSessionFromWindowFn: (sessionId: string, windowId?: number) => Promise<chrome.tabs.Tab | SidofunBrowserExtensionTab | undefined>,
  getTrackedActiveTabIdFn: (existing: TSession, sessionId: string) => Promise<number>
) {
  const tabId = await getTrackedActiveTabIdFn(existing, sessionId);
  const tab = await waitForTabComplete(tabId).catch(() => undefined);
  if (tab?.windowId) {
    const synced = await syncSessionFromWindowFn(sessionId, tab.windowId);
    if (synced?.id) {
      return synced.id;
    }
  }
  return tab?.id ?? tabId;
}

export async function getSessionContext<TSession extends ProviderSessionRecordLike>(
  sessionId: string,
  fallback: TSession | undefined,
  getSessionRecordFn: (sessionId: string, fallback?: TSession) => Promise<TSession>,
  ensureSessionTabReadyFn: (sessionId: string, existing: TSession) => Promise<number>
) {
  const session = await getSessionRecordFn(sessionId, fallback);
  const tabId = await ensureSessionTabReadyFn(sessionId, session);
  return {
    session: await getSessionRecordFn(sessionId, session),
    tabId
  };
}
