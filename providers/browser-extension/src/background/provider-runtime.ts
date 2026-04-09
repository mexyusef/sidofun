import type {
  SidofunBrowserProviderQueuedCommand,
  SidofunBrowserProviderSessionState,
} from '../protocol.js';

interface ProviderSessionRecordLike {
  sessionId: string;
  windowId?: number;
  activeTabId?: number;
  tabs?: Array<{ id: number; url?: string; active?: boolean }>;
  site?: string;
  targetUrl?: string;
  privateMode?: boolean;
  snapshot?: unknown;
  screenshot?: unknown;
  networkEvents?: unknown[];
  domEvents?: unknown[];
}

interface ProviderStorageStateLike<TSession extends ProviderSessionRecordLike> {
  serverBaseUrl: string;
  sessions: Record<string, TSession>;
}

interface ProviderRuntimeDeps<TSession extends ProviderSessionRecordLike> {
  providerId: string;
  protocolVersion: string;
  extensionId: string;
  buildId: string;
  pollAlarm: string;
  pollPeriodMinutes: number;
  fastSyncDelayMs: number;
  providerLongPollWaitMs: number;
  commandDrainLimit: number;
  commandExecutionTimeoutMs?: number;
  defaultState: () => ProviderStorageStateLike<TSession>;
  getState: () => Promise<ProviderStorageStateLike<TSession>>;
  setState: (state: ProviderStorageStateLike<TSession>) => Promise<void>;
  sidofunFetch: (path: string, init?: RequestInit) => Promise<any>;
  executeCommand: (command: SidofunBrowserProviderQueuedCommand) => Promise<unknown>;
  getWindowTabs: (windowId?: number) => Promise<Array<{ id: number; url?: string; active?: boolean }>>;
}

export function createProviderRuntime<TSession extends ProviderSessionRecordLike>(
  deps: ProviderRuntimeDeps<TSession>
) {
  let pollInFlight = false;
  let pendingPoll = false;
  let scheduledPollTimer: ReturnType<typeof setTimeout> | undefined;
  let initializeInFlight: Promise<void> | undefined;

  function scheduleProviderSync(delayMs = deps.fastSyncDelayMs) {
    pendingPoll = true;
    if (scheduledPollTimer) {
      clearTimeout(scheduledPollTimer);
    }
    scheduledPollTimer = setTimeout(() => {
      scheduledPollTimer = undefined;
      void heartbeatAndPoll();
    }, Math.max(0, delayMs));
  }

  async function reportCommandResult(command: SidofunBrowserProviderQueuedCommand, ok: boolean, result?: unknown, error?: string) {
    await deps.sidofunFetch('/browser-extension/provider/command-result', {
      method: 'POST',
      body: JSON.stringify({
        extensionId: deps.extensionId,
        sessionId: command.sessionId,
        commandId: command.id,
        ok,
        result,
        error
      })
    });
  }

  async function collectHeartbeatSessions(): Promise<SidofunBrowserProviderSessionState[]> {
    const state = await deps.getState();
    const sessions = Object.values(state.sessions);
    const payload: SidofunBrowserProviderSessionState[] = [];
    for (const session of sessions) {
      const tabs = session.windowId ? await deps.getWindowTabs(session.windowId) : (session.tabs ?? []);
      const activeTab = tabs.find((tab) => tab.active) ?? tabs[0];
      payload.push({
        sessionId: session.sessionId,
        connected: tabs.length > 0,
        windowId: session.windowId,
        activeTabId: activeTab?.id ?? session.activeTabId,
        tabs,
        site: session.site,
        targetUrl: activeTab?.url ?? session.targetUrl,
        privateMode: session.privateMode,
        snapshot: session.snapshot,
        screenshot: session.screenshot,
        networkEventCount: session.networkEvents?.length ?? 0,
        domEventCount: session.domEvents?.length ?? 0
      });
    }
    return payload;
  }

  async function registerProvider() {
    const result = await deps.sidofunFetch('/browser-extension/provider/register', {
      method: 'POST',
      body: JSON.stringify({
        extensionId: deps.extensionId,
        protocolVersion: deps.protocolVersion,
        buildId: deps.buildId,
        browserName: 'chrome',
        browserVersion: navigator.userAgent.match(/Chrome\/([0-9.]+)/)?.[1],
        userAgent: navigator.userAgent
      })
    });
    const state = await deps.getState();
    state.serverBaseUrl = result?.serverBaseUrl || state.serverBaseUrl;
    await deps.setState(state);
  }

  async function heartbeatAndPoll() {
    if (pollInFlight) {
      pendingPoll = true;
      return;
    }
    pollInFlight = true;
    pendingPoll = false;
    try {
      await registerProvider();
      const sessions = await collectHeartbeatSessions();
      await deps.sidofunFetch('/browser-extension/provider/heartbeat', {
        method: 'POST',
        body: JSON.stringify({
          extensionId: deps.extensionId,
          protocolVersion: deps.protocolVersion,
          buildId: deps.buildId,
          sessions
        })
      });
      let drainCount = 0;
      while (drainCount < deps.commandDrainLimit) {
        const commands = await deps.sidofunFetch('/browser-extension/provider/poll', {
          method: 'POST',
          body: JSON.stringify({
            extensionId: deps.extensionId,
            limit: 10,
            waitMs: drainCount === 0 ? deps.providerLongPollWaitMs : 0
          })
        }) as SidofunBrowserProviderQueuedCommand[];
        if (!Array.isArray(commands) || commands.length === 0) {
          break;
        }
        for (const command of commands) {
          try {
            const result = await Promise.race([
              deps.executeCommand(command),
              new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error(`Timed out executing provider command: ${command.kind}`)), deps.commandExecutionTimeoutMs ?? 60_000);
              }),
            ]);
            await reportCommandResult(command, true, result);
          } catch (error) {
            await reportCommandResult(command, false, undefined, error instanceof Error ? error.message : String(error));
          }
        }
        drainCount += 1;
      }
    } catch (error) {
      console.warn(`[${deps.providerId}] bridge heartbeat/poll failed`, error);
    } finally {
      pollInFlight = false;
      scheduleProviderSync(pendingPoll ? deps.fastSyncDelayMs : deps.providerLongPollWaitMs);
    }
  }

  async function initializeProvider() {
    if (initializeInFlight) {
      return initializeInFlight;
    }
    initializeInFlight = (async () => {
      const state = await deps.getState();
      await deps.setState({
        ...deps.defaultState(),
        ...state
      });
      await chrome.alarms.clear(deps.pollAlarm);
      await chrome.alarms.create(deps.pollAlarm, {
        delayInMinutes: 0.01,
        periodInMinutes: deps.pollPeriodMinutes
      });
      await heartbeatAndPoll();
    })().finally(() => {
      initializeInFlight = undefined;
    });
    return initializeInFlight;
  }

  return {
    scheduleProviderSync,
    collectHeartbeatSessions,
    registerProvider,
    heartbeatAndPoll,
    initializeProvider,
  };
}
