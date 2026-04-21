import { describe, expect, test } from 'bun:test';
import { renderBrowserLaunch } from '../src/operator-cli/render.js';

describe('operator cli render', () => {
  test('quotes browser launch output for Windows command lines with spaces', () => {
    const rendered = renderBrowserLaunch({
      browserId: 'chrome',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      pid: 20728,
      usedProfile: {
        id: 'Default',
        browserId: 'chrome',
        name: 'Default',
        displayName: 'Person 1',
        path: 'C:\\Users\\usef\\AppData\\Local\\Google\\Chrome\\User Data\\Default',
        isDefault: true,
        emails: []
      },
      command: [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        '--user-data-dir=C:\\Users\\usef\\AppData\\Local\\Google\\Chrome\\User Data',
        '--profile-directory=Default',
        '--incognito',
        'https://google.com'
      ]
    });

    expect(rendered).toContain('Executable: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"');
    expect(rendered).toContain('Command: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" "--user-data-dir=C:\\Users\\usef\\AppData\\Local\\Google\\Chrome\\User Data" --profile-directory=Default --incognito https://google.com');
  });
});
