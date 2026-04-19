import fs from 'node:fs';
import path from 'node:path';
import { createSidofunRuntime, type SidofunRuntime } from '../../src/runtime/sidofun-runtime.js';
import type { BrowserRuntimeInfo } from '../../src/services/browser-automation/types.js';

export interface NewsroomTarget {
  name: string;
  url: string;
}

export interface NewsroomLaunchRecord {
  target: NewsroomTarget;
  runtime: BrowserRuntimeInfo;
}

export interface NewsroomLayoutOptions {
  closeOnExit?: boolean;
  startupDelayMs?: number;
  settleDelayMs?: number;
  gap?: number;
  preset?: 'newsroom-5' | 'newsroom-6' | '3-column' | '2x2';
  targetsFile?: string;
  verbose?: boolean;
}

export const defaultNewsroomTargets: NewsroomTarget[] = [
  { name: 'New York Times', url: 'https://www.nytimes.com/' },
  { name: 'SCMP', url: 'https://www.scmp.com/' },
  { name: 'Washington Post', url: 'https://www.washingtonpost.com/' },
  { name: 'Sydney Morning Herald', url: 'https://www.smh.com.au/' },
  { name: 'The Guardian', url: 'https://www.theguardian.com/international' }
];

export const defaultNewsroomTargetsFile = path.resolve(import.meta.dir, 'newsroom-layout.targets.json');

export async function launchAndTileNewsroomWorkflow(
  targets: NewsroomTarget[] = defaultNewsroomTargets,
  options: NewsroomLayoutOptions = {}
): Promise<{
  launched: NewsroomLaunchRecord[];
  tiled: Awaited<ReturnType<SidofunRuntime['computer']['browser']['windows']['tile']>>;
}> {
  const runtime = createSidofunRuntime();
  const configuredTargets = options.targetsFile
    ? loadNewsroomTargets(options.targetsFile)
    : targets;
  const launched: NewsroomLaunchRecord[] = [];
  const closeOnExit = options.closeOnExit ?? false;
  const startupDelayMs = options.startupDelayMs ?? 1500;
  const settleDelayMs = options.settleDelayMs ?? 3000;
  const gap = options.gap ?? 16;
  const preset = options.preset ?? (configuredTargets.length >= 6 ? 'newsroom-6' : 'newsroom-5');
  const verbose = options.verbose ?? true;

  try {
    for (const target of configuredTargets) {
      if (verbose) {
        console.log(`Launching ${target.name}...`);
      }

      const browserRuntime = await runtime.browserAutomationService.createRuntime({
        browserId: 'chrome',
        automationMode: 'debuggable',
        url: target.url
      });
      launched.push({ target, runtime: browserRuntime });

      if (startupDelayMs > 0) {
        await sleep(startupDelayMs);
      }
    }

    if (settleDelayMs > 0) {
      await sleep(settleDelayMs);
    }

    const bound = launched.map((entry) => runtime.computer.browser.windows.bind(entry.runtime.id));
    if (verbose) {
      for (const binding of bound) {
        console.log(`Bound ${binding.runtimeId}: matched=${binding.matched} matchKind=${binding.matchKind} handle=${binding.window?.handle ?? 'n/a'} title=${binding.window?.title ?? 'n/a'}`);
      }
    }

    const tiled = await runtime.computer.browser.windows.tile({
      runtimeIds: launched.map((entry) => entry.runtime.id),
      preset,
      gap
    });

    return { launched, tiled };
  } catch (error) {
    if (closeOnExit) {
      await closeLaunched(runtime, launched);
    }
    throw error;
  }
}

export function loadNewsroomTargets(targetsFile: string = defaultNewsroomTargetsFile): NewsroomTarget[] {
  const raw = fs.readFileSync(targetsFile, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Newsroom targets file must be an array: ${targetsFile}`);
  }

  const targets = parsed.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`Invalid newsroom target at index ${index}`);
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.name !== 'string' || typeof record.url !== 'string') {
      throw new Error(`Newsroom target requires string name and url at index ${index}`);
    }
    return {
      name: record.name,
      url: record.url
    } satisfies NewsroomTarget;
  });

  if (targets.length === 0) {
    throw new Error(`Newsroom targets file is empty: ${targetsFile}`);
  }

  return targets;
}

async function closeLaunched(runtime: SidofunRuntime, launched: NewsroomLaunchRecord[]): Promise<void> {
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
