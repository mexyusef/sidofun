import type { BrowserAutomationService } from '../browser-automation/browser-automation-service.js';
import type { BrowserPlaywrightService } from '../browser-automation/browser-playwright-service.js';
import type { BrowserPageQueryService } from '../browser-page-query/browser-page-query-service.js';
import type { BrowserWindowLayoutService } from '../browser-window-layout/browser-window-layout-service.js';
import type { BrowserExtensionService } from '../browser-extension/browser-extension-service.js';
import type { BrowserService } from '../browser/browser-service.js';
import type { ClipboardService } from '../clipboard/clipboard-service.js';
import type { DesktopScopeService } from '../desktop-scope/desktop-scope-service.js';
import type { HfPapersService } from '../hf-papers/hf-papers-service.js';
import type { OpenCliService } from '../opencli/opencli-service.js';
import type { PlatformAdapter } from '../../platforms/platform-adapter.js';
import type { ProcessWindowService } from '../process-window/process-window-service.js';
import type { SessionManagerService } from '../session-manager/session-manager-service.js';
import type { ShellService } from '../shell/shell-service.js';
import type { TelemetryService } from '../telemetry/telemetry-service.js';
import type { TerminalService } from '../terminal/terminal-service.js';

export interface SidofunComputerInterface {
  screen: {
    size: () => ReturnType<PlatformAdapter['getScreenSize']>;
    mousePosition: () => ReturnType<PlatformAdapter['getMousePosition']>;
    activeWindow: () => ReturnType<PlatformAdapter['executeDesktopAction']>;
    screenshot: (options?: { format?: 'png' | 'jpg'; filename?: string; returnBase64?: boolean }) => ReturnType<PlatformAdapter['takeScreenshot']>;
    screenshotWin32: (options?: { windowHandle?: number; filename?: string; returnBase64?: boolean; format?: 'png' | 'jpg' }) => ReturnType<PlatformAdapter['screenshotWin32']>;
  };
  mouse: {
    move: (x: number, y: number) => ReturnType<PlatformAdapter['executeDesktopAction']>;
    click: (x: number, y: number, button?: 'left' | 'right' | 'middle') => ReturnType<PlatformAdapter['executeDesktopAction']>;
    drag: (path: Array<{ x: number; y: number }>, button?: 'left' | 'right' | 'middle') => ReturnType<PlatformAdapter['executeDesktopAction']>;
    scroll: (direction: 'up' | 'down' | 'left' | 'right', count?: number) => ReturnType<PlatformAdapter['executeDesktopAction']>;
  };
  keyboard: {
    type: (text: string) => ReturnType<PlatformAdapter['executeDesktopAction']>;
    press: (key: string) => ReturnType<PlatformAdapter['executeDesktopAction']>;
    toggle: (key: string, direction?: 'down' | 'up') => ReturnType<PlatformAdapter['executeDesktopAction']>;
    delayed: (text: string, cpm?: number) => ReturnType<PlatformAdapter['executeDesktopAction']>;
  };
  clipboard: {
    read: () => ReturnType<ClipboardService['read']>;
    write: (text: string) => ReturnType<ClipboardService['write']>;
    clear: () => ReturnType<ClipboardService['clear']>;
    status: () => ReturnType<ClipboardService['status']>;
  };
  window: {
    list: () => ReturnType<ProcessWindowService['listWindows']>;
    info: (windowHandle: number) => ReturnType<ProcessWindowService['getWindowInfo']>;
    focus: (windowTitle?: string, processName?: string) => ReturnType<ProcessWindowService['focus']>;
    move: (windowHandle: number, x: number, y: number) => ReturnType<ProcessWindowService['move']>;
    resize: (windowHandle: number, width: number, height: number) => ReturnType<ProcessWindowService['resize']>;
    show: (windowHandle: number) => ReturnType<ProcessWindowService['show']>;
    hide: (windowHandle: number) => ReturnType<ProcessWindowService['hide']>;
    maximize: (windowHandle: number) => ReturnType<ProcessWindowService['maximize']>;
    minimize: (windowHandle: number) => ReturnType<ProcessWindowService['minimize']>;
    restore: (windowHandle: number) => ReturnType<ProcessWindowService['restore']>;
    close: (windowHandle: number) => ReturnType<ProcessWindowService['close']>;
    dragMove: (windowHandle: number, x: number, y: number) => ReturnType<ProcessWindowService['dragMove']>;
    dragResize: (windowHandle: number, width: number, height: number) => ReturnType<ProcessWindowService['dragResize']>;
  };
  process: {
    list: () => ReturnType<ProcessWindowService['listProcesses']>;
  };
  shell: {
    run: (options: Parameters<ShellService['run']>[0]) => ReturnType<ShellService['run']>;
    cmd: (command: string, cwd?: string, timeoutMs?: number, env?: Record<string, string>) => ReturnType<ShellService['run']>;
    pwsh: (command: string, cwd?: string, timeoutMs?: number, env?: Record<string, string>) => ReturnType<ShellService['run']>;
  };
  terminal: {
    spawn: (options: Parameters<TerminalService['spawn']>[0]) => ReturnType<TerminalService['spawn']>;
    list: (kind?: Parameters<TerminalService['list']>[0]) => ReturnType<TerminalService['list']>;
    status: (target: Parameters<TerminalService['status']>[0]) => ReturnType<TerminalService['status']>;
    focus: (target: Parameters<TerminalService['focus']>[0]) => ReturnType<TerminalService['focus']>;
    type: (target: Parameters<TerminalService['type']>[0], text: string) => ReturnType<TerminalService['type']>;
    exec: (target: Parameters<TerminalService['exec']>[0], command: string, options?: Parameters<TerminalService['exec']>[2]) => ReturnType<TerminalService['exec']>;
    close: (target: Parameters<TerminalService['close']>[0]) => ReturnType<TerminalService['close']>;
  };
  browser: {
    list: () => ReturnType<BrowserService['listBrowsers']>;
    info: (browserId: Parameters<BrowserService['getBrowser']>[0]) => ReturnType<BrowserService['getBrowser']>;
    profiles: (browserId: Parameters<BrowserService['listProfiles']>[0]) => ReturnType<BrowserService['listProfiles']>;
    launch: (options: Parameters<BrowserService['launchBrowser']>[0]) => ReturnType<BrowserService['launchBrowser']>;
    runtimes: {
      create: (options: Parameters<BrowserAutomationService['createRuntime']>[0]) => ReturnType<BrowserAutomationService['createRuntime']>;
      list: () => ReturnType<BrowserAutomationService['listRuntimes']>;
      info: (runtimeId: string) => ReturnType<BrowserAutomationService['getRuntime']>;
      close: (runtimeId: string) => ReturnType<BrowserAutomationService['closeRuntime']>;
    };
    pages: {
      list: (runtimeId?: string) => ReturnType<BrowserPlaywrightService['listPages']>;
      open: (runtimeId: string, url?: string) => ReturnType<BrowserPlaywrightService['openPage']>;
      info: (pageId: string) => ReturnType<BrowserPlaywrightService['getPage']>;
      close: (pageId: string) => ReturnType<BrowserPlaywrightService['closePage']>;
      locate: (pageId: string, query: string, options?: Parameters<BrowserPageQueryService['locate']>[2]) => ReturnType<BrowserPageQueryService['locate']>;
      fillQuery: (pageId: string, query: string, value: string, options?: Parameters<BrowserPageQueryService['fillQuery']>[3]) => ReturnType<BrowserPageQueryService['fillQuery']>;
      clickQuery: (pageId: string, query: string, options?: Parameters<BrowserPageQueryService['clickQuery']>[2]) => ReturnType<BrowserPageQueryService['clickQuery']>;
      submit: (pageId: string, options?: Parameters<BrowserPageQueryService['submit']>[1]) => ReturnType<BrowserPageQueryService['submit']>;
      waitText: (pageId: string, text: string, options?: Parameters<BrowserPageQueryService['waitForText']>[2]) => ReturnType<BrowserPageQueryService['waitForText']>;
      formWorkflow: (pageId: string, options: Parameters<BrowserPageQueryService['formWorkflow']>[1]) => ReturnType<BrowserPageQueryService['formWorkflow']>;
    };
    windows: {
      list: (runtimeIds?: string[]) => ReturnType<BrowserWindowLayoutService['listRuntimeWindows']>;
      bind: (runtimeId: string, windowHandle?: number) => ReturnType<BrowserWindowLayoutService['bindRuntimeWindow']>;
      tile: (options?: Parameters<BrowserWindowLayoutService['tileRuntimeWindows']>[0]) => ReturnType<BrowserWindowLayoutService['tileRuntimeWindows']>;
    };
  };
  browserExtension: {
    status: () => ReturnType<BrowserExtensionService['getStatus']>;
    capabilities: () => ReturnType<BrowserExtensionService['getCapabilities']>;
    sites: () => ReturnType<BrowserExtensionService['listSites']>;
    workspaceList: () => ReturnType<BrowserExtensionService['listWorkspaces']>;
    workspaceGet: (name: string) => ReturnType<BrowserExtensionService['getWorkspace']>;
    workspaceSet: (name: string, workspacePath: string, sites?: string[]) => ReturnType<BrowserExtensionService['setWorkspace']>;
    workspaceClear: (name: string) => ReturnType<BrowserExtensionService['clearWorkspace']>;
    sessionCreate: (options?: Parameters<BrowserExtensionService['createSession']>[0]) => ReturnType<BrowserExtensionService['createSession']>;
    sessionList: () => ReturnType<BrowserExtensionService['listSessions']>;
    sessionInfo: (sessionId: string) => ReturnType<BrowserExtensionService['getSession']>;
    sessionClose: (sessionId: string) => ReturnType<BrowserExtensionService['closeSession']>;
    tabs: (sessionId: string) => ReturnType<BrowserExtensionService['listTabs']>;
    navigate: (sessionId: string, targetUrl: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['navigate']>;
    focusTab: (sessionId: string, tabId: number, timeoutMs?: number) => ReturnType<BrowserExtensionService['focusTab']>;
    snapshot: (sessionId: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['snapshot']>;
    evaluate: (sessionId: string, expression: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['evaluate']>;
    click: (sessionId: string, selector: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['click']>;
    type: (sessionId: string, selector: string, text: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['type']>;
    press: (sessionId: string, key: string, selector?: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['press']>;
    cookies: (sessionId: string, targetUrl?: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['cookies']>;
    chatGptReadLatest: (sessionId: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['chatGptReadLatest']>;
    chatGptSend: (sessionId: string, text: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['chatGptSend']>;
    chatGptAsk: (sessionId: string, text: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['chatGptAsk']>;
    deepSeekReadLatest: (sessionId: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['deepSeekReadLatest']>;
    deepSeekSend: (sessionId: string, text: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['deepSeekSend']>;
    deepSeekAsk: (sessionId: string, text: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['deepSeekAsk']>;
    xSearch: (
      sessionId: string,
      query: string,
      options?: { mode?: 'top' | 'latest' | 'live' | 'people' | 'media'; limit?: number; timeoutMs?: number }
    ) => ReturnType<BrowserExtensionService['xSearch']>;
    sessionEvents: (
      sessionId: string,
      options?: { limit?: number; kind?: string; ok?: boolean }
    ) => ReturnType<BrowserExtensionService['listSessionEvents']>;
    clearSessionEvents: (sessionId: string) => ReturnType<BrowserExtensionService['clearSessionEvents']>;
    waitUrl: (
      sessionId: string,
      text: string,
      options?: { timeoutMs?: number; intervalMs?: number }
    ) => ReturnType<BrowserExtensionService['waitForUrl']>;
    waitSelector: (
      sessionId: string,
      selector: string,
      options?: { timeoutMs?: number; intervalMs?: number }
    ) => ReturnType<BrowserExtensionService['waitForSelector']>;
    waitNoSelector: (
      sessionId: string,
      selector: string,
      options?: { timeoutMs?: number; intervalMs?: number }
    ) => ReturnType<BrowserExtensionService['waitForNoSelector']>;
    waitText: (
      sessionId: string,
      text: string,
      options?: { timeoutMs?: number; intervalMs?: number }
    ) => ReturnType<BrowserExtensionService['waitForText']>;
    chatGptWaitMessage: (
      sessionId: string,
      options?: { text?: string; role?: 'user' | 'assistant' | 'system'; timeoutMs?: number; intervalMs?: number; stableReads?: number; limit?: number }
    ) => ReturnType<BrowserExtensionService['chatGptWaitMessage']>;
    deepSeekWaitMessage: (
      sessionId: string,
      options?: { text?: string; role?: 'user' | 'assistant' | 'system'; timeoutMs?: number; intervalMs?: number; stableReads?: number; limit?: number }
    ) => ReturnType<BrowserExtensionService['deepSeekWaitMessage']>;
    networkEvents: (
      sessionId: string,
      options?: { limit?: number; urlIncludes?: string; stage?: 'request' | 'response' | 'error'; method?: string }
    ) => ReturnType<BrowserExtensionService['listNetworkEvents']>;
    clearNetworkEvents: (sessionId: string, timeoutMs?: number) => ReturnType<BrowserExtensionService['clearNetworkEvents']>;
  };
  scope: {
    create: (options: Parameters<DesktopScopeService['create']>[0]) => ReturnType<DesktopScopeService['create']>;
    list: () => ReturnType<DesktopScopeService['list']>;
    info: (scopeId: string) => ReturnType<DesktopScopeService['getInfo']>;
    focus: (scopeId: string) => ReturnType<DesktopScopeService['focus']>;
    screenshot: (scopeId: string, options?: Parameters<DesktopScopeService['screenshot']>[1]) => ReturnType<DesktopScopeService['screenshot']>;
    click: (scopeId: string, x: number, y: number, button?: 'left' | 'right' | 'middle') => ReturnType<DesktopScopeService['click']>;
    type: (scopeId: string, text: string) => ReturnType<DesktopScopeService['type']>;
    close: (scopeId: string) => ReturnType<DesktopScopeService['close']>;
    };
    hfPapers: {
      status: () => ReturnType<HfPapersService['getStatus']>;
      doctor: (backend?: 'api' | 'cli' | 'auto', timeoutMs?: number) => ReturnType<HfPapersService['doctor']>;
      search: (query: string, limit?: number, backend?: 'api' | 'cli' | 'auto', token?: string, timeoutMs?: number) => ReturnType<HfPapersService['search']>;
      info: (paperId: string, backend?: 'api' | 'cli' | 'auto', token?: string, timeoutMs?: number) => ReturnType<HfPapersService['info']>;
      read: (paperId: string, backend?: 'api' | 'cli' | 'auto', token?: string, savePath?: string, timeoutMs?: number) => ReturnType<HfPapersService['read']>;
      listDaily: (options?: Parameters<HfPapersService['listDaily']>[0]) => ReturnType<HfPapersService['listDaily']>;
    };
    opencli: {
      status: () => ReturnType<OpenCliService['getStatus']>;
      doctor: (cwd?: string, workspace?: string, ownerSessionId?: string, timeoutMs?: number) => ReturnType<OpenCliService['doctor']>;
      sites: () => ReturnType<OpenCliService['listSites']>;
      commands: (site: string) => ReturnType<OpenCliService['listCommands']>;
      run: (site: string, command: string, args?: string[], cwd?: string, workspace?: string, ownerSessionId?: string, timeoutMs?: number) => ReturnType<OpenCliService['run']>;
      workspaceList: () => ReturnType<OpenCliService['listWorkspaces']>;
      workspaceGet: (name: string) => ReturnType<OpenCliService['getWorkspace']>;
      workspaceSet: (name: string, workspacePath: string) => ReturnType<OpenCliService['setWorkspace']>;
      workspaceClear: (name: string) => ReturnType<OpenCliService['clearWorkspace']>;
      workspaceBindSession: (sessionId: string, workspace: string) => ReturnType<OpenCliService['bindSessionWorkspace']>;
      workspaceUnbindSession: (sessionId: string) => ReturnType<OpenCliService['unbindSessionWorkspace']>;
      workspaceSession: (sessionId: string) => ReturnType<OpenCliService['getSessionWorkspace']>;
    };
    twitter: {
      search: (query: string, limit?: number, cwd?: string, workspace?: string, ownerSessionId?: string, timeoutMs?: number) => ReturnType<OpenCliService['twitterSearch']>;
      timeline: (timelineType?: 'for-you' | 'following', limit?: number, cwd?: string, workspace?: string, ownerSessionId?: string, timeoutMs?: number) => ReturnType<OpenCliService['twitterTimeline']>;
      bookmarks: (limit?: number, cwd?: string, workspace?: string, ownerSessionId?: string, timeoutMs?: number) => ReturnType<OpenCliService['twitterBookmarks']>;
      post: (text: string, cwd?: string, workspace?: string, ownerSessionId?: string, timeoutMs?: number) => ReturnType<OpenCliService['twitterPost']>;
    };
  session: {
    create: (options?: Parameters<SessionManagerService['createSession']>[0]) => ReturnType<SessionManagerService['createSession']>;
    list: () => ReturnType<SessionManagerService['listSessions']>;
    info: (sessionId: string) => ReturnType<SessionManagerService['getSession']>;
    touch: (sessionId: string) => ReturnType<SessionManagerService['touchSession']>;
    close: (sessionId: string, options?: Parameters<SessionManagerService['closeSession']>[1]) => ReturnType<SessionManagerService['closeSession']>;
  };
  telemetry: {
    trace: {
      start: (options?: Parameters<TelemetryService['startTrace']>[0]) => ReturnType<TelemetryService['startTrace']>;
      list: () => ReturnType<TelemetryService['listTraces']>;
      info: (traceId: string) => ReturnType<TelemetryService['getTrace']>;
      stop: (traceId: string) => ReturnType<TelemetryService['stopTrace']>;
      export: (traceId: string, targetPath?: string) => ReturnType<TelemetryService['exportTrace']>;
    };
    trajectory: {
      start: (options?: Parameters<TelemetryService['startTrajectory']>[0]) => ReturnType<TelemetryService['startTrajectory']>;
      list: () => ReturnType<TelemetryService['listTrajectories']>;
      info: (trajectoryId: string) => ReturnType<TelemetryService['getTrajectory']>;
      appendTurn: (trajectoryId: string, turn: Parameters<TelemetryService['appendTurn']>[1]) => ReturnType<TelemetryService['appendTurn']>;
      stop: (trajectoryId: string) => ReturnType<TelemetryService['stopTrajectory']>;
      export: (trajectoryId: string, targetPath?: string) => ReturnType<TelemetryService['exportTrajectory']>;
    };
  };
}

export function createComputerInterface(services: {
  platform: PlatformAdapter;
  clipboardService: ClipboardService;
  processWindowService: ProcessWindowService;
  shellService: ShellService;
  terminalService: TerminalService;
  browserService: BrowserService;
  browserExtensionService: BrowserExtensionService;
  browserAutomationService: BrowserAutomationService;
  browserPlaywrightService: BrowserPlaywrightService;
  browserPageQueryService: BrowserPageQueryService;
  browserWindowLayoutService: BrowserWindowLayoutService;
  desktopScopeService: DesktopScopeService;
  hfPapersService: HfPapersService;
  openCliService: OpenCliService;
  sessionManagerService: SessionManagerService;
  telemetryService: TelemetryService;
}): SidofunComputerInterface {
  return {
    screen: {
      size: () => services.platform.getScreenSize(),
      mousePosition: () => services.platform.getMousePosition(),
      activeWindow: () => services.platform.executeDesktopAction({ type: 'active_window' }),
      screenshot: (options) => services.platform.takeScreenshot(options?.format, options?.filename, options?.returnBase64),
      screenshotWin32: (options) => services.platform.screenshotWin32(options?.windowHandle, options?.filename, options?.returnBase64, options?.format)
    },
    mouse: {
      move: (x, y) => services.platform.executeDesktopAction({ type: 'move_mouse', coordinates: { x, y } }),
      click: (x, y, button = 'left') => services.platform.executeDesktopAction({ type: 'click', coordinates: { x, y }, button }),
      drag: (path, button = 'left') => services.platform.executeDesktopAction({ type: 'drag_mouse', path, button }),
      scroll: (direction, count = 1) => services.platform.executeDesktopAction({ type: 'scroll', direction, count })
    },
    keyboard: {
      type: (text) => services.platform.executeDesktopAction({ type: 'type', text }),
      press: (key) => services.platform.executeDesktopAction({ type: 'key_press', key }),
      toggle: (key, direction = 'down') => services.platform.executeDesktopAction({ type: 'key_toggle', key, direction }),
      delayed: (text, cpm = 600) => services.platform.executeDesktopAction({ type: 'type_delayed', text, count: cpm })
    },
    clipboard: {
      read: () => services.clipboardService.read(),
      write: (text) => services.clipboardService.write(text),
      clear: () => services.clipboardService.clear(),
      status: () => services.clipboardService.status()
    },
    window: {
      list: () => services.processWindowService.listWindows(),
      info: (windowHandle) => services.processWindowService.getWindowInfo(windowHandle),
      focus: (windowTitle, processName) => services.processWindowService.focus({ windowTitle, processName }),
      move: (windowHandle, x, y) => services.processWindowService.move(windowHandle, x, y),
      resize: (windowHandle, width, height) => services.processWindowService.resize(windowHandle, width, height),
      show: (windowHandle) => services.processWindowService.show(windowHandle),
      hide: (windowHandle) => services.processWindowService.hide(windowHandle),
      maximize: (windowHandle) => services.processWindowService.maximize(windowHandle),
      minimize: (windowHandle) => services.processWindowService.minimize(windowHandle),
      restore: (windowHandle) => services.processWindowService.restore(windowHandle),
      close: (windowHandle) => services.processWindowService.close(windowHandle),
      dragMove: (windowHandle, x, y) => services.processWindowService.dragMove(windowHandle, x, y),
      dragResize: (windowHandle, width, height) => services.processWindowService.dragResize(windowHandle, width, height)
    },
    process: {
      list: () => services.processWindowService.listProcesses()
    },
    shell: {
      run: (options) => services.shellService.run(options),
      cmd: (command, cwd, timeoutMs, env) => services.shellService.run({ shell: 'cmd', command, cwd, timeoutMs, env }),
      pwsh: (command, cwd, timeoutMs, env) => services.shellService.run({ shell: 'pwsh', command, cwd, timeoutMs, env })
    },
    terminal: {
      spawn: (options) => services.terminalService.spawn(options),
      list: (kind) => services.terminalService.list(kind),
      status: (target) => services.terminalService.status(target),
      focus: (target) => services.terminalService.focus(target),
      type: (target, text) => services.terminalService.type(target, text),
      exec: (target, command, options) => services.terminalService.exec(target, command, options),
      close: (target) => services.terminalService.close(target)
    },
    browser: {
      list: () => services.browserService.listBrowsers(),
      info: (browserId) => services.browserService.getBrowser(browserId),
      profiles: (browserId) => services.browserService.listProfiles(browserId),
      launch: (options) => services.browserService.launchBrowser(options),
      runtimes: {
        create: (options) => services.browserAutomationService.createRuntime(options),
        list: () => services.browserAutomationService.listRuntimes(),
        info: (runtimeId) => services.browserAutomationService.getRuntime(runtimeId),
        close: (runtimeId) => services.browserAutomationService.closeRuntime(runtimeId)
      },
      pages: {
        list: (runtimeId) => services.browserPlaywrightService.listPages(runtimeId),
        open: (runtimeId, url) => services.browserPlaywrightService.openPage(runtimeId, url),
        info: (pageId) => services.browserPlaywrightService.getPage(pageId),
        close: (pageId) => services.browserPlaywrightService.closePage(pageId),
        locate: (pageId, query, options) => services.browserPageQueryService.locate(pageId, query, options),
        fillQuery: (pageId, query, value, options) => services.browserPageQueryService.fillQuery(pageId, query, value, options),
        clickQuery: (pageId, query, options) => services.browserPageQueryService.clickQuery(pageId, query, options),
        submit: (pageId, options) => services.browserPageQueryService.submit(pageId, options),
        waitText: (pageId, text, options) => services.browserPageQueryService.waitForText(pageId, text, options),
        formWorkflow: (pageId, options) => services.browserPageQueryService.formWorkflow(pageId, options)
      },
      windows: {
        list: (runtimeIds) => services.browserWindowLayoutService.listRuntimeWindows(runtimeIds),
        bind: (runtimeId, windowHandle) => services.browserWindowLayoutService.bindRuntimeWindow(runtimeId, windowHandle),
        tile: (options) => services.browserWindowLayoutService.tileRuntimeWindows(options)
      }
    },
    browserExtension: {
      status: () => services.browserExtensionService.getStatus(),
      capabilities: () => services.browserExtensionService.getCapabilities(),
      sites: () => services.browserExtensionService.listSites(),
      workspaceList: () => services.browserExtensionService.listWorkspaces(),
      workspaceGet: (name) => services.browserExtensionService.getWorkspace(name),
      workspaceSet: (name, workspacePath, sites) => services.browserExtensionService.setWorkspace(name, workspacePath, sites),
      workspaceClear: (name) => services.browserExtensionService.clearWorkspace(name),
      sessionCreate: (options) => services.browserExtensionService.createSession(options),
      sessionList: () => services.browserExtensionService.listSessions(),
      sessionInfo: (sessionId) => services.browserExtensionService.getSession(sessionId),
      sessionClose: (sessionId) => services.browserExtensionService.closeSession(sessionId),
      tabs: (sessionId) => services.browserExtensionService.listTabs(sessionId),
      navigate: (sessionId, targetUrl, timeoutMs) => services.browserExtensionService.navigate(sessionId, targetUrl, timeoutMs),
      focusTab: (sessionId, tabId, timeoutMs) => services.browserExtensionService.focusTab(sessionId, tabId, timeoutMs),
      snapshot: (sessionId, timeoutMs) => services.browserExtensionService.snapshot(sessionId, timeoutMs),
      evaluate: (sessionId, expression, timeoutMs) => services.browserExtensionService.evaluate(sessionId, expression, timeoutMs),
      click: (sessionId, selector, timeoutMs) => services.browserExtensionService.click(sessionId, selector, timeoutMs),
      type: (sessionId, selector, text, timeoutMs) => services.browserExtensionService.type(sessionId, selector, text, timeoutMs),
      press: (sessionId, key, selector, timeoutMs) => services.browserExtensionService.press(sessionId, selector, key, timeoutMs),
      cookies: (sessionId, targetUrl, timeoutMs) => services.browserExtensionService.cookies(sessionId, targetUrl, timeoutMs),
      chatGptReadLatest: (sessionId, timeoutMs) => services.browserExtensionService.chatGptReadLatest(sessionId, timeoutMs),
      chatGptSend: (sessionId, text, timeoutMs) => services.browserExtensionService.chatGptSend(sessionId, text, timeoutMs),
      chatGptAsk: (sessionId, text, timeoutMs) => services.browserExtensionService.chatGptAsk(sessionId, text, timeoutMs),
      deepSeekReadLatest: (sessionId, timeoutMs) => services.browserExtensionService.deepSeekReadLatest(sessionId, timeoutMs),
      deepSeekSend: (sessionId, text, timeoutMs) => services.browserExtensionService.deepSeekSend(sessionId, text, timeoutMs),
      deepSeekAsk: (sessionId, text, timeoutMs) => services.browserExtensionService.deepSeekAsk(sessionId, text, timeoutMs),
      xSearch: (sessionId, query, options) => services.browserExtensionService.xSearch(sessionId, query, options),
      sessionEvents: (sessionId, options) => services.browserExtensionService.listSessionEvents(sessionId, options),
      clearSessionEvents: (sessionId) => services.browserExtensionService.clearSessionEvents(sessionId),
      waitUrl: (sessionId, text, options) => services.browserExtensionService.waitForUrl(sessionId, text, options),
      waitSelector: (sessionId, selector, options) => services.browserExtensionService.waitForSelector(sessionId, selector, options),
      waitNoSelector: (sessionId, selector, options) => services.browserExtensionService.waitForNoSelector(sessionId, selector, options),
      waitText: (sessionId, text, options) => services.browserExtensionService.waitForText(sessionId, text, options),
      chatGptWaitMessage: (sessionId, options) => services.browserExtensionService.chatGptWaitMessage(sessionId, options),
      deepSeekWaitMessage: (sessionId, options) => services.browserExtensionService.deepSeekWaitMessage(sessionId, options),
      networkEvents: (sessionId, options) => services.browserExtensionService.listNetworkEvents(sessionId, options),
      clearNetworkEvents: (sessionId, timeoutMs) => services.browserExtensionService.clearNetworkEvents(sessionId, timeoutMs)
    },
    scope: {
      create: (options) => services.desktopScopeService.create(options),
      list: () => services.desktopScopeService.list(),
      info: (scopeId) => services.desktopScopeService.getInfo(scopeId),
      focus: (scopeId) => services.desktopScopeService.focus(scopeId),
      screenshot: (scopeId, options) => services.desktopScopeService.screenshot(scopeId, options),
      click: (scopeId, x, y, button = 'left') => services.desktopScopeService.click(scopeId, { x, y }, button),
      type: (scopeId, text) => services.desktopScopeService.type(scopeId, text),
      close: (scopeId) => services.desktopScopeService.close(scopeId)
    },
    hfPapers: {
      status: () => services.hfPapersService.getStatus(),
      doctor: (backend, timeoutMs) => services.hfPapersService.doctor({ backend, timeoutMs }),
      search: (query, limit, backend, token, timeoutMs) => services.hfPapersService.search({ query, limit, backend, token, timeoutMs }),
      info: (paperId, backend, token, timeoutMs) => services.hfPapersService.info({ paperId, backend, token, timeoutMs }),
      read: (paperId, backend, token, savePath, timeoutMs) => services.hfPapersService.read({ paperId, backend, token, savePath, timeoutMs }),
      listDaily: (options) => services.hfPapersService.listDaily(options)
    },
    opencli: {
      status: () => services.openCliService.getStatus(),
        doctor: (cwd, workspace, ownerSessionId, timeoutMs) => services.openCliService.doctor({ cwd, workspace, ownerSessionId, timeoutMs }),
        sites: () => services.openCliService.listSites(),
        commands: (site) => services.openCliService.listCommands(site),
        run: (site, command, args, cwd, workspace, ownerSessionId, timeoutMs) => services.openCliService.run({ site, command, args, cwd, workspace, ownerSessionId, timeoutMs, format: 'json' }),
        workspaceList: () => services.openCliService.listWorkspaces(),
        workspaceGet: (name) => services.openCliService.getWorkspace(name),
        workspaceSet: (name, workspacePath) => services.openCliService.setWorkspace(name, workspacePath),
        workspaceClear: (name) => services.openCliService.clearWorkspace(name),
        workspaceBindSession: (sessionId, workspace) => services.openCliService.bindSessionWorkspace(sessionId, workspace),
        workspaceUnbindSession: (sessionId) => services.openCliService.unbindSessionWorkspace(sessionId),
        workspaceSession: (sessionId) => services.openCliService.getSessionWorkspace(sessionId)
      },
      twitter: {
        search: (query, limit, cwd, workspace, ownerSessionId, timeoutMs) => services.openCliService.twitterSearch({ query, limit, cwd, workspace, ownerSessionId, timeoutMs }),
        timeline: (timelineType, limit, cwd, workspace, ownerSessionId, timeoutMs) => services.openCliService.twitterTimeline({ type: timelineType, limit, cwd, workspace, ownerSessionId, timeoutMs }),
        bookmarks: (limit, cwd, workspace, ownerSessionId, timeoutMs) => services.openCliService.twitterBookmarks({ limit, cwd, workspace, ownerSessionId, timeoutMs }),
        post: (text, cwd, workspace, ownerSessionId, timeoutMs) => services.openCliService.twitterPost({ text, cwd, workspace, ownerSessionId, timeoutMs })
      },
    session: {
      create: (options) => services.sessionManagerService.createSession(options),
      list: () => services.sessionManagerService.listSessions(),
      info: (sessionId) => services.sessionManagerService.getSession(sessionId),
      touch: (sessionId) => services.sessionManagerService.touchSession(sessionId),
      close: (sessionId, options) => services.sessionManagerService.closeSession(sessionId, options)
    },
    telemetry: {
      trace: {
        start: (options) => services.telemetryService.startTrace(options),
        list: () => services.telemetryService.listTraces(),
        info: (traceId) => services.telemetryService.getTrace(traceId),
        stop: (traceId) => services.telemetryService.stopTrace(traceId),
        export: (traceId, targetPath) => services.telemetryService.exportTrace(traceId, targetPath)
      },
      trajectory: {
        start: (options) => services.telemetryService.startTrajectory(options),
        list: () => services.telemetryService.listTrajectories(),
        info: (trajectoryId) => services.telemetryService.getTrajectory(trajectoryId),
        appendTurn: (trajectoryId, turn) => services.telemetryService.appendTurn(trajectoryId, turn),
        stop: (trajectoryId) => services.telemetryService.stopTrajectory(trajectoryId),
        export: (trajectoryId, targetPath) => services.telemetryService.exportTrajectory(trajectoryId, targetPath)
      }
    }
  };
}
