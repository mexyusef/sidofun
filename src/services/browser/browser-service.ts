import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { execFileSync } from 'node:child_process';
import { LIBNUT_PATH } from '../../config/index.js';
import { createWindowsBrowserCatalog } from './catalog.js';
import type {
  BrowserAutomationMode,
  BrowserDefinition,
  BrowserId,
  BrowserInfo,
  BrowserLaunchOptions,
  BrowserLaunchResult,
  BrowserProfileInfo,
  BrowserWindowInfo
} from './types.js';

interface BrowserServiceOptions {
  definitions?: BrowserDefinition[];
}

export class BrowserService {
  private definitions: BrowserDefinition[];
  private libnut: any = null;

  constructor(options: BrowserServiceOptions = {}) {
    this.definitions = options.definitions || createWindowsBrowserCatalog();
  }

  listBrowsers(): BrowserInfo[] {
    return this.definitions.map((definition) => this.resolveBrowser(definition));
  }

  getBrowser(browserId: BrowserId): BrowserInfo {
    return this.resolveBrowser(this.getDefinition(browserId));
  }

  listProfiles(browserId: BrowserId): BrowserProfileInfo[] {
    const definition = this.getDefinition(browserId);
    const browser = this.resolveBrowser(definition);

    if (!browser.supportsProfileDiscovery) {
      return [];
    }

    if (!browser.userDataPath || !fs.existsSync(browser.userDataPath)) {
      return [];
    }

    switch (definition.profileStrategy) {
      case 'chromium':
        return this.listChromiumProfiles(browserId, browser.userDataPath);
      case 'firefox':
        return this.listFirefoxProfiles(browserId, browser.userDataPath);
      case 'single':
        return [{
          id: 'default',
          browserId,
          name: 'default',
          displayName: `${browser.displayName} Default`,
          path: browser.userDataPath,
          isDefault: true,
          emails: [],
          lastUsedAt: this.safeStatIso(browser.userDataPath)
        }];
      case 'none':
      default:
        return [];
    }
  }

  buildLaunchCommand(options: BrowserLaunchOptions): BrowserLaunchResult {
    const definition = this.getDefinition(options.browserId);
    const browser = this.resolveBrowser(definition);

    if (!browser.executablePath) {
      throw new Error(`Browser executable not found for ${options.browserId}`);
    }

    const command = [browser.executablePath];
    let usedProfile: BrowserProfileInfo | undefined;
    const automationMode = options.automationMode || 'standard';
    const debugPort = automationMode === 'standard'
      ? undefined
      : options.debugPort || 9222;

    if (options.profile || options.profilePath) {
      if (!definition.supportsProfileLaunch) {
        throw new Error(`Profile launch is not supported for ${options.browserId}`);
      }

      usedProfile = this.resolveProfileForLaunch(options.browserId, options.profile, options.profilePath);

      if (definition.profileStrategy === 'chromium') {
        command.push(`--user-data-dir=${path.dirname(usedProfile.path)}`);
        command.push(`--profile-directory=${path.basename(usedProfile.path)}`);
      } else if (definition.profileStrategy === 'firefox') {
        command.push('-P', usedProfile.name);
      }
    }

    if (options.userDataDir && definition.profileStrategy === 'chromium') {
      command.push(`--user-data-dir=${options.userDataDir}`);
    }

    if (options.privateMode && definition.launchFlags?.privateMode) {
      command.push(...definition.launchFlags.privateMode);
    }

    if (options.headless && definition.launchFlags?.headless) {
      command.push(...definition.launchFlags.headless);
    }

    this.addAutomationFlags(command, definition, automationMode, debugPort);

    if (options.args && options.args.length > 0) {
      command.push(...options.args);
    }

    if (options.url) {
      command.push(this.normalizeUrl(options.url));
    }

    return {
      browserId: options.browserId,
      executablePath: browser.executablePath,
      command,
      usedProfile,
      automationMode,
      debugPort,
      remoteDebuggingUrl: debugPort
        ? `http://127.0.0.1:${debugPort}`
        : undefined
    };
  }

  launchBrowser(options: BrowserLaunchOptions): BrowserLaunchResult {
    const launchPlan = this.buildLaunchCommand(options);
    const child = spawn(launchPlan.command[0], launchPlan.command.slice(1), {
      detached: options.detached ?? false,
      windowsHide: false,
      stdio: 'ignore'
    });

    child.unref();

    return {
      ...launchPlan,
      pid: child.pid
    };
  }

