import type { CMDSession } from '../services/cmd/cmd-session-service.js';
import type { PowerShellSession } from '../services/powershell/powershell-session-service.js';
import type { DesktopScopeRecord } from '../services/desktop-scope/types.js';
import type { BrowserPageSnapshot, BrowserRuntimeInfo } from '../services/browser-automation/types.js';
import type { SidofunClientSession } from '../services/session-manager/session-manager-service.js';

export interface PersistedDaemonState {
  version: 1;
  updatedAt: string;
  daemon?: {
    pid: number;
    startedAt: string;
    pipePath: string;
    protocolVersion?: number;
  };
  clientSessions?: PersistedClientSession[];
  desktopScopes?: PersistedDesktopScope[];
  browserRuntimes?: PersistedBrowserRuntime[];
  browserPages?: PersistedBrowserPage[];
  cmdSessions: PersistedTerminalSession[];
  pwshSessions: PersistedTerminalSession[];
}

export interface PersistedClientSession {
  id: string;
  clientKind: SidofunClientSession['clientKind'];
  name?: string;
  createdAt: string;
  lastActivity: string;
  shutdown: boolean;
  resources: SidofunClientSession['resources'];
}

export interface PersistedDesktopScope extends DesktopScopeRecord {}

export interface PersistedBrowserRuntime extends BrowserRuntimeInfo {}
export interface PersistedBrowserPage extends BrowserPageSnapshot {}

export interface PersistedTerminalSession {
  id: string;
  handle: number;
  title: string;
  currentDirectory: string;
  commandHistory: string[];
  createdAt: string;
  lastActivity: string;
}

export interface DaemonHealth {
  ok: true;
  pid: number;
  startedAt: string;
  pipePath: string;
  protocolVersion: number;
  clientSessionCount: number;
  desktopScopeCount: number;
  browserRuntimeCount: number;
  browserPageCount: number;
  cmdSessionCount: number;
  pwshSessionCount: number;
}

export function serializeCmdSession(session: CMDSession): PersistedTerminalSession {
  return {
    id: session.id,
    handle: session.handle,
    title: session.title,
    currentDirectory: session.currentDirectory,
    commandHistory: [...session.commandHistory],
    createdAt: session.createdAt.toISOString(),
    lastActivity: session.lastActivity.toISOString()
  };
}

export function serializePwshSession(session: PowerShellSession): PersistedTerminalSession {
  return {
    id: session.id,
    handle: session.handle,
    title: session.title,
    currentDirectory: session.currentDirectory,
    commandHistory: [...session.commandHistory],
    createdAt: session.createdAt.toISOString(),
    lastActivity: session.lastActivity.toISOString()
  };
}

export function serializeClientSession(session: SidofunClientSession): PersistedClientSession {
  return {
    id: session.id,
    clientKind: session.clientKind,
    name: session.name,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    shutdown: session.shutdown,
    resources: session.resources.map((resource) => ({
      ...resource,
      metadata: resource.metadata ? { ...resource.metadata } : undefined
    }))
  };
}

export function serializeDesktopScope(scope: DesktopScopeRecord): PersistedDesktopScope {
  return {
    ...scope,
    selectors: {
      windowHandles: [...scope.selectors.windowHandles],
      processIds: [...scope.selectors.processIds],
      titleQuery: scope.selectors.titleQuery
    }
  };
}

export function serializeBrowserRuntime(runtime: BrowserRuntimeInfo): PersistedBrowserRuntime {
  return {
    ...runtime,
    command: [...runtime.command],
    usedProfile: runtime.usedProfile ? {
      ...runtime.usedProfile,
      emails: [...runtime.usedProfile.emails]
    } : undefined,
    launchResult: {
      ...runtime.launchResult,
      command: [...runtime.launchResult.command],
      usedProfile: runtime.launchResult.usedProfile ? {
        ...runtime.launchResult.usedProfile,
        emails: [...runtime.launchResult.usedProfile.emails]
      } : undefined
    }
  };
}

export function serializeBrowserPage(page: BrowserPageSnapshot): PersistedBrowserPage {
  return {
    ...page,
    networkEvents: page.networkEvents.map((event) => ({ ...event })),
    consoleEvents: page.consoleEvents.map((event) => ({ ...event })),
    eventQueue: page.eventQueue.map((event) => ({ ...event }))
  };
}
