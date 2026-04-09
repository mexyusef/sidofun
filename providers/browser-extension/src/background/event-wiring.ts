interface SessionRecordLike {
  sessionId: string;
  windowId?: number;
  activeTabId?: number;
  tabs?: Array<{ id: number; url?: string; active?: boolean }>;
  targetUrl?: string;
  privateMode?: boolean;
  connected: boolean;
  updatedAt: string;
  networkEvents?: unknown[];
  domEvents?: unknown[];
}

interface StorageStateLike<TSession extends SessionRecordLike> {
  sessions: Record<string, TSession>;
}

interface BackgroundEventDeps<TSession extends SessionRecordLike> {
  protocolVersion: string;
  providerId: string;
  extensionId: string;
  pollAlarm: string;
  trackedWebRequestUrls: string[];
  initializeProvider: () => Promise<void>;
  scheduleProviderSync: (delayMs?: number) => void;
  getState: () => Promise<StorageStateLike<TSession>>;
  setState: (state: StorageStateLike<TSession>) => Promise<void>;
  getWindowTabs: (windowId?: number) => Promise<Array<{ id: number; url?: string; active?: boolean }>>;
  pushSessionState: (sessionId: string) => Promise<void>;
  pushSessionLifecycleEvent: (sessionId: string, summary: string, extras?: { url?: string; text?: string; error?: string }) => Promise<void>;
  ensureContentScript: (tabId: number) => Promise<unknown>;
  appendDomEventForTab: (tabId: number, event: any) => Promise<void>;
  appendNetworkEventForTab: (tabId: number, event: any) => Promise<void>;
}

