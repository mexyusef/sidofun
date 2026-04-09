import type { BrowserId } from './types.js';
import type { BrowserService } from './browser-service.js';
import type { BrowserAutomationService } from '../browser-automation/browser-automation-service.js';
import type { BrowserPlaywrightService } from '../browser-automation/browser-playwright-service.js';
import { TraceRecorder, summarizeForTrajectory } from '../../telemetry/trajectory-recorder.js';

export interface BrowserAutomationAdapter {
  execute(action: string, params: Record<string, any>): Promise<any>;
}

export class LocalBrowserAutomationAdapter implements BrowserAutomationAdapter {
  constructor(
    private readonly browserService: BrowserService,
    private readonly browserAutomationService: BrowserAutomationService,
    private readonly browserPlaywrightService: BrowserPlaywrightService
  ) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    switch (action) {
      case 'browser_list':
        return this.browserService.listBrowsers();

      case 'browser_info':
        return this.browserService.getBrowser(params?.browser as BrowserId);

      case 'browser_profiles':
        return this.browserService.listProfiles(params?.browser as BrowserId);

      case 'browser_launch_plan':
        return this.browserService.buildLaunchCommand({
          browserId: params?.browser as BrowserId,
          profile: params?.profile,
          profilePath: params?.profilePath,
          url: params?.url,
          privateMode: params?.privateMode,
          headless: params?.headless,
          args: params?.args,
          detached: params?.detached
        });

      case 'browser_launch':
        return this.browserService.launchBrowser({
          browserId: params?.browser as BrowserId,
          profile: params?.profile,
          profilePath: params?.profilePath,
          url: params?.url,
          privateMode: params?.privateMode,
          headless: params?.headless,
          args: params?.args,
          detached: params?.detached
        });

      case 'browser_windows':
        return this.browserService.listWindows(params?.browser as BrowserId | undefined);

      case 'browser_focus_window':
        if (typeof params?.handle === 'number') {
          return this.browserService.focusWindow(params.handle);
        }
        return this.browserService.focusBrowserWindow(params?.browser as BrowserId, params?.titleIncludes);

      case 'browser_runtime_create':
        return this.browserAutomationService.createRuntime({
          browserId: params?.browser as BrowserId,
          profile: params?.profile,
          profilePath: params?.profilePath,
          url: params?.url,
          privateMode: params?.privateMode,
          headless: params?.headless,
          args: params?.args,
          detached: params?.detached,
          automationMode: params?.automationMode,
          debugPort: params?.debugPort
        });

      case 'browser_runtime_list':
        return this.browserAutomationService.listRuntimes();

      case 'browser_runtime_info':
        return this.browserAutomationService.getRuntime(params?.runtimeId);

      case 'browser_runtime_close':
        await this.browserPlaywrightService.closeRuntimePages(params?.runtimeId).catch(() => ({
          runtimeId: params?.runtimeId,
          closedPageIds: []
        }));
        return this.browserAutomationService.closeRuntime(params?.runtimeId);

      case 'browser_page_list':
        return this.browserPlaywrightService.listPages(params?.runtimeId);

      case 'browser_page_open':
        return this.browserPlaywrightService.openPage(params?.runtimeId, params?.url);

      case 'browser_page_info':
        return this.browserPlaywrightService.getPage(params?.pageId);

      case 'browser_page_navigate':
        return this.browserPlaywrightService.navigate(params?.pageId, params?.url);

      case 'browser_page_click':
        return this.browserPlaywrightService.click(params?.pageId, params?.selector);

      case 'browser_page_fill':
        return this.browserPlaywrightService.fill(params?.pageId, params?.selector, params?.value);

      case 'browser_page_press':
        return this.browserPlaywrightService.press(params?.pageId, params?.selector, params?.key);

      case 'browser_page_wait_for':
        return this.browserPlaywrightService.waitFor(
          params?.pageId,
          params?.waitFor,
          params?.query,
          params?.timeoutMs
        );

      case 'browser_page_evaluate':
        return this.browserPlaywrightService.evaluate(params?.pageId, params?.expression);

      case 'browser_page_content':
        return this.browserPlaywrightService.content(params?.pageId);

      case 'browser_page_screenshot':
        return this.browserPlaywrightService.screenshot(params?.pageId, params?.path, params?.fullPage);

      case 'browser_page_pdf':
        return this.browserPlaywrightService.pdf(params?.pageId, params?.path);

      case 'browser_page_download_url':
        return this.browserPlaywrightService.downloadUrl(params?.pageId, params?.url, params?.path);

      case 'browser_page_network_events':
        return this.browserPlaywrightService.networkEvents(params?.pageId);

      case 'browser_page_events':
        return this.browserPlaywrightService.pageEvents(params?.pageId, params?.sinceId);

      case 'browser_page_console_events':
        return this.browserPlaywrightService.consoleEvents(params?.pageId);

      case 'browser_page_clear_events':
        return this.browserPlaywrightService.clearEvents(params?.pageId);

      case 'browser_page_wait_for_network':
        return this.browserPlaywrightService.waitForNetwork(
          params?.pageId,
          params?.urlIncludes,
          params?.kind,
          params?.status,
          params?.timeoutMs
        );

      case 'browser_page_close':
        return this.browserPlaywrightService.closePage(params?.pageId);

      default:
        throw new Error(`Unknown browser action: ${action}`);
    }
  }
}

export class TracingBrowserAutomationAdapter implements BrowserAutomationAdapter {
  constructor(
    private readonly base: BrowserAutomationAdapter,
    private readonly recorder: TraceRecorder
  ) {}

  async execute(action: string, params: Record<string, any>): Promise<any> {
    const startedAt = Date.now();

    try {
      const output = await this.base.execute(action, params);
      await this.recorder.record({
        timestamp: new Date().toISOString(),
        source: 'platform',
        operation: `browser:${action}`,
        status: 'success',
        durationMs: Date.now() - startedAt,
        input: summarizeForTrajectory(params),
        output: summarizeForTrajectory(output)
      });
      return output;
    } catch (error: any) {
      await this.recorder.record({
        timestamp: new Date().toISOString(),
        source: 'platform',
        operation: `browser:${action}`,
        status: 'error',
        durationMs: Date.now() - startedAt,
        input: summarizeForTrajectory(params),
        error: {
          message: error?.message || 'Unknown error'
        }
      });
      throw error;
    }
  }
}
