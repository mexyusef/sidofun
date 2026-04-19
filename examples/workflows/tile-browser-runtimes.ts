import { createSidofunRuntime } from '../../src/runtime/sidofun-runtime.js';

async function main(): Promise<void> {
  const runtime = createSidofunRuntime();
  const columns = parseNumberFlag(process.argv.slice(2), '--columns') ?? 2;
  const gap = parseNumberFlag(process.argv.slice(2), '--gap') ?? 12;

  const bindings = runtime.computer.browser.windows.list();
  console.log('Runtime window bindings');
  for (const binding of bindings) {
    console.log(`- runtime=${binding.runtimeId} matched=${binding.matched} matchKind=${binding.matchKind} windowHandle=${binding.window?.handle ?? 'n/a'} title=${binding.window?.title ?? 'n/a'}`);
  }

  const tiled = await runtime.computer.browser.windows.tile({ columns, gap });
  console.log('');
  console.log('Tile result');
  console.log(JSON.stringify(tiled, null, 2));
}

function parseNumberFlag(argv: string[], flag: string): number | undefined {
  const index = argv.indexOf(flag);
  if (index === -1 || !argv[index + 1]) {
    return undefined;
  }
  const value = Number.parseInt(argv[index + 1], 10);
  return Number.isNaN(value) ? undefined : value;
}

main().catch((error) => {
  console.error(`Tile browser runtimes failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
