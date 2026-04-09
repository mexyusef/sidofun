import type { BrowserExtensionWorkflowSessionOwnership } from './browserext-workflow-execution-state.js';

export type BrowserExtensionWorkflowTabLike = {
  id?: number;
  windowId?: number;
  url?: string;
  active?: boolean;
};

export type BrowserExtensionWorkflowOwnershipResolution = BrowserExtensionWorkflowSessionOwnership & {
  availableTabIds: number[];
  availableTabs: Array<{
    id: number;
    url?: string;
    active?: boolean;
  }>;
  exactTabId?: number;
  hostTabId?: number;
};

export function resolveBrowserExtensionWorkflowOwnership(
  sessionId: string,
  tabs: BrowserExtensionWorkflowTabLike[],
  options: {
    targetUrl?: string;
    targetHost?: string;
    privateMode?: boolean;
    preferredTabId?: number;
    matchesUrl: (tabUrl: string | undefined, targetUrl: string | undefined) => boolean;
  }
): BrowserExtensionWorkflowOwnershipResolution {
  const pinnedTab = options.preferredTabId ? tabs.find((tab) => tab.id === options.preferredTabId) : undefined;
  const exactTab = tabs.find((tab) => options.matchesUrl(tab.url, options.targetUrl));
  const hostTab = tabs.find((tab) => {
    if (!tab?.url || !options.targetHost) {
      return false;
    }
    try {
      return new URL(tab.url).hostname === options.targetHost;
    } catch {
      return false;
    }
  });
  const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];
  const selected = pinnedTab ?? exactTab ?? hostTab ?? activeTab;
  if (!selected?.id) {
    throw new Error(`Workflow session ${sessionId} has no available tab to own`);
  }
  const matchedBy = pinnedTab?.id === selected.id
    ? 'pinned-tab'
    : exactTab?.id === selected.id
      ? 'exact-url'
      : hostTab?.id === selected.id
        ? 'host'
        : 'active-tab';
  return {
    sessionId,
    pinnedTabId: selected.id,
    windowId: selected.windowId,
    targetUrl: options.targetUrl,
    targetHost: options.targetHost,
    privateMode: options.privateMode === true,
    matchedBy,
    availableTabIds: tabs.map((tab) => tab.id).filter((id): id is number => typeof id === 'number'),
    availableTabs: tabs
      .filter((tab): tab is BrowserExtensionWorkflowTabLike & { id: number } => typeof tab.id === 'number')
      .map((tab) => ({
        id: tab.id,
        url: tab.url,
        active: tab.active
      })),
    exactTabId: exactTab?.id,
    hostTabId: hostTab?.id,
  };
}

export function assertBrowserExtensionWorkflowOwnership(
  sessionId: string,
  expected: BrowserExtensionWorkflowSessionOwnership | undefined,
  refreshed: BrowserExtensionWorkflowOwnershipResolution
) {
  if (expected?.pinnedTabId && refreshed.pinnedTabId !== expected.pinnedTabId) {
    throw new Error(
      `Workflow lost pinned tab ownership for session ${sessionId}: expected tab ${expected.pinnedTabId}, resolved tab ${refreshed.pinnedTabId} via ${refreshed.matchedBy}. Available tabs: ${refreshed.availableTabs.map((tab) => `${tab.id}:${tab.url ?? 'unknown'}${tab.active ? ':active' : ''}`).join(', ') || 'none'}`
    );
  }
  if (expected?.pinnedTabId && expected.targetUrl && refreshed.matchedBy !== 'pinned-tab') {
    throw new Error(
      `Workflow tab ownership degraded for session ${sessionId}: expected pinned target ${expected.targetUrl}, resolved via ${refreshed.matchedBy}. Exact match: ${refreshed.exactTabId ?? 'none'}, host match: ${refreshed.hostTabId ?? 'none'}. Available tabs: ${refreshed.availableTabs.map((tab) => `${tab.id}:${tab.url ?? 'unknown'}${tab.active ? ':active' : ''}`).join(', ') || 'none'}`
    );
  }
}
