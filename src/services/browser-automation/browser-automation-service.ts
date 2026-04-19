import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BrowserService } from '../browser/browser-service.js';
import type { BrowserLaunchResult } from '../browser/types.js';
import type {
  BrowserNavigationPolicy,
  BrowserRuntimeCloseResult,
  BrowserRuntimeCreateOptions,
  BrowserRuntimeInfo
} from './types.js';
import type { BrowserNavigationPolicyService } from '../browser-page-query/browser-navigation-policy-service.js';

interface BrowserAutomationServiceOptions {
  browserService: Pick<BrowserService, 'launchBrowser'>;
  navigationPolicyService?: BrowserNavigationPolicyService;
  closeProcess?: (pid: number) => void;
  generateId?: () => string;
  now?: () => Date;
  allocatePort?: () => number;
  waitForDebugEndpoint?: (remoteDebuggingUrl: string) => Promise<void>;
}

export class BrowserAutomationService {
  private readonly browserService: Pick<BrowserService, 'launchBrowser'>;
  private readonly closeProcess: (pid: number) => void;
  private readonly navigationPolicyService?: BrowserNavigationPolicyService;
  private readonly generateId: () => string;
  private readonly now: () => Date;
  private readonly allocatePort: () => number;
  private readonly waitForDebugEndpointFn: (remoteDebuggingUrl: string) => Promise<void>;
  private readonly runtimes = new Map<string, BrowserRuntimeInfo>();
  private nextPort = 9222;

  constructor(options: BrowserAutomationServiceOptions) {
    this.browserService = options.browserService;
    this.navigationPolicyService = options.navigationPolicyService;
    this.closeProcess = options.closeProcess || this.defaultCloseProcess;
    this.generateId = options.generateId || (() => `browser_rt_${randomUUID()}`);
    this.now = options.now || (() => new Date());
    this.allocatePort = options.allocatePort || (() => this.nextPort++);
    this.waitForDebugEndpointFn = options.waitForDebugEndpoint || ((remoteDebuggingUrl) => this.waitForDebugEndpoint(remoteDebuggingUrl));
  }

  async createRuntime(options: BrowserRuntimeCreateOptions): Promise<BrowserRuntimeInfo> {
    this.navigationPolicyService?.assertUrlAllowed(options.url);
    const automationMode = options.automationMode || 'debuggable';
    const debugPort = options.debugPort || this.allocatePort();
    const tempUserDataDir = this.createTempUserDataDir(options.browserId, automationMode, options.profile, options.profilePath);
    const launchResult = this.browserService.launchBrowser({
      ...options,
      detached: options.detached ?? true,
      automationMode,
      debugPort,
      userDataDir: tempUserDataDir
    });

    const runtime = this.buildRuntimeInfo(launchResult, {
      id: this.generateId(),
      automationMode,
      createdAt: this.now().toISOString(),
      tempUserDataDir
    });

    await this.waitForDebugEndpointFn(runtime.remoteDebuggingUrl);

    this.runtimes.set(runtime.id, runtime);
    return runtime;
  }

  registerRuntime(runtime: BrowserRuntimeInfo): BrowserRuntimeInfo {
    this.runtimes.set(runtime.id, {
      ...runtime,
      command: [...runtime.command],
      usedProfile: runtime.usedProfile ? {
        ...runtime.usedProfile,
        emails: [...runtime.usedProfile.emails]
      } : undefined,
      launchResult: {
        ...runtime.launchResult,
        command: [...runtime.launchResult.command],
        usedProfile: runtime.launchResult.usedProfile ? {
          ...runtime.launchResult.usedProfile,
          emails: [...runtime.launchResult.usedProfile.emails]
        } : undefined
      }
    });
    return this.getRuntime(runtime.id);
  }

