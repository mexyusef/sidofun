import { SIDOFUN_DAEMON_PIPE, SIDOFUN_STATE_FILE } from '../config/constants.js';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DAEMON_PROTOCOL_VERSION = 2;

type DaemonState = {
  daemon?: {
    pid: number;
    startedAt: string;
    pipePath: string;
    protocolVersion?: number;
  };
};

type DaemonHealth = {
  ok: true;
  pid: number;
  startedAt: string;
  pipePath: string;
  protocolVersion: number;
  clientSessionCount: number;
  desktopScopeCount: number;
  browserRuntimeCount: number;
  browserPageCount: number;
  cmdSessionCount: number;
  pwshSessionCount: number;
};

type DaemonMessage =
  | { type: 'health' }
  | { type: 'shutdown' }
  | { type: 'command'; action: string; params?: Record<string, unknown> };

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForHealth(attempts: number, delayMs: number): Promise<DaemonHealth | null> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const health = await getDaemonHealth();
    if (health) {
      return health;
    }
    await sleep(delayMs);
  }
  return null;
}

function resolveDaemonEntrypoint(): string {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);
  const candidates = [
    path.resolve(currentDir, '../operator-daemon.ts'),
    path.resolve(currentDir, '../dist/operator-daemon.js'),
    path.resolve(currentDir, 'operator-daemon.js')
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve Sidofun operator daemon entrypoint from ${currentFile}`);
}

function readDaemonState(): DaemonState | null {
  try {
    const raw = fs.readFileSync(SIDOFUN_STATE_FILE, 'utf8');
    return JSON.parse(raw) as DaemonState;
  } catch {
    return null;
  }
}

function clearDaemonMetadata(): void {
  const state = readDaemonState();
  if (!state?.daemon) {
    return;
  }
  delete state.daemon;
  fs.writeFileSync(SIDOFUN_STATE_FILE, JSON.stringify(state, null, 2));
}

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function killPid(pid: number): void {
  try {
    process.kill(pid);
  } catch {
    // Ignore and verify by liveness checks afterward.
  }
}

async function sendDaemonMessage(message: DaemonMessage, timeoutMs: number): Promise<any> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(SIDOFUN_DAEMON_PIPE);
    let settled = false;
    let buffer = '';

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        socket.destroy();
        reject(new Error('Timed out communicating with Sidofun operator daemon'));
      }
    }, timeoutMs);

    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      callback();
    };

    socket.once('error', (error) => {
      finish(() => reject(error));
    });

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex === -1) {
        return;
      }

      const raw = buffer.slice(0, newlineIndex).trim();
      finish(() => {
        socket.end();
        if (!raw) {
          reject(new Error('Sidofun operator daemon returned an empty response'));
          return;
        }
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.error) {
            reject(new Error(String(parsed.error)));
            return;
          }
          resolve(parsed);
        } catch (error: unknown) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
    });

    socket.once('connect', () => {
      socket.write(`${JSON.stringify(message)}\n`);
    });
  });
}

export async function getDaemonHealth(): Promise<DaemonHealth | null> {
  try {
    return await sendDaemonMessage({ type: 'health' }, 5000) as DaemonHealth;
  } catch {
    return null;
  }
}

export async function ensureDaemonRunning(): Promise<DaemonHealth> {
  const state = readDaemonState();
  const knownPid = state?.daemon?.pid;

  if (knownPid && isPidRunning(knownPid)) {
    const existing = await waitForHealth(10, 500);
    if (existing?.protocolVersion === DAEMON_PROTOCOL_VERSION) {
      return existing;
    }
    if (existing || state?.daemon?.protocolVersion !== DAEMON_PROTOCOL_VERSION) {
      killPid(knownPid);
      await sleep(500);
    }
  }

  const existing = await waitForHealth(2, 250);
  if (existing?.protocolVersion === DAEMON_PROTOCOL_VERSION) {
    return existing;
  }

  const daemonPath = resolveDaemonEntrypoint();
  const child = spawn(process.execPath, [daemonPath], {
    cwd: process.cwd(),
    detached: true,
    windowsHide: true,
    stdio: 'ignore'
  });
  child.unref();

  const health = await waitForHealth(60, 500);
  if (health) {
    return health;
  }

  throw new Error('Failed to start Sidofun operator daemon');
}

export async function daemonCommand(action: string, params: Record<string, unknown> = {}): Promise<any> {
  await ensureDaemonRunning();
  const response = await sendDaemonMessage({ type: 'command', action, params }, 30000);
  if (!response?.ok) {
    throw new Error(`Daemon command failed: ${JSON.stringify(response)}`);
  }
  return response.result;
}

export async function stopDaemon(): Promise<boolean> {
  const state = readDaemonState();
  const knownPid = state?.daemon?.pid;
  const health = await getDaemonHealth();
  const targetPid = health?.pid || knownPid;

  if (!health && !(targetPid && isPidRunning(targetPid))) {
    clearDaemonMetadata();
    return false;
  }

  if (health) {
    try {
      await sendDaemonMessage({ type: 'shutdown' }, 5000);
    } catch {
      // Fall through to forceful shutdown below.
    }
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    await sleep(200);
    const nextHealth = await getDaemonHealth();
    if (!nextHealth && !(targetPid && isPidRunning(targetPid))) {
      clearDaemonMetadata();
      return true;
    }
  }

  if (targetPid && isPidRunning(targetPid)) {
    killPid(targetPid);
  }

  for (let attempt = 0; attempt < 100; attempt += 1) {
    await sleep(200);
    const nextHealth = await getDaemonHealth();
    if (!nextHealth && !(targetPid && isPidRunning(targetPid))) {
      clearDaemonMetadata();
      return true;
    }
  }

  return false;
}
