import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, test } from 'bun:test';
import {
  LocalBrowserAutomationAdapter,
  TracingBrowserAutomationAdapter
} from '../src/services/browser/browser-automation-adapter.js';
import { TraceRecorder } from '../src/telemetry/trajectory-recorder.js';
import { normalizeScreenshotResult } from '../src/services/screenshots/normalized-screenshot.js';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
});

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe('Browser automation adapter', () => {
  test('routes browser actions through local adapter', async () => {
    const adapter = new LocalBrowserAutomationAdapter(
      {
        listBrowsers: () => [{ id: 'chrome' }],
        getBrowser: () => ({ id: 'chrome' }),
        listProfiles: () => [],
        buildLaunchCommand: () => ({ command: ['chrome.exe'] }),
        launchBrowser: () => ({ pid: 123 }),
        listWindows: () => [],
        focusWindow: () => ({ focused: true }),
        focusBrowserWindow: () => ({ focused: true })
      } as any,
      {
        listRuntimes: () => [{ id: 'runtime-1' }]
      } as any,
      {
        openPage: async (runtimeId: string, url: string) => ({ runtimeId, url })
      } as any
    );

    expect(await adapter.execute('browser_list', {})).toEqual([{ id: 'chrome' }]);
    expect(await adapter.execute('browser_runtime_list', {})).toEqual([{ id: 'runtime-1' }]);
    expect(await adapter.execute('browser_page_open', { runtimeId: 'rt-1', url: 'https://example.com' })).toEqual({
      runtimeId: 'rt-1',
      url: 'https://example.com'
    });
  });

  test('records traced browser actions', async () => {
    const traceDir = await makeTempDir('sidofun-browser-trace-');
    const recorder = new TraceRecorder(traceDir, 'trace.ndjson');
    const adapter = new TracingBrowserAutomationAdapter({
      execute: async () => ({ ok: true })
    }, recorder);

    await adapter.execute('browser_runtime_list', {});

    const lines = (await fs.readFile(recorder.outputPath, 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]);
    expect(record.operation).toBe('browser:browser_runtime_list');
    expect(record.status).toBe('success');
  });
});

describe('Screenshot normalization', () => {
  test('resizes screenshots to target dimensions', async () => {
    const dir = await makeTempDir('sidofun-screenshot-');
    const source = path.join(dir, 'source.png');

    await fs.writeFile(source, await sharp({
      create: {
        width: 20,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 }
      }
    }).png().toBuffer());

    const normalized = await normalizeScreenshotResult(
      {
        filepath: source,
        width: 20,
        height: 10,
        format: 'png'
      },
      {
        width: 100,
        height: 50
      }
    );

    expect(normalized.width).toBe(100);
    expect(normalized.height).toBe(50);
    expect(await fs.stat(normalized.filepath!)).toBeDefined();
  });
});