  listRuntimes(): BrowserRuntimeInfo[] {
    return [...this.runtimes.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  getRuntime(runtimeId: string): BrowserRuntimeInfo {
    const runtime = this.runtimes.get(runtimeId);
    if (!runtime) {
      throw new Error(`Browser runtime not found: ${runtimeId}`);
    }
    return runtime;
  }

  closeRuntime(runtimeId: string): BrowserRuntimeCloseResult {
    const runtime = this.getRuntime(runtimeId);

    if (runtime.status === 'closed') {
      return {
        id: runtime.id,
        closed: true,
        status: runtime.status,
        closedAt: runtime.closedAt,
        pid: runtime.pid
      };
    }

    if (runtime.pid) {
      this.closeProcess(runtime.pid);
    }

    runtime.status = 'closed';
    runtime.closedAt = this.now().toISOString();
    if (runtime.tempUserDataDir && fs.existsSync(runtime.tempUserDataDir)) {
      try {
        fs.rmSync(runtime.tempUserDataDir, { recursive: true, force: true });
      } catch {
        // Chromium temp profiles can stay locked briefly after process exit.
      }
    }

    return {
      id: runtime.id,
      closed: true,
      status: runtime.status,
      closedAt: runtime.closedAt,
      pid: runtime.pid
    };
  }

  shutdown(): void {
    for (const runtime of this.runtimes.values()) {
      if (runtime.status === 'running') {
        try {
          this.closeRuntime(runtime.id);
        } catch {
          // Ignore shutdown cleanup failures.
        }
      }
    }
  }

  async canReconnectRuntime(remoteDebuggingUrl: string): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    try {
      const response = await fetch(`${remoteDebuggingUrl}/json/version`, {
        signal: controller.signal
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  getNavigationPolicy(): BrowserNavigationPolicy {
    return this.navigationPolicyService?.getPolicy() ?? {
      enabled: false,
      allowList: [],
      denyList: []
    };
  }

  setNavigationPolicy(next: Partial<BrowserNavigationPolicy>): BrowserNavigationPolicy {
    if (!this.navigationPolicyService) {
      throw new Error('Browser navigation policy service is not available');
    }
    return this.navigationPolicyService.setPolicy(next);
  }

  private buildRuntimeInfo(
    launchResult: BrowserLaunchResult,
    base: {
      id: string;
      automationMode: 'debuggable' | 'persistent-debuggable';
      createdAt: string;
      tempUserDataDir?: string;
    }
  ): BrowserRuntimeInfo {
    if (!launchResult.debugPort || !launchResult.remoteDebuggingUrl) {
      throw new Error('Debuggable runtime launch did not include remote debugging metadata');
    }

    return {
      id: base.id,
      browserId: launchResult.browserId,
      automationMode: base.automationMode,
      createdAt: base.createdAt,
      status: 'running',
      pid: launchResult.pid,
      debugPort: launchResult.debugPort,
      remoteDebuggingUrl: launchResult.remoteDebuggingUrl,
      executablePath: launchResult.executablePath,
      command: launchResult.command,
      usedProfile: launchResult.usedProfile,
      tempUserDataDir: base.tempUserDataDir,
      launchResult
    };
  }

  private defaultCloseProcess(pid: number): void {
    try {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        timeout: 15000,
        stdio: 'ignore'
      });
    } catch {
      try {
        process.kill(pid);
      } catch {
        // Browsers may hand launch off to an existing process, leaving the
        // original spawn pid already gone by the time close is requested.
      }
    }
  }

  private createTempUserDataDir(
    browserId: string,
    automationMode: 'debuggable' | 'persistent-debuggable',
    profile?: string,
    profilePath?: string
  ): string | undefined {
    const isChromium = ['chrome', 'edge', 'brave', 'opera', 'vivaldi', 'chromium', 'maxthon', 'midori', 'min'].includes(browserId);
    if (!isChromium || automationMode !== 'debuggable' || profile || profilePath) {
      return undefined;
    }

    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `sidofun-${browserId}-rt-`));
    this.prepareChromiumAutomationProfile(userDataDir);
    return userDataDir;
  }

  private prepareChromiumAutomationProfile(userDataDir: string): void {
    try {
      fs.mkdirSync(path.join(userDataDir, 'Default'), { recursive: true });
      fs.writeFileSync(path.join(userDataDir, 'First Run'), '', 'utf8');
    } catch {
      // Launch should still proceed even if temp profile seeding fails.
    }
  }

  private async waitForDebugEndpoint(remoteDebuggingUrl: string): Promise<void> {
    const versionUrl = `${remoteDebuggingUrl}/json/version`;
    let lastError: unknown;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        const response = await fetch(versionUrl);
        if (response.ok) {
          return;
        }
      } catch (error) {
        lastError = error;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (lastError instanceof Error) {
      throw new Error(`Remote debugging endpoint did not become ready: ${lastError.message}`);
    }
    throw new Error('Remote debugging endpoint did not become ready');
  }
}
