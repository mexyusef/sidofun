import { SIDOFUN_BROWSER_EXTENSION_PROTOCOL, type SidofunBrowserExtensionSnapshot, type SidofunBrowserExtensionTab } from '../protocol.js';

export interface ProviderSessionTabState {
  windowId?: number;
  tabs?: SidofunBrowserExtensionTab[];
  site?: string;
  targetUrl?: string;
}

type ExecuteDomBridge = <T>(tabId: number, kind: string, payload?: Record<string, unknown>) => Promise<T | undefined>;

export async function getTabInfo(tabId: number): Promise<SidofunBrowserExtensionTab | undefined> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return {
      id: tab.id!,
      windowId: tab.windowId,
      url: tab.url,
      title: tab.title,
      active: tab.active,
      status: tab.status,
      favIconUrl: tab.favIconUrl
    };
  } catch {
    return undefined;
  }
}

export async function getWindowTabs(windowId?: number) {
  if (!windowId) {
    return [];
  }
  const tabs = await chrome.tabs.query({ windowId });
  return tabs
    .filter((tab): tab is chrome.tabs.Tab & { id: number } => typeof tab.id === 'number')
    .map((tab) => ({
      id: tab.id,
      windowId: tab.windowId,
      url: tab.url,
      title: tab.title,
      active: tab.active,
      status: tab.status,
      favIconUrl: tab.favIconUrl
    }));
}

export function getSessionSiteHosts(session: ProviderSessionTabState) {
  const targetUrl = typeof session.targetUrl === 'string' ? session.targetUrl : undefined;
  const site = typeof session.site === 'string' ? session.site.toLowerCase() : undefined;
  const hosts = new Set<string>();
  if (targetUrl) {
    try {
      hosts.add(new URL(targetUrl).hostname.toLowerCase());
    } catch {
      // ignore invalid targetUrl
    }
  }
  if (site === 'deepseek.com') {
    hosts.add('chat.deepseek.com');
    hosts.add('deepseek.com');
  } else if (site) {
    hosts.add(site);
  }
  return [...hosts];
}

export async function snapshotActiveTab(
  tabId: number | undefined,
  executeDomBridge: ExecuteDomBridge
) {
  if (!tabId) {
    return undefined;
  }
  try {
    const snapshot = await executeDomBridge<SidofunBrowserExtensionSnapshot>(tabId, 'snapshot', { limit: 6000 });
    if (snapshot) {
      return snapshot as SidofunBrowserExtensionSnapshot | undefined;
    }
  } catch {
    // fall through to content-script path
  }
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      protocol: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
      kind: 'snapshot'
    }, { frameId: 0 });
    return response?.snapshot as SidofunBrowserExtensionSnapshot | undefined;
  } catch {
    return undefined;
  }
}
