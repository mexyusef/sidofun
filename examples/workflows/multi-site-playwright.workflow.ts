import { createSidofunRuntime, type SidofunRuntime } from '../../src/runtime/sidofun-runtime.js';
import type { BrowserPageInfo, BrowserRuntimeInfo } from '../../src/services/browser-automation/types.js';

export interface MultiSiteBrowserTarget {
  name: string;
  urls: string[];
}

export interface MultiSiteLaunchRecord {
  target: MultiSiteBrowserTarget;
  runtime: BrowserRuntimeInfo;
  matchedWindowHandle?: number;
  matchedWindowTitle?: string;
}

export interface MultiSiteLaunchOptions {
  browserId?: 'chrome';
  closeOnExit?: boolean;
  startupDelayMs?: number;
  settleDelayMs?: number;
  verbose?: boolean;
}

export const defaultNewsTargets: MultiSiteBrowserTarget[] = [
  { name: 'New York Times', urls: ['https://www.nytimes.com/'] },
  { name: 'OpenAI + Reuters', urls: ['https://chatgpt.com/', 'https://www.reuters.com/'] }
];

export async function launchMultiSitePlaywrightWorkflow(
  targets: MultiSiteBrowserTarget[] = defaultNewsTargets,
  options: MultiSiteLaunchOptions = {}
): Promise<MultiSiteLaunchRecord[]> {
  const runtime = createSidofunRuntime();
  const closeOnExit = options.closeOnExit ?? false;
  const startupDelayMs = options.startupDelayMs ?? 1500;
  const settleDelayMs = options.settleDelayMs ?? 2500;
  const verbose = options.verbose ?? true;
  const browserId = options.browserId ?? 'chrome';
  const launched: MultiSiteLaunchRecord[] = [];

  try {
    for (const target of targets) {
      if (verbose) {
        console.log(`Launching ${target.name} in ${browserId}...`);
      }

      const browserRuntime = await runtime.browserAutomationService.createRuntime({
        browserId,
        automationMode: 'debuggable',
        url: target.urls[0],
        args: target.urls.slice(1)
      });

      if (startupDelayMs > 0) {
        await sleep(startupDelayMs);
      }

      const record: MultiSiteLaunchRecord = {
        target,
        runtime: browserRuntime
      };
      launched.push(record);

      if (verbose) {
        console.log(`Opened ${target.urls.join(', ')} as runtime ${browserRuntime.id}`);
      }
    }

    if (settleDelayMs > 0) {
      await sleep(settleDelayMs);
    }

    await attachVisibleWindowMetadata(runtime, launched);
    return launched;
  } catch (error) {
    if (closeOnExit) {
      await closeLaunched(runtime, launched);
    }
    throw error;
  }
}

async function attachVisibleWindowMetadata(
  runtime: SidofunRuntime,
  launched: MultiSiteLaunchRecord[]
): Promise<void> {
  const windows = runtime.browserService.listWindows('chrome');
  for (const entry of launched) {
    const matchedWindow = windows.find((window) => window.pid === entry.runtime.pid);
    if (!matchedWindow) {
      continue;
    }
    entry.matchedWindowHandle = matchedWindow.handle;
    entry.matchedWindowTitle = matchedWindow.title;
  }
}

async function closeLaunched(runtime: SidofunRuntime, launched: MultiSiteLaunchRecord[]): Promise<void> {
  for (const entry of launched) {
    await runtime.browserPlaywrightService.closeRuntimePages(entry.runtime.id).catch(() => ({
      runtimeId: entry.runtime.id,
      closedPageIds: []
    }));
    runtime.browserAutomationService.closeRuntime(entry.runtime.id);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
