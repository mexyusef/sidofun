import { SIDOFUN_BROWSER_EXTENSION_PROTOCOL } from '../protocol.js';

const CONTENT_SCRIPT_INJECT_RETRY_MS = 750;
const CONTENT_SCRIPT_INJECT_MAX_ATTEMPTS = 4;
const FRAME_MESSAGE_TIMEOUT_MS = 2_500;
const DOM_EXECUTION_TIMEOUT_MS = 5_000;

export interface ReachableContentScriptFrame {
  frameId: number;
  parentFrameId?: number;
  url?: string;
  errorOccurred?: boolean;
}

type WaitForTabComplete = (tabId: number, timeoutMs?: number) => Promise<chrome.tabs.Tab | undefined>;
type SendTabCommand = (
  tabId: number,
  payload: Record<string, unknown>,
  sessionId?: string
) => Promise<Record<string, unknown> | undefined>;

export async function contentScriptExists(tabId: number, frameId = 0) {
  try {
    const response = await Promise.race([
      chrome.tabs.sendMessage(tabId, {
        protocol: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
        kind: 'content_script_exists'
      }, { frameId }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timed out probing content script in frame ${frameId}`)), Math.min(FRAME_MESSAGE_TIMEOUT_MS, 1_000));
      }),
    ]);
    return response?.ok === true;
  } catch {
    return false;
  }
}

function normalizeHost(value?: string) {
  if (!value) {
    return '';
  }
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export async function findReachableContentScriptFrames(tabId: number): Promise<ReachableContentScriptFrame[]> {
  const framesById = new Map<number, ReachableContentScriptFrame>();
  framesById.set(0, { frameId: 0 });
  const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => []);
  for (const frame of frames ?? []) {
    if (typeof frame.frameId === 'number') {
      framesById.set(frame.frameId, {
        frameId: frame.frameId,
        parentFrameId: typeof frame.parentFrameId === 'number' ? frame.parentFrameId : undefined,
        url: typeof frame.url === 'string' ? frame.url : undefined,
        errorOccurred: frame.errorOccurred === true,
      });
    }
  }
  const reachable: ReachableContentScriptFrame[] = [];
  for (const frame of framesById.values()) {
    if (await contentScriptExists(tabId, frame.frameId)) {
      reachable.push(frame);
    }
  }
  return reachable;
}

export function prioritizeReachableContentScriptFrames(
  frames: ReachableContentScriptFrame[],
  tabUrl?: string,
  preferredFrameId?: number
) {
  const topHost = normalizeHost(tabUrl);
  const scored = frames.map((frame, index) => {
    const frameHost = normalizeHost(frame.url);
    let score = 0;
    if (typeof preferredFrameId === 'number' && frame.frameId === preferredFrameId) {
      score += 10_000;
    }
    if (frame.frameId === 0) {
      score += 5_000;
    }
    if (frameHost && topHost && frameHost === topHost) {
      score += 1_000;
    }
    if (frameHost && topHost && (frameHost.endsWith(`.${topHost}`) || topHost.endsWith(`.${frameHost}`))) {
      score += 500;
    }
    if (frame.errorOccurred) {
      score -= 250;
    }
    return { frame, score, index };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  return scored.map((entry) => entry.frame);
}

export async function sendMessageToFrame<T>(
  tabId: number,
  frameId: number,
  payload: Record<string, unknown>,
  timeoutMs = FRAME_MESSAGE_TIMEOUT_MS
) {
  return await Promise.race([
    chrome.tabs.sendMessage(tabId, {
      protocol: SIDOFUN_BROWSER_EXTENSION_PROTOCOL,
      ...payload,
    }, { frameId }) as Promise<T>,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out waiting for browser-extension tab command: ${String(payload.kind)} [frame ${frameId}]`)), timeoutMs);
    }),
  ]);
}

export async function ensureContentScript(tabId: number) {
  for (let attempt = 0; attempt < CONTENT_SCRIPT_INJECT_MAX_ATTEMPTS; attempt += 1) {
    const reachableBefore = await findReachableContentScriptFrames(tabId);
    if (reachableBefore.length > 0) {
      return true;
    }
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      injectImmediately: true,
      files: ['dist/content-script.js']
    }).catch(() => undefined);
    const reachableAfter = await findReachableContentScriptFrames(tabId);
    if (reachableAfter.length > 0) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, CONTENT_SCRIPT_INJECT_RETRY_MS));
  }
  return false;
}

export async function executeDomScript<T>(
  tabId: number,
  func: (...args: any[]) => T,
  args: unknown[] = [],
  waitForTabComplete: WaitForTabComplete
): Promise<T | undefined> {
  await waitForTabComplete(tabId).catch(() => undefined);
  const normalizedArgs = JSON.parse(JSON.stringify(args, (_key, value) => value === undefined ? null : value));
  const [result] = await Promise.race([
    chrome.scripting.executeScript({
      target: { tabId },
      func,
      args: normalizedArgs
    }).catch(() => []),
    new Promise<[]>(resolve => {
      setTimeout(() => resolve([]), DOM_EXECUTION_TIMEOUT_MS);
    }),
  ]);
  return result?.result as T | undefined;
}

export async function ensureDomBridge(tabId: number, waitForTabComplete: WaitForTabComplete) {
  await waitForTabComplete(tabId).catch(() => undefined);
  await chrome.scripting.executeScript({
    target: { tabId },
    injectImmediately: true,
    files: ['dist/dom-bridge.js']
  }).catch(() => undefined);
}

export async function executeDomBridge<T>(
  tabId: number,
  kind: string,
  payload: Record<string, unknown> | undefined,
  waitForTabComplete: WaitForTabComplete
): Promise<T | undefined> {
  await ensureDomBridge(tabId, waitForTabComplete);
  const [result] = await Promise.race([
    chrome.scripting.executeScript({
      target: { tabId },
      func: (commandKind: string, commandPayload?: Record<string, unknown>) => {
        const bridge = (globalThis as typeof globalThis & {
          __sidofunDomBridge?: {
            run: (kind: string, payload?: Record<string, unknown>) => unknown;
          };
        }).__sidofunDomBridge;
        if (!bridge) {
          throw new Error('Sidofun DOM bridge is not installed in the target tab');
        }
        return bridge.run(commandKind, commandPayload);
      },
      args: [kind, payload ?? {}]
    }).catch(() => []),
    new Promise<[]>(resolve => {
      setTimeout(() => resolve([]), DOM_EXECUTION_TIMEOUT_MS);
    }),
  ]);
  return result?.result as T | undefined;
}

export function isBridgeResultEmpty(result: unknown) {
  if (result == null) {
    return true;
  }
  if (Array.isArray(result)) {
    return result.length === 0;
  }
  if (typeof result === 'object') {
    return Object.keys(result as Record<string, unknown>).length === 0;
  }
  return false;
}

export async function executeDomBridgeWithFallback<T>(
  tabId: number,
  sessionId: string,
  bridgeKind: string,
  payload: Record<string, unknown>,
  fallbackKind: string,
  fallbackKey: string,
  waitForTabComplete: WaitForTabComplete,
  sendTabCommand: SendTabCommand
): Promise<T | undefined> {
  const bridged = await executeDomBridge<T>(tabId, bridgeKind, payload, waitForTabComplete).catch(() => undefined);
  if (!isBridgeResultEmpty(bridged)) {
    return bridged;
  }
  const response = await sendTabCommand(tabId, {
    kind: fallbackKind,
    ...payload
  }, sessionId).catch(() => undefined);
  const fallback = response?.[fallbackKey] as T | undefined;
  return fallback ?? bridged;
}