  listWindows(browserId?: BrowserId): BrowserWindowInfo[] {
    const processNameToBrowser = new Map<string, BrowserId>();
    for (const definition of this.definitions) {
      for (const processName of definition.processNames || []) {
        processNameToBrowser.set(processName.toLowerCase(), definition.id);
      }
    }

    const command = [
      '$processes = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle };',
      '$result = foreach ($proc in $processes) {',
      '  [PSCustomObject]@{',
      '    pid = $proc.Id;',
      '    processName = $proc.ProcessName;',
      '    title = $proc.MainWindowTitle;',
      '    handle = [int64]$proc.MainWindowHandle',
      '  }',
      '};',
      '$result | ConvertTo-Json -Depth 3'
    ].join(' ');

    const raw = execFileSync('powershell', ['-NoProfile', '-Command', command], {
      encoding: 'utf8',
      timeout: 15000
    }).trim();

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Array<{
      pid: number;
      processName: string;
      title: string;
      handle: number;
    }> | {
      pid: number;
      processName: string;
      title: string;
      handle: number;
    };

    const windows = (Array.isArray(parsed) ? parsed : [parsed])
      .map((window): BrowserWindowInfo | null => {
        const browser = processNameToBrowser.get(window.processName.toLowerCase());
        if (!browser) {
          return null;
        }

        return {
          handle: Number(window.handle),
          title: window.title,
          processName: window.processName,
          pid: window.pid,
          browserId: browser,
          bounds: this.tryGetWindowBounds(Number(window.handle))
        };
      })
      .filter((window): window is BrowserWindowInfo => window !== null);

    if (!browserId) {
      return windows;
    }

    return windows.filter((window) => window.browserId === browserId);
  }

  focusWindow(handle: number): BrowserWindowInfo {
    const libnut = this.getLibnut();
    libnut.focusWindow(handle);
    const matched = this.listWindows().find((window) => window.handle === handle);
    if (!matched) {
      return {
        handle,
        title: '',
        processName: '',
        pid: 0
      };
    }
    return matched;
  }

  focusBrowserWindow(browserId: BrowserId, titleIncludes?: string): BrowserWindowInfo {
    const windows = this.listWindows(browserId);
    const target = titleIncludes
      ? windows.find((window) => window.title.toLowerCase().includes(titleIncludes.toLowerCase()))
      : windows[0];

    if (!target) {
      throw new Error(`No window found for browser ${browserId}`);
    }

    return this.focusWindow(target.handle);
  }

  private getDefinition(browserId: BrowserId): BrowserDefinition {
    const definition = this.definitions.find((entry) => entry.id === browserId);
    if (!definition) {
      throw new Error(`Unsupported browser: ${browserId}`);
    }
    return definition;
  }

  private resolveBrowser(definition: BrowserDefinition): BrowserInfo {
    const executablePath = this.findExistingPath(definition.executableCandidates);
    const userDataPath = definition.userDataCandidates
      ? this.findExistingPath(definition.userDataCandidates) || definition.userDataCandidates[0]
      : undefined;
    const supportsProfileDiscovery = definition.supportsProfileDiscovery ?? definition.profileStrategy !== 'none';

    return {
      id: definition.id,
      displayName: definition.displayName,
      installed: Boolean(executablePath),
      executablePath,
      userDataPath,
      profileStrategy: definition.profileStrategy,
      supportsProfileDiscovery,
      supportsProfiles: supportsProfileDiscovery,
      supportsProfileLaunch: definition.supportsProfileLaunch,
      launchMode: definition.supportsProfileLaunch ? 'profile' : 'direct',
      supportsPrivateMode: Boolean(definition.launchFlags?.privateMode?.length),
      supportsHeadless: Boolean(definition.launchFlags?.headless?.length),
      notes: definition.notes
    };
  }

  private findExistingPath(candidates: string[]): string | undefined {
    return candidates.find((candidate) => fs.existsSync(candidate));
  }

  private listChromiumProfiles(browserId: BrowserId, userDataPath: string): BrowserProfileInfo[] {
    const profiles: BrowserProfileInfo[] = [];
    const root = path.resolve(userDataPath);

    const defaultPath = path.join(root, 'Default');
    if (fs.existsSync(defaultPath) && fs.statSync(defaultPath).isDirectory()) {
      profiles.push(this.buildChromiumProfile(browserId, defaultPath, 'Default', true));
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('Profile ')) {
        continue;
      }
      profiles.push(this.buildChromiumProfile(browserId, path.join(root, entry.name), entry.name, false));
    }

