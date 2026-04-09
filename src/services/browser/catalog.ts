import path from 'node:path';
import type { BrowserDefinition } from './types.js';

function uniqueValues(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

export function createWindowsBrowserCatalog(env: NodeJS.ProcessEnv = process.env): BrowserDefinition[] {
  const userProfile = env.USERPROFILE || 'C:\\Users\\Default';
  const localAppData = env.LOCALAPPDATA || path.join(userProfile, 'AppData', 'Local');
  const appData = env.APPDATA || path.join(userProfile, 'AppData', 'Roaming');
  const programFiles = env.ProgramFiles || 'C:\\Program Files';
  const programFilesX86 = env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  return [
    {
      id: 'chrome',
      displayName: 'Google Chrome',
      processNames: ['chrome'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_CHROME_PATH,
        env.CHROME_LOCATION,
        path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_CHROME_USER_DATA,
        env.CHROME_USER_DATA,
        path.join(localAppData, 'Google', 'Chrome', 'User Data')
      ]),
      profileStrategy: 'chromium',
      supportsProfileLaunch: true,
      launchFlags: { privateMode: ['--incognito'], headless: ['--headless'] }
    },
    {
      id: 'firefox',
      displayName: 'Mozilla Firefox',
      processNames: ['firefox'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_FIREFOX_PATH,
        env.FIREFOX_LOCATION,
        path.join(programFiles, 'Mozilla Firefox', 'firefox.exe'),
        path.join(programFilesX86, 'Mozilla Firefox', 'firefox.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_FIREFOX_USER_DATA,
        env.FIREFOX_PROFILE_DIR,
        path.join(appData, 'Mozilla', 'Firefox')
      ]),
      profileStrategy: 'firefox',
      supportsProfileLaunch: true,
      launchFlags: { privateMode: ['--private-window'], headless: ['--headless'] }
    },
    {
      id: 'edge',
      displayName: 'Microsoft Edge',
      processNames: ['msedge'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_EDGE_PATH,
        env.EDGE_LOCATION,
        path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_EDGE_USER_DATA,
        env.EDGE_USER_DATA,
        path.join(localAppData, 'Microsoft', 'Edge', 'User Data')
      ]),
      profileStrategy: 'chromium',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      launchFlags: { privateMode: ['--inprivate'], headless: ['--headless'] },
      notes: 'Edge is exposed as a direct-launch browser for agents; Chrome and Firefox are the profile-first browsers.'
    },
    {
      id: 'brave',
      displayName: 'Brave Browser',
      processNames: ['brave'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_BRAVE_PATH,
        env.BRAVE_LOCATION,
        path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_BRAVE_USER_DATA,
        path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data')
      ]),
      profileStrategy: 'chromium',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      launchFlags: { privateMode: ['--incognito'], headless: ['--headless'] },
      notes: 'Brave is exposed as a direct-launch browser for agents; Chrome and Firefox are the profile-first browsers.'
    },
    {
      id: 'opera',
      displayName: 'Opera',
      processNames: ['opera', 'launcher'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_OPERA_PATH,
        env.OPERA_LOCATION,
        path.join(localAppData, 'Programs', 'Opera', 'opera.exe'),
        path.join(localAppData, 'Programs', 'Opera', 'launcher.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_OPERA_USER_DATA,
        path.join(appData, 'Opera Software', 'Opera Stable'),
        path.join(localAppData, 'Opera Software', 'Opera Stable')
      ]),
      profileStrategy: 'chromium',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      launchFlags: { privateMode: ['--private'], headless: ['--headless'] },
      notes: 'Opera is exposed as a direct-launch browser for agents, with private/headless flags but no profile workflow.'
    },
    {
      id: 'vivaldi',
      displayName: 'Vivaldi',
      processNames: ['vivaldi'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_VIVALDI_PATH,
        env.VIVALDI_LOCATION,
        path.join(localAppData, 'Vivaldi', 'Application', 'vivaldi.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_VIVALDI_USER_DATA,
        path.join(localAppData, 'Vivaldi', 'User Data')
      ]),
      profileStrategy: 'chromium',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      launchFlags: { privateMode: ['--incognito'], headless: ['--headless'] },
      notes: 'Vivaldi is exposed as a direct-launch browser for agents; Chrome and Firefox are the profile-first browsers.'
    },
    {
      id: 'chromium',
      displayName: 'Chromium',
      processNames: ['chromium'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_CHROMIUM_PATH,
        path.join(localAppData, 'Chromium', 'Application', 'chromium.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_CHROMIUM_USER_DATA,
        path.join(localAppData, 'Chromium', 'User Data')
      ]),
      profileStrategy: 'chromium',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      launchFlags: { privateMode: ['--incognito'], headless: ['--headless'] },
      notes: 'Chromium is exposed as a direct-launch browser for agents; Chrome and Firefox are the profile-first browsers.'
    },
    {
      id: 'maxthon',
      displayName: 'Maxthon',
      processNames: ['maxthon'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_MAXTHON_PATH,
        path.join(localAppData, 'Maxthon', 'Bin', 'Maxthon.exe'),
        path.join(localAppData, 'Maxthon', 'Maxthon.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_MAXTHON_USER_DATA,
        path.join(localAppData, 'Maxthon', 'User Data'),
        path.join(appData, 'Maxthon3', 'Users')
      ]),
      profileStrategy: 'single',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      notes: 'Maxthon profile layout is machine-specific; Sidofun treats it as a single-profile browser for now.'
    },
    {
      id: 'midori',
      displayName: 'Midori',
      processNames: ['midori'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_MIDORI_PATH,
        path.join(programFiles, 'Midori Browser', 'midori.exe'),
        path.join(userProfile, 'Desktop', 'midori', 'midori.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_MIDORI_USER_DATA,
        path.join(appData, 'Midori'),
        path.join(localAppData, 'Midori')
      ]),
      profileStrategy: 'single',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false,
      launchFlags: { privateMode: ['--private'], headless: ['--headless'] },
      notes: 'Midori install and profile locations are often custom on Windows.'
    },
    {
      id: 'min',
      displayName: 'Min',
      processNames: ['min'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_MIN_PATH,
        path.join(localAppData, 'min', 'min.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_MIN_USER_DATA,
        path.join(appData, 'Min')
      ]),
      profileStrategy: 'single',
      supportsProfileDiscovery: false,
      supportsProfileLaunch: false
    },
    {
      id: 'netsurf',
      displayName: 'NetSurf',
      processNames: ['netsurf'],
      executableCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_NETSURF_PATH,
        path.join(programFilesX86, 'NetSurf', 'NetSurf', 'NetSurf.exe')
      ]),
      userDataCandidates: uniqueValues([
        env.SIDOFUN_BROWSER_NETSURF_USER_DATA,
        path.join(appData, 'NetSurf')
      ]),
      profileStrategy: 'none',
      supportsProfileLaunch: false,
      notes: 'NetSurf is exposed as installed/not-installed only in this iteration.'
    }
  ];
}
