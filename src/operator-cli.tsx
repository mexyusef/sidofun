#!/usr/bin/env bun
import { getOperatorHelpText, parseOperatorCommand } from './operator-cli/args.js';
import { getOperatorConfigPath, getOperatorConfigValue, setOperatorConfigValue } from './operator-cli/config-file.js';
import { daemonCommand, ensureDaemonRunning, getDaemonHealth, stopDaemon } from './operator-cli/daemon-client.js';
import type { OperatorService } from './operator-cli/operator-service.js';
import {
  renderBrowserLaunch,
  renderBrowserProfiles,
  renderBrowsers,
  renderDaemonHealth,
  renderDoctor,
  renderLocalCoderList,
  renderLocalCoderStatus,
  renderOperationResult,
  renderSessions,
  renderSessionStatus
} from './operator-cli/render.js';

function printResult(result: unknown, json: boolean): void {
  process.stdout.write(`${json ? JSON.stringify(result, null, 2) : String(result)}\n`);
}

async function main() {
  const command = parseOperatorCommand(process.argv.slice(2));
  if (command.kind === 'help') {
    process.stdout.write(`${getOperatorHelpText()}\n`);
    return;
  }
  let service: OperatorService | undefined;
  try {
    switch (command.kind) {
      case 'doctor':
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        printResult(command.json ? service.getDoctorStatus() : renderDoctor(service.getDoctorStatus()), command.json);
        break;
      case 'config_get': {
        const value = getOperatorConfigValue(command.key);
        const result = command.key
          ? { key: command.key, value, path: getOperatorConfigPath() }
          : { config: value, path: getOperatorConfigPath() };
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'config_set': {
        const config = setOperatorConfigValue(command.key, command.value);
        const result = {
          key: command.key,
          value: command.value,
          path: getOperatorConfigPath(),
          config
        };
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'clipboard_read': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.readClipboard();
        printResult(result, command.json);
        break;
      }
      case 'clipboard_write': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.writeClipboard(command.text);
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'clipboard_clear': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clearClipboard();
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'clipboard_status': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getClipboardStatus();
        printResult(command.json ? result : `Clipboard\nLength: ${result.length}\nHas Text: ${result.hasText ? 'yes' : 'no'}\nText: ${result.text}`, command.json);
        break;
      }
      case 'session_create': {
        const result = await daemonCommand('session_create', {
          clientKind: command.clientKind,
          name: command.name
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_list': {
        const result = await daemonCommand('session_list');
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_list_idle': {
        const result = await daemonCommand('session_list_idle', {
          maxIdleMs: command.maxIdleMs,
          clientKind: command.clientKind
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_reap_idle': {
        const result = await daemonCommand('session_reap_idle', {
          maxIdleMs: command.maxIdleMs,
          clientKind: command.clientKind,
          cleanupOwnedResources: command.cleanupOwnedResources
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_info': {
        const result = await daemonCommand('session_info', { sessionId: command.sessionId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_resources': {
        const result = await daemonCommand('session_resources', {
          resourceType: command.resourceType,
          sessionId: command.sessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_resource_owners': {
        const result = await daemonCommand('session_resource_owners', {
          resourceType: command.resourceType,
          resourceId: command.resourceId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_claim_resource': {
        const result = await daemonCommand('session_claim_resource', {
          sessionId: command.sessionId,
          resourceType: command.resourceType,
          resourceId: command.resourceId,
          takeover: command.takeover
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'session_close': {
        const result = await daemonCommand('session_close', {
          sessionId: command.sessionId,
          cleanupOwnedResources: command.cleanupOwnedResources
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trace_start': {
        const result = await daemonCommand('trace_start', {
          name: command.name,
          ownerSessionId: command.ownerSessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trace_list': {
        const result = await daemonCommand('trace_list');
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trace_info': {
        const result = await daemonCommand('trace_info', { traceId: command.traceId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trace_export': {
        const result = await daemonCommand('trace_export', { traceId: command.traceId, path: command.path });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trace_stop': {
        const result = await daemonCommand('trace_stop', { traceId: command.traceId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trajectory_start': {
        const result = await daemonCommand('trajectory_start', {
          name: command.name,
          ownerSessionId: command.ownerSessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trajectory_list': {
        const result = await daemonCommand('trajectory_list');
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trajectory_info': {
        const result = await daemonCommand('trajectory_info', { trajectoryId: command.trajectoryId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trajectory_export': {
        const result = await daemonCommand('trajectory_export', { trajectoryId: command.trajectoryId, path: command.path });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trajectory_append_turn': {
        const result = await daemonCommand('trajectory_append_turn', {
          trajectoryId: command.trajectoryId,
          turnId: command.turnId,
          role: command.role,
          prompt: command.prompt,
          response: command.response
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'trajectory_stop': {
        const result = await daemonCommand('trajectory_stop', { trajectoryId: command.trajectoryId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_create': {
        const result = await daemonCommand('desktop_scope_create', {
          windowHandles: command.windowHandles,
          processIds: command.processIds,
          titleQuery: command.titleQuery,
          name: command.name,
          ownerSessionId: command.ownerSessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_list': {
        const result = await daemonCommand('desktop_scope_list');
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_info': {
        const result = await daemonCommand('desktop_scope_info', { scopeId: command.scopeId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_focus': {
        const result = await daemonCommand('desktop_scope_focus', { scopeId: command.scopeId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_screenshot': {
        const result = await daemonCommand('desktop_scope_screenshot', { scopeId: command.scopeId, filename: command.filename });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_click': {
        const result = await daemonCommand('desktop_scope_click', { scopeId: command.scopeId, x: command.x, y: command.y, button: command.button });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_type': {
        const result = await daemonCommand('desktop_scope_type', { scopeId: command.scopeId, text: command.text });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'desktop_scope_close': {
        const result = await daemonCommand('desktop_scope_close', { scopeId: command.scopeId });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'shell_run': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.runShell(command.command, {
          shell: command.shell,
          cwd: command.cwd,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : `${result.shell} exit=${result.exitCode} success=${result.success}\n${result.stdout || result.stderr}`, command.json);
        break;
      }
      case 'terminal_spawn': {
        const result = await daemonCommand('terminal_spawn', {
          kind: command.terminalKind,
          title: command.title,
          cwd: command.cwd,
          text: command.text,
          delayMs: command.delayMs,
          ownerSessionId: command.ownerSessionId
        });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'terminal_list': {
        const result = await daemonCommand('terminal_list', { kind: command.terminalKind });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'terminal_status': {
        const result = await daemonCommand('terminal_status', {
          kind: command.terminalKind,
          sessionId: command.sessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'terminal_focus': {
        const result = await daemonCommand('terminal_focus', {
          kind: command.terminalKind,
          sessionId: command.sessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'terminal_type': {
        const result = await daemonCommand('terminal_type', {
          kind: command.terminalKind,
          sessionId: command.sessionId,
          text: command.text
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'terminal_exec': {
        const result = await daemonCommand('terminal_exec', {
          kind: command.terminalKind,
          sessionId: command.sessionId,
          command: command.command
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'terminal_close': {
        const result = await daemonCommand('terminal_close', {
          kind: command.terminalKind,
          sessionId: command.sessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'daemon_start': {
        const result = await ensureDaemonRunning();
        printResult(command.json ? result : renderDaemonHealth(result), command.json);
        break;
      }
      case 'daemon_status': {
        const result = await getDaemonHealth();
        if (!result) {
          throw new Error('Sidofun operator daemon is not running');
        }
        printResult(command.json ? result : renderDaemonHealth(result), command.json);
        break;
      }
      case 'daemon_stop': {
        const stopped = await stopDaemon();
        const result = { message: stopped ? 'Stopped Sidofun operator daemon' : 'Sidofun operator daemon was not running' };
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'browsers_list':
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        printResult(command.json ? service.listBrowsers() : renderBrowsers(service.listBrowsers()), command.json);
        break;
      case 'browser_profiles': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const profiles = service.listBrowserProfiles(command.browserId as any);
        printResult(command.json ? profiles : renderBrowserProfiles(command.browserId, profiles), command.json);
        break;
      }
      case 'browser_launch': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.launchBrowser({
          browserId: command.browserId as any,
          profile: command.profile,
          url: command.url,
          privateMode: command.privateMode,
          headless: command.headless
        });
        printResult(command.json ? result : renderBrowserLaunch(result), command.json);
        break;
      }
      case 'browser_runtime_create': {
        const result = await daemonCommand('browser_runtime_create', {
          browser: command.browserId,
          profile: command.profile,
          url: command.url,
          privateMode: command.privateMode,
          headless: command.headless,
          automationMode: command.automationMode,
          debugPort: command.debugPort,
          ownerSessionId: command.ownerSessionId
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_runtime_list': {
        const result = await daemonCommand('browser_runtime_list');
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_runtime_info': {
        const result = await daemonCommand('browser_runtime_info', { runtimeId: command.runtimeId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_runtime_close': {
        const result = await daemonCommand('browser_runtime_close', { runtimeId: command.runtimeId });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_status': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getBrowserExtensionStatus();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_capabilities': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.getBrowserExtensionCapabilities();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_sites': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.listBrowserExtensionSites();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_provider': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionProvider(command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workspace_list': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.listBrowserExtensionWorkspaces();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workspace_get': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.getBrowserExtensionWorkspace(command.name);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workspace_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.setBrowserExtensionWorkspace(command.name, command.path, command.sites);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workspace_clear': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.clearBrowserExtensionWorkspace(command.name);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_create': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.createBrowserExtensionSession({
          workspace: command.workspace,
          site: command.site,
          targetUrl: command.targetUrl,
          name: command.name,
          privateMode: command.privateMode
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_list': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.listBrowserExtensionSessions();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_info': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.getBrowserExtensionSession(command.sessionId);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_refresh': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.refreshBrowserExtensionSession(command.sessionId);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_reconnect': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.reconnectBrowserExtensionSession(command.sessionId, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_wait_ready': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionSessionReady(command.sessionId, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_close': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.closeBrowserExtensionSession(command.sessionId);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_nuke': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.nukeBrowserExtensionSessions({
          site: command.site,
          staleOnly: command.staleOnly,
          connectedOnly: command.connectedOnly,
          disconnectedOnly: command.disconnectedOnly,
          queue: command.queue
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_queue_clear': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.clearBrowserExtensionQueuedCommands({
          sessionId: command.sessionId,
          site: command.site,
          status: command.status
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_tabs': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionTabs(command.sessionId);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_frames': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionFrames(command.sessionId, command.frameSelectors, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_navigate': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.navigateBrowserExtensionSession(command.sessionId, command.targetUrl, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_back': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionBack(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_forward': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionForward(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_reload': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionReload(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_metadata': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionMetadata(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_url_parts': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionUrlParts(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_storage_list': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionListStorage(command.sessionId, {
          scope: command.scope,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_storage_get': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionGetStorageEntry(command.sessionId, command.key, {
          scope: command.scope,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_storage_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionSetStorageEntry(command.sessionId, command.key, command.value, {
          scope: command.scope,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_storage_remove': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionRemoveStorageEntry(command.sessionId, command.key, {
          scope: command.scope,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_focus_tab': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.focusBrowserExtensionTab(command.sessionId, command.tabId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_snapshot': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.snapshotBrowserExtensionSession(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_scroll_page': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.scrollBrowserExtensionPage(command.sessionId, {
          direction: command.direction,
          amount: command.amount,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dom_tree': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.domTreeBrowserExtensionSession(
          command.sessionId,
          command.selector,
          command.frameSelectors,
          command.maxDepth,
          command.maxChildren,
          command.timeoutMs
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_screenshot': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.screenshotBrowserExtensionSession(command.sessionId, {
          filename: command.filename,
          returnBase64: !command.filename,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_inspect': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.inspectBrowserExtensionSession(command.sessionId, command.selector, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_inspect_all': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.inspectAllBrowserExtensionSession(command.sessionId, command.selector, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_locate': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.locateBrowserExtensionPage(
          command.sessionId,
          command.query,
          command.by,
          command.selector,
          command.frameSelectors,
          command.maxDepth,
          command.maxChildren,
          command.limit,
          command.timeoutMs
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_click_query': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionQuery(command.sessionId, command.query, {
          by: command.by,
          selector: command.selector,
          frameSelectors: command.frameSelectors,
          maxDepth: command.maxDepth,
          maxChildren: command.maxChildren,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_links': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionLinks(command.sessionId, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_actionables': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionActionables(command.sessionId, {
          selector: command.selector,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_page_state': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.readBrowserExtensionPageState(command.sessionId, {
          selector: command.selector,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          maxDepth: command.maxDepth,
          maxChildren: command.maxChildren,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_page_diff': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.diffBrowserExtensionPageState(command.sessionId, {
          againstFile: command.againstFile,
          selector: command.selector,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          maxDepth: command.maxDepth,
          maxChildren: command.maxChildren,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_page_blockers': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.readBrowserExtensionPageBlockers(command.sessionId, {
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_page_outcomes': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.readBrowserExtensionPageOutcomes(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_page_recover': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.recoverBrowserExtensionPage(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          continueOnError: command.continueOnError
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_page_ready': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.ensureBrowserExtensionPageReady(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          continueOnError: command.continueOnError
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_page_ready': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.ensureBrowserExtensionPageReady(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          continueOnError: command.continueOnError
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_next_actions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionNextActions(command.sessionId, {
          selector: command.selector,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          maxDepth: command.maxDepth,
          maxChildren: command.maxChildren,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_markdown': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionMarkdown(command.sessionId, command.selector, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_readability': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionReadability(command.sessionId, command.selector, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dialogs': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionDialogs(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dialog_actions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionDialogActions(command.sessionId, command.query, {
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dialog_actions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionDialogActions(command.sessionId, command.query, {
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_banners': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionBanners(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_banner_dismiss': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.dismissBrowserExtensionBanner(command.sessionId, command.query, {
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_loading_states': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionLoadingStates(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_empty_states': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionEmptyStates(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dialog_close': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.closeBrowserExtensionDialog(command.sessionId, command.query, {
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dialog_action': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionDialogAction(command.sessionId, command.actionQuery, {
          dialogQuery: command.dialogQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dialog_action': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionDialogAction(command.sessionId, command.actionQuery, {
          dialogQuery: command.dialogQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_menus': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionMenus(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_menu_select': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectBrowserExtensionMenuOption(command.sessionId, command.optionQuery, {
          menuQuery: command.menuQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_disclosures': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionDisclosures(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_disclosure_toggle': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.toggleBrowserExtensionDisclosure(command.sessionId, command.query, {
          desiredState: command.desiredState,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_dialog': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionDialog(command.sessionId, {
          query: command.query,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_no_dialog': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForNoBrowserExtensionDialog(command.sessionId, {
          query: command.query,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_menu': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionMenu(command.sessionId, {
          query: command.query,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_no_menu': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForNoBrowserExtensionMenu(command.sessionId, {
          query: command.query,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_disclosure': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionDisclosureState(command.sessionId, {
          query: command.query,
          expanded: command.state === 'open' ? true : command.state === 'closed' ? false : undefined,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collections': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionCollections(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_controls': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionCollectionControls(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_active_filters': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionActiveCollectionFilters(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_sort_state': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionCollectionSortState(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_filter_tokens': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionCollectionFilterTokens(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_rows': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionCollectionRows(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_find': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.findBrowserExtensionCollectionRows(command.sessionId, {
          query: command.query,
          cellQuery: command.cellQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_values': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getBrowserExtensionCollectionValues(command.sessionId, {
          cellQuery: command.cellQuery,
          rowQuery: command.rowQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_values_diff': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.diffBrowserExtensionCollectionValues(command.sessionId, {
          cellQuery: command.cellQuery,
          againstFile: command.againstFile,
          rowQuery: command.rowQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_stats': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getBrowserExtensionCollectionStats(command.sessionId, {
          cellQuery: command.cellQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_stats_diff': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.diffBrowserExtensionCollectionStats(command.sessionId, {
          againstFile: command.againstFile,
          cellQuery: command.cellQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_row': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getBrowserExtensionCollectionRow(command.sessionId, {
          rowQuery: command.rowQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_cell': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getBrowserExtensionCollectionCell(command.sessionId, {
          rowQuery: command.rowQuery,
          cellQuery: command.cellQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_collection_row': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionCollectionRow(command.sessionId, {
          rowQuery: command.rowQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_collection_count': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionCollectionCount(command.sessionId, {
          count: command.count,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_row_actions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionCollectionRowActions(command.sessionId, {
          rowQuery: command.rowQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_selection_state': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getBrowserExtensionCollectionSelectionState(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_sort': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.sortBrowserExtensionCollection(command.sessionId, command.valueQuery, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_filter': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.filterBrowserExtensionCollection(command.sessionId, command.query, command.value, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_filter_clear': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clearBrowserExtensionCollectionFilter(command.sessionId, command.query, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_filter_token_clear': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clearBrowserExtensionCollectionFilterToken(command.sessionId, command.query, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_clear_all_filters': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clearAllBrowserExtensionCollectionFilters(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          continueOnError: command.continueOnError,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_click': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionCollectionItem(command.sessionId, command.itemQuery, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_row_click': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionCollectionRowAction(command.sessionId, {
          rowQuery: command.rowQuery,
          actionQuery: command.actionQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_row_select': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectBrowserExtensionCollectionRow(command.sessionId, {
          rowQuery: command.rowQuery,
          desiredState: command.desiredState,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_select_all': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectAllBrowserExtensionCollectionRows(command.sessionId, {
          desiredState: command.desiredState,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_row_details': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getBrowserExtensionCollectionRowDetails(command.sessionId, {
          rowQuery: command.rowQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_row_expand': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.expandBrowserExtensionCollectionRow(command.sessionId, {
          rowQuery: command.rowQuery,
          desiredState: command.desiredState,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_bulk_action': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.bulkClickBrowserExtensionCollectionRows(command.sessionId, {
          rowQueries: command.rowQueries,
          actionQuery: command.actionQuery,
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          continueOnError: command.continueOnError,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_export': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.exportBrowserExtensionCollection(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          includeSelection: command.includeSelection,
          includeDetails: command.includeDetails,
          format: command.format,
          filePath: command.filePath,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_diff': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.diffBrowserExtensionCollection(command.sessionId, {
          collectionQuery: command.collectionQuery,
          againstFile: command.againstFile,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          dedupeBy: command.dedupeBy,
          includeSelection: command.includeSelection,
          includeDetails: command.includeDetails,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_collection_diff': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionCollectionDiff(command.sessionId, {
          collectionQuery: command.collectionQuery,
          againstFile: command.againstFile,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          dedupeBy: command.dedupeBy,
          includeSelection: command.includeSelection,
          includeDetails: command.includeDetails,
          addedAtLeast: command.addedAtLeast,
          removedAtLeast: command.removedAtLeast,
          changedAtLeast: command.changedAtLeast,
          unchangedAtLeast: command.unchangedAtLeast,
          rowAdded: command.rowAdded,
          rowRemoved: command.rowRemoved,
          rowChanged: command.rowChanged,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_paginations': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listBrowserExtensionPaginations(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_pagination_click': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionPagination(command.sessionId, command.query, {
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_load_more': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionLoadMore(command.sessionId, {
          query: command.query,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_collection_harvest': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.harvestBrowserExtensionCollection(command.sessionId, {
          collectionQuery: command.collectionQuery,
          strategy: command.strategy,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          limit: command.limit,
          maxIterations: command.maxIterations,
          stableIterations: command.stableIterations,
          settleQuietMs: command.settleQuietMs,
          dedupeBy: command.dedupeBy,
          scrollAmount: command.scrollAmount,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_evaluate': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.evaluateBrowserExtensionSession(command.sessionId, command.expression, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_click': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clickBrowserExtensionSession(command.sessionId, command.selector, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_type': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.typeBrowserExtensionSession(command.sessionId, command.selector, command.text, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_press': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.pressBrowserExtensionSession(command.sessionId, command.key, command.selector, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_editor_read': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.editorReadBrowserExtensionSession(command.sessionId, command.selector, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_editor_fill': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.editorFillBrowserExtensionSession(command.sessionId, command.selector, command.value, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_fill': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.formFillBrowserExtensionSession(command.sessionId, command.selector, command.value, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_fill_human': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.formFillHumanBrowserExtensionSession(command.sessionId, command.selector, command.value, {
          timeoutMs: command.timeoutMs,
          frameSelectors: command.frameSelectors,
          delayMs: command.delayMs,
          jitterMs: command.jitterMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_fill_many': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.formFillManyBrowserExtensionSession(command.sessionId, command.fields, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_workflow': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.runBrowserExtensionFormWorkflow(command.sessionId, {
          fields: command.fields,
          frameSelectors: command.frameSelectors,
          formSelector: command.formSelector,
          contextIndex: command.contextIndex,
          contextQuery: command.contextQuery,
          frameQuery: command.frameQuery,
          exact: command.exact,
          submit: command.submit,
          submitSelector: command.submitSelector,
          delayMs: command.delayMs,
          waitUrlIncludes: command.waitUrlIncludes,
          waitText: command.waitText,
          waitSelector: command.waitSelector,
          waitNoSelector: command.waitNoSelector,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_context_plan': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.contextPlanBrowserExtensionSession(command.sessionId, {
          frameSelectors: command.frameSelectors,
          formSelector: command.formSelector,
          contextIndex: command.contextIndex,
          contextQuery: command.contextQuery,
          frameQuery: command.frameQuery,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_context_state': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionContextState(command.sessionId, {
          frameSelectors: command.frameSelectors,
          formSelector: command.formSelector,
          contextIndex: command.contextIndex,
          contextQuery: command.contextQuery,
          frameQuery: command.frameQuery,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_query_plan': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.planBrowserExtensionQueryWorkflow(command.sessionId, {
          fills: command.fills,
          clicks: command.clicks,
          radios: command.radios,
          segmenteds: command.segmenteds,
          ranges: command.ranges,
          toggles: command.toggles,
          frameSelectors: command.frameSelectors,
          formSelector: command.formSelector,
          contextQuery: command.contextQuery,
          frameQuery: command.frameQuery,
          exact: command.exact,
          submit: command.submit,
          submitSelector: command.submitSelector,
          submitQuery: command.submitQuery
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_query_workflow': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.runBrowserExtensionQueryWorkflow(command.sessionId, {
          fills: command.fills,
          clicks: command.clicks,
          radios: command.radios,
          segmenteds: command.segmenteds,
          ranges: command.ranges,
          toggles: command.toggles,
          frameSelectors: command.frameSelectors,
          formSelector: command.formSelector,
          contextQuery: command.contextQuery,
          frameQuery: command.frameQuery,
          exact: command.exact,
          submit: command.submit,
          submitSelector: command.submitSelector,
          submitQuery: command.submitQuery,
          delayMs: command.delayMs,
          waitUrlIncludes: command.waitUrlIncludes,
          waitText: command.waitText,
          waitSelector: command.waitSelector,
          waitNoSelector: command.waitNoSelector,
          requireTexts: command.requireTexts,
          requireNoTexts: command.requireNoTexts,
          requireSelectors: command.requireSelectors,
          requireNoSelectors: command.requireNoSelectors,
          settleAfterEach: command.settleAfterEach,
          settleQuietMs: command.settleQuietMs,
          stableReads: command.stableReads,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workflow_plan': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.planBrowserExtensionWorkflowFile(command.sessionId, command.filepath, command.variables);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workflow_validate': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.validateBrowserExtensionWorkflowFile(command.filepath);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workflow_diagnose': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.diagnoseBrowserExtensionWorkflowFile(command.sessionId, command.filepath, command.variables);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_workflow_run': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.runBrowserExtensionWorkflowFile(command.sessionId, command.filepath, command.variables);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_fields': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listFormFieldsBrowserExtensionSession(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_values': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listFormValuesBrowserExtensionSession(command.sessionId, {
          frameSelectors: command.frameSelectors,
          formSelector: command.formSelector,
          contextQuery: command.contextQuery,
          frameQuery: command.frameQuery,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_contexts': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listFormContextsBrowserExtensionSession(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_radio_groups': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listRadioGroupsBrowserExtensionSession(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_segmented_options': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listSegmentedGroupsBrowserExtensionSession(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_find_field': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.findFormFieldBrowserExtensionSession(command.sessionId, command.query, command.frameSelectors, command.exact, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_radio_select': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectRadioOptionBrowserExtensionSession(
          command.sessionId,
          command.query,
          command.value,
          command.frameSelectors,
          command.exact,
          command.timeoutMs,
          command.formSelector
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_segmented_select': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectSegmentedOptionBrowserExtensionSession(
          command.sessionId,
          command.query,
          command.value,
          command.frameSelectors,
          command.exact,
          command.timeoutMs,
          command.formSelector
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_tablist_options': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listTablistsBrowserExtensionSession(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_tablist_select': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectTablistBrowserExtensionSession(
          command.sessionId,
          command.query,
          command.value,
          {
            frameSelectors: command.frameSelectors,
            exact: command.exact,
            timeoutMs: command.timeoutMs,
            formSelector: command.formSelector
          }
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_stepper': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listSteppersBrowserExtensionSession(command.sessionId, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_stepper_move': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.moveStepperBrowserExtensionSession(command.sessionId, command.direction, {
          query: command.query,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs,
          formSelector: command.formSelector
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_date_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.setTypedFieldBrowserExtensionSession(command.sessionId, 'form_date_set', command.query, command.value, command.frameSelectors, command.exact, command.timeoutMs, command.formSelector);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_time_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.setTypedFieldBrowserExtensionSession(command.sessionId, 'form_time_set', command.query, command.value, command.frameSelectors, command.exact, command.timeoutMs, command.formSelector);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_datetime_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.setTypedFieldBrowserExtensionSession(command.sessionId, 'form_datetime_set', command.query, command.value, command.frameSelectors, command.exact, command.timeoutMs, command.formSelector);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_toggle': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.toggleBrowserExtensionControl(command.sessionId, command.query, {
          desiredState: command.desiredState,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          timeoutMs: command.timeoutMs,
          formSelector: command.formSelector
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_range_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.setRangeBrowserExtensionControl(
          command.sessionId,
          command.query,
          command.value,
          command.frameSelectors,
          command.exact,
          command.timeoutMs,
          command.formSelector
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_options': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listFormOptionsBrowserExtensionSession(command.sessionId, command.selector, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_fill_label': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.fillFormFieldByLabelBrowserExtensionSession(command.sessionId, command.query, command.value, command.frameSelectors, command.exact, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_fill_query': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.fillFormFieldByQueryBrowserExtensionSession(
          command.sessionId,
          command.query,
          command.value,
          command.frameSelectors,
          command.exact,
          command.timeoutMs,
          command.formSelector
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_select': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectFormOptionBrowserExtensionSession(command.sessionId, command.selector, command.value, command.by, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_upload': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.uploadFormFileBrowserExtensionSession(command.sessionId, command.selector, command.filepath, {
          fileName: command.fileName,
          mimeType: command.mimeType,
          timeoutMs: command.timeoutMs,
          frameSelectors: command.frameSelectors
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_combobox_options': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listFormComboboxOptionsBrowserExtensionSession(command.sessionId, command.selector, command.frameSelectors, command.limit, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_combobox_select': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.selectFormComboboxOptionBrowserExtensionSession(command.sessionId, command.selector, command.value, command.match, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_submit': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.formSubmitBrowserExtensionSession(command.sessionId, command.selector, command.timeoutMs, command.frameSelectors);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_form_submit_wait': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.formSubmitAndWaitBrowserExtensionSession(command.sessionId, {
          selector: command.selector,
          frameSelectors: command.frameSelectors,
          waitUrlIncludes: command.waitUrlIncludes,
          waitText: command.waitText,
          waitSelector: command.waitSelector,
          waitNoSelector: command.waitNoSelector,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_auth_login': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.authLoginBrowserExtensionSession(command.sessionId, {
          email: command.email,
          username: command.username,
          password: command.password,
          frameSelectors: command.frameSelectors,
          selector: command.selector,
          humanLike: command.humanLike,
          delayMs: command.delayMs,
          jitterMs: command.jitterMs,
          skipSubmit: command.skipSubmit,
          waitUrlIncludes: command.waitUrlIncludes,
          waitText: command.waitText,
          waitSelector: command.waitSelector,
          waitNoSelector: command.waitNoSelector,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_auth_signup': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.authSignupBrowserExtensionSession(command.sessionId, {
          fullName: command.fullName,
          username: command.username,
          email: command.email,
          password: command.password,
          confirmPassword: command.confirmPassword,
          frameSelectors: command.frameSelectors,
          selector: command.selector,
          humanLike: command.humanLike,
          delayMs: command.delayMs,
          jitterMs: command.jitterMs,
          skipSubmit: command.skipSubmit,
          waitUrlIncludes: command.waitUrlIncludes,
          waitText: command.waitText,
          waitSelector: command.waitSelector,
          waitNoSelector: command.waitNoSelector,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_cookies': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionCookies(command.sessionId, command.targetUrl, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_cookie_get': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionGetCookie(command.sessionId, command.name, {
          targetUrl: command.targetUrl,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_cookie_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionSetCookie(command.sessionId, command.name, command.value, {
          targetUrl: command.targetUrl,
          domain: command.domain,
          path: command.path,
          secure: command.secure,
          httpOnly: command.httpOnly,
          sameSite: command.sameSite,
          expirationDate: command.expirationDate,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_cookie_remove': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionRemoveCookie(command.sessionId, command.name, {
          targetUrl: command.targetUrl,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_cookie': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionCookie(command.sessionId, {
          name: command.name,
          targetUrl: command.targetUrl,
          equals: command.equals,
          includes: command.includes,
          exists: command.exists,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_downloads': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDownloads(command.sessionId, {
          query: command.query,
          state: command.state,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_download_cancel': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionCancelDownload(command.sessionId, command.query, {
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_download_erase': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionEraseDownload(command.sessionId, command.query, {
          exact: command.exact,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_download': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionDownload(command.sessionId, {
          query: command.query,
          state: command.state,
          limit: command.limit,
          exact: command.exact,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_read_latest': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptReadLatest(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_new_chat': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptNewChat(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_sidebar_state': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptSidebarState(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_toggle_sidebar': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptToggleSidebar(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_models': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptModels(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_select_model': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptSelectModel(command.sessionId, command.query, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_info': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptInfo(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_list_conversations': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptListConversations(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_open_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptOpenConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_conversation_actions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptConversationActions(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_conversation_action': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptConversationAction(command.sessionId, command.actionQuery, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_rename_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptRenameConversation(command.sessionId, command.title, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_list_conversations': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptListConversations(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_open_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptOpenConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_stop': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptStop(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_continue': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptContinue(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_response_controls': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptResponseControls(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_previous_response': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptPreviousResponse(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_next_response': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptNextResponse(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_list_response_versions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptListResponseVersions(command.sessionId, {
          limit: command.limit,
          maxVersions: command.maxVersions,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_select_response_version': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptSelectResponseVersion(command.sessionId, command.count ?? 0, {
          limit: command.limit,
          maxVersions: command.maxVersions,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_regenerate': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptRegenerate(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_edit_message': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptEditMessage(command.sessionId, command.text, {
          index: command.index,
          role: command.role,
          offset: command.offset,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_read_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptReadThread(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_read_message': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptReadMessage(command.sessionId, {
          index: command.index,
          role: command.role,
          offset: command.offset,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_current_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptCurrentConversation(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_export_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptExportThread(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          format: command.format
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_send': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptSend(command.sessionId, command.text, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_ask': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptAsk(command.sessionId, command.text, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_ask_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptAskThread(command.sessionId, command.text, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_rewrite_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptRewriteThread(command.sessionId, command.text, {
          index: command.index,
          role: command.role,
          offset: command.offset,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_wait_idle': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptWaitIdle(command.sessionId, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_wait_response': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptWaitResponse(command.sessionId, {
          baselineText: command.baselineText,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_wait_message': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptWaitMessage(command.sessionId, {
          text: command.text,
          role: command.role,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_wait_sidebar': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptWaitSidebar(command.sessionId, {
          open: command.open,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_wait_model': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptWaitModel(command.sessionId, {
          query: command.query,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_wait_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptWaitConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          active: command.active,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_prepare': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptPrepare(command.sessionId, {
          ensureSidebarOpen: command.ensureSidebarOpen,
          model: command.model,
          newChat: command.newChat,
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_delete_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptDeleteConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_chatgpt_archive_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionChatGptArchiveConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_read_latest': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekReadLatest(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_new_chat': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekNewChat(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_sidebar_state': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekSidebarState(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_toggle_sidebar': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekToggleSidebar(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_models': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekModels(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_select_model': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekSelectModel(command.sessionId, command.query, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_info': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekInfo(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_list_conversations': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekListConversations(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_open_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekOpenConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_conversation_actions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekConversationActions(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_conversation_action': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekConversationAction(command.sessionId, command.actionQuery, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_rename_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekRenameConversation(command.sessionId, command.title, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_list_conversations': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekListConversations(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_open_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekOpenConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_stop': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekStop(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_continue': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekContinue(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_response_controls': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekResponseControls(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_previous_response': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekPreviousResponse(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_next_response': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekNextResponse(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_list_response_versions': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekListResponseVersions(command.sessionId, {
          limit: command.limit,
          maxVersions: command.maxVersions,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_select_response_version': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekSelectResponseVersion(command.sessionId, command.count ?? 0, {
          limit: command.limit,
          maxVersions: command.maxVersions,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_regenerate': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekRegenerate(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_edit_message': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekEditMessage(command.sessionId, command.text, {
          index: command.index,
          role: command.role,
          offset: command.offset,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_read_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekReadThread(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_read_message': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekReadMessage(command.sessionId, {
          index: command.index,
          role: command.role,
          offset: command.offset,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_current_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekCurrentConversation(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_export_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekExportThread(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          format: command.format
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_send': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekSend(command.sessionId, command.text, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_ask': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekAsk(command.sessionId, command.text, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_ask_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekAskThread(command.sessionId, command.text, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_rewrite_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekRewriteThread(command.sessionId, command.text, {
          index: command.index,
          role: command.role,
          offset: command.offset,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_wait_idle': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekWaitIdle(command.sessionId, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_wait_response': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekWaitResponse(command.sessionId, {
          baselineText: command.baselineText,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_wait_message': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekWaitMessage(command.sessionId, {
          text: command.text,
          role: command.role,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_wait_sidebar': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekWaitSidebar(command.sessionId, {
          open: command.open,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_wait_model': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekWaitModel(command.sessionId, {
          query: command.query,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_wait_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekWaitConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          active: command.active,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs,
          stableReads: command.stableReads
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_prepare': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekPrepare(command.sessionId, {
          ensureSidebarOpen: command.ensureSidebarOpen,
          model: command.model,
          newChat: command.newChat,
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_delete_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekDeleteConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_deepseek_archive_conversation': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDeepSeekArchiveConversation(command.sessionId, {
          titleQuery: command.titleQuery,
          url: command.url,
          index: command.index,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_search': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXSearch(command.sessionId, command.query, {
          mode: command.mode,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_timeline': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXTimeline(command.sessionId, {
          timelineType: command.timelineType,
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_bookmarks': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXBookmarks(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_notifications': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXNotifications(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_messages': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXMessages(command.sessionId, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_open_message_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXOpenMessageThread(command.sessionId, command.thread, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_send_message': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXSendMessage(command.sessionId, command.text, {
          thread: command.thread,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_read_thread': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXReadThread(command.sessionId, command.postUrl, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_post': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXPost(command.sessionId, command.text, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_open_post': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXOpenPost(command.sessionId, command.postUrl, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_profile': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXProfile(command.sessionId, command.handleOrUrl, {
          limit: command.limit,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_follow': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXFollow(command.sessionId, command.handleOrUrl, {
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_reply': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXReply(command.sessionId, command.text, {
          postUrl: command.postUrl,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_like': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXLike(command.sessionId, {
          postUrl: command.postUrl,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_x_repost': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionXRepost(command.sessionId, {
          postUrl: command.postUrl,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_network_events': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.browserExtensionNetworkEvents(command.sessionId, {
          limit: command.limit,
          urlIncludes: command.urlIncludes,
          stage: command.stage,
          method: command.method
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_dom_events': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionDomEvents(command.sessionId, {
          limit: command.limit,
          mutationType: command.mutationType,
          textIncludes: command.textIncludes,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_session_events': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.browserExtensionSessionEvents(command.sessionId, {
          limit: command.limit,
          kind: command.eventKind,
          ok: command.ok
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_clear_session_events': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.clearBrowserExtensionSessionEvents(command.sessionId);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_url': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionUrl(command.sessionId, command.text, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_selector': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionSelector(command.sessionId, command.selector, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_no_selector': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionNoSelector(command.sessionId, command.selector, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_text': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.browserExtensionWaitText(command.sessionId, command.text, command.timeoutMs, command.intervalMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_dom_quiet': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForDomQuietBrowserExtensionSession(
          command.sessionId,
          command.quietMs,
          command.timeoutMs,
          command.intervalMs,
          command.mutationType,
          command.textIncludes
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_network_idle': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForNetworkIdleBrowserExtensionSession(
          command.sessionId,
          command.quietMs,
          command.timeoutMs,
          command.intervalMs,
          command.urlIncludes,
          command.stage,
          command.method
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_page_stable': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForPageStableBrowserExtensionSession(
          command.sessionId,
          command.quietMs,
          command.timeoutMs,
          command.intervalMs,
          command.stableReads
        );
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_page_diff': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionPageDiff(command.sessionId, {
          againstFile: command.againstFile,
          selector: command.selector,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          maxDepth: command.maxDepth,
          maxChildren: command.maxChildren,
          urlChanged: command.urlChanged,
          titleChanged: command.titleChanged,
          textChanged: command.textChanged,
          textLengthDeltaAtLeast: command.textLengthDeltaAtLeast,
          addedActionableQuery: command.addedActionableQuery,
          removedActionableQuery: command.removedActionableQuery,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_no_blockers': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionNoBlockers(command.sessionId, {
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_banner': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionBanner(command.sessionId, {
          text: command.text,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_no_banner': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForNoBrowserExtensionBanner(command.sessionId, {
          text: command.text,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_page_outcome': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForBrowserExtensionPageOutcome(command.sessionId, {
          status: command.status,
          frameSelectors: command.frameSelectors,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_wait_no_collection_filters': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.waitForNoActiveBrowserExtensionCollectionFilters(command.sessionId, {
          collectionQuery: command.collectionQuery,
          frameSelectors: command.frameSelectors,
          exact: command.exact,
          limit: command.limit,
          timeoutMs: command.timeoutMs,
          intervalMs: command.intervalMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_clear_network_events': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clearBrowserExtensionNetworkEvents(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'browser_extension_clear_dom_events': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.clearBrowserExtensionDomEvents(command.sessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_status': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.getOpenCliStatus();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_doctor': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.openCliDoctor(command.cwd, command.workspace, command.ownerSessionId, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result.parsed ?? result, null, 2), command.json);
        break;
      }
      case 'opencli_sites': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.listOpenCliSites();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_commands': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.listOpenCliCommands(command.site);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_run': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.runOpenCli(
          command.site,
          command.command,
          command.args,
          command.cwd,
          command.timeoutMs,
          command.workspace,
          command.ownerSessionId,
          command.keepBrowserOpen,
          command.waitAfterMs,
          command.maximizeBrowser
        );
        printResult(command.json ? result : JSON.stringify(result.parsed ?? result, null, 2), command.json);
        break;
      }
      case 'opencli_workspace_list': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.listOpenCliWorkspaces();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_workspace_get': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.getOpenCliWorkspace(command.name);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_workspace_set': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.setOpenCliWorkspace(command.name, command.path);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_workspace_clear': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.clearOpenCliWorkspace(command.name);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_workspace_bind_session': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.bindOpenCliWorkspaceSession(command.sessionId, command.workspace);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_workspace_unbind_session': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.unbindOpenCliWorkspaceSession(command.sessionId);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'opencli_workspace_session': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.getOpenCliWorkspaceSession(command.sessionId);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'hf_papers_status': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getHfPapersStatus();
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'hf_papers_doctor': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.doctorHfPapers(command.backend, command.timeoutMs);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'hf_papers_search': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.searchHfPapers(command.query, {
          limit: command.limit,
          backend: command.backend,
          token: command.token,
          includeRaw: command.includeRaw,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'hf_papers_info': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getHfPaperInfo(command.paperId, {
          backend: command.backend,
          token: command.token,
          includeRaw: command.includeRaw,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'hf_papers_read': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.readHfPaper(command.paperId, {
          backend: command.backend,
          token: command.token,
          savePath: command.savePath,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : result.markdown, command.json);
        break;
      }
      case 'hf_papers_list_daily': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.listDailyHfPapers({
          date: command.date,
          week: command.week,
          month: command.month,
          submitter: command.submitter,
          sort: command.sort,
          limit: command.limit,
          backend: command.backend,
          token: command.token,
          includeRaw: command.includeRaw,
          timeoutMs: command.timeoutMs
        });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'twitter_search': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.twitterSearch(
          command.query,
          command.mode,
          command.limit,
          command.cwd,
          command.timeoutMs,
          command.workspace,
          command.ownerSessionId,
          command.keepBrowserOpen,
          command.waitAfterMs,
          command.maximizeBrowser
        );
        printResult(command.json ? result : JSON.stringify(result.parsed ?? result, null, 2), command.json);
        break;
      }
      case 'twitter_timeline': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.twitterTimeline(
          command.timelineType,
          command.limit,
          command.cwd,
          command.timeoutMs,
          command.workspace,
          command.ownerSessionId,
          command.keepBrowserOpen,
          command.waitAfterMs,
          command.maximizeBrowser
        );
        printResult(command.json ? result : JSON.stringify(result.parsed ?? result, null, 2), command.json);
        break;
      }
      case 'twitter_bookmarks': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.twitterBookmarks(
          command.limit,
          command.cwd,
          command.timeoutMs,
          command.workspace,
          command.ownerSessionId,
          command.keepBrowserOpen,
          command.waitAfterMs,
          command.maximizeBrowser
        );
        printResult(command.json ? result : JSON.stringify(result.parsed ?? result, null, 2), command.json);
        break;
      }
      case 'twitter_post': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.twitterPost(
          command.text,
          command.cwd,
          command.timeoutMs,
          command.workspace,
          command.ownerSessionId,
          command.keepBrowserOpen,
          command.waitAfterMs,
          command.maximizeBrowser
        );
        printResult(command.json ? result : JSON.stringify(result.parsed ?? result, null, 2), command.json);
        break;
      }
      case 'local_coder_list': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = service.listLocalCoders();
        printResult(command.json ? result : renderLocalCoderList(result), command.json);
        break;
      }
      case 'local_coder_status': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.getLocalCoderStatus(command.appId as any);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_open': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.openLocalCoder(command.appId as any, command.prompt, command.workingDirectory, command.inputDelayMs);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_focus': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.focusLocalCoder(command.appId as any);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_close': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.closeLocalCoder(command.appId as any);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_maximize': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.maximizeLocalCoder(command.appId as any);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_minimize': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.minimizeLocalCoder(command.appId as any);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_restore': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.restoreLocalCoder(command.appId as any);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_move': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.moveLocalCoder(command.appId as any, command.x, command.y);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_resize': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.resizeLocalCoder(command.appId as any, command.width, command.height);
        printResult(command.json ? result : renderLocalCoderStatus(result), command.json);
        break;
      }
      case 'local_coder_run': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const result = await service.runLocalCoder(command.appId as any, command.prompt, command.workingDirectory, command.timeoutMs);
        printResult(command.json ? result : renderOperationResult({ message: `${result.summary}${result.success ? '' : ' (failed)'}` }), command.json);
        break;
      }
      case 'cmd_spawn': {
        const result = await daemonCommand('cmd_spawn', {
          title: command.title,
          cwd: command.cwd,
          text: command.text,
          delayMs: command.delayMs
        });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'cmd_list': {
        const sessions = await daemonCommand('cmd_list');
        printResult(command.json ? sessions : renderSessions('Tracked CMD Sessions', sessions), command.json);
        break;
      }
      case 'cmd_type': {
        const result = await daemonCommand('cmd_type', { sessionId: command.sessionId, text: command.text });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'cmd_exec': {
        const result = await daemonCommand('cmd_exec', { sessionId: command.sessionId, command: command.command });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'cmd_screenshot': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const session = await daemonCommand('cmd_status', { sessionId: command.sessionId });
        const result = await service.screenshotTrackedCMD(session, command.filename, true);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'cmd_status': {
        const session = await daemonCommand('cmd_status', { sessionId: command.sessionId });
        printResult(command.json ? session : renderSessionStatus('CMD Session Status', session), command.json);
        break;
      }
      case 'cmd_focus': {
        const result = await daemonCommand('cmd_focus', { sessionId: command.sessionId });
        printResult(command.json ? result : renderSessionStatus(result.message, result.session), command.json);
        break;
      }
      case 'cmd_activate': {
        const result = await daemonCommand('cmd_activate', { titleQuery: command.titleQuery });
        printResult(command.json ? result : renderSessionStatus(result.message, result.session), command.json);
        break;
      }
      case 'cmd_close': {
        const result = await daemonCommand('cmd_close', { sessionId: command.sessionId });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'pwsh_list': {
        const sessions = await daemonCommand('pwsh_list');
        printResult(command.json ? sessions : renderSessions('Tracked PowerShell Sessions', sessions), command.json);
        break;
      }
      case 'pwsh_spawn': {
        const result = await daemonCommand('pwsh_spawn', {
          title: command.title,
          cwd: command.cwd,
          text: command.text,
          delayMs: command.delayMs
        });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'pwsh_type': {
        const result = await daemonCommand('pwsh_type', { sessionId: command.sessionId, text: command.text });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'pwsh_exec': {
        const result = await daemonCommand('pwsh_exec', { sessionId: command.sessionId, command: command.command });
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'pwsh_screenshot': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const session = await daemonCommand('pwsh_status', { sessionId: command.sessionId });
        const result = await service.screenshotTrackedPowerShell(session, command.filename, true);
        printResult(command.json ? result : JSON.stringify(result, null, 2), command.json);
        break;
      }
      case 'pwsh_status': {
        const session = await daemonCommand('pwsh_status', { sessionId: command.sessionId });
        printResult(command.json ? session : renderSessionStatus('PowerShell Session Status', session), command.json);
        break;
      }
      case 'pwsh_focus': {
        const result = await daemonCommand('pwsh_focus', { sessionId: command.sessionId });
        printResult(command.json ? result : renderSessionStatus(result.message, result.session), command.json);
        break;
      }
      case 'pwsh_activate': {
        const result = await daemonCommand('pwsh_activate', { titleQuery: command.titleQuery });
        printResult(command.json ? result : renderSessionStatus(result.message, result.session), command.json);
        break;
      }
      case 'pwsh_close': {
        const result = await daemonCommand('pwsh_close', { sessionId: command.sessionId });
        printResult(command.json ? result : renderOperationResult(result), command.json);
        break;
      }
      case 'tui': {
        service = new (await import('./operator-cli/operator-service.js')).OperatorService();
        const [{ render }, reactModule, { OperatorDashboard }] = await Promise.all([
          import('ink'),
          import('react'),
          import('./operator-cli/app.js')
        ]);
        const React = reactModule.default;
        const app = render(<OperatorDashboard service={service} />);
        await app.waitUntilExit();
        break;
      }
    }
  } finally {
    service?.shutdown();
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`Sidofun operator fatal error: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exit(1);
  });
}
