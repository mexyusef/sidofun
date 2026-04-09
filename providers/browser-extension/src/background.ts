import {
  SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
  SIDOFUN_BROWSER_EXTENSION_SERVER,
  type SidofunBrowserExtensionDomEvent,
  type SidofunBrowserExtensionNetworkEvent,
  type SidofunBrowserProviderQueuedCommand,
  type SidofunBrowserProviderSessionState
} from './protocol.js';
import { SIDOFUN_BROWSER_EXTENSION_BUILD_ID } from '../../../src/shared/browser-extension-build-info.js';
import type {
  ProviderSessionRecord,
  ProviderStorageState,
} from './background/types.js';
import {
  ensureContentScript as ensureContentScriptInternal,
  executeDomBridge as executeDomBridgeInternal,
  executeDomBridgeWithFallback as executeDomBridgeWithFallbackInternal,
  executeDomScript as executeDomScriptInternal,
  findReachableContentScriptFrames,
  prioritizeReachableContentScriptFrames,
  sendMessageToFrame,
} from './background/tab-execution.js';
import {
  executeStorageScript,
  findDownloads,
  summarizeCookie,
} from './background/browser-data-utils.js';
import {
  registerBackgroundEventListeners,
} from './background/event-wiring.js';
import {
  createBrowserStateCommandExecutor,
} from './background/browser-state-command-executor.js';
import {
  createCommandRouter,
} from './background/command-router.js';
import {
  createProviderRuntime,
} from './background/provider-runtime.js';
import {
  createProviderCommandExecutor,
} from './background/provider-command-executor.js';
import {
  appendDomEventForTab as appendDomEventForTabInternal,
  appendNetworkEventForTab as appendNetworkEventForTabInternal,
  pushSessionLifecycleEvent as pushSessionLifecycleEventInternal,
} from './background/provider-events.js';
import {
  ensureSessionTabReady as ensureSessionTabReadyInternal,
  getSessionContext as getSessionContextInternal,
  getSessionRecord as getSessionRecordInternal,
  getTrackedActiveTabId as getTrackedActiveTabIdInternal,
  refreshSessionState as refreshSessionStateInternal,
  syncSessionFromWindow as syncSessionFromWindowInternal,
} from './background/session-state.js';
import {
  getTabInfo,
  getWindowTabs,
  snapshotActiveTab as snapshotActiveTabInternal,
} from './background/tab-state.js';

const PROVIDER_ID = 'sidofun-browser-extension';
const STORAGE_KEY = 'sidofun.browser-extension.state';
const POLL_ALARM = 'sidofun-provider-poll';
const POLL_PERIOD_MINUTES = 0.05;
const COMMAND_DRAIN_LIMIT = 5;
const FAST_SYNC_DELAY_MS = 150;
const PROVIDER_LONG_POLL_WAIT_MS = 5000;
const MAX_NETWORK_EVENTS_PER_SESSION = 200;
const MAX_DOM_EVENTS_PER_SESSION = 200;
const TRACKED_WEBREQUEST_URLS = [
  'https://x.com/*',
  'https://twitter.com/*',
  'https://chatgpt.com/*',
  'https://deepseek.com/*',
  'https://chat.deepseek.com/*'
];
const TAB_COMMAND_TIMEOUT_MS = 60_000;
const X_EXTRACTION_TIMEOUT_MS = 20_000;
const X_EXTRACTION_POLL_MS = 1_000;
const LAST_SUCCESSFUL_FRAME_BY_TAB = new Map<number, number>();

function defaultState(): ProviderStorageState {
  return {
    serverBaseUrl: SIDOFUN_BROWSER_EXTENSION_SERVER,
    sessions: {}
  };
}

async function getState(): Promise<ProviderStorageState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return (stored[STORAGE_KEY] as ProviderStorageState | undefined) ?? defaultState();
}

