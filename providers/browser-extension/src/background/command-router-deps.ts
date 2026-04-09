import type { SidofunBrowserProviderQueuedCommand } from '../protocol.js';
import type {
  ProviderSessionRecord,
  ProviderStorageState,
} from './types.js';

export interface CommandRouterDeps {
  getState: () => Promise<ProviderStorageState>;
  setState: (state: ProviderStorageState) => Promise<void>;
  getWindowTabs: (windowId?: number) => Promise<any[]>;
  getSessionContext: (sessionId: string, fallback?: ProviderSessionRecord) => Promise<{ session: ProviderSessionRecord; tabId: number }>;
  waitForTabComplete: (tabId: number, timeoutMs?: number) => Promise<any>;
  syncSessionFromWindow: (sessionId: string, windowId?: number) => Promise<any>;
  refreshSessionState: (sessionId: string) => Promise<any>;
  pushSessionState: (sessionId: string) => Promise<any>;
  getTabInfo: (tabId: number) => Promise<any>;
  executeStorageScript: <T>(
    tabId: number,
    args: { scope: 'local' | 'session'; key?: string; value?: string; limit?: number },
    operation: 'list' | 'get' | 'set' | 'remove'
  ) => Promise<T>;
  executeDomBridgeWithFallback: <T>(
    tabId: number,
    sessionId: string,
    bridgeKind: string,
    payload: Record<string, unknown>,
    fallbackKind: string,
    fallbackKey: string
  ) => Promise<T | undefined>;
  executeDomBridge: <T>(tabId: number, kind: string, payload?: Record<string, unknown>) => Promise<T | undefined>;
  getTrackedActiveTabId: (existing: ProviderSessionRecord, sessionId: string) => Promise<number>;
  snapshotActiveTab: (tabId?: number) => Promise<any>;
  getSessionRecord: (sessionId: string, fallback?: ProviderSessionRecord) => Promise<ProviderSessionRecord>;
  sendTabCommand: (tabId: number, payload: Record<string, unknown>, sessionId?: string) => Promise<Record<string, any>>;
  waitForFormOutcome: (tabId: number, options: {
    waitUrlIncludes?: string;
    waitText?: string;
    waitSelector?: string;
    waitNoSelector?: string;
    frameSelectors?: string[];
    timeoutMs?: number;
    intervalMs?: number;
  }) => Promise<Record<string, unknown>>;
  executeProviderCommand: (
    command: SidofunBrowserProviderQueuedCommand,
    existing: ProviderSessionRecord
  ) => Promise<{ handled: boolean; result?: any }>;
  executeBrowserStateCommand: (
    command: SidofunBrowserProviderQueuedCommand,
    existing: ProviderSessionRecord
  ) => Promise<{ handled: boolean; result?: any }>;
}
