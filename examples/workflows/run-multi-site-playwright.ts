import {
  defaultNewsTargets,
  launchMultiSitePlaywrightWorkflow,
  type MultiSiteBrowserTarget
} from './multi-site-playwright.workflow.js';

interface CliOptions {
  closeOnExit: boolean;
  startupDelayMs: number;
  settleDelayMs: number;
}

async function main(): Promise<void> {
  const cliOptions = parseArgs(process.argv.slice(2));
  const targets = defaultNewsTargets;

  console.log(`Opening ${targets.length} Chrome runtime(s) with Playwright-managed pages...`);
  const launched = await launchMultiSitePlaywrightWorkflow(targets, {
    closeOnExit: cliOptions.closeOnExit,
    startupDelayMs: cliOptions.startupDelayMs,
    settleDelayMs: cliOptions.settleDelayMs,
    verbose: true
  });

  printSummary(launched);

  if (!cliOptions.closeOnExit) {
    console.log('Browsers left open intentionally for manual inspection.');
  }

  process.exit(0);
}

function parseArgs(argv: string[]): CliOptions {
  let closeOnExit = false;
  let startupDelayMs = 1500;
  let settleDelayMs = 2500;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--close') {
      closeOnExit = true;
      continue;
    }
    if (arg === '--startup-delay-ms' && argv[index + 1]) {
      startupDelayMs = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    if (arg === '--settle-delay-ms' && argv[index + 1]) {
      settleDelayMs = Number.parseInt(argv[index + 1], 10);
      index += 1;
    }
  }

  return {
    closeOnExit,
    startupDelayMs,
    settleDelayMs
  };
}

function printSummary(targets: Array<{
  target: MultiSiteBrowserTarget;
  runtime: { id: string; pid?: number; debugPort: number };
  matchedWindowHandle?: number;
  matchedWindowTitle?: string;
}>): void {
  console.log('');
  console.log('Launch summary');
  for (const entry of targets) {
    console.log(`- ${entry.target.name}`);
    console.log(`  runtime=${entry.runtime.id} pid=${entry.runtime.pid ?? 'n/a'} debugPort=${entry.runtime.debugPort}`);
    console.log(`  urls=${entry.target.urls.join(', ')}`);
    console.log(`  windowHandle=${entry.matchedWindowHandle ?? 'unmatched'} windowTitle=${entry.matchedWindowTitle ?? 'unmatched'}`);
  }
}

main().catch((error) => {
  console.error(`Multi-site Playwright workflow failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
