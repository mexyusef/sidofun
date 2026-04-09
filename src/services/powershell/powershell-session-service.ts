/**
 * PowerShell Session Service
 * 
 * Manages PowerShell (pwsh.exe/powershell.exe) windows for automation.
 */

import type { ScreenshotResult } from '../../services/windows-nutjs.js';
import type { WindowsNutJsService } from '../../services/windows-nutjs.js';
import { CMDWindowManager } from '../../services/cmd/cmd-window-manager.js';
import { NORMALIZED_SCREEN_CONFIG } from '../../config/constants.js';
import { normalizeScreenshotResult } from '../screenshots/normalized-screenshot.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const execAsync = promisify(exec);

export interface ExecOptions {
  wait?: boolean;
  timeout?: number;
  screenshot?: boolean;
  outputFormat?: 'text' | 'json';
}

export interface ExecResult {
  command: string;
  duration: number;
  exitCode?: number;
  screenshot?: ScreenshotResult;
  success: boolean;
  output?: any;
}

export interface PowerShellSession {
  id: string;
  handle: number;
  title: string;
  currentDirectory: string;
  commandHistory: string[];
  createdAt: Date;
  lastActivity: Date;
}

export class PowerShellSessionService {
  private sessions: Map<string, PowerShellSession>;
  private windowManager: CMDWindowManager;

  constructor(private windowsNutJs: WindowsNutJsService) {
    this.sessions = new Map();
    this.windowManager = new CMDWindowManager();
  }

