/**
 * Application Configuration
 *
 * Maps common application names to their Windows executable paths.
 * Used by the launch_application action.
 */

export interface ApplicationEntry {
  /** Executable path or command */
  path: string;
  /** Description of what this application does */
  description?: string;
}

/**
 * Map of application aliases to Windows executable paths.
 *
 * Keys are lowercase aliases that users can reference.
 * Values are either:
 *   - Full paths to executables
 *   - Executable names that will be searched in PATH
 */
export const APPLICATION_MAP: Record<string, ApplicationEntry['path']> = {
  // Command Prompt / Terminal
  'cmd': 'C:\\Windows\\System32\\cmd.exe',
  'terminal': 'C:\\Windows\\System32\\cmd.exe',
  'command': 'C:\\Windows\\System32\\cmd.exe',
  'cmd.exe': 'C:\\Windows\\System32\\cmd.exe',
  'powershell': 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  'pwsh': 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
  'powershell_7': 'pwsh.exe',  // PowerShell 7+ if in PATH

  // Built-in Windows Applications
  'notepad': 'C:\\Windows\\System32\\notepad.exe',
  'notepad++': 'notepad++.exe',  // If in PATH
  'calculator': 'C:\\Windows\\System32\\calc.exe',
  'calc': 'C:\\Windows\\System32\\calc.exe',
  'paint': 'C:\\Windows\\System32\\mspaint.exe',
  'mspaint': 'C:\\Windows\\System32\\mspaint.exe',
  'explorer': 'C:\\Windows\\explorer.exe',
  'taskmgr': 'C:\\Windows\\System32\\taskmgr.exe',
  'taskmanager': 'C:\\Windows\\System32\\taskmgr.exe',

  // Browsers
  'chrome': 'chrome.exe',
  'google-chrome': 'chrome.exe',
  'chromium': 'chromium.exe',
  'firefox': 'firefox.exe',
  'edge': 'msedge.exe',
  'msedge': 'msedge.exe',
  'brave': 'brave.exe',
  'opera': 'opera.exe',

  // Development Tools
  'vscode': 'code.exe',
  'code': 'code.exe',
  'visual-studio-code': 'code.exe',
  'gitbash': 'C:\\Program Files\\Git\\bin\\bash.exe',

  // Communication
  'discord': 'Discord.exe',
  'slack': 'slack.exe',
  'teams': 'ms-teams.exe',
  'zoom': 'zoom.exe',
  'telegram': 'Telegram.exe',

  // Other Common Applications
  'spotify': 'Spotify.exe',
  'word': 'winword.exe',
  'excel': 'excel.exe',
  'powerpoint': 'powerpnt.exe',
  'outlook': 'outlook.exe',
};

/**
 * Resolve an application name to its executable path.
 *
 * @param appName - Application name or alias
 * @returns Executable path, or original name if not found in map
 */
export function resolveApplicationPath(appName: string): string {
  const normalized = appName.toLowerCase().trim();
  return APPLICATION_MAP[normalized] || appName;
}

/**
 * Check if an application is a CMD/Command Prompt variant.
 *
 * @param appName - Application name or path
 * @returns True if this is a CMD variant
 */
export function isCmdApplication(appName: string): boolean {
  const normalized = appName.toLowerCase();
  return normalized.includes('cmd') || normalized.includes('command');
}