async function setState(state: ProviderStorageState) {
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

async function sidofunFetch(path: string, init?: RequestInit) {
  const state = await getState();
  const response = await fetch(`${state.serverBaseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || `Sidofun request failed: ${response.status}`);
  }
  return payload.result;
}

async function pushProviderEvents(
  sessionId: string,
  payload: {
    networkEvents?: SidofunBrowserExtensionNetworkEvent[];
    domEvents?: SidofunBrowserExtensionDomEvent[];
    events?: Array<{
      id: string;
      kind: 'session_state';
      ok: boolean;
      summary?: string;
      url?: string;
      text?: string;
      error?: string;
      timestamp: string;
    }>;
  }
) {
  if (
    (!payload.networkEvents || payload.networkEvents.length === 0) &&
    (!payload.domEvents || payload.domEvents.length === 0) &&
    (!payload.events || payload.events.length === 0)
  ) {
    return;
  }
  try {
    await sidofunFetch('/browser-extension/provider/events', {
      method: 'POST',
      body: JSON.stringify({
        extensionId: chrome.runtime.id,
        protocolVersion: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
        buildId: SIDOFUN_BROWSER_EXTENSION_BUILD_ID,
        sessionId,
        networkEvents: payload.networkEvents,
        domEvents: payload.domEvents,
        events: payload.events
      })
    });
  } catch (error) {
    console.warn(`[${PROVIDER_ID}] event upsert failed`, error);
  }
}

async function pushSessionState(sessionId: string) {
  const state = await getState();
  const session = state.sessions[sessionId];
  if (!session) {
    return;
  }
  const tabs = session.windowId ? await getWindowTabs(session.windowId) : (session.tabs ?? []);
  const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];
  const payload: SidofunBrowserProviderSessionState = {
    sessionId,
    connected: tabs.length > 0,
    windowId: session.windowId,
    activeTabId: activeTab?.id ?? session.activeTabId,
    tabs,
    site: session.site,
    targetUrl: activeTab?.url ?? session.targetUrl,
    privateMode: session.privateMode,
    snapshot: session.snapshot,
    screenshot: session.screenshot,
    networkEventCount: session.networkEvents?.length ?? 0,
    domEventCount: session.domEvents?.length ?? 0
  };
  try {
    await sidofunFetch('/browser-extension/provider/state', {
      method: 'POST',
      body: JSON.stringify({
        extensionId: chrome.runtime.id,
        protocolVersion: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
        buildId: SIDOFUN_BROWSER_EXTENSION_BUILD_ID,
        session: payload
      })
    });
  } catch (error) {
    console.warn(`[${PROVIDER_ID}] state upsert failed`, error);
  }
}

const providerRuntime = createProviderRuntime<ProviderSessionRecord>({
  providerId: PROVIDER_ID,
  protocolVersion: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
  extensionId: chrome.runtime.id,
  buildId: SIDOFUN_BROWSER_EXTENSION_BUILD_ID,
  pollAlarm: POLL_ALARM,
  pollPeriodMinutes: POLL_PERIOD_MINUTES,
  fastSyncDelayMs: FAST_SYNC_DELAY_MS,
  providerLongPollWaitMs: PROVIDER_LONG_POLL_WAIT_MS,
  commandDrainLimit: COMMAND_DRAIN_LIMIT,
  commandExecutionTimeoutMs: 60_000,
  defaultState,
  getState,
  setState,
  sidofunFetch,
  executeCommand,
  getWindowTabs,
});

const scheduleProviderSync = providerRuntime.scheduleProviderSync;
const heartbeatAndPoll = providerRuntime.heartbeatAndPoll;
const initializeProvider = providerRuntime.initializeProvider;

async function waitForFormOutcome(
  tabId: number,
  options: {
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    frameSelectors?: string[];
    timeoutMs?: number;
    intervalMs?: number;
  }
) {
  const probeSelector = async (selector?: string) => {
    if (!selector) {
      return undefined;
    }
    try {
      const response = await send(tabId, {
        kind: 'inspect',
        selector,
        frameSelectors: options.frameSelectors
      });
      return Boolean(response?.element);
    } catch {
      return undefined;
    }
  };
  const timeoutMs = Math.max(500, options.timeoutMs ?? 15_000);
  const intervalMs = Math.max(100, options.intervalMs ?? 500);
  const deadline = Date.now() + timeoutMs;
  let latestSnapshot = await snapshotActiveTab(tabId);
  while (Date.now() <= deadline) {
    latestSnapshot = await snapshotActiveTab(tabId);
    const selectorFound = await probeSelector(options.waitSelector);
    const noSelectorFound = await probeSelector(options.waitNoSelector);
    const matched = {
      urlIncludes: options.waitUrlIncludes ? Boolean(latestSnapshot?.url?.includes(options.waitUrlIncludes)) : undefined,
      text: options.waitText ? Boolean(latestSnapshot?.text?.includes(options.waitText)) : undefined,
      selector: options.waitSelector ? selectorFound : undefined,
      noSelector: options.waitNoSelector ? !noSelectorFound : undefined
    };
    const satisfied = [
      matched.urlIncludes,
      matched.text,
      matched.selector,
      matched.noSelector
    ].filter((value) => value !== undefined);
    if (satisfied.length === 0 || satisfied.every(Boolean)) {
      return {
        matched,
        snapshot: latestSnapshot
      };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return {
    matched: {
      urlIncludes: options.waitUrlIncludes ? Boolean(latestSnapshot?.url?.includes(options.waitUrlIncludes)) : undefined,
      text: options.waitText ? Boolean(latestSnapshot?.text?.includes(options.waitText)) : undefined,
      selector: await probeSelector(options.waitSelector),
      noSelector: options.waitNoSelector ? !(await probeSelector(options.waitNoSelector)) : undefined
    },
    snapshot: latestSnapshot
  };
}

async function sendTabCommand(tabId: number, payload: Record<string, unknown>, sessionId?: string) {
  const sendMessage = async (targetTabId: number) => {
    const tab = await chrome.tabs.get(targetTabId).catch(() => undefined);
    const reachableFrames = await findReachableContentScriptFrames(targetTabId);
    const targets = prioritizeReachableContentScriptFrames(
      reachableFrames.length > 0 ? reachableFrames : [{ frameId: 0 }],
      tab?.url,
      LAST_SUCCESSFUL_FRAME_BY_TAB.get(targetTabId)
    );
    let lastError: unknown;
    for (const frame of targets) {
      try {
        const response = await sendMessageToFrame<Record<string, unknown>>(
          targetTabId,
          frame.frameId,
          payload,
          Math.min(TAB_COMMAND_TIMEOUT_MS, 2_500)
        );
        LAST_SUCCESSFUL_FRAME_BY_TAB.set(targetTabId, frame.frameId);
        return response;
      } catch (error) {
        lastError = error;
      }
    }
    throw (lastError instanceof Error ? lastError : new Error(`Timed out waiting for browser-extension tab command: ${String(payload.kind)}`));
  };
  try {
    await waitForTabComplete(tabId).catch(() => undefined);
    await ensureContentScript(tabId);
    const response = await sendMessage(tabId);
    if (!response?.ok) {
      throw new Error(response?.error || `Browser-extension tab command failed: ${String(payload.kind)}`);
    }
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('No tab with id') && sessionId) {
      const { tabId: recoveredTabId } = await getSessionContext(sessionId);
      if (recoveredTabId !== tabId) {
        return sendTabCommand(recoveredTabId, payload, sessionId);
      }
    }
    if (!message.includes('Receiving end does not exist')) {
      throw error;
    }
    const installed = await ensureContentScript(tabId);
    if (!installed) {
      throw new Error(`Failed to inject content script into tab ${tabId}`);
    }
    const response = await sendMessage(tabId);
    if (!response?.ok) {
      throw new Error(response?.error || `Browser-extension tab command failed: ${String(payload.kind)}`);
    }
    return response;
  }
}

async function ensureContentScript(tabId: number) {
  return ensureContentScriptInternal(tabId);
}

async function executeDomScript<T>(tabId: number, func: (...args: any[]) => T, args: unknown[] = []): Promise<T | undefined> {
  return executeDomScriptInternal(tabId, func, args, waitForTabComplete);
}

async function executeDomBridge<T>(tabId: number, kind: string, payload?: Record<string, unknown>): Promise<T | undefined> {
  return executeDomBridgeInternal(tabId, kind, payload, waitForTabComplete);
}

async function executeDomBridgeWithFallback<T>(
  tabId: number,
  sessionId: string,
  bridgeKind: string,
  payload: Record<string, unknown>,
  fallbackKind: string,
  fallbackKey: string
): Promise<T | undefined> {
  return executeDomBridgeWithFallbackInternal(
    tabId,
    sessionId,
    bridgeKind,
    payload,
    fallbackKind,
    fallbackKey,
    waitForTabComplete,
    sendTabCommand
  );
}

async function snapshotActiveTab(tabId?: number) {
  return snapshotActiveTabInternal(tabId, executeDomBridge);
}

async function refreshSessionState(sessionId: string) {
  return refreshSessionStateInternal(sessionId, getState, setState);
}

async function syncSessionFromWindow(sessionId: string, windowId?: number) {
  return syncSessionFromWindowInternal(sessionId, windowId, getState, setState, pushSessionState);
}

async function getSessionRecord(sessionId: string, fallback?: ProviderSessionRecord) {
  return getSessionRecordInternal(sessionId, getState, fallback);
}

async function getTrackedActiveTabId(existing: ProviderSessionRecord, sessionId: string) {
  return getTrackedActiveTabIdInternal(existing, sessionId, getState, setState, pushSessionState);
}

async function ensureSessionTabReady(sessionId: string, existing: ProviderSessionRecord) {
  return ensureSessionTabReadyInternal(
    sessionId,
    existing,
    waitForTabComplete,
    syncSessionFromWindow,
    getTrackedActiveTabId
  );
}

async function getSessionContext(sessionId: string, fallback?: ProviderSessionRecord) {
  return getSessionContextInternal(sessionId, fallback, getSessionRecord, ensureSessionTabReady);
}

async function appendNetworkEventForTab(
  tabId: number,
  event: Omit<SidofunBrowserExtensionNetworkEvent, 'id' | 'windowId'>
) {
  return appendNetworkEventForTabInternal(
    tabId,
    event,
    MAX_NETWORK_EVENTS_PER_SESSION,
    getState,
    setState,
    pushProviderEvents
  );
}

async function appendDomEventForTab(
  tabId: number,
  event: Omit<SidofunBrowserExtensionDomEvent, 'id'>
) {
  return appendDomEventForTabInternal(
    tabId,
    event,
    MAX_DOM_EVENTS_PER_SESSION,
    getState,
    setState,
    pushProviderEvents
  );
}

async function pushSessionLifecycleEvent(
  sessionId: string,
  summary: string,
  extras?: {
    url?: string;
    text?: string;
    error?: string;
  }
) {
  return pushSessionLifecycleEventInternal(sessionId, summary, pushProviderEvents, extras);
}

const executeProviderCommand = createProviderCommandExecutor<ProviderSessionRecord>({
  navigateActiveSessionTab,
  getTrackedActiveTabId,
  send: sendTabCommand,
  executeDomBridgeWithFallback,
  normalizeXProfileUrl,
});

const executeBrowserStateCommand = createBrowserStateCommandExecutor<ProviderSessionRecord, ProviderStorageState>({
  getSessionContext,
  getTabInfo,
  findDownloads,
  summarizeCookie,
  getState,
  setState,
  updateSession: (state, sessionId, updater) => {
    const existing = state.sessions[sessionId];
    if (!existing) {
      throw new Error(`Session ${sessionId} is no longer available`);
    }
    return {
      ...state,
      sessions: {
        ...state.sessions,
        [sessionId]: updater(existing)
      }
    };
  }
});

const executeCommandRouter = createCommandRouter({
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
  executeDomBridgeWithFallback,
  executeDomBridge,
  getTrackedActiveTabId,
  snapshotActiveTab,
  getSessionRecord,
  sendTabCommand,
  waitForFormOutcome,
  executeProviderCommand,
  executeBrowserStateCommand,
});

async function waitForTabComplete(tabId: number, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const tab = await chrome.tabs.get(tabId).catch(() => undefined);
    if (tab?.status === 'complete') {
      return tab;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return chrome.tabs.get(tabId).catch(() => undefined);
}

async function navigateActiveSessionTab(sessionId: string, existing: ProviderSessionRecord, targetUrl: string) {
  const { tabId } = await getSessionContext(sessionId, existing);
  await chrome.tabs.update(tabId, { url: targetUrl, active: true });
  await waitForTabComplete(tabId, 35_000);
  await refreshSessionState(sessionId);
  return tabId;
}

function normalizeXProfileUrl(handleOrUrl: string) {
  const normalized = handleOrUrl.trim();
  if (!normalized) {
    throw new Error('A non-empty X profile handle or URL is required');
  }
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  const handle = normalized.replace(/^@/, '');
  return `https://x.com/${encodeURIComponent(handle)}`;
}

async function executeCommand(command: SidofunBrowserProviderQueuedCommand) {
  return executeCommandRouter(command);
}

registerBackgroundEventListeners<ProviderSessionRecord>({
  protocolVersion: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
  providerId: PROVIDER_ID,
  extensionId: chrome.runtime.id,
  pollAlarm: POLL_ALARM,
  trackedWebRequestUrls: TRACKED_WEBREQUEST_URLS,
  initializeProvider,
  scheduleProviderSync,
  getState,
  setState,
  getWindowTabs,
  pushSessionState,
  pushSessionLifecycleEvent,
  ensureContentScript,
  appendDomEventForTab,
  appendNetworkEventForTab,
});

void initializeProvider();
