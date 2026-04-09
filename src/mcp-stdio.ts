#!/usr/bin/env bun

// Keep stdout reserved for MCP JSON-RPC messages.
console.log = (...args: any[]) => {
  console.error(...args);
};

const { main } = await import('./mcp-server.js');

main().catch((error: unknown) => {
  process.stderr.write(`Sidofun MCP fatal error: ${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
