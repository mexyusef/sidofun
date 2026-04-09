import type { BrowserInfo, BrowserLaunchResult, BrowserProfileInfo } from '../services/browser/types.js';
import type { LocalCoderAppStatus } from '../services/local-coder-apps/types.js';
import type { DoctorStatus, SessionInfo } from './types.js';

function formatRect(session: SessionInfo): string {
  return `${session.rect.width}x${session.rect.height} @ ${session.rect.x},${session.rect.y}`;
}

export function renderDoctor(status: DoctorStatus): string {
  return [
    'Sidofun Doctor',
    `Platform: ${status.platform}`,
    `Node: ${status.nodeVersion}`,
    `Bun: ${status.bunVersion}`,
    `CWD: ${status.cwd}`,
    `CLI Path: ${status.cliPath}`,
    `libnut: ${status.libnutPresent ? 'present' : 'missing'} (${status.libnutPath})`
  ].join('\n');
}

export function renderBrowsers(browsers: BrowserInfo[]): string {
  if (browsers.length === 0) {
    return 'No browsers discovered.';
  }

  return [
    'Browsers',
    ...browsers.map((browser) =>
      `${browser.id.padEnd(10)} ${browser.installed ? 'installed' : 'missing'}  launch=${browser.launchMode}  private=${browser.supportsPrivateMode ? 'yes' : 'no'}  headless=${browser.supportsHeadless ? 'yes' : 'no'}`
    )
  ].join('\n');
}

export function renderBrowserProfiles(browserId: string, profiles: BrowserProfileInfo[]): string {
  if (profiles.length === 0) {
    return `Profiles for ${browserId}\nNo profiles discovered.`;
  }

  return [
    `Profiles for ${browserId}`,
    ...profiles.map((profile, index) => {
      const emailSuffix = profile.emails.length > 0 ? `  emails=${profile.emails.join(',')}` : '';
      return `${String(index + 1).padStart(2)}. ${profile.displayName}  default=${profile.isDefault ? 'yes' : 'no'}  path=${profile.path}${emailSuffix}`;
    })
  ].join('\n');
}

export function renderBrowserLaunch(result: BrowserLaunchResult): string {
  return [
    `Browser launch: ${result.browserId}`,
    `Executable: ${result.executablePath}`,
    `PID: ${result.pid ?? 'n/a'}`,
    `Profile: ${result.usedProfile?.displayName || 'none'}`,
    `Command: ${result.command.join(' ')}`,
    `Debug URL: ${result.remoteDebuggingUrl || 'n/a'}`
  ].join('\n');
}

export function renderLocalCoderList(apps: LocalCoderAppStatus[]): string {
  if (apps.length === 0) {
    return 'No local coder apps configured.';
  }

  return [
    'Local Coders',
    ...apps.map((app) =>
      `${app.id.padEnd(10)} installed=${app.installed ? 'yes' : 'no'}  running=${app.running ? 'yes' : 'no'}  focused=${app.focused ? 'yes' : 'no'}`
    )
  ].join('\n');
}

export function renderLocalCoderStatus(app: LocalCoderAppStatus): string {
  return [
    `Local Coder: ${app.displayName}`,
    `ID: ${app.id}`,
    `Installed: ${app.installed ? 'yes' : 'no'}`,
    `Running: ${app.running ? 'yes' : 'no'}`,
    `Focused: ${app.focused ? 'yes' : 'no'}`,
    `Executable: ${app.executablePath}`,
    `Working Directory: ${app.workingDirectory}`,
    `Process Name: ${app.processName}`,
    app.pid ? `PID: ${app.pid}` : undefined,
    app.window ? `Window: ${app.window.title}` : undefined,
    app.window ? `Handle: ${app.window.handle}` : undefined,
    app.window
      ? `Rect: ${app.window.rect.width}x${app.window.rect.height} @ ${app.window.rect.x},${app.window.rect.y}`
      : undefined
  ].filter(Boolean).join('\n');
}

export function renderOperationResult(result: { sessionId?: string; message: string }): string {
  return [
    result.sessionId ? `Session: ${result.sessionId}` : undefined,
    result.message
  ].filter(Boolean).join('\n');
}

export function renderDaemonHealth(result: {
  pid: number;
  startedAt: string;
  pipePath: string;
  protocolVersion?: number;
  clientSessionCount?: number;
  desktopScopeCount?: number;
  browserRuntimeCount?: number;
  browserPageCount?: number;
  cmdSessionCount: number;
  pwshSessionCount: number;
}): string {
  return [
    'Sidofun Daemon',
    `PID: ${result.pid}`,
    `Started: ${result.startedAt}`,
    `Pipe: ${result.pipePath}`,
    result.protocolVersion ? `Protocol: v${result.protocolVersion}` : undefined,
    `Client Sessions: ${result.clientSessionCount ?? 0}`,
    `Desktop Scopes: ${result.desktopScopeCount ?? 0}`,
    `Browser Runtimes: ${result.browserRuntimeCount ?? 0}`,
    `Browser Pages: ${result.browserPageCount ?? 0}`,
    `CMD Sessions: ${result.cmdSessionCount}`,
    `PowerShell Sessions: ${result.pwshSessionCount}`
  ].filter(Boolean).join('\n');
}

export function renderSessions(label: string, sessions: SessionInfo[]): string {
  if (sessions.length === 0) {
    return `${label}\nNo tracked sessions.`;
  }

  return [
    label,
    ...sessions.map((session, index) =>
      `${String(index + 1).padStart(2)}. ${session.id}  ${session.terminalKind}  ${session.tabTitle}  ${formatRect(session)}`
    )
  ].join('\n');
}

export function renderSessionStatus(label: string, session: SessionInfo): string {
  return [
    label,
    `ID: ${session.id}`,
    `Title: ${session.title}`,
    `Tab: ${session.tabTitle}`,
    `Handle: ${session.handle}`,
    `Terminal: ${session.terminalKind}`,
    `Host: ${session.hostProcessName || 'unknown'} (${session.hostPid || 'n/a'})`,
    `Rect: ${formatRect(session)}`,
    `Commands: ${session.commandCount}`,
    `CWD: ${session.currentDirectory}`,
    `Last Activity: ${new Date(session.lastActivity).toISOString()}`
  ].join('\n');
}
