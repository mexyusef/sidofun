import fs from 'node:fs/promises';
import path from 'node:path';
import { SIDOFUN_APP_DIR, SIDOFUN_STATE_FILE } from '../config/constants.js';
import type { PersistedDaemonState } from './types.js';

const EMPTY_STATE: PersistedDaemonState = {
  version: 1,
  updatedAt: new Date(0).toISOString(),
  clientSessions: [],
  desktopScopes: [],
  browserRuntimes: [],
  cmdSessions: [],
  pwshSessions: []
};

export class DaemonStateStore {
  async read(): Promise<PersistedDaemonState> {
    await fs.mkdir(SIDOFUN_APP_DIR, { recursive: true });
    try {
      const raw = await fs.readFile(SIDOFUN_STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as PersistedDaemonState;
      return {
        ...EMPTY_STATE,
        ...parsed,
        clientSessions: parsed.clientSessions || [],
        desktopScopes: parsed.desktopScopes || [],
        browserRuntimes: parsed.browserRuntimes || [],
        cmdSessions: parsed.cmdSessions || [],
        pwshSessions: parsed.pwshSessions || []
      };
    } catch {
      return { ...EMPTY_STATE };
    }
  }

  async write(state: PersistedDaemonState): Promise<void> {
    await fs.mkdir(SIDOFUN_APP_DIR, { recursive: true });
    const output = {
      ...state,
      updatedAt: new Date().toISOString()
    };
    const tempPath = path.join(SIDOFUN_APP_DIR, 'state.tmp.json');
    await fs.writeFile(tempPath, JSON.stringify(output, null, 2), 'utf8');
    await fs.rename(tempPath, SIDOFUN_STATE_FILE);
  }
}
