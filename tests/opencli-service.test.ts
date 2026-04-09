import { afterEach, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OpenCliService } from '../src/services/opencli/opencli-service.js';

const originalEnv = { ...process.env };
const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_DIR, '..');
const OPENCLI_REPO = path.join(REPO_ROOT, 'opencli-rs');

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('opencli service', () => {
  test('lists adapter sites from nested opencli-rs repo', () => {
    const service = new OpenCliService();
    const sites = service.listSites();
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.some((site) => site.site === 'twitter')).toBe(true);
    expect(service.listCommands('twitter')).toContain('search');
  });

  test('reports adapter metadata from a configured repo path', () => {
    process.env.OPENCLI_RS_PATH = OPENCLI_REPO;
    const service = new OpenCliService();
    const status = service.getStatus();
    expect(status.adapterSiteCount).toBeGreaterThan(0);
    expect(status.twitterAvailable).toBe(true);
  });

  test('accepts repo directory from Sidofun config file path setting', () => {
    const repoPath = OPENCLI_REPO;
    const configDir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'Sidofun');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.json'),
      JSON.stringify({ OPENCLI_RS_PATH: repoPath }, null, 2),
      'utf8'
    );

    const service = new OpenCliService();
    const status = service.getStatus();
    expect(status.available).toBe(true);
    expect(status.repoPath).toBe(repoPath);
    expect(status.extensionPath).toBe(path.join(repoPath, 'extension'));
  });

  test('runs a built binary and parses json output', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidofun-opencli-'));
    const fakeCli = path.join(tempDir, 'fake-opencli.cmd');
    fs.writeFileSync(
      fakeCli,
      '@echo off\r\n' +
      'echo [{"site":"%1","command":"%2"}]\r\n',
      'utf8'
    );
    process.env.OPENCLI_RS_PATH = fakeCli;

    const service = new OpenCliService();
    const result = await service.run({
      site: 'hackernews',
      command: 'top',
      args: ['--limit', '1'],
      cwd: tempDir,
      timeoutMs: 2000,
      format: 'json'
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe('binary');
    expect(result.parsed).toEqual([{ site: 'hackernews', command: 'top' }]);
  });

  test('twitter search appends mode argument when provided', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidofun-opencli-'));
    const fakeCli = path.join(tempDir, 'fake-opencli-twitter-mode.cmd');
    fs.writeFileSync(
      fakeCli,
      '@echo off\r\n' +
      'echo [{"ok":true}]\r\n',
      'utf8'
    );
    process.env.OPENCLI_RS_PATH = fakeCli;

    const service = new OpenCliService();
    const result = await service.twitterSearch({
      query: 'rust lang',
      mode: 'latest',
      limit: 3,
      cwd: tempDir
    });

    expect(result.commandLine).toContain('--mode');
    expect(result.commandLine).toContain('latest');
  });

  test('passes keep-browser-open env flag and waits after completion', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidofun-opencli-'));
    const fakeCli = path.join(tempDir, 'fake-opencli-keep.cmd');
    const markerFile = path.join(tempDir, 'keep-flag.txt');
    fs.writeFileSync(
      fakeCli,
      `@echo off\r\n` +
      `set OPENCLI_KEEP_BROWSER_OPEN> "${markerFile}"\r\n` +
      'echo [{"ok":true}]\r\n',
      'utf8'
    );
    process.env.OPENCLI_RS_PATH = fakeCli;

    const service = new OpenCliService();
    const startedAt = Date.now();
    const result = await service.run({
      site: 'twitter',
      command: 'search',
      cwd: tempDir,
      timeoutMs: 2000,
      format: 'json',
      keepBrowserOpen: true,
      waitAfterMs: 150
    });

    expect(result.success).toBe(true);
    expect(result.keepBrowserOpen).toBe(true);
    expect(result.waitAfterMs).toBe(150);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(125);
    expect(fs.readFileSync(markerFile, 'utf8')).toContain('OPENCLI_KEEP_BROWSER_OPEN=1');
  });

  test('parses json output even with trailing elapsed line', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidofun-opencli-'));
    const fakeCli = path.join(tempDir, 'fake-opencli-elapsed.cmd');
    fs.writeFileSync(
      fakeCli,
      '@echo off\r\n' +
      'echo [{"ok":true}]\r\n' +
      'echo Elapsed: 1.00s ^| Source: hackernews top\r\n',
      'utf8'
    );
    process.env.OPENCLI_RS_PATH = fakeCli;

    const service = new OpenCliService();
    const result = await service.run({
      site: 'hackernews',
      command: 'top',
      cwd: tempDir,
      timeoutMs: 2000,
      format: 'json'
    });

    expect(result.parsed).toEqual([{ ok: true }]);
  });

  test('parses json output even with leading log lines', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidofun-opencli-'));
    const fakeCli = path.join(tempDir, 'fake-opencli-leading.cmd');
    fs.writeFileSync(
      fakeCli,
      '@echo off\r\n' +
      'echo WARN provider log line\r\n' +
      'echo [{"ok":true,"rows":0}]\r\n',
      'utf8'
    );
    process.env.OPENCLI_RS_PATH = fakeCli;

    const service = new OpenCliService();
    const result = await service.run({
      site: 'twitter',
      command: 'search',
      cwd: tempDir,
      timeoutMs: 2000,
      format: 'json'
    });

    expect(result.parsed).toEqual([{ ok: true, rows: 0 }]);
  });
});
