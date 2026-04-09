#!/usr/bin/env bun
/**
 * Sidofun Desktop CLI - IPC Entry Point (Bootstrap)
 *
 * This file redirects console.log to console.error BEFORE importing modules,
 * ensuring only JSON responses go to stdout.
 */

// Save original console.log for JSON output
// Make it available globally for cli-impl.ts to use
(globalThis as any).jsonLog = console.log;

// Redirect console.log to console.error BEFORE any imports
// This ensures all logging goes to stderr, only JSON responses go to stdout
console.log = (...args: any[]) => {
  console.error(...args);
};

// Now import the actual CLI implementation
const { CLIServer } = await import('./cli-impl.js');

// Start the server
const server = new CLIServer();

// Handle shutdown gracefully
process.on('SIGINT', () => {
  server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.shutdown();
  process.exit(0);
});

// Start the server
await server.start();
