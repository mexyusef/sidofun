/**
 * PowerShell Action Handlers
 * 
 * Import this in cli-impl.ts to add PowerShell support
 */

import type { PowerShellSessionService } from './powershell-session-service.js';
import { parseEscapeSequences } from '../terminal/escape-sequences.js';

export function createPowerShellHandlers(psService: PowerShellSessionService) {
  return {
    async handlePowerShellAction(action: string, params: Record<string, any>): Promise<any> {
      switch (action) {
        case 'pwsh_spawn':
          const sessionId = await psService.spawn(
            params?.title,
            params?.executionPolicy || 'Bypass',
            params?.usePwsh7 !== false
          );
          return { sessionId, message: `PowerShell session created: ${sessionId}` };

        case 'pwsh_list':
          const sessions = psService.listSessions();
          const sessionInfos = sessions.map(s => psService.getSessionInfo(s.id));
          return { sessions: sessionInfos, count: sessionInfos.length };

        case 'pwsh_tabs': {
          const sessions = psService.listSessions();
          const sessionInfos = sessions.map(s => psService.getSessionInfo(s.id));
          return { sessions: sessionInfos, count: sessionInfos.length };
        }

        case 'pwsh_find': {
          const query = String(params?.titleQuery || '').toLowerCase();
          const sessions = psService
            .listSessions()
            .map(s => psService.getSessionInfo(s.id))
            .filter((session) =>
              String(session.title || '').toLowerCase().includes(query) ||
              String(session.tabTitle || '').toLowerCase().includes(query)
            );
          return { sessions, count: sessions.length };
        }

        case 'pwsh_focus': {
          const focusId = resolveSessionId(params!.sessionId!, psService);
          await psService.focus(focusId);
          return {
            session: psService.getSessionInfo(focusId),
            message: `Focused session: ${focusId}`
          };
        }

        case 'pwsh_activate_by_title': {
          const query = String(params?.titleQuery || '').toLowerCase();
          const sessions = psService.listSessions().map(s => psService.getSessionInfo(s.id));
          const matchedSession =
            sessions.find((session) =>
              String(session.title || '').toLowerCase() === query ||
              String(session.tabTitle || '').toLowerCase() === query
            ) ||
            sessions.find((session) =>
              String(session.title || '').toLowerCase().includes(query) ||
              String(session.tabTitle || '').toLowerCase().includes(query)
            );
          if (!matchedSession) {
            throw new Error(`No tracked PowerShell session matched title query: ${params?.titleQuery}`);
          }
          await psService.focus(matchedSession.id);
          return {
            session: psService.getSessionInfo(matchedSession.id),
            message: `Activated session by title: ${matchedSession.id}`
          };
        }

        case 'pwsh_info':
          return psService.getSessionInfo(params?.sessionId);

        case 'pwsh_status': {
          const statusId = resolveSessionId(params!.sessionId!, psService);
          const session = psService.getSessionInfo(statusId);
          const screenshot = params?.screenshot
            ? await psService.screenshot(statusId, params?.filename, params?.returnBase64)
            : undefined;
          return { session, screenshot };
        }

        case 'pwsh_exec':
          const resolvedId = resolveSessionId(params!.sessionId!, psService);
          return await psService.exec(resolvedId, params!.command!, {
            wait: params?.wait,
            timeout: params?.timeout,
            screenshot: params?.screenshot,
            outputFormat: params?.outputFormat
          });

        case 'pwsh_type': {
          const resolvedId = resolveSessionId(params!.sessionId!, psService);
          const text = params!.text!;
          const segments = parseEscapeSequences(text);
          let textCount = 0, delayCount = 0;

          for (const seg of segments) {
            if (seg.type === 'text') {
              const txt = seg.value as string;
              if (txt.includes('\n')) {
                const lines = txt.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  if (lines[i]) await psService.type(resolvedId, lines[i]);
                  if (i < lines.length - 1 || lines[i] === '') await psService.press(resolvedId, 'enter');
                }
                textCount += lines.length;
              } else if (txt) {
                await psService.type(resolvedId, txt);
                textCount++;
              }
            } else if (seg.type === 'delay') {
              await new Promise(resolve => setTimeout(resolve, seg.value as number));
              delayCount++;
            } else if (seg.type === 'window_action') {
              const wa = seg.value as string;
              if (wa === 'maximize') await psService.maximize(resolvedId);
              else if (wa === 'minimize') await psService.minimize(resolvedId);
              else if (wa === 'restore') await psService.restore(resolvedId);
              else if (wa === 'focus') await psService.focus(resolvedId);
              textCount++;
            }
          }
          return { message: `Typed ${textCount} segment(s)${delayCount > 0 ? ` with ${delayCount} delay(s)` : ''}` };
        }

        case 'pwsh_press':
          const pressId = resolveSessionId(params!.sessionId!, psService);
          await psService.press(pressId, params!.key!);
          return { message: `Pressed ${params!.key}` };

        case 'pwsh_screenshot':
          const shotId = resolveSessionId(params!.sessionId!, psService);
          return await psService.screenshot(shotId, params?.filename, params?.returnBase64);

        case 'pwsh_break':
          const breakId = resolveSessionId(params!.sessionId!, psService);
          await psService.break(breakId);
          return { message: 'Sent Ctrl+C' };

        case 'pwsh_key_toggle':
          const toggleId = resolveSessionId(params!.sessionId!, psService);
          await psService.keyToggle(toggleId, params!.key!, params?.direction || 'down');
          return { message: `Key ${params!.key} ${params?.direction || 'down'}` };

        case 'pwsh_close':
          const closeId = resolveSessionId(params!.sessionId!, psService);
          await psService.close(closeId);
          return { message: 'Session closed' };

        default:
          throw new Error(`Unknown PowerShell action: ${action}`);
      }
    }
  };
}

// Helper functions (copied from cli-impl.ts patterns)
function resolveSessionId(sessionIdOrIndex: string, psService: PowerShellSessionService): string {
  const index = parseInt(sessionIdOrIndex);
  if (!isNaN(index)) {
    const sessions = psService.listSessions();
    const targetIndex = index - 1;
    if (targetIndex >= 0 && targetIndex < sessions.length) {
      return sessions[targetIndex].id;
    }
    throw new Error(`Session index ${index} out of range`);
  }
  return sessionIdOrIndex;
}
