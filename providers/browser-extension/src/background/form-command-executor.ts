import type { SidofunBrowserProviderQueuedCommand } from '../protocol.js';
import {
  createFormActionCommandExecutor,
} from './form-action-command-executor.js';
import {
  createFormReadCommandExecutor,
} from './form-read-command-executor.js';
import type { CommandRouterDeps } from './command-router-deps.js';
import type { ProviderSessionRecord } from './types.js';

export function createFormCommandExecutor(deps: CommandRouterDeps) {
  const executeFormReadCommand = createFormReadCommandExecutor(deps);
  const executeFormActionCommand = createFormActionCommandExecutor(deps);

  return async function executeFormCommand(command: SidofunBrowserProviderQueuedCommand, existing: ProviderSessionRecord) {
    const readResult = await executeFormReadCommand(command, existing);
    if (readResult.handled) {
      return readResult;
    }

    return executeFormActionCommand(command, existing);
  };
}
