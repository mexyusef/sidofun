import type { SidofunBrowserProviderQueuedCommand } from '../protocol.js';
import {
  createPageActionCommandExecutor,
} from './page-action-command-executor.js';
import {
  createPageReadCommandExecutor,
} from './page-read-command-executor.js';
import type { CommandRouterDeps } from './command-router-deps.js';
import type { ProviderSessionRecord } from './types.js';

export function createPageCommandExecutor(deps: CommandRouterDeps) {
  const executePageReadCommand = createPageReadCommandExecutor(deps);
  const executePageActionCommand = createPageActionCommandExecutor(deps);

  return async function executePageCommand(command: SidofunBrowserProviderQueuedCommand, existing: ProviderSessionRecord) {
    const readResult = await executePageReadCommand(command, existing);
    if (readResult.handled) {
      return readResult;
    }

    return executePageActionCommand(command, existing);
  };
}
