export type OpenCliOutputFormat = 'json' | 'yaml' | 'table' | 'csv' | 'md';

export interface OpenCliSiteInfo {
  site: string;
  commands: string[];
}

export interface OpenCliStatus {
  available: boolean;
  mode: 'binary' | 'cargo' | 'unavailable';
  executablePath?: string;
  repoPath: string;
  cargoManifestPath: string;
  extensionPath?: string;
  adapterSiteCount: number;
  adapterCommandCount: number;
  twitterAvailable: boolean;
  notes: string[];
}

export interface OpenCliWorkspaceEntry {
  name: string;
  path: string;
}

export interface OpenCliSessionWorkspaceBinding {
  sessionId: string;
  workspace: string;
  path: string;
}

export interface OpenCliRunOptions {
  site: string;
  command: string;
  args?: string[];
  cwd?: string;
  workspace?: string;
  ownerSessionId?: string;
  timeoutMs?: number;
  keepBrowserOpen?: boolean;
  waitAfterMs?: number;
  maximizeBrowser?: boolean;
  format?: OpenCliOutputFormat;
}

export interface OpenCliRunResult {
  site: string;
  command: string;
  args: string[];
  cwd: string;
  exitCode: number;
  success: boolean;
  timedOut: boolean;
  mode: 'binary' | 'cargo';
  executablePath?: string;
  commandLine: string[];
  stdout: string;
  stderr: string;
  parsed?: unknown;
  summary: string;
  workspace?: OpenCliWorkspaceEntry;
  ownerSessionId?: string;
  keepBrowserOpen?: boolean;
  waitAfterMs?: number;
  maximizeBrowser?: boolean;
}

export interface OpenCliDoctorOptions {
  cwd?: string;
  workspace?: string;
  ownerSessionId?: string;
  timeoutMs?: number;
}

export interface TwitterSearchOptions {
  query: string;
  mode?: 'top' | 'latest' | 'live' | 'people' | 'media';
  limit?: number;
  cwd?: string;
  workspace?: string;
  ownerSessionId?: string;
  timeoutMs?: number;
  keepBrowserOpen?: boolean;
  waitAfterMs?: number;
  maximizeBrowser?: boolean;
}

export interface TwitterTimelineOptions {
  type?: 'for-you' | 'following';
  limit?: number;
  cwd?: string;
  workspace?: string;
  ownerSessionId?: string;
  timeoutMs?: number;
  keepBrowserOpen?: boolean;
  waitAfterMs?: number;
  maximizeBrowser?: boolean;
}

export interface TwitterBookmarksOptions {
  limit?: number;
  cwd?: string;
  workspace?: string;
  ownerSessionId?: string;
  timeoutMs?: number;
  keepBrowserOpen?: boolean;
  waitAfterMs?: number;
  maximizeBrowser?: boolean;
}

export interface TwitterPostOptions {
  text: string;
  cwd?: string;
  workspace?: string;
  ownerSessionId?: string;
  timeoutMs?: number;
  keepBrowserOpen?: boolean;
  waitAfterMs?: number;
  maximizeBrowser?: boolean;
}
