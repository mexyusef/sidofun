import type { CMDSessionService } from '../cmd/cmd-session-service.js';
import type { ExecOptions } from '../cmd/cmd-session-service.js';
import type { WindowsNutJsService } from '../windows-nutjs.js';
import type { ScreenshotResult } from '../windows-nutjs.js';
import { parseEscapeSequences } from './escape-sequences.js';
import { TraceRecorder, summarizeForTrajectory } from '../../telemetry/trajectory-recorder.js';

export type CMDShortcut =
  | 'new_tab'
  | 'next_tab'
  | 'prev_tab'
  | 'split_vertical'
  | 'split_horizontal'
  | 'pane_up'
  | 'pane_down'
  | 'pane_left'
  | 'pane_right';

export interface TypeEscapedResult {
  sessionId: string;
  textCount: number;
  delayCount: number;
  message: string;
}

export interface ShortcutResult {
  sessionId: string;
  message: string;
}

export interface SessionOperationResult {
  sessionId: string;
  message: string;
}

export interface SessionStatusResult {
  session: ReturnType<CMDSessionService['getSessionInfo']>;
  screenshot?: ScreenshotResult;
}

export interface SessionSelectionResult {
  session: ReturnType<CMDSessionService['getSessionInfo']>;
  message: string;
}

export class CMDTerminalCore {
  constructor(
    private readonly cmdService: CMDSessionService,
    private readonly nutJs: WindowsNutJsService,
    private readonly recorder?: TraceRecorder
  ) {}

  async spawn(title?: string, cwd?: string): Promise<SessionOperationResult> {
    return this.trace('spawn', { title, cwd }, async () => {
      const sessionId = await this.cmdService.spawn(title, cwd);
      return {
        sessionId,
        message: `CMD session created: ${sessionId}`
      };
    });
  }

  async attach(titlePattern: string): Promise<SessionOperationResult> {
    return this.trace('attach', { titlePattern }, async () => {
      const sessionId = await this.cmdService.attach(titlePattern);
      return {
        sessionId,
        message: `Attached to CMD session: ${sessionId}`
      };
    });
  }

  resolveSessionId(sessionIdOrIndex: string): string {
    const index = parseInt(sessionIdOrIndex, 10);
    if (!Number.isNaN(index)) {
      const sessions = this.cmdService.listSessions();
      const targetIndex = index - 1;
      if (targetIndex >= 0 && targetIndex < sessions.length) {
        return sessions[targetIndex].id;
      }
      throw new Error(`Session index ${index} out of range (1-${sessions.length})`);
    }
    return sessionIdOrIndex;
  }

  async listSessions(): Promise<{ sessions: ReturnType<CMDSessionService['getSessionInfo']>[]; count: number }> {
    return this.trace('list_sessions', undefined, async () => {
      const sessions = this.cmdService.listSessions();
      const sessionInfos = sessions.map((session) => this.cmdService.getSessionInfo(session.id));
      return {
        sessions: sessionInfos,
        count: sessionInfos.length
      };
    });
  }

  async listTabs(): Promise<{ sessions: ReturnType<CMDSessionService['getSessionInfo']>[]; count: number }> {
    return this.trace('list_tabs', undefined, async () => this.listSessions());
  }

  async findSessionsByTitle(titleQuery: string): Promise<{ sessions: ReturnType<CMDSessionService['getSessionInfo']>[]; count: number }> {
    return this.trace('find_sessions_by_title', { titleQuery }, async () => {
      const query = titleQuery.toLowerCase();
      const sessions = this.cmdService
        .listSessions()
        .map((session) => this.cmdService.getSessionInfo(session.id))
        .filter((session) =>
          session.title.toLowerCase().includes(query) ||
          session.tabTitle.toLowerCase().includes(query)
        );
      return {
        sessions,
        count: sessions.length
      };
    });
  }

