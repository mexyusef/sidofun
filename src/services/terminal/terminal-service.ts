import type { PowerShellSessionService } from '../powershell/powershell-session-service.js';
import type { CMDTerminalCore } from './cmd-terminal-core.js';

export type TerminalKind = 'cmd' | 'pwsh';

export interface TerminalSpawnOptions {
  kind: TerminalKind;
  title?: string;
  cwd?: string;
  executionPolicy?: string;
  usePwsh7?: boolean;
}

export interface TerminalTarget {
  kind: TerminalKind;
  sessionId: string;
}

export class TerminalService {
  constructor(
    private readonly cmdTerminalCore: CMDTerminalCore,
    private readonly psService: PowerShellSessionService
  ) {}

  async spawn(options: TerminalSpawnOptions) {
    if (options.kind === 'cmd') {
      const result = await this.cmdTerminalCore.spawn(options.title, options.cwd);
      return {
        kind: 'cmd' as const,
        ...result
      };
    }

    const sessionId = await this.psService.spawn(
      options.title,
      options.executionPolicy || 'Bypass',
      options.usePwsh7 !== false,
      options.cwd
    );
    return {
      kind: 'pwsh' as const,
      sessionId,
      message: `PowerShell session created: ${sessionId}`
    };
  }

  async list(kind?: TerminalKind) {
    if (!kind || kind === 'cmd') {
      const cmdSessions = (await this.cmdTerminalCore.listSessions()).sessions.map((session: any) => ({
        kind: 'cmd' as const,
        session
      }));
      if (kind === 'cmd') {
        return { sessions: cmdSessions, count: cmdSessions.length };
      }

      const pwshSessions = this.psService.listSessions().map((session) => ({
        kind: 'pwsh' as const,
        session: this.psService.getSessionInfo(session.id)
      }));
      return {
        sessions: [...cmdSessions, ...pwshSessions],
        count: cmdSessions.length + pwshSessions.length
      };
    }

    const sessions = this.psService.listSessions().map((session) => ({
      kind: 'pwsh' as const,
      session: this.psService.getSessionInfo(session.id)
    }));
    return { sessions, count: sessions.length };
  }

  async status(target: TerminalTarget, options?: { screenshot?: boolean; filename?: string; returnBase64?: boolean }) {
    if (target.kind === 'cmd') {
      return await this.cmdTerminalCore.getSessionStatus(target.sessionId, options);
    }

    const session = this.psService.getSessionInfo(target.sessionId);
    const screenshot = options?.screenshot
      ? await this.psService.screenshot(target.sessionId, options?.filename, options?.returnBase64)
      : undefined;
    return { session, screenshot };
  }

  async focus(target: TerminalTarget) {
    if (target.kind === 'cmd') {
      return await this.cmdTerminalCore.focus(target.sessionId);
    }

    await this.psService.focus(target.sessionId);
    return {
      session: this.psService.getSessionInfo(target.sessionId),
      message: `Focused session: ${target.sessionId}`
    };
  }

  async type(target: TerminalTarget, text: string) {
    if (target.kind === 'cmd') {
      return { message: (await this.cmdTerminalCore.typeEscaped(target.sessionId, text)).message };
    }

    await this.psService.type(target.sessionId, text);
    return { message: `Typed text into session: ${target.sessionId}` };
  }

  async exec(target: TerminalTarget, command: string, options?: Record<string, unknown>) {
    if (target.kind === 'cmd') {
      return await this.cmdTerminalCore.exec(target.sessionId, command, {
        wait: options?.wait as boolean | undefined,
        timeout: options?.timeout as number | undefined,
        screenshot: options?.screenshot as boolean | undefined
      });
    }

    return await this.psService.exec(target.sessionId, command, {
      wait: options?.wait as boolean | undefined,
      timeout: options?.timeout as number | undefined,
      screenshot: options?.screenshot as boolean | undefined,
      outputFormat: options?.outputFormat as 'text' | 'json' | undefined
    });
  }

  async close(target: TerminalTarget) {
    if (target.kind === 'cmd') {
      return await this.cmdTerminalCore.close(target.sessionId);
    }

    await this.psService.close(target.sessionId);
    return { message: 'Session closed' };
  }
}
