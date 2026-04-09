import { SIDOFUN_DAEMON_PIPE } from '../config/constants.js';
import { OperatorService } from '../operator-cli/operator-service.js';
import { DaemonStateStore } from './state-store.js';
import { createServer, type Server, type Socket } from 'node:net';
import type {
  DaemonHealth,
  PersistedClientSession,
  PersistedDaemonState,
  PersistedDesktopScope,
  PersistedBrowserRuntime,
  PersistedBrowserPage,
  PersistedTerminalSession
} from './types.js';
import {
  serializeClientSession,
  serializeCmdSession,
  serializeDesktopScope,
  serializeBrowserRuntime,
  serializeBrowserPage,
  serializePwshSession
} from './types.js';

const DAEMON_PROTOCOL_VERSION = 2;
const CMD_INITIAL_TYPE_MIN_DELAY_MS = 1500;
const POWERSHELL_INITIAL_TYPE_MIN_DELAY_MS = 5000;

type CommandPayload = {
  type: 'health' | 'command' | 'shutdown';
  action?: string;
  params?: Record<string, unknown>;
};

export class OperatorDaemon {
  private readonly service = new OperatorService();
  private readonly store = new DaemonStateStore();
  private readonly startedAt = new Date().toISOString();
  private server?: Server;

  async start(): Promise<void> {
    await this.restoreState();

    this.server = createServer((socket) => this.handleConnection(socket));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(SIDOFUN_DAEMON_PIPE, () => {
        this.server!.off('error', reject);
        resolve();
      });
    });

    await this.persistState();

    process.on('SIGINT', () => {
      void this.shutdown().finally(() => process.exit(0));
    });
    process.on('SIGTERM', () => {
      void this.shutdown().finally(() => process.exit(0));
    });

    console.error(`Sidofun operator daemon listening on ${SIDOFUN_DAEMON_PIPE}`);
  }

  private getHealth(): DaemonHealth {
    return {
      ok: true,
      pid: process.pid,
      startedAt: this.startedAt,
      pipePath: SIDOFUN_DAEMON_PIPE,
      protocolVersion: DAEMON_PROTOCOL_VERSION,
      clientSessionCount: this.service.runtime.sessionManagerService.listSessions().count,
      desktopScopeCount: this.service.runtime.desktopScopeService.listScopeRecords().length,
      browserRuntimeCount: this.service.runtime.browserAutomationService.listRuntimes().length,
      browserPageCount: this.service.runtime.browserPlaywrightService.pageCount(),
      cmdSessionCount: this.service.runtime.cmdService.listSessions().length,
      pwshSessionCount: this.service.psService.listSessions().length
    };
  }

  private handleConnection(socket: Socket): void {
    let buffer = '';

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      void this.flushBufferedMessages(socket, () => {
        const nextNewline = buffer.indexOf('\n');
        if (nextNewline === -1) {
          return null;
        }
        const raw = buffer.slice(0, nextNewline).trim();
        buffer = buffer.slice(nextNewline + 1);
        return raw;
      });
    });

    socket.on('error', () => {
      socket.destroy();
    });
  }

  private async delay(ms?: number): Promise<void> {
    if (!ms || ms <= 0) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async flushBufferedMessages(socket: Socket, nextMessage: () => string | null): Promise<void> {
    for (;;) {
      const raw = nextMessage();
      if (raw === null) {
        return;
      }
      if (!raw) {
        continue;
      }

      try {
        const message = JSON.parse(raw) as CommandPayload;
        if (message.type === 'health') {
          socket.write(`${JSON.stringify(this.getHealth())}\n`);
          continue;
        }
        if (message.type === 'command') {
          const result = await this.execute(String(message.action), message.params || {});
          socket.write(`${JSON.stringify({ ok: true, result })}\n`);
          continue;
        }
        if (message.type === 'shutdown') {
          socket.write(`${JSON.stringify({ ok: true })}\n`);
          setTimeout(() => {
            void this.shutdown()
              .then(() => process.exit(0))
              .catch(() => process.exit(1));
          }, 100);
          continue;
        }

        socket.write(`${JSON.stringify({ error: `Unknown daemon message type: ${message.type}` })}\n`);
      } catch (error: unknown) {
        socket.write(`${JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        })}\n`);
      }
    }
  }

  private async execute(action: string, params: Record<string, unknown>): Promise<unknown> {
    switch (action) {
      case 'cmd_spawn': {
        const result = await this.service.spawnCMD(params.title as string | undefined, params.cwd as string | undefined);
        if (typeof params.text === 'string' && params.text.length > 0) {
          const requestedDelay = Number(params.delayMs) || 0;
          await this.delay(Math.max(requestedDelay, CMD_INITIAL_TYPE_MIN_DELAY_MS));
          await this.service.typeCMD(result.sessionId, String(params.text));
        }
        if (params.ownerSessionId) {
          this.service.runtime.sessionManagerService.ownResource(String(params.ownerSessionId), {
            type: 'terminal',
            id: result.sessionId,
            metadata: { kind: 'cmd' }
          });
        }
        await this.persistState();
        return result;
      }
      case 'session_create': {
        const result = this.service.createClientSession({
          clientKind: params.clientKind as any,
          name: params.name as string | undefined
        });
        await this.persistState();
        return result;
      }
      case 'session_list':
        return this.service.listClientSessions();
      case 'session_list_idle':
        return this.service.listIdleClientSessions(Number(params.maxIdleMs), params.clientKind as any);
      case 'session_info':
        return this.service.getClientSession(String(params.sessionId));
      case 'session_resources':
        return this.service.runtime.sessionManagerService.listOwnedResources({
          type: params.resourceType as any,
          sessionId: params.sessionId as string | undefined
        });
      case 'session_resource_owners':
        return this.service.runtime.sessionManagerService.getResourceOwners(
          params.resourceType as any,
          String(params.resourceId)
        );
      case 'session_claim_resource': {
        const result = this.service.runtime.sessionManagerService.claimResource(
          String(params.sessionId),
          {
            type: params.resourceType as any,
            id: String(params.resourceId),
            metadata: params.metadata as Record<string, unknown> | undefined
          },
          {
            exclusive: true,
            takeover: params.takeover === true
          }
        );
        await this.persistState();
        return result;
      }
      case 'session_close': {
        const result = await this.service.closeClientSession(String(params.sessionId), params.cleanupOwnedResources !== false);
        await this.persistState();
        return result;
      }
      case 'session_reap_idle': {
        const result = await this.service.reapIdleClientSessions(Number(params.maxIdleMs), {
          clientKind: params.clientKind as any,
          cleanupOwnedResources: params.cleanupOwnedResources !== false
        });
        await this.persistState();
        return result;
      }
      case 'trace_start': {
        const result = await this.service.startTrace(
          params.name as string | undefined,
          params.metadata as Record<string, unknown> | undefined,
          params.ownerSessionId as string | undefined
        );
        await this.persistState();
        return result;
      }
      case 'trace_list':
        return this.service.listTraces();
      case 'trace_info':
        return this.service.getTrace(String(params.traceId));
      case 'trace_export':
        return this.service.exportTrace(String(params.traceId), params.path as string | undefined);
      case 'trace_stop': {
        const result = await this.service.stopTrace(String(params.traceId));
        await this.persistState();
        return result;
      }
      case 'trajectory_start': {
        const result = await this.service.startTrajectory(
          params.name as string | undefined,
          params.metadata as Record<string, unknown> | undefined,
          params.ownerSessionId as string | undefined
        );
        await this.persistState();
        return result;
      }
      case 'trajectory_list':
        return this.service.listTrajectories();
      case 'trajectory_info':
        return this.service.getTrajectory(String(params.trajectoryId));
      case 'trajectory_export':
        return this.service.exportTrajectory(String(params.trajectoryId), params.path as string | undefined);
      case 'trajectory_append_turn': {
        const result = await this.service.appendTrajectoryTurn(String(params.trajectoryId), {
          turnId: String(params.turnId),
          role: params.role as string | undefined,
          prompt: params.prompt,
          response: params.response,
          actions: params.actions as unknown[] | undefined,
          screenshots: params.screenshots as unknown[] | undefined,
          metadata: params.metadata as Record<string, unknown> | undefined
        });
        await this.persistState();
        return result;
      }
      case 'trajectory_stop': {
        const result = await this.service.stopTrajectory(String(params.trajectoryId));
        await this.persistState();
        return result;
      }
      case 'desktop_scope_create': {
        const result = await this.service.createDesktopScope({
          windowHandles: params.windowHandles as number[] | undefined,
          processIds: params.processIds as number[] | undefined,
          titleQuery: params.titleQuery as string | undefined,
          name: params.name as string | undefined,
          ownerSessionId: params.ownerSessionId as string | undefined
        });
        await this.persistState();
        return result;
      }
      case 'desktop_scope_list':
        return this.service.listDesktopScopes();
      case 'desktop_scope_info':
        return this.service.getDesktopScope(String(params.scopeId));
      case 'desktop_scope_focus':
        return this.service.focusDesktopScope(String(params.scopeId));
      case 'desktop_scope_screenshot':
        return this.service.screenshotDesktopScope(String(params.scopeId), {
          filename: params.filename as string | undefined
        });
      case 'desktop_scope_click':
        return this.service.clickDesktopScope(
          String(params.scopeId),
          Number(params.x),
          Number(params.y),
          (params.button as 'left' | 'right' | 'middle' | undefined) ?? 'left'
        );
      case 'desktop_scope_type':
        return this.service.typeDesktopScope(String(params.scopeId), String(params.text));
      case 'desktop_scope_close': {
        const result = await this.service.closeDesktopScope(String(params.scopeId));
        await this.persistState();
        return result;
      }
      case 'browser_runtime_create': {
        const result = await this.service.createBrowserRuntime({
          browserId: params.browser as any,
          profile: params.profile as string | undefined,
          profilePath: params.profilePath as string | undefined,
          url: params.url as string | undefined,
          privateMode: params.privateMode as boolean | undefined,
          headless: params.headless as boolean | undefined,
          args: params.args as string[] | undefined,
          detached: params.detached as boolean | undefined,
          automationMode: params.automationMode as any,
          debugPort: params.debugPort as number | undefined,
          ownerSessionId: params.ownerSessionId as string | undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_runtime_list':
        return this.service.listBrowserRuntimes();
      case 'browser_runtime_info':
        return this.service.getBrowserRuntime(String(params.runtimeId));
      case 'browser_runtime_close': {
        const result = await this.service.closeBrowserRuntime(String(params.runtimeId));
        await this.persistState();
        return result;
      }
      case 'cmd_list':
        await this.reconcileAndPersist();
        return this.service.listCMDSessions();
      case 'cmd_type': {
        const result = await this.service.typeCMD(String(params.sessionId), String(params.text));
        await this.persistState();
        return result;
      }
      case 'cmd_exec': {
        const result = await this.service.execCMD(String(params.sessionId), String(params.command));
        await this.persistState();
        return result;
      }
      case 'cmd_screenshot':
        await this.reconcileAndPersist();
        return this.service.screenshotCMD(
          String(params.sessionId),
          params.filename as string | undefined,
          params.returnBase64 as boolean | undefined
        );
      case 'terminal_spawn': {
        const result = await this.service.spawnTerminal(
          params.kind as 'cmd' | 'pwsh',
          params.title as string | undefined,
          params.ownerSessionId as string | undefined,
          params.cwd as string | undefined
        );
        if (typeof params.text === 'string' && params.text.length > 0) {
          await this.delay(Number(params.delayMs) || 0);
          await this.service.typeTerminal(result.kind, result.sessionId, String(params.text));
        }
        await this.persistState();
        return result;
      }
      case 'terminal_list':
        await this.reconcileAndPersist();
        return this.service.listTerminals(params.kind as 'cmd' | 'pwsh' | undefined);
      case 'terminal_status':
        await this.reconcileAndPersist();
        return this.service.terminalStatus(params.kind as 'cmd' | 'pwsh', String(params.sessionId));
      case 'terminal_focus':
        await this.reconcileAndPersist();
        return this.service.focusTerminal(params.kind as 'cmd' | 'pwsh', String(params.sessionId));
      case 'terminal_type': {
        const result = await this.service.typeTerminal(params.kind as 'cmd' | 'pwsh', String(params.sessionId), String(params.text));
        await this.persistState();
        return result;
      }
      case 'terminal_exec': {
        const result = await this.service.execTerminal(params.kind as 'cmd' | 'pwsh', String(params.sessionId), String(params.command));
        await this.persistState();
        return result;
      }
      case 'terminal_close': {
        const result = await this.service.closeTerminal(params.kind as 'cmd' | 'pwsh', String(params.sessionId));
        await this.persistState();
        return result;
      }
      case 'cmd_status':
        await this.reconcileAndPersist();
        return this.service.getCMDStatus(String(params.sessionId));
      case 'cmd_focus':
        await this.reconcileAndPersist();
        return this.service.focusCMD(String(params.sessionId));
      case 'cmd_activate':
        await this.reconcileAndPersist();
        return this.service.activateCMDByTitle(String(params.titleQuery));
      case 'cmd_close': {
        const result = await this.service.closeCMD(String(params.sessionId));
        await this.persistState();
        return result;
      }
      case 'pwsh_spawn': {
        const result = await this.service.spawnPowerShell(params.title as string | undefined, params.cwd as string | undefined);
        if (typeof params.text === 'string' && params.text.length > 0) {
          const requestedDelay = Number(params.delayMs) || 0;
          await this.delay(Math.max(requestedDelay, POWERSHELL_INITIAL_TYPE_MIN_DELAY_MS));
          await this.service.typePowerShell(result.sessionId, String(params.text));
        }
        if (params.ownerSessionId) {
          this.service.runtime.sessionManagerService.ownResource(String(params.ownerSessionId), {
            type: 'terminal',
            id: result.sessionId,
            metadata: { kind: 'pwsh' }
          });
        }
        await this.persistState();
        return result;
      }
      case 'pwsh_list':
        await this.reconcileAndPersist();
        return this.service.listPowerShellSessions();
      case 'pwsh_type': {
        const result = await this.service.typePowerShell(String(params.sessionId), String(params.text));
        await this.persistState();
        return result;
      }
      case 'pwsh_exec': {
        const result = await this.service.execPowerShell(String(params.sessionId), String(params.command));
        await this.persistState();
        return result;
      }
      case 'pwsh_status':
        await this.reconcileAndPersist();
        return this.service.getPowerShellStatus(String(params.sessionId));
      case 'pwsh_screenshot':
        await this.reconcileAndPersist();
        return this.service.screenshotPowerShell(
          String(params.sessionId),
          params.filename as string | undefined,
          params.returnBase64 as boolean | undefined
        );
      case 'pwsh_focus':
        await this.reconcileAndPersist();
        return this.service.focusPowerShell(String(params.sessionId));
      case 'pwsh_activate':
        await this.reconcileAndPersist();
        return this.service.activatePowerShellByTitle(String(params.titleQuery));
      case 'pwsh_close': {
        const result = await this.service.closePowerShell(String(params.sessionId));
        await this.persistState();
        return result;
      }
      default:
        throw new Error(`Unknown daemon action: ${action}`);
    }
  }

  private async restoreState(): Promise<void> {
    const state = await this.store.read();
    for (const session of state.clientSessions || []) {
      this.service.runtime.sessionManagerService.registerSession(this.deserializeClientSession(session));
    }
    for (const scope of state.desktopScopes || []) {
      this.service.runtime.desktopScopeService.registerScope(this.deserializeDesktopScope(scope));
    }
    for (const runtime of state.browserRuntimes || []) {
      if (runtime.status !== 'running') {
        continue;
      }
      const canReconnect = await this.service.runtime.browserAutomationService.canReconnectRuntime(runtime.remoteDebuggingUrl).catch(() => false);
      if (!canReconnect) {
        continue;
      }
      this.service.runtime.browserAutomationService.registerRuntime(this.deserializeBrowserRuntime(runtime));
    }
    const pagesByRuntime = new Map<string, PersistedBrowserPage[]>();
    for (const page of state.browserPages || []) {
      const pages = pagesByRuntime.get(page.runtimeId) || [];
      pages.push(page);
      pagesByRuntime.set(page.runtimeId, pages);
    }
    for (const [runtimeId, pages] of pagesByRuntime.entries()) {
      try {
        await this.service.runtime.browserPlaywrightService.registerRestoredPages(
          runtimeId,
          pages.map((page) => this.deserializeBrowserPage(page))
        );
      } catch {
        // Best-effort restore for browser pages.
      }
    }
    for (const session of state.cmdSessions) {
      const restored = this.deserializeCmdSession(session);
      this.service.runtime.cmdService.registerSession(restored);
      const isLive = await this.ensureLiveCmdSession(restored.id);
      if (!isLive) {
        this.service.runtime.cmdService.unregisterSession(restored.id);
      }
    }
    for (const session of state.pwshSessions) {
      const restored = this.deserializePwshSession(session);
      this.service.psService.registerSession(restored);
      const isLive = await this.ensureLivePwshSession(restored.id);
      if (!isLive) {
        this.service.psService.unregisterSession(restored.id);
      }
    }
    await this.pruneRestoredOwnedResources();
    await this.reconcileAndPersist();
  }

  private async reconcileAndPersist(): Promise<void> {
    const cmdSessions = [...this.service.runtime.cmdService.listSessions()];
    for (const session of cmdSessions) {
      try {
        const isLive = await this.ensureLiveCmdSession(session.id);
        if (!isLive) {
          this.service.runtime.cmdService.unregisterSession(session.id);
        }
      } catch {
        this.service.runtime.cmdService.unregisterSession(session.id);
      }
    }

    const pwshSessions = [...this.service.psService.listSessions()];
    for (const session of pwshSessions) {
      try {
        const isLive = await this.ensureLivePwshSession(session.id);
        if (!isLive) {
          this.service.psService.unregisterSession(session.id);
        }
      } catch {
        this.service.psService.unregisterSession(session.id);
      }
    }

    await this.persistState();
  }

  private async persistState(includeDaemon: boolean = true): Promise<void> {
    const state: PersistedDaemonState = {
      version: 1,
      updatedAt: new Date().toISOString(),
      clientSessions: this.service.runtime.sessionManagerService.listSessions().sessions.map(serializeClientSession),
      desktopScopes: this.service.runtime.desktopScopeService.listScopeRecords().map(serializeDesktopScope),
      browserRuntimes: this.service.runtime.browserAutomationService.listRuntimes().map(serializeBrowserRuntime),
      browserPages: this.service.runtime.browserPlaywrightService.snapshotPages().map(serializeBrowserPage),
      cmdSessions: this.service.runtime.cmdService.listSessions().map(serializeCmdSession),
      pwshSessions: this.service.psService.listSessions().map(serializePwshSession)
    };
    if (includeDaemon) {
      state.daemon = {
        pid: process.pid,
        startedAt: this.startedAt,
        pipePath: SIDOFUN_DAEMON_PIPE,
        protocolVersion: DAEMON_PROTOCOL_VERSION
      };
    }
    await this.store.write(state);
  }

  private deserializeCmdSession(session: PersistedTerminalSession) {
    return {
      id: session.id,
      handle: session.handle,
      title: session.title,
      currentDirectory: session.currentDirectory,
      commandHistory: [...session.commandHistory],
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity)
    };
  }

  private deserializePwshSession(session: PersistedTerminalSession) {
    return {
      id: session.id,
      handle: session.handle,
      title: session.title,
      currentDirectory: session.currentDirectory,
      commandHistory: [...session.commandHistory],
      createdAt: new Date(session.createdAt),
      lastActivity: new Date(session.lastActivity)
    };
  }

  private deserializeClientSession(session: PersistedClientSession) {
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

  private deserializeDesktopScope(scope: PersistedDesktopScope) {
    return {
      ...scope,
      selectors: {
        windowHandles: [...scope.selectors.windowHandles],
        processIds: [...scope.selectors.processIds],
        titleQuery: scope.selectors.titleQuery
      }
    };
  }

  private deserializeBrowserRuntime(runtime: PersistedBrowserRuntime) {
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

  private deserializeBrowserPage(page: PersistedBrowserPage) {
    return {
      ...page,
      networkEvents: page.networkEvents.map((event) => ({ ...event })),
      consoleEvents: page.consoleEvents.map((event) => ({ ...event })),
      eventQueue: page.eventQueue.map((event) => ({ ...event }))
    };
  }

  private async ensureLiveCmdSession(sessionId: string): Promise<boolean> {
    const existingInfo = this.tryGetCmdSessionInfo(sessionId);
    if (existingInfo && this.isLiveSession(existingInfo)) {
      return true;
    }

    const refreshed = await this.service.runtime.cmdService.refreshSessionHandle(sessionId).catch(() => false);
    if (!refreshed) {
      return false;
    }

    const refreshedInfo = this.tryGetCmdSessionInfo(sessionId);
    return Boolean(refreshedInfo && this.isLiveSession(refreshedInfo));
  }

  private async ensureLivePwshSession(sessionId: string): Promise<boolean> {
    const existingInfo = this.tryGetPwshSessionInfo(sessionId);
    if (existingInfo && this.isLiveSession(existingInfo)) {
      return true;
    }

    const refreshed = await this.service.psService.refreshSessionHandle(sessionId).catch(() => false);
    if (!refreshed) {
      return false;
    }

    const refreshedInfo = this.tryGetPwshSessionInfo(sessionId);
    return Boolean(refreshedInfo && this.isLiveSession(refreshedInfo));
  }

  private tryGetCmdSessionInfo(sessionId: string) {
    try {
      return this.service.runtime.cmdService.getSessionInfo(sessionId);
    } catch {
      return null;
    }
  }

  private tryGetPwshSessionInfo(sessionId: string) {
    try {
      return this.service.psService.getSessionInfo(sessionId);
    } catch {
      return null;
    }
  }

  private isLiveSession(session: {
    rect: { width: number; height: number };
    terminalKind: 'windows_terminal' | 'console' | 'unknown';
    hostProcessName?: string;
  }): boolean {
    if (session.rect.width > 0 && session.rect.height > 0) {
      return true;
    }
    return session.terminalKind !== 'unknown' || Boolean(session.hostProcessName);
  }

  private async pruneRestoredOwnedResources(): Promise<void> {
    const sessionManager = this.service.runtime.sessionManagerService;
    const cmdIds = new Set(this.service.runtime.cmdService.listSessions().map((session) => session.id));
    const pwshIds = new Set(this.service.psService.listSessions().map((session) => session.id));
    const desktopScopeIds = new Set(this.service.runtime.desktopScopeService.listScopeRecords().map((scope) => scope.id));
    const browserRuntimeIds = new Set(this.service.runtime.browserAutomationService.listRuntimes().map((runtime) => runtime.id));
    const traceIds = new Set((await this.service.listTraces()).traces.map((trace) => trace.id));
    const trajectoryIds = new Set((await this.service.listTrajectories()).trajectories.map((trajectory) => trajectory.id));

    for (const session of sessionManager.listSessions().sessions) {
      const survivingResources = session.resources.filter((resource) => {
        if (resource.type === 'desktop_scope') {
          return desktopScopeIds.has(resource.id);
        }
        if (resource.type === 'browser_runtime') {
          return browserRuntimeIds.has(resource.id);
        }
        if (resource.type === 'trace') {
          return traceIds.has(resource.id);
        }
        if (resource.type === 'trajectory') {
          return trajectoryIds.has(resource.id);
        }
        if (resource.type !== 'terminal') {
          return false;
        }
        const kind = resource.metadata?.kind;
        if (kind === 'cmd') {
          return cmdIds.has(resource.id);
        }
        if (kind === 'pwsh') {
          return pwshIds.has(resource.id);
        }
        return false;
      });
      sessionManager.setSessionResources(session.id, survivingResources);
    }
  }

  async shutdown(): Promise<void> {
    const server = this.server;
    this.server = undefined;
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await this.persistState(false);
    this.service.shutdown({ preserveManagedBrowserRuntimes: true });
  }
}
