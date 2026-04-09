import type {
  SidofunBrowserExtensionDomEvent,
  SidofunBrowserExtensionNetworkEvent,
  SidofunBrowserExtensionTab,
} from '../protocol.js';

export interface ProviderEventSessionRecordLike {
  sessionId: string;
  windowId?: number;
  tabs?: SidofunBrowserExtensionTab[];
  networkEvents?: SidofunBrowserExtensionNetworkEvent[];
  domEvents?: SidofunBrowserExtensionDomEvent[];
  updatedAt: string;
}

export interface ProviderEventStorageStateLike<TSession extends ProviderEventSessionRecordLike> {
  sessions: Record<string, TSession>;
}

type GetState<TSession extends ProviderEventSessionRecordLike> = () => Promise<ProviderEventStorageStateLike<TSession>>;
type SetState<TSession extends ProviderEventSessionRecordLike> = (state: ProviderEventStorageStateLike<TSession>) => Promise<void>;
type PushProviderEvents = (
  sessionId: string,
  payload: {
    networkEvents?: SidofunBrowserExtensionNetworkEvent[];
    domEvents?: SidofunBrowserExtensionDomEvent[];
    events?: Array<{
      id: string;
      kind: 'session_state';
      ok: boolean;
      summary?: string;
      url?: string;
      text?: string;
      error?: string;
      timestamp: string;
    }>;
  }
) => Promise<void>;

function createEventId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function trimNetworkEvents(events: SidofunBrowserExtensionNetworkEvent[], maxEvents: number) {
  return events.length > maxEvents ? events.slice(events.length - maxEvents) : events;
}

function trimDomEvents(events: SidofunBrowserExtensionDomEvent[], maxEvents: number) {
  return events.length > maxEvents ? events.slice(events.length - maxEvents) : events;
}

export async function appendNetworkEventForTab<TSession extends ProviderEventSessionRecordLike>(
  tabId: number,
  event: Omit<SidofunBrowserExtensionNetworkEvent, 'id' | 'windowId'>,
  maxEvents: number,
  getState: GetState<TSession>,
  setState: SetState<TSession>,
  pushProviderEvents: PushProviderEvents
) {
  const state = await getState();
  let changed = false;
  const pushes: Array<Promise<void>> = [];
  for (const session of Object.values(state.sessions)) {
    const tab = (session.tabs ?? []).find((entry) => entry.id === tabId);
    if (!tab) {
      continue;
    }
    const nextEvent: SidofunBrowserExtensionNetworkEvent = {
      ...event,
      id: createEventId(),
      windowId: session.windowId
    };
    session.networkEvents = trimNetworkEvents([...(session.networkEvents ?? []), nextEvent], maxEvents);
    session.updatedAt = new Date().toISOString();
    changed = true;
    pushes.push(pushProviderEvents(session.sessionId, { networkEvents: [nextEvent] }));
  }
  if (changed) {
    await setState(state);
    await Promise.all(pushes);
  }
}

export async function appendDomEventForTab<TSession extends ProviderEventSessionRecordLike>(
  tabId: number,
  event: Omit<SidofunBrowserExtensionDomEvent, 'id'>,
  maxEvents: number,
  getState: GetState<TSession>,
  setState: SetState<TSession>,
  pushProviderEvents: PushProviderEvents
) {
  const state = await getState();
  let changed = false;
  const pushes: Array<Promise<void>> = [];
  for (const session of Object.values(state.sessions)) {
    const tab = (session.tabs ?? []).find((entry) => entry.id === tabId);
    if (!tab) {
      continue;
    }
    const nextEvent: SidofunBrowserExtensionDomEvent = {
      ...event,
      id: createEventId()
    };
    session.domEvents = trimDomEvents([...(session.domEvents ?? []), nextEvent], maxEvents);
    session.updatedAt = new Date().toISOString();
    changed = true;
    pushes.push(pushProviderEvents(session.sessionId, { domEvents: [nextEvent] }));
  }
  if (changed) {
    await setState(state);
    await Promise.all(pushes);
  }
}

export async function pushSessionLifecycleEvent(
  sessionId: string,
  summary: string,
  pushProviderEvents: PushProviderEvents,
  extras?: {
    url?: string;
    text?: string;
    error?: string;
  }
) {
  await pushProviderEvents(sessionId, {
    events: [
      {
        id: createEventId(),
        kind: 'session_state',
        ok: true,
        summary,
        url: extras?.url,
        text: extras?.text,
        error: extras?.error,
        timestamp: new Date().toISOString()
      }
    ]
  });
}
