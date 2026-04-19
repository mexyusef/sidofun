import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, test } from 'bun:test';
import { BrowserService } from '../src/services/browser/browser-service.js';
import type { BrowserDefinition } from '../src/services/browser/types.js';

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sidofun-browser-'));
  tempDirs.push(dir);
  return dir;
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('BrowserService', () => {
  test('lists chromium profiles with display names and emails', () => {
    const root = makeTempDir();
    const executablePath = path.join(root, 'chrome.exe');
    const userDataPath = path.join(root, 'ChromeUserData');
    fs.writeFileSync(executablePath, '');

    writeJson(path.join(userDataPath, 'Default', 'Preferences'), {
      profile: { name: 'Work Chrome' },
      account_info: [{ email: 'work@example.com' }]
    });
    writeJson(path.join(userDataPath, 'Profile 1', 'Preferences'), {
      profile: { name: 'Personal Chrome' },
      account_info: [{ email: 'personal@example.com' }]
    });

    const definitions: BrowserDefinition[] = [{
      id: 'chrome',
      displayName: 'Google Chrome',
      executableCandidates: [executablePath],
      userDataCandidates: [userDataPath],
      profileStrategy: 'chromium',
      supportsProfileLaunch: true,
      launchFlags: { privateMode: ['--incognito'], headless: ['--headless'] }
    }];

    const service = new BrowserService({ definitions });
    const profiles = service.listProfiles('chrome');

    expect(profiles.map((profile) => profile.name)).toEqual(['Default', 'Profile 1']);
    expect(profiles[0].displayName).toBe('Work Chrome');
    expect(profiles[0].emails).toEqual(['work@example.com']);
    expect(profiles[1].displayName).toBe('Personal Chrome');
    expect(profiles[1].emails).toEqual(['personal@example.com']);
  });

  test('lists firefox profiles from profiles.ini', () => {
    const root = makeTempDir();
    const executablePath = path.join(root, 'firefox.exe');
    const profileRoot = path.join(root, 'Firefox');
    const profilePath = path.join(profileRoot, 'Profiles', 'abc.default-release');
    fs.writeFileSync(executablePath, '');
    fs.mkdirSync(profilePath, { recursive: true });
    fs.writeFileSync(path.join(profileRoot, 'profiles.ini'), [
      '[Profile0]',
      'Name=default-release',
      'IsRelative=1',
      'Path=Profiles/abc.default-release',
      'Default=1'
    ].join('\n'));

    const definitions: BrowserDefinition[] = [{
      id: 'firefox',
      displayName: 'Mozilla Firefox',
      executableCandidates: [executablePath],
      userDataCandidates: [profileRoot],
      profileStrategy: 'firefox',
      supportsProfileLaunch: true,
      launchFlags: { privateMode: ['--private-window'], headless: ['--headless'] }
    }];

    const service = new BrowserService({ definitions });
    const profiles = service.listProfiles('firefox');

    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('default-release');
    expect(profiles[0].path).toBe(profilePath);
    expect(profiles[0].isDefault).toBe(true);
  });

  test('builds chromium launch commands with profile and normalized url', () => {
    const root = makeTempDir();
    const executablePath = path.join(root, 'chrome.exe');
    const userDataPath = path.join(root, 'ChromeUserData');
    fs.writeFileSync(executablePath, '');

    writeJson(path.join(userDataPath, 'Profile 7', 'Preferences'), {
      profile: { name: 'Testing Chrome' }
    });

    const definitions: BrowserDefinition[] = [{
      id: 'chrome',
      displayName: 'Google Chrome',
      executableCandidates: [executablePath],
      userDataCandidates: [userDataPath],
      profileStrategy: 'chromium',
      supportsProfileLaunch: true,
      launchFlags: { privateMode: ['--incognito'], headless: ['--headless'] }
    }];

    const service = new BrowserService({ definitions });
    const result = service.buildLaunchCommand({
      browserId: 'chrome',
      profile: 'Profile 7',
      url: 'example.com',
      privateMode: true,
      headless: true,
      args: ['--new-window']
    });

    expect(result.command).toEqual([
      executablePath,
      `--user-data-dir=${userDataPath}`,
      '--profile-directory=Profile 7',
      '--incognito',
      '--headless',
      '--new-window',
      'https://example.com'
    ]);
    expect(result.usedProfile?.displayName).toBe('Testing Chrome');
  });

  test('builds debuggable firefox launch commands with remote debugging metadata', () => {
    const root = makeTempDir();
    const executablePath = path.join(root, 'firefox.exe');
    const profileRoot = path.join(root, 'Firefox');
    const profilePath = path.join(profileRoot, 'Profiles', 'abc.uneh.saraswati');
    fs.writeFileSync(executablePath, '');
    fs.mkdirSync(profilePath, { recursive: true });
    fs.writeFileSync(path.join(profileRoot, 'profiles.ini'), [
      '[Profile0]',
      'Name=uneh.saraswati',
      'IsRelative=1',
      'Path=Profiles/abc.uneh.saraswati',
      'Default=0'
    ].join('\n'));

    const definitions: BrowserDefinition[] = [{
      id: 'firefox',
      displayName: 'Mozilla Firefox',
      executableCandidates: [executablePath],
      userDataCandidates: [profileRoot],
      profileStrategy: 'firefox',
      supportsProfileLaunch: true,
      launchFlags: { privateMode: ['--private-window'], headless: ['--headless'] }
    }];

    const service = new BrowserService({ definitions });
    const result = service.buildLaunchCommand({
      browserId: 'firefox',
      profile: 'uneh.saraswati',
      url: 'gmail.com',
      automationMode: 'debuggable',
      debugPort: 9333
    });

    expect(result.command).toEqual([
      executablePath,
      '-P',
      'uneh.saraswati',
      '-new-instance',
      '--remote-debugging-port',
      '9333',
      'https://gmail.com'
    ]);
    expect(result.debugPort).toBe(9333);
    expect(result.remoteDebuggingUrl).toBe('http://127.0.0.1:9333');
  });

  test('adds Chromium automation flags that suppress first-run gating for debuggable launches', () => {
    const root = makeTempDir();
    const executablePath = path.join(root, 'chrome.exe');
    fs.writeFileSync(executablePath, '');

    const definitions: BrowserDefinition[] = [{
      id: 'chrome',
      displayName: 'Google Chrome',
      executableCandidates: [executablePath],
      userDataCandidates: [path.join(root, 'ChromeUserData')],
      profileStrategy: 'chromium',
      supportsProfileLaunch: true,
      launchFlags: { privateMode: ['--incognito'], headless: ['--headless'] }
    }];

    const service = new BrowserService({ definitions });
    const result = service.buildLaunchCommand({
      browserId: 'chrome',
      automationMode: 'debuggable',
      debugPort: 9444,
      url: 'example.com'
    });

    expect(result.command).toEqual([
      executablePath,
      '--remote-debugging-port=9444',
      '--remote-debugging-address=127.0.0.1',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-default-apps',
      '--disable-sync',
      'https://example.com'
    ]);
  });

  test('keeps direct-launch chromium browsers out of the profile workflow while preserving private/headless flags', () => {
    const root = makeTempDir();
    const executablePath = path.join(root, 'edge.exe');
    const userDataPath = path.join(root, 'Edge User Data');
    fs.writeFileSync(executablePath, '');

    const definitions: BrowserDefinition[] = [{
      id: 'edge',
      displayName: 'Microsoft Edge',
      executableCandidates: [executablePath],
      userDataCandidates: [userDataPath],
      profileStrategy: 'chromium',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      launchFlags: { privateMode: ['--inprivate'], headless: ['--headless'] }
    }];

    const service = new BrowserService({ definitions });
    const browser = service.getBrowser('edge');
    const profiles = service.listProfiles('edge');
    const result = service.buildLaunchCommand({
      browserId: 'edge',
      url: 'example.com',
      privateMode: true,
      headless: true
    });

    expect(browser.launchMode).toBe('direct');
    expect(browser.supportsProfiles).toBe(false);
    expect(browser.supportsProfileDiscovery).toBe(false);
    expect(browser.supportsProfileLaunch).toBe(false);
    expect(browser.supportsPrivateMode).toBe(true);
    expect(browser.supportsHeadless).toBe(true);
    expect(profiles).toEqual([]);
    expect(result.command).toEqual([
      executablePath,
      '--inprivate',
      '--headless',
      'https://example.com'
    ]);
    expect(result.usedProfile).toBeUndefined();
  });
});
