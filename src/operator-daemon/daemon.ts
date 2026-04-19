import { SIDOFUN_DAEMON_PIPE } from '../config/constants.js';
import { OperatorService } from '../operator-cli/operator-service.js';
import { DaemonStateStore } from './state-store.js';
import fs from 'node:fs';
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

const DAEMON_PROTOCOL_VERSION = 3;
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
      case 'browser_runtime_windows':
        return this.service.listBrowserRuntimeWindows(
          Array.isArray(params.runtimeIds) && params.runtimeIds.length
            ? params.runtimeIds.map((value) => String(value))
            : undefined
        );
      case 'browser_runtime_bind': {
        const result = this.service.bindBrowserRuntimeWindow(
          String(params.runtimeId),
          typeof params.windowHandle === 'number' ? params.windowHandle : undefined
        );
        await this.persistState();
        return result;
      }
      case 'browser_runtime_open_tab': {
        const result = await this.service.openBrowserPage(
          String(params.runtimeId),
          typeof params.url === 'string' ? params.url : undefined
        );
        await this.persistState();
        return result;
      }
      case 'browser_runtime_tile':
        return this.service.tileBrowserRuntimeWindows({
          runtimeIds: Array.isArray(params.runtimeIds) && params.runtimeIds.length
            ? params.runtimeIds.map((value) => String(value))
            : undefined,
          preset: params.preset as '2-up' | '3-column' | '2x2' | 'main-left' | 'main-right' | 'newsroom-5' | 'newsroom-6' | undefined,
          columns: typeof params.columns === 'number' ? params.columns : undefined,
          gap: typeof params.gap === 'number' ? params.gap : undefined,
          area: typeof params.area === 'object' && params.area
            ? {
                x: Number((params.area as Record<string, unknown>).x),
                y: Number((params.area as Record<string, unknown>).y),
                width: Number((params.area as Record<string, unknown>).width),
                height: Number((params.area as Record<string, unknown>).height)
              }
            : undefined
        });
      case 'browser_runtime_close': {
        const result = await this.service.closeBrowserRuntime(String(params.runtimeId));
        await this.persistState();
        return result;
      }
      case 'browser_page_list':
        return this.service.listBrowserPages(typeof params.runtimeId === 'string' ? params.runtimeId : undefined);
      case 'browser_page_open': {
        const result = await this.service.openBrowserPage(
          String(params.runtimeId),
          typeof params.url === 'string' ? params.url : undefined
        );
        await this.persistState();
        return result;
      }
      case 'browser_page_info':
        return this.service.getBrowserPage(String(params.pageId));
      case 'browser_page_locate':
        return this.service.locateBrowserPage(String(params.pageId), String(params.query), {
          kind: params.kind as 'field' | 'button' | 'link' | 'any' | undefined,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          limit: typeof params.limit === 'number' ? params.limit : undefined
        });
      case 'browser_page_fill_query': {
        const result = await this.service.fillBrowserPageQuery(
          String(params.pageId),
          String(params.query),
          String(params.value),
          {
            exact: params.exact === true,
            formSelector: params.formSelector as string | undefined,
            rootSelector: params.rootSelector as string | undefined
          }
        );
        await this.persistState();
        return result;
      }
      case 'browser_page_click_query': {
        const result = await this.service.clickBrowserPageQuery(
          String(params.pageId),
          String(params.query),
          {
            kind: params.kind as 'field' | 'button' | 'link' | 'any' | undefined,
            exact: params.exact === true,
            formSelector: params.formSelector as string | undefined,
            rootSelector: params.rootSelector as string | undefined
          }
        );
        await this.persistState();
        return result;
      }
      case 'browser_page_submit': {
        const result = await this.service.submitBrowserPage(String(params.pageId), {
          query: params.query as string | undefined,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_wait_text':
        return this.service.waitForBrowserPageText(String(params.pageId), String(params.text), {
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
      case 'browser_page_form_workflow': {
        const result = await this.service.formWorkflowBrowserPage(String(params.pageId), {
          fields: Array.isArray(params.fields)
            ? params.fields.map((field) => ({
                query: String((field as Record<string, unknown>).query),
                value: String((field as Record<string, unknown>).value)
              }))
            : [],
          submit: params.submit === true,
          submitQuery: params.submitQuery as string | undefined,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          waitUrlIncludes: params.waitUrlIncludes as string | undefined,
          waitText: params.waitText as string | undefined,
          waitSelector: params.waitSelector as string | undefined,
          waitNoSelector: params.waitNoSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_auth_login': {
        const result = await this.service.authLoginBrowserPage(String(params.pageId), {
          email: params.email as string | undefined,
          username: params.username as string | undefined,
          password: String(params.password),
          submitQuery: params.submitQuery as string | undefined,
          skipSubmit: params.skipSubmit === true,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          waitUrlIncludes: params.waitUrlIncludes as string | undefined,
          waitText: params.waitText as string | undefined,
          waitSelector: params.waitSelector as string | undefined,
          waitNoSelector: params.waitNoSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_auth_signup': {
        const result = await this.service.authSignupBrowserPage(String(params.pageId), {
          fullName: params.fullName as string | undefined,
          username: params.username as string | undefined,
          email: params.email as string | undefined,
          password: String(params.password),
          confirmPassword: params.confirmPassword as string | undefined,
          submitQuery: params.submitQuery as string | undefined,
          skipSubmit: params.skipSubmit === true,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          waitUrlIncludes: params.waitUrlIncludes as string | undefined,
          waitText: params.waitText as string | undefined,
          waitSelector: params.waitSelector as string | undefined,
          waitNoSelector: params.waitNoSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_open_workflow': {
        const result = await this.service.openWorkflowBrowserPage(String(params.runtimeId), {
          url: String(params.url),
          fields: Array.isArray(params.fields)
            ? params.fields.map((field) => ({
                query: String((field as Record<string, unknown>).query),
                value: String((field as Record<string, unknown>).value)
              }))
            : [],
          submit: params.submit === true,
          submitQuery: params.submitQuery as string | undefined,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          waitUrlIncludes: params.waitUrlIncludes as string | undefined,
          waitText: params.waitText as string | undefined,
          waitSelector: params.waitSelector as string | undefined,
          waitNoSelector: params.waitNoSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_open_and_login': {
        const result = await this.service.openAndLoginBrowserPage(String(params.runtimeId), {
          url: String(params.url),
          email: params.email as string | undefined,
          username: params.username as string | undefined,
          password: String(params.password),
          submitQuery: params.submitQuery as string | undefined,
          skipSubmit: params.skipSubmit === true,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          waitUrlIncludes: params.waitUrlIncludes as string | undefined,
          waitText: params.waitText as string | undefined,
          waitSelector: params.waitSelector as string | undefined,
          waitNoSelector: params.waitNoSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_open_and_signup': {
        const result = await this.service.openAndSignupBrowserPage(String(params.runtimeId), {
          url: String(params.url),
          fullName: params.fullName as string | undefined,
          username: params.username as string | undefined,
          email: params.email as string | undefined,
          password: String(params.password),
          confirmPassword: params.confirmPassword as string | undefined,
          submitQuery: params.submitQuery as string | undefined,
          skipSubmit: params.skipSubmit === true,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          waitUrlIncludes: params.waitUrlIncludes as string | undefined,
          waitText: params.waitText as string | undefined,
          waitSelector: params.waitSelector as string | undefined,
          waitNoSelector: params.waitNoSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_profile_list':
        return this.service.listBrowserPageProfiles(params.profileFile as string | undefined);
      case 'browser_page_profile_info':
        return this.service.getBrowserPageProfile(String(params.profileId), params.profileFile as string | undefined);
      case 'browser_policy_get':
        return this.service.getBrowserNavigationPolicy();
      case 'browser_policy_set':
        return this.service.setBrowserNavigationPolicy({
          enabled: typeof params.enabled === 'boolean' ? params.enabled : undefined,
          allowList: Array.isArray(params.allowList) ? params.allowList.map((entry) => String(entry)) : undefined,
          denyList: Array.isArray(params.denyList) ? params.denyList.map((entry) => String(entry)) : undefined
        });
      case 'browser_page_profile_login': {
        const result = await this.service.loginBrowserPageProfile(String(params.runtimeId), String(params.profileId), {
          profileFile: params.profileFile as string | undefined,
          url: params.url as string | undefined,
          email: params.email as string | undefined,
          username: params.username as string | undefined,
          password: params.password as string | undefined,
          confirmPassword: params.confirmPassword as string | undefined,
          fullName: params.fullName as string | undefined,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_profile_signup': {
        const result = await this.service.signupBrowserPageProfile(String(params.runtimeId), String(params.profileId), {
          profileFile: params.profileFile as string | undefined,
          url: params.url as string | undefined,
          email: params.email as string | undefined,
          username: params.username as string | undefined,
          password: params.password as string | undefined,
          confirmPassword: params.confirmPassword as string | undefined,
          fullName: params.fullName as string | undefined,
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined,
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_dom':
        return this.service.snapshotBrowserPageDom(String(params.pageId));
      case 'browser_page_fill_commit': {
        const result = await this.service.fillCommitBrowserPage(String(params.pageId), String(params.selector), String(params.value));
        await this.persistState();
        return result;
      }
      case 'browser_page_wait_ready':
        return this.service.waitReadyBrowserPage(String(params.pageId), (params.selectors as string[]) || [], {
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined,
          stableReads: typeof params.stableReads === 'number' ? params.stableReads : undefined
        });
      case 'browser_page_click_text': {
        const result = await this.service.clickTextBrowserPage(String(params.pageId), String(params.text), {
          exact: params.exact !== false,
          withinSelector: params.withinSelector as string | undefined,
          topRegionOnly: params.topRegionOnly === true,
          topRegionMax: typeof params.topRegionMax === 'number' ? params.topRegionMax : undefined,
          allowLinks: params.allowLinks !== false,
          settleAfter: params.settleAfter as 'dom' | 'page' | 'network' | undefined,
          settleTimeoutMs: typeof params.settleTimeoutMs === 'number' ? params.settleTimeoutMs : undefined,
          settleStableReads: typeof params.settleStableReads === 'number' ? params.settleStableReads : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_check_agreement': {
        const result = await this.service.checkAgreementBrowserPage(String(params.pageId), {
          selector: params.selector as string | undefined,
          labelTextIncludes: params.labelTextIncludes as string[] | undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_settle':
        return this.service.settleBrowserPage(String(params.pageId), params.mode as 'dom' | 'page' | 'network', {
          timeoutMs: typeof params.timeoutMs === 'number' ? params.timeoutMs : undefined,
          intervalMs: typeof params.intervalMs === 'number' ? params.intervalMs : undefined,
          stableReads: typeof params.stableReads === 'number' ? params.stableReads : undefined,
          quietMs: typeof params.quietMs === 'number' ? params.quietMs : undefined
        });
      case 'browser_page_complete_profile': {
        const result = await this.service.completeProfileBrowserPage(String(params.pageId), {
          email: String(params.email),
          username: params.username as string | undefined,
          fullName: params.fullName as string | undefined,
          usernameSelector: params.usernameSelector as string | undefined,
          fullNameSelector: params.fullNameSelector as string | undefined,
          agreementSelector: params.agreementSelector as string | undefined,
          agreementTextIncludes: params.agreementTextIncludes as string[] | undefined,
          submitText: params.submitText as string | undefined,
          waitReadyTimeoutMs: typeof params.waitReadyTimeoutMs === 'number' ? params.waitReadyTimeoutMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_signup_step': {
        const result = await this.service.signupStepBrowserPage(String(params.pageId), {
          email: String(params.email),
          password: String(params.password),
          emailSelector: params.emailSelector as string | undefined,
          passwordSelector: params.passwordSelector as string | undefined,
          submitText: params.submitText as string | undefined,
          waitReadyTimeoutMs: typeof params.waitReadyTimeoutMs === 'number' ? params.waitReadyTimeoutMs : undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_scroll': {
        const result = await this.service.scrollBrowserPage(
          String(params.pageId),
          params.direction as 'up' | 'down' | 'top' | 'bottom',
          params.query as string | undefined
        );
        await this.persistState();
        return result;
      }
      case 'browser_page_scroll_text': {
        const result = await this.service.scrollBrowserPageToText(
          String(params.pageId),
          String(params.text),
          typeof params.nth === 'number' ? params.nth : undefined
        );
        await this.persistState();
        return result;
      }
      case 'browser_page_send_keys': {
        const result = await this.service.sendKeysBrowserPage(
          String(params.pageId),
          String(params.keys),
          params.query as string | undefined
        );
        await this.persistState();
        return result;
      }
      case 'browser_page_select_options':
        return this.service.getBrowserPageSelectOptions(String(params.pageId), String(params.query), {
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined
        });
      case 'browser_page_select_option': {
        const result = await this.service.selectBrowserPageOption(String(params.pageId), String(params.query), String(params.text), {
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_detect_file_uploader':
        return this.service.detectBrowserPageFileUploader(String(params.pageId), String(params.query), {
          exact: params.exact === true,
          formSelector: params.formSelector as string | undefined,
          rootSelector: params.rootSelector as string | undefined
        });
      case 'browser_page_replay': {
        const payload = JSON.parse(fs.readFileSync(String(params.filePath), 'utf8')) as { actions?: unknown[] };
        const actions = Array.isArray(payload) ? payload : payload.actions;
        if (!Array.isArray(actions)) {
          throw new Error(`browser page replay file must be a JSON array or an object with an "actions" array: ${String(params.filePath)}`);
        }
        const result = await this.service.replayBrowserPage(
          String(params.pageId),
          actions.map((entry) => entry as import('../services/browser-automation/types.js').BrowserPageRecordedAction)
        );
        await this.persistState();
        return result;
      }
      case 'browser_agent_run': {
        const payload = JSON.parse(fs.readFileSync(String(params.filePath), 'utf8')) as {
          goal?: string;
          steps?: unknown[];
        };
        if (!Array.isArray(payload.steps)) {
          throw new Error(`browser agent file must be a JSON object with a "steps" array: ${String(params.filePath)}`);
        }
        const result = await this.service.runBrowserAgent({
          runtimeId: String(params.runtimeId),
          url: params.url as string | undefined,
          goal: (params.goal as string | undefined) ?? payload.goal,
          trajectoryId: params.trajectoryId as string | undefined,
          steps: payload.steps as import('../services/browser-automation/types.js').BrowserAgentPlanStep[]
        });
        await this.persistState();
        return result;
      }
      case 'browser_page_close': {
        const result = await this.service.closeBrowserPage(String(params.pageId));
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
