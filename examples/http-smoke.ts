import { setTimeout as delay } from 'node:timers/promises';

const baseUrl = process.env.SIDOFUN_BASE_URL || 'http://127.0.0.1:9995';

async function fetchJson(path: string, init?: RequestInit): Promise<any> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const body = await response.json();
  if (!response.ok || body?.success === false) {
    throw new Error(body?.error || `Request failed: ${response.status} ${response.statusText}`);
  }
  return body;
}

async function waitForServer(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await fetchJson('/health');
      return;
    } catch (error) {
      lastError = error;
      await delay(500);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function main(): Promise<void> {
  console.log(`HTTP smoke against ${baseUrl}`);
  await waitForServer();

  const health = await fetchJson('/health');
  console.log('health:', health);

  const screenSize = await fetchJson('/screen-size');
  console.log('screen-size:', screenSize.result);

  const mousePosition = await fetchJson('/mouse-position');
  console.log('mouse-position:', mousePosition.result);

  const browsers = await fetchJson('/browsers');
  console.log('browsers:', browsers.result.map((browser: any) => browser.id));

  const runtimes = await fetchJson('/browser-runtimes');
  console.log('browser-runtimes:', runtimes.result);

  if (process.env.SIDOFUN_SMOKE_SCREENSHOT === '1') {
    const screenshot = await fetchJson('/screenshot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'png' })
    });
    console.log('screenshot:', {
      filepath: screenshot.result?.filepath,
      width: screenshot.result?.width,
      height: screenshot.result?.height
    });
  }

  console.log('HTTP smoke completed');
}

main().catch((error) => {
  console.error(`HTTP smoke failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
