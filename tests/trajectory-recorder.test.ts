import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { TracingPlatformAdapter } from '../src/platforms/tracing-platform-adapter.js';
import { TraceRecorder } from '../src/telemetry/trajectory-recorder.js';
import { CMDTerminalCore } from '../src/services/terminal/cmd-terminal-core.js';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

async function createRecorder(): Promise<TraceRecorder> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sidofun-trace-'));
  tempDirs.push(dir);
  return new TraceRecorder(dir, 'trace.ndjson');
}

async function readTraceLines(recorder: TraceRecorder): Promise<any[]> {
  const contents = await fs.readFile(recorder.outputPath, 'utf8');
  return contents
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

describe('Trajectory tracing', () => {
  test('tracing platform adapter records sanitized screenshot output', async () => {
    const recorder = await createRecorder();
    const adapter = new TracingPlatformAdapter({
      executeDesktopAction: async (action) => action,
      getScreenSize: async () => ({ width: 1920, height: 1080 }),
      getMousePosition: async () => ({ x: 50, y: 75 }),
      takeScreenshot: async () => ({
        filepath: 'shot.png',
        width: 1920,
        height: 1080,
        format: 'png',
        data: 'data:image/png;base64,abc123'
      }),
      screenshotWin32: async () => ({
        filepath: 'win32.png',
        width: 1280,
        height: 720,
        format: 'png'
      })
    }, recorder);

    await adapter.takeScreenshot('png', 'shot.png', true);

    const records = await readTraceLines(recorder);
    expect(records).toHaveLength(1);
    expect(records[0].source).toBe('platform');
    expect(records[0].operation).toBe('take_screenshot');
    expect(records[0].status).toBe('success');
    expect(records[0].output.data).toBe('[base64 omitted]');
  });

  test('cmd terminal core records shared terminal operations', async () => {
    const recorder = await createRecorder();
    const cmdService = {
      spawn: async (title?: string) => `session:${title || 'default'}`,
      attach: async (titlePattern: string) => `attached:${titlePattern}`,
      listSessions: () => [{ id: 'session-1' }],
      getSessionInfo: (sessionId: string) => ({ id: sessionId, title: 'Terminal 1' }),
      exec: async (sessionId: string, command: string) => ({ sessionId, command, ok: true }),
      press: async () => undefined,
      screenshot: async (sessionId: string) => ({
        filepath: `${sessionId}.png`,
        width: 800,
        height: 600,
        format: 'png'
      }),
      sendBreak: async () => undefined,
      sendEOF: async () => undefined,
      close: async () => undefined,
      focus: async () => undefined,
      type: async () => undefined,
      maximize: async () => undefined,
      minimize: async () => undefined,
      restore: async () => undefined
    };
    const nutJs = {
      executeAction: async () => undefined
    };
    const terminalCore = new CMDTerminalCore(cmdService as any, nutJs as any, recorder);

    await terminalCore.spawn('work');
    await terminalCore.exec('session-1', 'dir');
    await terminalCore.keyToggle('session-1', 'shift', 'down');

    const records = await readTraceLines(recorder);
    expect(records).toHaveLength(3);
    expect(records.map((record) => record.operation)).toEqual(['spawn', 'exec', 'key_toggle']);
    expect(records.every((record) => record.source === 'terminal')).toBe(true);
    expect(records[2].output.message).toBe('Key down: shift');
  });
});
