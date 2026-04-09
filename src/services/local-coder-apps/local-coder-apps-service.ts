import fs from 'node:fs';
import { exec } from 'node:child_process';
import { LOCAL_CODER_APPS } from '../../config/constants.js';
import type { PlatformAdapter } from '../../platforms/platform-adapter.js';
import { ProcessWindowService } from '../process-window/process-window-service.js';
import type { ProcessInfo, WindowInfo } from '../process-window/types.js';
import type { CMDTerminalCore } from '../terminal/cmd-terminal-core.js';
import type { LocalCoderAppDefinition, LocalCoderAppId, LocalCoderAppStatus, LocalCoderOpenOptions, LocalCoderRunOptions, LocalCoderRunResult } from './types.js';

const LOCAL_CODER_APP_LIST: LocalCoderAppDefinition[] = Object.values(LOCAL_CODER_APPS);

export class LocalCoderAppsService {
  private readonly processWindowService: ProcessWindowService;
  private readonly hostedSessions = new Map<LocalCoderAppId, string>();

  constructor(
    private readonly platform: PlatformAdapter,
    processWindowService?: ProcessWindowService,
    private readonly cmdTerminalCore?: CMDTerminalCore
  ) {
    this.processWindowService = processWindowService ?? new ProcessWindowService(platform);
  }

  listApps(): LocalCoderAppStatus[] {
    return LOCAL_CODER_APP_LIST.map((app) => ({
      id: app.id,
      displayName: app.displayName,
      installed: fs.existsSync(app.executablePath),
      executablePath: app.executablePath,
      workingDirectory: app.workingDirectory,
      processName: app.processName,
      running: false,
      focused: false
    }));
  }

  async getStatus(appId: LocalCoderAppId): Promise<LocalCoderAppStatus> {
    const app = this.getApp(appId);
    const hostedSessionId = this.hostedSessions.get(appId);
    if (hostedSessionId && this.cmdTerminalCore) {
      try {
        return await this.getHostedSessionStatus(app, hostedSessionId);
      } catch {
        this.hostedSessions.delete(appId);
      }
    }

    const installed = fs.existsSync(app.executablePath);
    const [processes, windows, activeWindow] = await Promise.all([
      this.processWindowService.listProcesses(),
      this.processWindowService.listWindows(),
      this.platform.executeDesktopAction({ type: 'get_active_window' }) as Promise<any>
    ]);

    const processMatch = this.findBestProcess(app, processes);
    const windowMatch = this.findBestWindow(app, windows, processMatch?.pid);
    const focused = Boolean(windowMatch && activeWindow?.handle === windowMatch.handle);

    return {
      id: app.id,
      displayName: app.displayName,
      installed,
      executablePath: app.executablePath,
      workingDirectory: app.workingDirectory,
      processName: app.processName,
      running: Boolean(processMatch),
      focused,
      pid: processMatch?.pid,
      window: windowMatch
        ? {
            handle: windowMatch.handle,
            title: windowMatch.title,
            rect: windowMatch.rect
          }
        : undefined
    };
  }

