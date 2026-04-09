import type {
  BrowserAutomationMode,
  BrowserId,
  BrowserLaunchOptions,
  BrowserLaunchResult,
  BrowserProfileInfo
} from '../browser/types.js';

export interface BrowserRuntimeCreateOptions extends Omit<BrowserLaunchOptions, 'automationMode'> {
  automationMode?: Exclude<BrowserAutomationMode, 'standard'>;
}

export interface BrowserRuntimeInfo {
  id: string;
  browserId: BrowserId;
  automationMode: Exclude<BrowserAutomationMode, 'standard'>;
  createdAt: string;
  closedAt?: string;
  status: 'running' | 'closed';
  pid?: number;
  debugPort: number;
  remoteDebuggingUrl: string;
  executablePath: string;
  command: string[];
  usedProfile?: BrowserProfileInfo;
  tempUserDataDir?: string;
  launchResult: BrowserLaunchResult;
}

export interface BrowserRuntimeCloseResult {
  id: string;
  closed: boolean;
  status: 'running' | 'closed';
  closedAt?: string;
  pid?: number;
}

export interface BrowserPageInfo {
  id: string;
  runtimeId: string;
  url: string;
  title: string;
  createdAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
}

export interface BrowserPageSnapshot extends BrowserPageInfo {
  networkEvents: BrowserNetworkEvent[];
  consoleEvents: BrowserConsoleEvent[];
  eventQueue: BrowserPageEvent[];
}

export interface BrowserPageActionResult {
  page: BrowserPageInfo;
}

export interface BrowserPageContentResult {
  page: BrowserPageInfo;
  content: string;
}

export interface BrowserPageScreenshotResult {
  page: BrowserPageInfo;
  path?: string;
}

export interface BrowserPageEvaluateResult {
  page: BrowserPageInfo;
  value: unknown;
}

export interface BrowserPageWaitResult {
  page: BrowserPageInfo;
  matched: boolean;
  waitFor: 'load' | 'selector' | 'title' | 'url';
  query?: string;
}

export interface BrowserPagePdfResult {
  page: BrowserPageInfo;
  path: string;
}

export interface BrowserPageDownloadResult {
  page: BrowserPageInfo;
  path: string;
  url: string;
}

export interface BrowserNetworkEvent {
  pageId: string;
  kind: 'request' | 'response' | 'request-finished' | 'request-failed';
  url: string;
  method?: string;
  status?: number;
  timestamp: string;
  errorText?: string;
}

export interface BrowserConsoleEvent {
  pageId: string;
  type: string;
  text: string;
  timestamp: string;
}

export interface BrowserNetworkWaitResult {
  page: BrowserPageInfo;
  matched: boolean;
  urlIncludes?: string;
  kind?: BrowserNetworkEvent['kind'];
  status?: number;
}

export interface BrowserPageEvent {
  id: number;
  pageId: string;
  category: 'network' | 'console';
  timestamp: string;
  payload: BrowserNetworkEvent | BrowserConsoleEvent;
}

export interface BrowserPageEventCursorResult {
  page: BrowserPageInfo;
  events: BrowserPageEvent[];
  nextCursor: number;
}
