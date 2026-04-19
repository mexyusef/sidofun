import {
  defaultNewsroomTargets,
  defaultNewsroomTargetsFile,
  launchAndTileNewsroomWorkflow,
  type NewsroomLayoutOptions
} from './newsroom-layout.workflow.js';

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const targetsFile = options.targetsFile ?? defaultNewsroomTargetsFile;
  console.log(`Launching newsroom windows from ${targetsFile} with preset ${options.preset ?? 'newsroom-5'}...`);
  const result = await launchAndTileNewsroomWorkflow(defaultNewsroomTargets, {
    closeOnExit: options.closeOnExit,
    startupDelayMs: options.startupDelayMs,
    settleDelayMs: options.settleDelayMs,
    gap: options.gap,
    preset: options.preset,
    targetsFile,
    verbose: true
  });

  console.log('');
  console.log('Launch summary');
  for (const entry of result.launched) {
    console.log(`- ${entry.target.name}: runtime=${entry.runtime.id} pid=${entry.runtime.pid ?? 'n/a'} url=${entry.target.url}`);
  }

  console.log('');
  console.log('Tile result');
  console.log(JSON.stringify(result.tiled, null, 2));

  if (!options.closeOnExit) {
    console.log('Browsers left open intentionally for inspection.');
  }
}

function parseArgs(argv: string[]): NewsroomLayoutOptions {
  const options: NewsroomLayoutOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--close') {
      options.closeOnExit = true;
      continue;
    }
    if (arg === '--startup-delay-ms' && argv[index + 1]) {
      options.startupDelayMs = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    if (arg === '--settle-delay-ms' && argv[index + 1]) {
      options.settleDelayMs = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    if (arg === '--gap' && argv[index + 1]) {
      options.gap = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
    if (arg === '--preset' && argv[index + 1]) {
      const preset = argv[index + 1];
      if (preset === 'newsroom-5' || preset === 'newsroom-6' || preset === '3-column' || preset === '2x2') {
        options.preset = preset;
      }
      index += 1;
      continue;
    }
    if (arg === '--targets-file' && argv[index + 1]) {
      options.targetsFile = argv[index + 1];
      index += 1;
    }
  }
  return options;
}

main().catch((error) => {
  console.error(`Newsroom layout workflow failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