  async open(appId: LocalCoderAppId, options: LocalCoderOpenOptions = {}): Promise<LocalCoderAppStatus> {
    const app = this.getApp(appId);
    const workingDirectory = options.workingDirectory || app.workingDirectory;

    if (this.cmdTerminalCore) {
      if (!fs.existsSync(workingDirectory)) {
        fs.mkdirSync(workingDirectory, { recursive: true });
      }

      const spawnResult = await this.cmdTerminalCore.spawn(`SidofunCoder_${app.id}_${Date.now()}`);
      const sessionId = spawnResult.sessionId;
      this.hostedSessions.set(appId, sessionId);
      await this.cmdTerminalCore.exec(sessionId, `cd /d "${workingDirectory}"`, { wait: false });
      await this.delay(300);
      await this.cmdTerminalCore.exec(sessionId, `"${app.executablePath}"`, { wait: false });
      await this.delay(options.inputDelayMs ?? 8000);
      if (options.initialPrompt) {
        await this.platform.executeDesktopAction({
          type: 'type',
          text: options.initialPrompt
        });
        if (options.submit !== false) {
          await this.submitHostedPrompt(app);
        }
      }
      return await this.getHostedSessionStatus(app, sessionId, workingDirectory);
    }

    if (!fs.existsSync(app.executablePath)) {
      throw new Error(`Executable not found: ${app.executablePath}`);
    }

    if (!fs.existsSync(workingDirectory)) {
      fs.mkdirSync(workingDirectory, { recursive: true });
    }

    const windowTitle = `SidofunCoder_${app.id}_${Date.now()}`;
    const quotedExecutable = `"${app.executablePath}"`;
    const quotedWorkingDirectory = `"${workingDirectory}"`;
    await new Promise<void>((resolve, reject) => {
      exec(`cmd /c start "${windowTitle}" /d ${quotedWorkingDirectory} cmd.exe /K ${quotedExecutable}`, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    const openedStatus = await this.waitForWindowTitle(app, windowTitle);
    return await this.seedInitialPrompt(openedStatus, options, windowTitle);
  }

  async focus(appId: LocalCoderAppId): Promise<LocalCoderAppStatus> {
    const hostedSessionId = this.hostedSessions.get(appId);
    if (hostedSessionId && this.cmdTerminalCore) {
      await this.cmdTerminalCore.focus(hostedSessionId);
      return await this.getHostedSessionStatus(this.getApp(appId), hostedSessionId);
    }

    const app = this.getApp(appId);
    await this.processWindowService.focus({ processName: app.processName });
    return await this.getStatus(appId);
  }

  async close(appId: LocalCoderAppId): Promise<LocalCoderAppStatus> {
    const hostedSessionId = this.hostedSessions.get(appId);
    if (hostedSessionId && this.cmdTerminalCore) {
      await this.cmdTerminalCore.close(hostedSessionId);
      this.hostedSessions.delete(appId);
      return {
        ...this.listApps().find((item) => item.id === appId)!,
        running: false,
        focused: false
      };
    }

    const status = await this.getStatus(appId);
    if (status.window?.handle) {
      await this.processWindowService.close(status.window.handle);
      await this.delay(250);
    }
    return await this.getStatus(appId);
  }

  async maximize(appId: LocalCoderAppId): Promise<LocalCoderAppStatus> {
    return await this.changeWindowState(appId, 'maximize');
  }

  async minimize(appId: LocalCoderAppId): Promise<LocalCoderAppStatus> {
    return await this.changeWindowState(appId, 'minimize');
  }

  async restore(appId: LocalCoderAppId): Promise<LocalCoderAppStatus> {
    return await this.changeWindowState(appId, 'restore');
  }

  async move(appId: LocalCoderAppId, x: number, y: number): Promise<LocalCoderAppStatus> {
    const hostedSessionId = this.hostedSessions.get(appId);
    if (hostedSessionId && this.cmdTerminalCore) {
      const session = await this.cmdTerminalCore.getSessionInfo(hostedSessionId);
      await this.processWindowService.move(session.handle, x, y);
      await this.delay(150);
      return await this.getHostedSessionStatus(this.getApp(appId), hostedSessionId);
    }

    const status = await this.open(appId);
    if (!status.window?.handle) {
      throw new Error(`No visible window found for ${appId}`);
    }
    await this.processWindowService.move(status.window.handle, x, y);
    await this.delay(150);
    return await this.getStatus(appId);
  }

  async resize(appId: LocalCoderAppId, width: number, height: number): Promise<LocalCoderAppStatus> {
    const hostedSessionId = this.hostedSessions.get(appId);
    if (hostedSessionId && this.cmdTerminalCore) {
      const session = await this.cmdTerminalCore.getSessionInfo(hostedSessionId);
      await this.processWindowService.resize(session.handle, width, height);
      await this.delay(150);
      return await this.getHostedSessionStatus(this.getApp(appId), hostedSessionId);
    }

    const status = await this.open(appId);
    if (!status.window?.handle) {
      throw new Error(`No visible window found for ${appId}`);
    }
    await this.processWindowService.resize(status.window.handle, width, height);
    await this.delay(150);
    return await this.getStatus(appId);
  }

  async run(appId: LocalCoderAppId, options: LocalCoderRunOptions): Promise<LocalCoderRunResult> {
    const app = this.getApp(appId);
    if (!fs.existsSync(app.executablePath)) {
      throw new Error(`Executable not found: ${app.executablePath}`);
    }

    const workingDirectory = options.workingDirectory || app.workingDirectory;
    if (!fs.existsSync(workingDirectory)) {
      throw new Error(`Working directory not found: ${workingDirectory}`);
    }

    const timeoutMs = options.timeoutMs ?? 120000;
    const command = this.buildRunCommand(app, workingDirectory, options.prompt);
    const subprocess = Bun.spawn(command, {
      cwd: workingDirectory,
      stdout: 'pipe',
      stderr: 'pipe'
    });

    let timedOut = false;
    const killTimer = setTimeout(() => {
      timedOut = true;
      try {
        subprocess.kill();
      } catch {
        // ignored
      }
    }, timeoutMs);

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
      subprocess.exited
    ]);

    clearTimeout(killTimer);

    return {
      id: app.id,
      displayName: app.displayName,
      executablePath: app.executablePath,
      workingDirectory,
      prompt: options.prompt,
      exitCode,
      success: exitCode === 0 && !timedOut,
      summary: this.normalizeRunSummary(app, stdout, stderr, exitCode, timedOut),
      stdout,
      stderr,
      timedOut,
      command
    };
  }

  private async changeWindowState(appId: LocalCoderAppId, action: 'maximize' | 'minimize' | 'restore'): Promise<LocalCoderAppStatus> {
    const hostedSessionId = this.hostedSessions.get(appId);
    if (hostedSessionId && this.cmdTerminalCore) {
      const session = await this.cmdTerminalCore.getSessionInfo(hostedSessionId);
      if (action === 'maximize') {
        await this.processWindowService.maximize(session.handle);
      } else if (action === 'minimize') {
        await this.processWindowService.minimize(session.handle);
      } else {
        await this.processWindowService.restore(session.handle);
      }
      await this.delay(150);
      return await this.getHostedSessionStatus(this.getApp(appId), hostedSessionId);
    }

    const status = await this.open(appId);
    if (!status.window?.handle) {
      throw new Error(`No visible window found for ${appId}`);
    }

    if (action === 'maximize') {
      await this.processWindowService.maximize(status.window.handle);
    } else if (action === 'minimize') {
      await this.processWindowService.minimize(status.window.handle);
    } else {
      await this.processWindowService.restore(status.window.handle);
    }
    await this.delay(150);
    return await this.getStatus(appId);
  }

  private async waitForWindow(appId: LocalCoderAppId, timeoutMs: number = 15000): Promise<LocalCoderAppStatus> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await this.getStatus(appId);
      if (status.window) {
        await this.processWindowService.focus({ processName: status.processName });
        return await this.getStatus(appId);
      }
      await this.delay(500);
    }
    return await this.getStatus(appId);
  }

  private async waitForWindowTitle(app: LocalCoderAppDefinition, windowTitle: string, timeoutMs: number = 15000): Promise<LocalCoderAppStatus> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const windows = await this.processWindowService.listWindows();
      const matchedWindow = windows.find((window) => String(window.title || '').includes(windowTitle));
      if (matchedWindow) {
        await this.processWindowService.focus({ windowTitle });
        return {
          id: app.id,
          displayName: app.displayName,
          installed: true,
          executablePath: app.executablePath,
          workingDirectory: app.workingDirectory,
          processName: app.processName,
          running: true,
          focused: true,
          pid: matchedWindow.pid,
          window: {
            handle: matchedWindow.handle,
            title: matchedWindow.title,
            rect: matchedWindow.rect
          }
        };
      }
      await this.delay(400);
    }
    return await this.getStatus(app.id);
  }

  private findBestProcess(app: LocalCoderAppDefinition, processes: ProcessInfo[]): ProcessInfo | undefined {
    const targetName = app.processName.toLowerCase().replace(/\.exe$/, '');
    return processes
      .filter((process) => {
        const processName = String(process.processName || '').toLowerCase().replace(/\.exe$/, '');
        const executablePath = String(process.executablePath || '').toLowerCase();
        return processName === targetName || executablePath === app.executablePath.toLowerCase();
      })
      .sort((left, right) => Number(right.isVisible) - Number(left.isVisible) || Number(Boolean(right.mainWindowHandle)) - Number(Boolean(left.mainWindowHandle)))
      .at(0);
  }

  private findBestWindow(app: LocalCoderAppDefinition, windows: WindowInfo[], pid?: number): WindowInfo | undefined {
    const targetPath = app.executablePath.toLowerCase();
    const targetName = app.processName.toLowerCase().replace(/\.exe$/, '');

    return windows
      .filter((window) => {
        const processName = String(window.processName || '').toLowerCase().replace(/\.exe$/, '');
        const executablePath = String(window.executablePath || '').toLowerCase();
        const pidMatch = pid !== undefined && window.pid === pid;
        const processMatch = processName === targetName;
        const pathMatch = executablePath === targetPath;
        return pidMatch || processMatch || pathMatch;
      })
      .sort((left, right) => Number(right.isForeground) - Number(left.isForeground) || (right.rect.width * right.rect.height) - (left.rect.width * left.rect.height))
      .at(0);
  }

  private getApp(appId: LocalCoderAppId): LocalCoderAppDefinition {
    const app = LOCAL_CODER_APP_LIST.find((candidate) => candidate.id === appId);
    if (!app) {
      throw new Error(`Unsupported local coder app: ${appId}`);
    }
    return app;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async submitHostedPrompt(app: LocalCoderAppDefinition): Promise<void> {
    if (app.openSubmit === 'shift-enter') {
      await this.platform.executeDesktopAction({
        type: 'key_toggle',
        key: 'shift',
        direction: 'down'
      });
      await this.platform.executeDesktopAction({
        type: 'key_press',
        key: 'enter'
      });
      await this.platform.executeDesktopAction({
        type: 'key_toggle',
        key: 'shift',
        direction: 'up'
      });
      return;
    }

    if (app.openSubmit === 'double-enter') {
      await this.platform.executeDesktopAction({
        type: 'key_press',
        key: 'enter'
      });
      await this.delay(120);
      await this.platform.executeDesktopAction({
        type: 'key_press',
        key: 'enter'
      });
      return;
    }

    await this.platform.executeDesktopAction({
      type: 'key_press',
      key: 'enter'
    });
  }

  private async seedInitialPrompt(status: LocalCoderAppStatus, options: LocalCoderOpenOptions, windowTitle?: string): Promise<LocalCoderAppStatus> {
    if (!options.initialPrompt) {
      return status;
    }

    if (!status.window?.handle && !windowTitle) {
      throw new Error(`No visible window found for ${status.id}`);
    }

    if (windowTitle) {
      await this.processWindowService.focus({ windowTitle });
    } else {
      await this.processWindowService.focus({ processName: status.processName });
    }
    await this.delay(options.inputDelayMs ?? 1200);
    await this.platform.executeDesktopAction({
      type: 'type',
      text: options.initialPrompt
    });

    if (options.submit !== false) {
      await this.platform.executeDesktopAction({
        type: 'key_press',
        key: 'enter'
      });
    }

    await this.delay(200);
    if (windowTitle) {
      return await this.waitForWindowTitle(this.getApp(status.id), windowTitle, 2000);
    }
    return await this.getStatus(status.id);
  }


  private async getHostedSessionStatus(
    app: LocalCoderAppDefinition,
    sessionId: string,
    workingDirectory?: string
  ): Promise<LocalCoderAppStatus> {
    if (!this.cmdTerminalCore) {
      throw new Error('CMD terminal core is not available');
    }

    const session = await this.cmdTerminalCore.getSessionInfo(sessionId);
    return {
      id: app.id,
      displayName: app.displayName,
      installed: fs.existsSync(app.executablePath),
      executablePath: app.executablePath,
      workingDirectory: workingDirectory || app.workingDirectory,
      processName: app.processName,
      running: true,
      focused: true,
      window: {
        handle: session.handle,
        title: session.title,
        rect: session.rect
      }
    };
  }

  private buildRunCommand(app: LocalCoderAppDefinition, workingDirectory: string, prompt: string): string[] {
    if (app.runMode === 'codex-exec') {
      return [
        app.executablePath,
        'exec',
        '--skip-git-repo-check',
        '--dangerously-bypass-approvals-and-sandbox',
        '-C',
        workingDirectory,
        prompt
      ];
    }

    if (app.runMode === 'opencode-run') {
      return [
        app.executablePath,
        'run',
        '--dir',
        workingDirectory,
        '--format',
        'json',
        prompt
      ];
    }

    return [
      app.executablePath,
      '-y',
      '-o',
      'text',
      '--prompt',
      prompt
    ];
  }

  private normalizeRunSummary(
    app: LocalCoderAppDefinition,
    stdout: string,
    stderr: string,
    exitCode: number,
    timedOut: boolean
  ): string {
    if (timedOut) {
      return `${app.displayName} timed out`;
    }

    if (app.id === 'opencode') {
      const lines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        try {
          const parsed = JSON.parse(lines[index]);
          const text = parsed?.part?.text;
          if (typeof text === 'string' && text.trim()) {
            return text.trim();
          }
        } catch {
          // ignored
        }
      }
    }

    const stdoutLines = stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => Boolean(line) && line !== '```');
    if (stdoutLines.length > 0) {
      return stdoutLines[stdoutLines.length - 1];
    }

    const stderrLines = stderr
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (stderrLines.length > 0) {
      return stderrLines[stderrLines.length - 1];
    }

    return exitCode === 0 ? `${app.displayName} completed` : `${app.displayName} failed with exit code ${exitCode}`;
  }
}
