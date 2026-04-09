import type { BrowserInfo, BrowserProfileInfo } from '../services/browser/types.js';
import type { CMDSessionService } from '../services/cmd/cmd-session-service.js';

export type SessionInfo = ReturnType<CMDSessionService['getSessionInfo']>;
export type OperatorBrowserProfile = BrowserProfileInfo;

export interface DoctorStatus {
  platform: NodeJS.Platform;
  nodeVersion: string;
  bunVersion: string;
  cwd: string;
  cliPath: string;
  libnutPath: string;
  libnutPresent: boolean;
}

export interface OperatorSnapshot {
  browsers: BrowserInfo[];
  cmdSessions: SessionInfo[];
  pwshSessions: SessionInfo[];
  capturedAt: string;
}
