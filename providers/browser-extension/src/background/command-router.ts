import type { SidofunBrowserProviderQueuedCommand } from '../protocol.js';
import {
  createFormCommandExecutor,
} from './form-command-executor.js';
import {
  createPageCommandExecutor,
} from './page-command-executor.js';
import {
  createSessionCommandExecutor,
} from './session-command-executor.js';
import type { CommandRouterDeps } from './command-router-deps.js';
import type {
  ProviderSessionRecord,
} from './types.js';

export function createCommandRouter(deps: CommandRouterDeps) {
  const executeSessionCommand = createSessionCommandExecutor(deps);
  const executePageCommand = createPageCommandExecutor(deps);
  const executeFormCommand = createFormCommandExecutor(deps);

  return async function executeCommand(command: SidofunBrowserProviderQueuedCommand) {
    const state = await deps.getState();
    const existing = state.sessions[command.sessionId] ?? {
      sessionId: command.sessionId,
      connected: false,
      updatedAt: new Date().toISOString()
    };

    const providerResult = await deps.executeProviderCommand(command, existing);
    if (providerResult.handled) {
      return providerResult.result;
    }

    const browserStateResult = await deps.executeBrowserStateCommand(command, existing);
    if (browserStateResult.handled) {
      return browserStateResult.result;
    }

    const sessionResult = await executeSessionCommand(command, existing);
    if (sessionResult.handled) {
      return sessionResult.result;
    }

    const pageResult = await executePageCommand(command, existing);
    if (pageResult.handled) {
      return pageResult.result;
    }

    const formResult = await executeFormCommand(command, existing);
    if (formResult.handled) {
      return formResult.result;
    }

    throw new Error(`Unsupported browser-extension command: ${command.kind}`);
  };
}