export function registerBackgroundEventListeners<TSession extends SessionRecordLike>(
  deps: BackgroundEventDeps<TSession>
) {
  chrome.runtime.onInstalled.addListener(() => {
    void deps.initializeProvider();
  });

  chrome.runtime.onStartup.addListener(() => {
    void deps.initializeProvider();
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === deps.pollAlarm) {
      deps.scheduleProviderSync(0);
    }
  });

  chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
    void (async () => {
      const state = await deps.getState();
      let changed = false;
      for (const session of Object.values(state.sessions)) {
        if (session.windowId === removeInfo.windowId) {
          session.tabs = await deps.getWindowTabs(removeInfo.windowId);
          session.activeTabId = session.tabs.find((tab) => tab.active)?.id;
          session.targetUrl = session.tabs.find((tab) => tab.id === session.activeTabId)?.url ?? session.targetUrl;
          session.connected = session.tabs.length > 0;
          session.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
      if (changed) {
        await deps.setState(state);
        await Promise.all(Object.keys(state.sessions).map(async (sessionId) => {
          await deps.pushSessionState(sessionId);
          await deps.pushSessionLifecycleEvent(sessionId, 'Tracked tab was removed from the browser-extension session');
        }));
        deps.scheduleProviderSync();
      }
    })();
  });

  chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
    if (typeof tab.windowId !== 'number') {
      return;
    }
    void (async () => {
      if (tab.status === 'complete' && /^https?:/i.test(tab.url ?? '')) {
        await deps.ensureContentScript(tabId).catch(() => undefined);
      }
      const state = await deps.getState();
      let changed = false;
      for (const session of Object.values(state.sessions)) {
        if (session.windowId === tab.windowId) {
          session.tabs = await deps.getWindowTabs(tab.windowId);
          session.activeTabId = session.tabs.find((entry) => entry.active)?.id;
          session.targetUrl = session.tabs.find((entry) => entry.id === tabId)?.url ?? session.targetUrl;
          session.connected = session.tabs.length > 0;
          session.networkEvents = session.networkEvents ?? [];
          session.domEvents = session.domEvents ?? [];
          session.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
      if (changed) {
        await deps.setState(state);
        await Promise.all(Object.keys(state.sessions).map(async (sessionId) => {
          await deps.pushSessionState(sessionId);
          await deps.pushSessionLifecycleEvent(sessionId, 'Tracked tab metadata changed in the browser-extension session', {
            url: state.sessions[sessionId]?.targetUrl
          });
        }));
        deps.scheduleProviderSync();
      }
    })();
  });

  chrome.tabs.onActivated.addListener((activeInfo) => {
    void (async () => {
      const state = await deps.getState();
      let changed = false;
      for (const session of Object.values(state.sessions)) {
        if (session.windowId === activeInfo.windowId) {
          session.tabs = await deps.getWindowTabs(activeInfo.windowId);
          session.activeTabId = activeInfo.tabId;
          session.targetUrl = session.tabs.find((entry) => entry.id === activeInfo.tabId)?.url ?? session.targetUrl;
          session.connected = session.tabs.length > 0;
          session.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
      if (changed) {
        await deps.setState(state);
        await Promise.all(Object.keys(state.sessions).map(async (sessionId) => {
          await deps.pushSessionState(sessionId);
          await deps.pushSessionLifecycleEvent(sessionId, 'Active tab changed in the browser-extension session', {
            url: state.sessions[sessionId]?.targetUrl
          });
        }));
        deps.scheduleProviderSync();
      }
    })();
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.protocol !== deps.protocolVersion) {
      return false;
    }
    if (message.kind === 'provider-status') {
      sendResponse({
        ok: true,
        providerId: deps.providerId,
        protocol: deps.protocolVersion,
        extensionId: deps.extensionId
      });
      return true;
    }
    if (message.kind === 'dom_event' && typeof sender.tab?.id === 'number' && message.event) {
      void deps.appendDomEventForTab(sender.tab.id, {
        url: typeof message.event.url === 'string' ? message.event.url : undefined,
        types: Array.isArray(message.event.types)
          ? message.event.types.filter((value: unknown): value is 'childList' | 'attributes' | 'characterData' => (
              value === 'childList' || value === 'attributes' || value === 'characterData'
            ))
          : [],
        targetTagName: typeof message.event.targetTagName === 'string' ? message.event.targetTagName : undefined,
        targetSelector: typeof message.event.targetSelector === 'string' ? message.event.targetSelector : undefined,
        addedNodeCount: Number.isFinite(Number(message.event.addedNodeCount)) ? Number(message.event.addedNodeCount) : undefined,
        removedNodeCount: Number.isFinite(Number(message.event.removedNodeCount)) ? Number(message.event.removedNodeCount) : undefined,
        attributeNames: Array.isArray(message.event.attributeNames)
          ? message.event.attributeNames.filter((value: unknown): value is string => typeof value === 'string')
          : undefined,
        textSample: typeof message.event.textSample === 'string' ? message.event.textSample : undefined,
        timestamp: typeof message.event.timestamp === 'string' ? message.event.timestamp : new Date().toISOString()
      });
      deps.scheduleProviderSync();
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  chrome.webRequest.onBeforeRequest.addListener((details) => {
    if (details.tabId >= 0) {
      void deps.appendNetworkEventForTab(details.tabId, {
        tabId: details.tabId,
        url: details.url,
        method: details.method,
        type: details.type,
        stage: 'request',
        timestamp: new Date().toISOString()
      });
      deps.scheduleProviderSync();
    }
  }, { urls: deps.trackedWebRequestUrls });

  chrome.webRequest.onCompleted.addListener((details) => {
    if (details.tabId >= 0) {
      void deps.appendNetworkEventForTab(details.tabId, {
        tabId: details.tabId,
        url: details.url,
        method: details.method,
        type: details.type,
        stage: 'response',
        statusCode: details.statusCode,
        statusLine: details.statusLine,
        timestamp: new Date().toISOString()
      });
      deps.scheduleProviderSync();
    }
  }, { urls: deps.trackedWebRequestUrls });

  chrome.webRequest.onErrorOccurred.addListener((details) => {
    if (details.tabId >= 0) {
      void deps.appendNetworkEventForTab(details.tabId, {
        tabId: details.tabId,
        url: details.url,
        method: details.method,
        type: details.type,
        stage: 'error',
        error: details.error,
        timestamp: new Date().toISOString()
      });
      deps.scheduleProviderSync();
    }
  }, { urls: deps.trackedWebRequestUrls });
}
