#!/usr/bin/env bun
import { OperatorDaemon } from './operator-daemon/daemon.js';

async function main() {
  const daemon = new OperatorDaemon();
  await daemon.start();
  await new Promise(() => undefined);
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    process.stderr.write(`Sidofun daemon fatal error: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
    process.exit(1);
  });
}
