import { NORMALIZED_SCREEN_CONFIG, SIDOFUN_TRACE_DIR } from '../config/constants.js';
import { SidofunCore } from '../core/sidofun-core.js';
import type { PlatformAdapter } from '../platforms/platform-adapter.js';
import { NormalizedPlatformAdapter } from '../platforms/normalized-platform-adapter.js';
import { TracingPlatformAdapter } from '../platforms/tracing-platform-adapter.js';
import { WindowsPlatformAdapter } from '../platforms/windows/windows-platform-adapter.js';
import { CMDSessionService } from '../services/cmd/cmd-session-service.js';
import { BrowserAutomationService } from '../services/browser-automation/browser-automation-service.js';
import { BrowserPlaywrightService } from '../services/browser-automation/browser-playwright-service.js';
import {
  LocalBrowserAutomationAdapter,
  TracingBrowserAutomationAdapter,
  type BrowserAutomationAdapter
} from '../services/browser/browser-automation-adapter.js';
import { BrowserExtensionService } from '../services/browser-extension/browser-extension-service.js';
import { BrowserService } from '../services/browser/browser-service.js';
import { createComputerInterface, type SidofunComputerInterface } from '../services/computer/computer-interface.js';
import { HfPapersService } from '../services/hf-papers/hf-papers-service.js';
import { LocalCoderAppsService } from '../services/local-coder-apps/local-coder-apps-service.js';
import { OpenCliService } from '../services/opencli/opencli-service.js';
import { PowerShellSessionService } from '../services/powershell/powershell-session-service.js';
import { ProcessWindowService } from '../services/process-window/process-window-service.js';
import { ClipboardService } from '../services/clipboard/clipboard-service.js';
import { DesktopScopeService } from '../services/desktop-scope/desktop-scope-service.js';
import { ShellService } from '../services/shell/shell-service.js';
import { SessionManagerService } from '../services/session-manager/session-manager-service.js';
import { TelemetryService } from '../services/telemetry/telemetry-service.js';
import { CMDTerminalCore } from '../services/terminal/cmd-terminal-core.js';
import { TerminalService } from '../services/terminal/terminal-service.js';
import { WindowsNutJsService } from '../services/windows-nutjs.js';
import { TraceRecorder } from '../telemetry/trajectory-recorder.js';

export interface SidofunRuntime {
  nutJs: WindowsNutJsService;
  trajectoryRecorder?: TraceRecorder;
  platform: PlatformAdapter;
  cmdService: CMDSessionService;
  psService: PowerShellSessionService;
  cmdTerminalCore: CMDTerminalCore;
  clipboardService: ClipboardService;
  desktopScopeService: DesktopScopeService;
  shellService: ShellService;
  sessionManagerService: SessionManagerService;
  telemetryService: TelemetryService;
  terminalService: TerminalService;
  browserService: BrowserService;
  browserExtensionService: BrowserExtensionService;
  browserAutomationService: BrowserAutomationService;
  browserPlaywrightService: BrowserPlaywrightService;
  browserAdapter: BrowserAutomationAdapter;
  computer: SidofunComputerInterface;
  localCoderAppsService: LocalCoderAppsService;
  hfPapersService: HfPapersService;
  openCliService: OpenCliService;
  processWindowService: ProcessWindowService;
  core: SidofunCore;
}

