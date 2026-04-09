/**
 * CMD Session Service
 *
 * Manages CMD.exe windows for automation.
 * Provides high-level methods for command execution, typing, and control signals.
 */

import type { ScreenshotResult } from '../../services/windows-nutjs.js';
import { NORMALIZED_SCREEN_CONFIG } from '../../config/constants.js';
import type { WindowsNutJsService } from '../windows-nutjs.js';
import { normalizeScreenshotResult } from '../screenshots/normalized-screenshot.js';
import { CMDWindowManager } from './cmd-window-manager.js';
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
  expect?: string | RegExp;
}

export interface ExecResult {
  command: string;
  duration: number;
  exitCode?: number;
  screenshot?: ScreenshotResult;
  success: boolean;
}

export interface CMDSession {
  id: string;
  handle: number;
  title: string;
  currentDirectory: string;
  commandHistory: string[];
  createdAt: Date;
  lastActivity: Date;
}

export class CMDSessionService {
  private sessions: Map<string, CMDSession>;
  private windowManager: CMDWindowManager;

  constructor(private windowsNutJs: WindowsNutJsService) {
    this.sessions = new Map();
    this.windowManager = new CMDWindowManager();
  }

  /**
   * Spawn a new CMD window
   * @param title Optional window title (for reference only)
   * @returns Session ID
   */
  async spawn(title?: string, cwd?: string): Promise<string> {
    const sessionTitle = title || `CMD ${Date.now()}`;

    // Get CMD windows before spawning
    const beforeWindows = await this.windowManager.findCMDWindows();
    console.log(`📋 CMD windows before spawn: ${beforeWindows.length}`);

    // Create a uniquely identifiable window title
    const windowTitle = `Sidofun_${Date.now()}`;

    // Launch CMD window directly using spawn (not exec) to avoid blocking
    // Using start command with title for reliable window creation
    // Note: Title is passed as first argument to start command
    const { spawn } = await import('child_process');

    console.log(`🚀 Launching CMD with title: ${windowTitle}`);

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
          'cmd.exe',
          '/K',
          'title',
          windowTitle
        ],
        {
          windowsHide: false,
          detached: true,
          stdio: 'ignore'
        }
      ).unref();
    } else {
      // Use spawn with shell: true to properly handle the start command
      spawn(
        `start "${windowTitle}" cmd.exe /K title "${windowTitle}"`,
        [],
        {
          shell: true,
          cwd,
          windowsHide: false,
          detached: true,
          stdio: 'ignore'
        }
      ).unref();
    }

    console.log(`⏳ Waiting for CMD window to appear...`);

    // Wait for window to appear (longer wait for window to fully initialize)
    await this.delay(3000);

    // Get CMD windows after spawning
    let afterWindows = await this.windowManager.findCMDWindows();
    console.log(`📋 CMD windows after spawn: ${afterWindows.length}`);

    // If no new windows detected, try a few more times with longer delays
    let retries = 0;
    while (retries < 5 && afterWindows.length <= beforeWindows.length) {
      console.log(`⏳ Retry ${retries + 1}: waiting for CMD window...`);
      await this.delay(2000);
      afterWindows = await this.windowManager.findCMDWindows();
      console.log(`📋 CMD windows after retry ${retries + 1}: ${afterWindows.length}`);
      retries++;
    }

    // Find the new window (the one that wasn't in beforeWindows)
    const newWindow = afterWindows.find(w =>
      !beforeWindows.some(before => before.handle === w.handle)
    );

    if (!newWindow) {
      // Log all windows for debugging
      console.error(`❌ Failed to detect spawned CMD window`);
      console.error(`   Before: ${beforeWindows.map(w => `${w.handle}:${w.title}`).join(', ')}`);
      console.error(`   After: ${afterWindows.map(w => `${w.handle}:${w.title}`).join(', ')}`);
      throw new Error(`Failed to detect spawned CMD window. Windows detected: ${afterWindows.length}`);
    }

    const sessionId = this.generateSessionId();
    const session: CMDSession = {
      id: sessionId,
      handle: newWindow.handle,
      title: newWindow.title,
      currentDirectory: cwd || 'C:\\',
      commandHistory: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    console.log(`✅ CMD session created: ${sessionId} (${newWindow.title})`);

    return sessionId;
  }

  /**
   * Attach to an existing CMD window by title pattern
   */
  async attach(titlePattern: string): Promise<string> {
    const handle = await this.windowManager.findCMDByTitle(titlePattern);
    if (!handle) {
      throw new Error(`CMD window not found: ${titlePattern}`);
    }

    const sessionId = this.generateSessionId();
    const title = this.windowManager.getWindowTitle(handle);

    const session: CMDSession = {
      id: sessionId,
      handle,
      title,
      currentDirectory: 'C:\\',
      commandHistory: [],
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.sessions.set(sessionId, session);
    console.log(`✅ Attached to CMD session: ${sessionId} (${title})`);

    return sessionId;
  }

  /**
   * Focus a CMD session window
   */
  async focus(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.windowManager.focusCMD(session.handle, session.title);
    session.lastActivity = new Date();
  }

  async refreshSessionHandle(sessionId: string): Promise<boolean> {
    const session = this.getSession(sessionId);
    const normalizedTitle = session.title.replace(/^"+|"+$/g, '');
    const refreshedHandle = await this.windowManager.findCMDByTitle(normalizedTitle);
    if (!refreshedHandle) {
      return false;
    }
    session.handle = refreshedHandle;
    return true;
  }

  /**
   * Maximize a CMD session window
   */
  async maximize(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.focus(sessionId);
    await this.windowManager.maximizeCMD(session.handle);
    session.lastActivity = new Date();
  }

  /**
   * Minimize a CMD session window
   */
  async minimize(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.focus(sessionId);
    await this.windowManager.minimizeCMD(session.handle);
    session.lastActivity = new Date();
  }

  /**
   * Restore a CMD session window (normalize from maximized/minimized)
   */
  async restore(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.focus(sessionId);
    await this.windowManager.restoreCMD(session.handle);
    session.lastActivity = new Date();
  }

  /**
   * Type text into the CMD window
   */
  async type(sessionId: string, text: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.focus(sessionId);

    await this.windowsNutJs.executeAction({
      type: 'type',
      text
    });

    session.lastActivity = new Date();
  }

  /**
   * Press a key in the CMD window
   */
  async press(sessionId: string, key: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.focus(sessionId);

    await this.windowsNutJs.executeAction({
      type: 'key_press',
      key
    });

    session.lastActivity = new Date();
  }

  /**
   * Execute a command in the CMD window
   */
  async exec(sessionId: string, command: string, options: ExecOptions = {}): Promise<ExecResult> {
    const session = this.getSession(sessionId);
    const startTime = Date.now();

    await this.focus(sessionId);

    // Type command
    await this.type(sessionId, command);

    // Press Enter
    await this.press(sessionId, 'enter');

    // Add to history
    session.commandHistory.push(command);
    session.lastActivity = new Date();

    // Wait if requested
    if (options.wait) {
      const waitTime = options.timeout || 5000;
      await this.delay(waitTime);
    }

    // Screenshot if requested
    let screenshot: ScreenshotResult | undefined;
    if (options.screenshot) {
      screenshot = await this.screenshot(sessionId);
    }

    return {
      command,
      duration: Date.now() - startTime,
      screenshot,
      success: true
    };
  }

  /**
   * Get a screenshot of the CMD window
   */
  async screenshot(sessionId: string, options: { filename?: string; returnBase64?: boolean } = {}): Promise<ScreenshotResult> {
    const session = this.getSession(sessionId);

    // Focus the window first
    await this.focus(sessionId);
    const host = this.windowManager.getWindowHostInfo(session.handle, session.title);

    if (host.terminalKind !== 'windows_terminal') {
      try {
        const directCapture = await this.windowsNutJs.screenshotWin32(
          session.handle,
          options.filename,
          options.returnBase64 ?? false,
          'png'
        );
        if (!(await this.isLikelyBlankScreenshot(directCapture.filepath))) {
          return directCapture;
        }
      } catch {
        // Fall back to full-screen crop for windows that do not cooperate with direct capture.
      }
    }

    // Get window geometry
    const geometry = await this.windowManager.getCMDGeometry(session.handle);

    const tempFilename = `cmd-${sessionId}-${Date.now()}-full.png`;
    const finalFilename = options.filename || `cmd-${sessionId}-${Date.now()}.png`;
    const fullScreenshot = await this.windowsNutJs.executeAction({
      type: 'screenshot',
      format: 'png',
      filename: tempFilename,
      returnBase64: false
    });

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
        returnBase64: options.returnBase64
      });
    }

    if (options.returnBase64) {
      const buffer = await fs.readFile(outputPath);
      result.data = `data:image/png;base64,${buffer.toString('base64')}`;
    }

    console.log(`📸 Screenshot captured for session ${sessionId}: ${width}x${height}`);
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

  /**
   * Send Ctrl+C (break signal)
   */
  async sendBreak(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.focus(sessionId);

    // Send Ctrl+C
    await this.windowsNutJs.executeAction({
      type: 'key_toggle',
      key: 'control',
      direction: 'down'
    });

    await this.windowsNutJs.executeAction({
      type: 'key_press',
      key: 'c'
    });

    await this.windowsNutJs.executeAction({
      type: 'key_toggle',
      key: 'control',
      direction: 'up'
    });

    session.lastActivity = new Date();
    console.log(`⌨️ Sent Ctrl+C to session ${sessionId}`);
  }

  /**
   * Send Ctrl+Z (EOF signal)
   */
  async sendEOF(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);
    await this.focus(sessionId);

    // Send Ctrl+Z
    await this.windowsNutJs.executeAction({
      type: 'key_toggle',
      key: 'control',
      direction: 'down'
    });

    await this.windowsNutJs.executeAction({
      type: 'key_press',
      key: 'z'
    });

    await this.windowsNutJs.executeAction({
      type: 'key_toggle',
      key: 'control',
      direction: 'up'
    });

    session.lastActivity = new Date();
    console.log(`⌨️ Sent Ctrl+Z to session ${sessionId}`);
  }

  /**
   * Close a CMD session
   */
  async close(sessionId: string): Promise<void> {
    const session = this.getSession(sessionId);

    // Send exit command
    try {
      await this.exec(sessionId, 'exit', { wait: false });
    } catch {
      // Ignore errors during close
    }

    // Wait a bit for window to close
    await this.delay(1000);

    // Remove from tracking
    this.sessions.delete(sessionId);
    console.log(`🔌 CMD session closed: ${sessionId}`);
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): CMDSession {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  registerSession(session: CMDSession): void {
    this.sessions.set(session.id, session);
  }

  unregisterSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Check if a session exists
   */
  hasSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /**
   * Get all sessions
   */
  listSessions(): CMDSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get session info
   */
  getSessionInfo(sessionId: string): {
    id: string;
    title: string;
    tabTitle: string;
    handle: number;
    currentDirectory: string;
    commandCount: number;
    age: number;
    lastActivity: Date;
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    terminalKind: 'windows_terminal' | 'console' | 'unknown';
    hostProcessName?: string;
    hostPid?: number;
    hostExecutablePath?: string;
    hostWindowTitle?: string;
  } {
    const session = this.getSession(sessionId);
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

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
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
