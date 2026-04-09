import type { BrowserIdValue } from '../../core/command-schemas.js';

export type BrowserId = BrowserIdValue;

export type BrowserProfileStrategy = 'chromium' | 'firefox' | 'single' | 'none';
export type BrowserAutomationMode = 'standard' | 'debuggable' | 'persistent-debuggable';

export interface BrowserLaunchFlags {
  privateMode?: string[];
  headless?: string[];
}

export interface BrowserDefinition {
  id: BrowserId;
  displayName: string;
  executableCandidates: string[];
  processNames?: string[];
  userDataCandidates?: string[];
  profileStrategy: BrowserProfileStrategy;
  supportsProfileDiscovery?: boolean;
  supportsProfileLaunch: boolean;
  launchFlags?: BrowserLaunchFlags;
  notes?: string;
}

export interface BrowserInfo {
  id: BrowserId;
  displayName: string;
  installed: boolean;
  executablePath?: string;
  userDataPath?: string;
  profileStrategy: BrowserProfileStrategy;
  supportsProfileDiscovery: boolean;
  supportsProfiles: boolean;
  supportsProfileLaunch: boolean;
  launchMode: 'profile' | 'direct';
  supportsPrivateMode: boolean;
  supportsHeadless: boolean;
  notes?: string;
}

export interface BrowserProfileInfo {
  id: string;
  browserId: BrowserId;
  name: string;
  displayName: string;
  path: string;
  isDefault: boolean;
  emails: string[];
  lastUsedAt?: string;
}

export interface BrowserLaunchOptions {
  browserId: BrowserId;
  profile?: string;
  profilePath?: string;
  userDataDir?: string;
  url?: string;
  privateMode?: boolean;
  headless?: boolean;
  args?: string[];
  detached?: boolean;
  automationMode?: BrowserAutomationMode;
  debugPort?: number;
}

export interface BrowserLaunchResult {
  browserId: BrowserId;
  executablePath: string;
  command: string[];
  pid?: number;
  usedProfile?: BrowserProfileInfo;
  automationMode?: BrowserAutomationMode;
  debugPort?: number;
  remoteDebuggingUrl?: string;
}

export interface BrowserWindowInfo {
  handle: number;
  title: string;
  processName: string;
  pid: number;
  browserId?: BrowserId;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