export function createSidofunRuntime(): SidofunRuntime {
  const nutJs = new WindowsNutJsService();
  const trajectoryRecorder = SIDOFUN_TRACE_DIR ? new TraceRecorder(SIDOFUN_TRACE_DIR) : undefined;
  const basePlatform = new WindowsPlatformAdapter(nutJs);
  const normalizedPlatform: PlatformAdapter = NORMALIZED_SCREEN_CONFIG
    ? new NormalizedPlatformAdapter(basePlatform, NORMALIZED_SCREEN_CONFIG)
    : basePlatform;
  const platform: PlatformAdapter = trajectoryRecorder
    ? new TracingPlatformAdapter(normalizedPlatform, trajectoryRecorder)
    : normalizedPlatform;

  const cmdService = new CMDSessionService(nutJs);
  const psService = new PowerShellSessionService(nutJs);
  const cmdTerminalCore = new CMDTerminalCore(cmdService, nutJs, trajectoryRecorder);
  const clipboardService = new ClipboardService(platform);
  const processWindowService = new ProcessWindowService(platform);
  const desktopScopeService = new DesktopScopeService(platform, processWindowService);
  const shellService = new ShellService();
  const telemetryService = new TelemetryService();
  const terminalService = new TerminalService(cmdTerminalCore, psService);
  const browserService = new BrowserService();
  const browserExtensionService = new BrowserExtensionService();
  const browserAutomationService = new BrowserAutomationService({
    browserService
  });
  const browserPlaywrightService = new BrowserPlaywrightService({
    automationService: browserAutomationService
  });
  const baseBrowserAdapter = new LocalBrowserAutomationAdapter(
    browserService,
    browserAutomationService,
    browserPlaywrightService
  );
  const browserAdapter: BrowserAutomationAdapter = trajectoryRecorder
    ? new TracingBrowserAutomationAdapter(baseBrowserAdapter, trajectoryRecorder)
    : baseBrowserAdapter;
  const sessionManagerService = new SessionManagerService();
  sessionManagerService.registerCleanupHandler('desktop_scope', async (resource) => {
    await desktopScopeService.close(resource.id);
  });
  sessionManagerService.registerCleanupHandler('browser_runtime', async (resource) => {
    await browserPlaywrightService.closeRuntimePages(resource.id).catch(() => ({
      runtimeId: resource.id,
      closedPageIds: []
    }));
    browserAutomationService.closeRuntime(resource.id);
  });
  sessionManagerService.registerCleanupHandler('browser_page', async (resource) => {
    await browserPlaywrightService.closePage(resource.id);
  });
  sessionManagerService.registerCleanupHandler('trace', async (resource) => {
    await telemetryService.stopTrace(resource.id);
  });
  sessionManagerService.registerCleanupHandler('trajectory', async (resource) => {
    await telemetryService.stopTrajectory(resource.id);
  });
  sessionManagerService.registerCleanupHandler('terminal', async (resource) => {
    const kind = resource.metadata?.kind;
    if (kind === 'cmd' || kind === 'pwsh') {
      await terminalService.close({ kind, sessionId: resource.id });
    }
  });
  const localCoderAppsService = new LocalCoderAppsService(platform, processWindowService, cmdTerminalCore);
  const hfPapersService = new HfPapersService();
  const openCliService = new OpenCliService();
  const computer = createComputerInterface({
    platform,
    clipboardService,
    processWindowService,
    shellService,
    terminalService,
    browserService,
    browserExtensionService,
    browserAutomationService,
    browserPlaywrightService,
    desktopScopeService,
    hfPapersService,
    openCliService,
    sessionManagerService,
    telemetryService
  });
  const core = new SidofunCore(
    platform,
    cmdTerminalCore,
    clipboardService,
    desktopScopeService,
    shellService,
    sessionManagerService,
    telemetryService,
    terminalService,
    browserAdapter,
    browserExtensionService,
    localCoderAppsService,
    hfPapersService,
    openCliService,
    processWindowService
  );

  return {
    nutJs,
    trajectoryRecorder,
    platform,
    cmdService,
    psService,
    cmdTerminalCore,
    clipboardService,
    desktopScopeService,
    shellService,
    sessionManagerService,
    telemetryService,
    terminalService,
    browserService,
    browserExtensionService,
    browserAutomationService,
    browserPlaywrightService,
    browserAdapter,
    computer,
    localCoderAppsService,
    hfPapersService,
    openCliService,
    processWindowService,
    core
  };
}