  async getSessionInfo(sessionIdOrIndex: string): Promise<ReturnType<CMDSessionService['getSessionInfo']>> {
    return this.trace('get_session_info', { sessionIdOrIndex }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      return this.cmdService.getSessionInfo(sessionId);
    });
  }

  async getSessionStatus(
    sessionIdOrIndex: string,
    options: { screenshot?: boolean; filename?: string; returnBase64?: boolean } = {}
  ): Promise<SessionStatusResult> {
    return this.trace('get_session_status', { sessionIdOrIndex, options }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      const session = this.cmdService.getSessionInfo(sessionId);
      const screenshot = options.screenshot
        ? await this.cmdService.screenshot(sessionId, {
            filename: options.filename,
            returnBase64: options.returnBase64
          })
        : undefined;
      return { session, screenshot };
    });
  }

  async focus(sessionIdOrIndex: string): Promise<SessionSelectionResult> {
    return this.trace('focus_session', { sessionIdOrIndex }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      await this.cmdService.focus(sessionId);
      const session = this.cmdService.getSessionInfo(sessionId);
      return {
        session,
        message: `Focused session: ${sessionId}`
      };
    });
  }

  async activateSessionByTitle(titleQuery: string): Promise<SessionSelectionResult> {
    return this.trace('activate_session_by_title', { titleQuery }, async () => {
      const query = titleQuery.toLowerCase();
      const sessions = this.cmdService
        .listSessions()
        .map((session) => this.cmdService.getSessionInfo(session.id));
      const matchedSession =
        sessions.find((session) =>
          session.title.toLowerCase() === query ||
          session.tabTitle.toLowerCase() === query
        ) ||
        sessions.find((session) =>
          session.title.toLowerCase().includes(query) ||
          session.tabTitle.toLowerCase().includes(query)
        );

      if (!matchedSession) {
        throw new Error(`No tracked terminal session matched title query: ${titleQuery}`);
      }

      await this.cmdService.focus(matchedSession.id);
      return {
        session: this.cmdService.getSessionInfo(matchedSession.id),
        message: `Activated session by title: ${matchedSession.id}`
      };
    });
  }

  async exec(sessionIdOrIndex: string, command: string, options: ExecOptions = {}): Promise<unknown> {
    return this.trace('exec', { sessionIdOrIndex, command, options }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      return this.cmdService.exec(sessionId, command, options);
    });
  }

  async press(sessionIdOrIndex: string, key: string): Promise<SessionOperationResult> {
    return this.trace('press', { sessionIdOrIndex, key }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      await this.cmdService.press(sessionId, key);
      return {
        sessionId,
        message: `Pressed key: ${key}`
      };
    });
  }

  async screenshot(
    sessionIdOrIndex: string,
    options: { filename?: string; returnBase64?: boolean } = {}
  ): Promise<ScreenshotResult> {
    return this.trace('screenshot', { sessionIdOrIndex, options }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      return this.cmdService.screenshot(sessionId, options);
    });
  }

  async sendBreak(sessionIdOrIndex: string): Promise<SessionOperationResult> {
    return this.trace('send_break', { sessionIdOrIndex }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      await this.cmdService.sendBreak(sessionId);
      return {
        sessionId,
        message: 'Sent Ctrl+C (break signal)'
      };
    });
  }

  async sendEOF(sessionIdOrIndex: string): Promise<SessionOperationResult> {
    return this.trace('send_eof', { sessionIdOrIndex }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      await this.cmdService.sendEOF(sessionId);
      return {
        sessionId,
        message: 'Sent Ctrl+Z (EOF signal)'
      };
    });
  }

  async close(sessionIdOrIndex: string): Promise<SessionOperationResult> {
    return this.trace('close', { sessionIdOrIndex }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      await this.cmdService.close(sessionId);
      return {
        sessionId,
        message: 'Session closed'
      };
    });
  }

  async keyToggle(
    sessionIdOrIndex: string,
    key: string,
    direction: 'up' | 'down' = 'down'
  ): Promise<SessionOperationResult> {
    return this.trace('key_toggle', { sessionIdOrIndex, key, direction }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      await this.cmdService.focus(sessionId);
      await this.nutJs.executeAction({
        type: 'key_toggle',
        key,
        direction
      });
      return {
        sessionId,
        message: `Key ${direction}: ${key}`
      };
    });
  }

  async typeEscaped(sessionIdOrIndex: string, text: string): Promise<TypeEscapedResult> {
    return this.trace('type_escaped', { sessionIdOrIndex, text }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      const segments = parseEscapeSequences(text);

      let textCount = 0;
      let delayCount = 0;

      for (const seg of segments) {
        if (seg.type === 'text') {
          const value = seg.value;
          if (value.includes('\n')) {
            const lines = value.split('\n');
            for (let i = 0; i < lines.length; i += 1) {
              if (lines[i]) {
                await this.cmdService.type(sessionId, lines[i]);
              }
              if (i < lines.length - 1 || lines[i] === '') {
                await this.cmdService.press(sessionId, 'enter');
              }
            }
            textCount += lines.length;
          } else if (value.includes('\t')) {
            const parts = value.split('\t');
            for (let i = 0; i < parts.length; i += 1) {
              if (parts[i]) {
                await this.cmdService.type(sessionId, parts[i]);
              }
              if (i < parts.length - 1) {
                await this.cmdService.press(sessionId, 'tab');
              }
            }
          } else if (value) {
            await this.cmdService.type(sessionId, value);
            textCount += 1;
          }
        } else if (seg.type === 'delay') {
          await new Promise((resolve) => setTimeout(resolve, seg.value));
          delayCount += 1;
        } else {
          switch (seg.value) {
            case 'maximize':
              await this.cmdService.maximize(sessionId);
              break;
            case 'minimize':
              await this.cmdService.minimize(sessionId);
              break;
            case 'restore':
              await this.cmdService.restore(sessionId);
              break;
            case 'focus':
              await this.cmdService.focus(sessionId);
              break;
          }
          textCount += 1;
        }
      }

      return {
        sessionId,
        textCount,
        delayCount,
        message: `Typed ${textCount} segment(s)${delayCount > 0 ? ` with ${delayCount} delay(s)` : ''}`
      };
    });
  }

  async executeShortcut(sessionIdOrIndex: string, shortcut: CMDShortcut): Promise<ShortcutResult> {
    return this.trace('execute_shortcut', { sessionIdOrIndex, shortcut }, async () => {
      const sessionId = this.resolveSessionId(sessionIdOrIndex);
      const shortcutMap: Record<CMDShortcut, { steps: Array<[string, 'down' | 'up'] | [string]>; message: string }> = {
        new_tab: {
          steps: [['control', 'down'], ['shift', 'down'], ['t'], ['shift', 'up'], ['control', 'up']],
          message: 'Created new tab (Ctrl+Shift+T)'
        },
        next_tab: {
          steps: [['control', 'down'], ['tab'], ['control', 'up']],
          message: 'Switched to next tab (Ctrl+Tab)'
        },
        prev_tab: {
          steps: [['control', 'down'], ['shift', 'down'], ['tab'], ['shift', 'up'], ['control', 'up']],
          message: 'Switched to previous tab (Ctrl+Shift+Tab)'
        },
        split_vertical: {
          steps: [['shift', 'down'], ['alt', 'down'], ['-'], ['alt', 'up'], ['shift', 'up']],
          message: 'Split vertically (Shift+Alt+-)'
        },
        split_horizontal: {
          steps: [['shift', 'down'], ['alt', 'down'], ['='], ['alt', 'up'], ['shift', 'up']],
          message: 'Split horizontally (Shift+Alt++)'
        },
        pane_up: {
          steps: [['alt', 'down'], ['up'], ['alt', 'up']],
          message: 'Navigated to upper pane (Alt+Up)'
        },
        pane_down: {
          steps: [['alt', 'down'], ['down'], ['alt', 'up']],
          message: 'Navigated to lower pane (Alt+Down)'
        },
        pane_left: {
          steps: [['alt', 'down'], ['left'], ['alt', 'up']],
          message: 'Navigated to left pane (Alt+Left)'
        },
        pane_right: {
          steps: [['alt', 'down'], ['right'], ['alt', 'up']],
          message: 'Navigated to right pane (Alt+Right)'
        }
      };

      const config = shortcutMap[shortcut];
      await this.cmdService.focus(sessionId);

      for (const step of config.steps) {
        if (step.length === 1) {
          await this.nutJs.executeAction({ type: 'key_press', key: step[0] });
        } else {
          await this.nutJs.executeAction({ type: 'key_toggle', key: step[0], direction: step[1] });
        }
      }

      return {
        sessionId,
        message: config.message
      };
    });
  }

  private async trace<T>(operation: string, input: unknown, fn: () => Promise<T>): Promise<T> {
    if (!this.recorder) {
      return fn();
    }

    const startedAt = Date.now();

    try {
      const output = await fn();
      await this.recorder.record({
        timestamp: new Date().toISOString(),
        source: 'terminal',
        operation,
        status: 'success',
        durationMs: Date.now() - startedAt,
        input: summarizeForTrajectory(input),
        output: summarizeForTrajectory(output)
      });
      return output;
    } catch (error: any) {
      await this.recorder.record({
        timestamp: new Date().toISOString(),
        source: 'terminal',
        operation,
        status: 'error',
        durationMs: Date.now() - startedAt,
        input: summarizeForTrajectory(input),
        error: {
          message: error?.message || 'Unknown error'
        }
      });
      throw error;
    }
  }
}