    return profiles.sort((left, right) => left.name.localeCompare(right.name));
  }

  private buildChromiumProfile(
    browserId: BrowserId,
    profilePath: string,
    profileName: string,
    isDefault: boolean
  ): BrowserProfileInfo {
    const preferencesPath = path.join(profilePath, 'Preferences');
    let displayName = profileName;
    const emails: string[] = [];

    if (fs.existsSync(preferencesPath)) {
      try {
        const preferences = JSON.parse(fs.readFileSync(preferencesPath, 'utf8')) as Record<string, unknown>;
        const profile = preferences.profile as Record<string, unknown> | undefined;
        const accountInfo = preferences.account_info;

        if (profile && typeof profile.name === 'string' && profile.name.trim()) {
          displayName = profile.name;
        }

        if (Array.isArray(accountInfo)) {
          for (const account of accountInfo) {
            if (account && typeof account === 'object' && 'email' in account) {
              const email = (account as { email?: unknown }).email;
              if (typeof email === 'string' && email.trim()) {
                emails.push(email);
              }
            }
          }
        }
      } catch {
        // Ignore malformed Preferences files during profile scan.
      }
    }

    return {
      id: profileName,
      browserId,
      name: profileName,
      displayName,
      path: profilePath,
      isDefault,
      emails: [...new Set(emails)],
      lastUsedAt: this.safeStatIso(profilePath)
    };
  }

  private listFirefoxProfiles(browserId: BrowserId, userDataPath: string): BrowserProfileInfo[] {
    const profilesIniPath = path.join(userDataPath, 'profiles.ini');
    if (!fs.existsSync(profilesIniPath)) {
      return [];
    }

    const sections = this.parseIni(fs.readFileSync(profilesIniPath, 'utf8'));
    const profiles: BrowserProfileInfo[] = [];

    for (const [sectionName, section] of Object.entries(sections)) {
      if (!sectionName.startsWith('Profile')) {
        continue;
      }

      const name = section.Name || section.name || sectionName;
      const isDefault = section.Default === '1';
      const isRelative = section.IsRelative !== '0';
      const rawPath = section.Path || '';

      if (!rawPath) {
        continue;
      }

      const profilePath = isRelative
        ? path.join(userDataPath, rawPath)
        : rawPath;

      if (!fs.existsSync(profilePath)) {
        continue;
      }

      profiles.push({
        id: name,
        browserId,
        name,
        displayName: name,
        path: profilePath,
        isDefault,
        emails: [],
        lastUsedAt: this.safeStatIso(profilePath)
      });
    }

    return profiles;
  }

  private parseIni(contents: string): Record<string, Record<string, string>> {
    const sections: Record<string, Record<string, string>> = {};
    let currentSection: string | undefined;

    for (const rawLine of contents.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith(';') || line.startsWith('#')) {
        continue;
      }

      if (line.startsWith('[') && line.endsWith(']')) {
        currentSection = line.slice(1, -1);
        sections[currentSection] = {};
        continue;
      }

      if (!currentSection) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      sections[currentSection][key] = value;
    }

    return sections;
  }

  private resolveProfileForLaunch(
    browserId: BrowserId,
    profileName?: string,
    profilePath?: string
  ): BrowserProfileInfo {
    const profiles = this.listProfiles(browserId);

    if (profilePath) {
      const directMatch = profiles.find((profile) => path.resolve(profile.path) === path.resolve(profilePath));
      if (directMatch) {
        return directMatch;
      }

      if (fs.existsSync(profilePath)) {
        return {
          id: profileName || path.basename(profilePath),
          browserId,
          name: profileName || path.basename(profilePath),
          displayName: profileName || path.basename(profilePath),
          path: profilePath,
          isDefault: false,
          emails: [],
          lastUsedAt: this.safeStatIso(profilePath)
        };
      }
    }

    if (profileName) {
      const match = profiles.find((profile) =>
        profile.id === profileName ||
        profile.name === profileName ||
        profile.displayName === profileName
      );
      if (match) {
        return match;
      }
    }

    throw new Error(`Profile not found for ${browserId}`);
  }

  private normalizeUrl(url: string): string {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) {
      return url;
    }
    return `https://${url}`;
  }

  private safeStatIso(targetPath: string): string | undefined {
    try {
      return fs.statSync(targetPath).mtime.toISOString();
    } catch {
      return undefined;
    }
  }

  private getLibnut(): any {
    if (this.libnut) {
      return this.libnut;
    }

    if (!fs.existsSync(LIBNUT_PATH)) {
      throw new Error(`libnut-core not found at: ${LIBNUT_PATH}`);
    }

    this.libnut = require(LIBNUT_PATH);
    return this.libnut;
  }

  private tryGetWindowBounds(handle: number): BrowserWindowInfo['bounds'] | undefined {
    try {
      const libnut = this.getLibnut();
      const rect = libnut.getWindowRect(handle);
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    } catch {
      return undefined;
    }
  }

  private addAutomationFlags(
    command: string[],
    definition: BrowserDefinition,
    automationMode: BrowserAutomationMode,
    debugPort?: number
  ): void {
    if (automationMode === 'standard' || !debugPort) {
      return;
    }

    if (definition.profileStrategy === 'chromium') {
      command.push(`--remote-debugging-port=${debugPort}`);
      command.push('--remote-debugging-address=127.0.0.1');
      return;
    }

    if (definition.profileStrategy === 'firefox') {
      command.push('-new-instance');
      command.push('--remote-debugging-port', String(debugPort));
    }
  }
}
