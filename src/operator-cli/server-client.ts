import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PORT } from '../config/constants.js';

const SERVER_HEALTH_URL = `http://127.0.0.1:${DEFAULT_PORT}/health`;

type ServerHealth = {
  success?: boolean;
  ready?: boolean;
  service?: string;
  timestamp?: string;
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveServerEntrypoint(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const candidates = [
    path.resolve(process.cwd(), 'dist', 'index.js'),
    path.resolve(process.cwd(), 'src', 'index.ts'),
    path.resolve(currentDir, '../index.ts'),
    path.resolve(currentDir, '../dist/index.js'),
    path.resolve(currentDir, 'index.js'),
    path.resolve(currentDir, '../../src/index.ts'),
    path.resolve(currentDir, '../../dist/index.js')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve Sidofun server entrypoint from ${currentFile}`);
}

export async function getServerHealth(timeoutMs = 1_500): Promise<ServerHealth | null> {
  try {
    const response = await Promise.race([
      fetch(SERVER_HEALTH_URL, { method: 'GET' }),
      new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Sidofun server health check timed out')), timeoutMs);
      })
    ]);
    if (!response.ok) {
      return null;
    }
    return await response.json() as ServerHealth;
  } catch {
    return null;
  }
}

export async function ensureServerRunning(): Promise<ServerHealth> {
  const existing = await getServerHealth();
  if (existing?.ready) {
    return existing;
  }

  const serverPath = resolveServerEntrypoint();
  const child = spawn(process.execPath, [serverPath], {
    cwd: process.cwd(),
    detached: true,
    windowsHide: true,
    stdio: 'ignore'
  });
  child.unref();

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const health = await getServerHealth();
    if (health?.ready) {
      return health;
    }
    await sleep(250);
  }

  throw new Error(`Failed to start Sidofun HTTP server on ${SERVER_HEALTH_URL}`);
}
