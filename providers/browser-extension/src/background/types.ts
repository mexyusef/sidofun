import type {
  SidofunBrowserExtensionDomEvent,
  SidofunBrowserExtensionNetworkEvent,
  SidofunBrowserExtensionScreenshot,
  SidofunBrowserExtensionSnapshot,
  SidofunBrowserExtensionTab,
} from '../protocol.js';

export interface ProviderSessionRecord {
  sessionId: string;
  windowId?: number;
  activeTabId?: number;
  tabs?: SidofunBrowserExtensionTab[];
  snapshot?: SidofunBrowserExtensionSnapshot;
  screenshot?: SidofunBrowserExtensionScreenshot;
  networkEvents?: SidofunBrowserExtensionNetworkEvent[];
  domEvents?: SidofunBrowserExtensionDomEvent[];
  site?: string;
  targetUrl?: string;
  privateMode?: boolean;
  connected: boolean;
  updatedAt: string;
}

export interface ProviderStorageState {
  serverBaseUrl: string;
  sessions: Record<string, ProviderSessionRecord>;
}