  async spawn(title?: string, executionPolicy: string = 'Bypass', usePwsh7: boolean = true, cwd?: string): Promise<string> {
    const sessionTitle = title || `PowerShell ${Date.now()}`;
    const beforeWindows = await this.windowManager.findPowerShellWindows();
    console.log(`[PS] Windows before spawn: ${beforeWindows.length}`);

    const windowTitle = `Sidofun_PS_${Date.now()}`;
    const psExecutable = usePwsh7 ? 'pwsh.exe' : 'powershell.exe';

    const { spawn } = await import('child_process');
    console.log(`[PS] Launching ${psExecutable} with title: ${windowTitle}`);

    if (this.hasWindowsTerminal()) {
      spawn(
        'wt.exe',
        [
          '-w',
          'new',
          'new-tab',
          '--title',
          windowTitle,
          ...(cwd ? ['-d', cwd] : []),
          psExecutable,
          '-ExecutionPolicy',
          executionPolicy,
          '-NoExit'
        ],
        { windowsHide: false, detached: true, stdio: 'ignore' }
      ).unref();
    } else {
      spawn(
        `start "${windowTitle}" ${psExecutable} -ExecutionPolicy ${executionPolicy} -NoExit`,
        [],
        { shell: true, cwd, windowsHide: false, detached: true, stdio: 'ignore' }
      ).unref();
    }

    await this.delay(3000);

    let afterWindows = await this.windowManager.findPowerShellWindows();
    console.log(`[PS] Windows after spawn: ${afterWindows.length}`);

    let retries = 0;
    while (retries < 5 && afterWindows.length <= beforeWindows.length) {
      await this.delay(2000);
      afterWindows = await this.windowManager.findPowerShellWindows();
      retries++;
    }

    const newWindow = afterWindows.find(w => !beforeWindows.some(b => b.handle === w.handle));
    if (!newWindow) throw new Error('Failed to spawn PowerShell window');

    console.log(`[PS] Window spawned: ${newWindow.title} (handle: ${newWindow.handle})`);

    const sessionId = `pwsh_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      handle: newWindow.handle,
      title: newWindow.title,
      currentDirectory: cwd || 'C:\\',
      commandHistory: [],
      createdAt: new Date(),
      lastActivity: new Date()
    });

    return sessionId;
  }

  listSessions(): PowerShellSession[] {
    return Array.from(this.sessions.values());
  }

  registerSession(session: PowerShellSession): void {
    this.sessions.set(session.id, session);
  }

  unregisterSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSessionInfo(sessionId: string): any {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);

    const rect = this.windowManager.getWindowRect(session.handle);
    const host = this.windowManager.getWindowHostInfo(session.handle, session.title);
    return {
      id: session.id,
      title: session.title,
      tabTitle: session.title,
      handle: session.handle,
      currentDirectory: session.currentDirectory,
      commandCount: session.commandHistory.length,
      age: Date.now() - session.createdAt.getTime(),
      lastActivity: session.lastActivity,
      rect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      terminalKind: host.terminalKind,
      hostProcessName: host.processName,
      hostPid: host.pid,
      hostExecutablePath: host.executablePath,
      hostWindowTitle: host.mainWindowTitle
    };
  }

  async exec(sessionId: string, command: string, options: ExecOptions = {}): Promise<ExecResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);

    const startTime = Date.now();
    console.log(`[PS] Executing in ${sessionId}: ${command}`);

    await this.type(sessionId, command);
    await this.press(sessionId, 'enter');

    if (options.wait) await this.delay(options.timeout || 5000);

    let screenshot: ScreenshotResult | undefined;
    if (options.screenshot) screenshot = await this.screenshot(sessionId);

    const duration = Date.now() - startTime;
    session.commandHistory.push(command);
    session.lastActivity = new Date();

    return { command, duration, success: true, screenshot };
  }

  async type(sessionId: string, text: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);

    await this.windowManager.focusPowerShell(session.handle, session.title);
    await this.windowsNutJs.executeAction({ type: 'type', text });
    console.log(`[PS] Typed into ${sessionId}: ${text.substring(0, 50)}...`);
  }

  async press(sessionId: string, key: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);

    await this.windowManager.focusPowerShell(session.handle, session.title);
    await this.windowsNutJs.executeAction({ type: 'key_press', key });
    console.log(`[PS] Pressed ${key} in ${sessionId}`);
  }

  async screenshot(sessionId: string, filename?: string, returnBase64: boolean = true): Promise<ScreenshotResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);

    await this.windowManager.focusPowerShell(session.handle, session.title);
    const host = this.windowManager.getWindowHostInfo(session.handle, session.title);

    if (host.terminalKind !== 'windows_terminal') {
      try {
        const directCapture = await this.windowsNutJs.screenshotWin32(
          session.handle,
          filename,
          returnBase64,
          'png'
        );
        if (!(await this.isLikelyBlankScreenshot(directCapture.filepath))) {
          return directCapture;
        }
      } catch {
        // Fall back to full-screen crop for windows that do not cooperate with direct capture.
      }
    }

    const geometry = await this.windowManager.getCMDGeometry(session.handle);
    const tempFilename = `pwsh-${sessionId}-${Date.now()}-full.png`;
    const finalFilename = filename || `pwsh-${sessionId}-${Date.now()}.png`;
    const fullScreenshot = await this.windowsNutJs.takeScreenshot('png', tempFilename, false);

    if (!fullScreenshot.filepath) {
      throw new Error('Full-screen screenshot path was not returned');
    }

    const outputPath = path.resolve(process.cwd(), finalFilename);
    const left = Math.max(0, Math.round(geometry.x));
    const top = Math.max(0, Math.round(geometry.y));
    const width = Math.min(fullScreenshot.width - left, Math.max(1, Math.round(geometry.width)));
    const height = Math.min(fullScreenshot.height - top, Math.max(1, Math.round(geometry.height)));

    await sharp(fullScreenshot.filepath)
      .extract({ left, top, width, height })
      .png()
      .toFile(outputPath);

    await fs.unlink(fullScreenshot.filepath).catch(() => undefined);

    const result: ScreenshotResult = {
      filepath: outputPath,
      width,
      height,
      format: 'png'
    };

    if (NORMALIZED_SCREEN_CONFIG) {
      return normalizeScreenshotResult(result, NORMALIZED_SCREEN_CONFIG, {
        format: 'png',
        filename: finalFilename,
        returnBase64
      });
    }

    if (returnBase64) {
      const buffer = await fs.readFile(outputPath);
      result.data = `data:image/png;base64,${buffer.toString('base64')}`;
    }

    return result;
  }

  private async isLikelyBlankScreenshot(filepath?: string): Promise<boolean> {
    if (!filepath) {
      return false;
    }

    try {
      const stats = await sharp(filepath).stats();
      const luminance = stats.channels
        .slice(0, 3)
        .reduce((sum, channel) => sum + channel.mean, 0) / 3;
      return luminance < 2;
    } catch {
      return false;
    }
  }

  async break(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);

    await this.windowManager.focusPowerShell(session.handle, session.title);
    await this.windowsNutJs.keyToggle('control', 'down');
    await this.windowsNutJs.keyTap('c');
    await this.windowsNutJs.keyToggle('control', 'up');
    console.log(`[PS] Sent Ctrl+C to ${sessionId}`);
  }

  async close(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);

    await this.windowManager.focusPowerShell(session.handle, session.title);
    await this.windowsNutJs.executeAction({ type: 'type', text: 'exit' });
    await this.windowsNutJs.executeAction({ type: 'key_press', key: 'enter' });
    this.sessions.delete(sessionId);
    console.log(`[PS] Session closed: ${sessionId}`);
  }

  async maximize(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);
    await this.windowManager.maximizePowerShell(session.handle);
  }

  async minimize(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);
    await this.windowManager.minimizePowerShell(session.handle);
  }

  async restore(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);
    await this.windowManager.restorePowerShell(session.handle);
  }

  async focus(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);
    await this.windowManager.focusPowerShell(session.handle, session.title);
  }

  async refreshSessionHandle(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);
    const normalizedTitle = session.title.replace(/^"+|"+$/g, '');
    const refreshedHandle = await this.windowManager.findPowerShellByTitle(normalizedTitle);
    if (!refreshedHandle) {
      return false;
    }
    session.handle = refreshedHandle;
    return true;
  }

  async keyToggle(sessionId: string, key: string, direction: string = 'down'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`PowerShell session not found: ${sessionId}`);
    await this.windowManager.focusPowerShell(session.handle, session.title);
    await this.windowsNutJs.executeAction({ type: 'key_toggle', key, direction });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private hasWindowsTerminal(): boolean {
    try {
      execFileSync('where.exe', ['wt.exe'], {
        encoding: 'utf8',
        timeout: 3000,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      return true;
    } catch {
      return false;
    }
  }
}
