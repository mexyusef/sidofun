import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PORT,
  SIDOFUN_APP_DIR,
  SIDOFUN_CONFIG_FILE,
  SIDOFUN_STATE_FILE
} from '../../config/constants.js';
import type {
  BrowserExtensionCapabilities,
  BrowserExtensionCommandResult,
  BrowserExtensionConversationMessage,
  BrowserExtensionConversationSummary,
  BrowserExtensionCookie,
  BrowserExtensionActionableSummary,
  BrowserExtensionBannerSummary,
  BrowserExtensionCollectionSummary,
  BrowserExtensionCollectionItemSummary,
  BrowserExtensionCollectionControlSummary,
  BrowserExtensionCollectionFilterTokenSummary,
  BrowserExtensionDialogActionSummary,
  BrowserExtensionDialogSummary,
  BrowserExtensionDownloadSummary,
  BrowserExtensionDisclosureSummary,
  BrowserExtensionDomTreeNode,
  BrowserExtensionDomEvent,
  BrowserExtensionElementSummary,
  BrowserExtensionFrame,
  BrowserExtensionFormFieldSummary,
  BrowserExtensionFormContextSummary,
  BrowserExtensionFormValidationSummary,
  BrowserExtensionLoadingStateSummary,
  BrowserExtensionLinkSummary,
  BrowserExtensionMenuSummary,
  BrowserExtensionPaginationSummary,
  BrowserExtensionPageMetadata,
  BrowserExtensionNetworkEvent,
  BrowserExtensionPageStateSummary,
  BrowserExtensionEmptyStateSummary,
  BrowserExtensionProviderHeartbeat,
  BrowserExtensionProviderEventsUpsert,
  BrowserExtensionProviderSessionStateUpsert,
  BrowserExtensionProviderRegistration,
  BrowserExtensionQueuedCommand,
  BrowserExtensionRadioGroupSummary,
  BrowserExtensionSegmentedGroupSummary,
  BrowserExtensionStepperSummary,
  BrowserExtensionTablistSummary,
  BrowserExtensionXDirectMessage,
  BrowserExtensionXMessageThread,
  BrowserExtensionXProfile,
  BrowserExtensionSessionEvent,
  BrowserExtensionSession,
  BrowserExtensionSuggestedAction,
  BrowserExtensionSelectOptionSummary,
  BrowserExtensionUploadedFileSummary,
  BrowserExtensionSnapshot,
  BrowserExtensionScreenshot,
  BrowserExtensionStorageEntry,
  BrowserExtensionStatus,
  BrowserExtensionTab,
  BrowserExtensionReadabilitySummary,
  BrowserExtensionXPost,
  BrowserExtensionWorkspace
} from './types.js';
import { SIDOFUN_BROWSER_EXTENSION_BUILD_ID } from '../../shared/browser-extension-build-info.js';

const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_ROOT_CANDIDATES = [
  path.resolve(SERVICE_DIR, '..', 'providers', 'browser-extension'),
  path.resolve(SERVICE_DIR, '..', '..', '..', 'providers', 'browser-extension'),
  path.resolve(SERVICE_DIR, '..', '..', 'providers', 'browser-extension'),
  path.resolve(process.cwd(), 'providers', 'browser-extension')
];
const EXTENSION_ROOT = EXTENSION_ROOT_CANDIDATES.find((candidate) => fs.existsSync(path.join(candidate, 'manifest.json')))
  ?? EXTENSION_ROOT_CANDIDATES[0]!;
const MANIFEST_PATH = path.join(EXTENSION_ROOT, 'manifest.json');
const BACKGROUND_PATH = path.join(EXTENSION_ROOT, 'src', 'background.ts');
const CONTENT_SCRIPT_PATH = path.join(EXTENSION_ROOT, 'src', 'content-script.ts');
const OPTIONS_PAGE_PATH = path.join(EXTENSION_ROOT, 'src', 'options.html');
const DIST_BACKGROUND_PATH = path.join(EXTENSION_ROOT, 'dist', 'background.js');
const DIST_CONTENT_SCRIPT_PATH = path.join(EXTENSION_ROOT, 'dist', 'content-script.js');
const BROWSER_EXTENSION_LOCK_FILE = path.join(SIDOFUN_APP_DIR, 'browser-extension.lock');
const PROVIDER_ID = 'sidofun-browser-extension' as const;
const PROVIDER_VERSION = '0.2.0';
const PROTOCOL_VERSION = 'sidofun.browser-extension.v1';
const SUPPORTED_SITES = ['x.com', 'chatgpt.com', 'deepseek.com'];
const ACTIVE_PROVIDER_TTL_MS = 30_000;
const SESSION_HEARTBEAT_TTL_MS = 45_000;
const COMMAND_RECOVERY_STALE_MS = 5_000;
const EXTERNAL_CLOSE_DISCONNECTED_REASONS = new Set(['missing_from_heartbeat', 'reported_disconnected']);
const PROVIDER_POLL_WAIT_SLICE_MS = 200;
const DEFAULT_COMMAND_TIMEOUT_MS = 15_000;
const DEFAULT_HUMAN_COMMAND_TIMEOUT_MS = 45_000;
const DEFAULT_AUTH_WORKFLOW_TIMEOUT_MS = 90_000;
const COMMAND_POLL_INTERVAL_MS = 150;
const MAX_SESSION_EVENTS = 200;
const PERSISTED_LOCK_TIMEOUT_MS = 5_000;
const PERSISTED_LOCK_RETRY_MS = 25;
const DEFAULT_HUMAN_DELAY_MS = 60;
const DEFAULT_HUMAN_JITTER_MS = 20;
const DEFAULT_QUIET_WINDOW_MS = 1500;
type AiResponseVersionState = {
  threadCount: number;
  latestAssistant: string;
  latestUser: string;
  previousAvailable: boolean;
  nextAvailable: boolean;
  previousLabel?: string;
  nextLabel?: string;
  messages: BrowserExtensionConversationMessage[];
};

function flattenDomTree(nodes: BrowserExtensionDomTreeNode | BrowserExtensionDomTreeNode[] | undefined): BrowserExtensionDomTreeNode[] {
  const queue = Array.isArray(nodes) ? [...nodes] : nodes ? [nodes] : [];
  const flat: BrowserExtensionDomTreeNode[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    flat.push(current);
    if (Array.isArray(current.children) && current.children.length > 0) {
      queue.push(...current.children);
    }
  }
  return flat;
}

function filterDomEvents(
  events: BrowserExtensionDomEvent[],
  options?: {
    mutationType?: 'childList' | 'attributes' | 'characterData';
    textIncludes?: string;
    limit?: number;
  }
) {
  let filtered = [...events];
  if (options?.mutationType) {
    filtered = filtered.filter((event) => event.types.includes(options.mutationType!));
  }
  if (options?.textIncludes) {
    filtered = filtered.filter((event) => (event.textSample ?? '').includes(options.textIncludes!));
  }
  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(-options.limit);
  }
  return filtered;
}
const CAPABILITIES = [
  'provider.status',
  'provider.register',
  'provider.heartbeat',
  'provider.state_upsert',
  'provider.events_upsert',
  'provider.poll',
  'provider.wait_connected',
  'workspace.list',
  'workspace.get',
  'workspace.set',
  'workspace.clear',
  'session.create',
  'session.list',
  'session.info',
  'session.refresh',
  'session.reconnect',
  'session.close',
  'session.wait_ready',
  'tab.list',
  'tab.frames',
  'tab.focus',
  'navigate',
  'navigate.back',
  'navigate.forward',
  'navigate.reload',
  'page.metadata',
  'page.storage_list',
  'page.storage_get',
  'page.storage_set',
  'page.storage_remove',
  'snapshot',
  'page.scroll',
  'page.dom_tree',
  'page.locate',
  'page.locate_all',
  'screenshot',
  'inspect',
  'inspect_all',
  'links',
  'click.human',
  'page.focus',
  'page.blur',
  'page.actionables',
  'page.page_state',
  'page.markdown',
  'page.readability',
  'page.banners',
  'page.banner_dismiss',
  'page.loading_states',
  'page.empty_states',
  'page.dialogs',
  'page.dialog_actions',
  'page.dialog_close',
  'page.dialog_action',
  'page.menus',
  'page.menu_select',
  'page.disclosures',
  'page.disclosure_toggle',
  'page.downloads',
  'page.download_cancel',
  'page.download_erase',
  'page.collections',
  'page.collection_controls',
  'page.collection_active_filters',
  'page.collection_filter_tokens',
  'page.collection_rows',
  'page.collection_row_actions',
  'page.collection_selection_state',
  'page.collection_click',
  'page.collection_row_click',
  'page.collection_row_select',
  'page.collection_select_all',
  'page.collection_row_details',
  'page.collection_row_expand',
  'page.collection_sort',
  'page.collection_filter',
  'page.collection_filter_clear',
  'page.collection_filter_token_clear',
  'page.paginations',
  'page.pagination_click',
  'page.load_more',
  'form.contexts',
  'eval',
  'click',
  'type',
  'press',
  'editor.fill',
  'editor.read',
  'form.fill',
  'form.fill_human',
  'form.clear',
  'form.fill_many',
  'form.fields',
  'form.find_field',
  'form.radio_groups',
  'form.radio_select',
  'form.segmented_options',
  'form.segmented_select',
  'form.tablist_options',
  'form.tablist_select',
  'form.stepper',
  'form.stepper_move',
  'form.date_set',
  'form.time_set',
  'form.datetime_set',
  'form.toggle',
  'form.range_set',
  'form.options',
  'form.fill_label',
  'form.select',
  'form.commit',
  'form.upload',
  'form.combobox_options',
  'form.combobox_select',
  'form.submit',
  'form.submit_wait',
  'auth.login',
  'auth.signup',
  'cookies',
  'cookies.get',
  'cookies.set',
  'cookies.remove',
  'dom.observe',
  'dom.events',
  'dom.clear',
  'wait.dom_quiet',
  'wait.network_idle',
  'wait.page_stable',
  'network.observe',
  'session.events',
  'wait.url',
  'wait.selector',
  'wait.no_selector',
  'wait.text',
  'chatgpt.list_conversations',
  'chatgpt.open_conversation',
  'chatgpt.new_chat',
  'chatgpt.sidebar_state',
  'chatgpt.toggle_sidebar',
  'chatgpt.models',
  'chatgpt.select_model',
  'chatgpt.read_latest',
  'chatgpt.info',
  'chatgpt.conversation_actions',
  'chatgpt.conversation_action',
  'chatgpt.rename_conversation',
  'chatgpt.read_thread',
  'chatgpt.current_conversation',
  'chatgpt.export_thread',
  'chatgpt.stop',
  'chatgpt.continue',
  'chatgpt.response_controls',
  'chatgpt.previous_response',
  'chatgpt.next_response',
  'chatgpt.list_response_versions',
  'chatgpt.select_response_version',
  'chatgpt.regenerate',
  'chatgpt.edit_message',
  'chatgpt.send',
  'chatgpt.ask',
  'chatgpt.ask_thread',
  'chatgpt.wait_idle',
  'chatgpt.wait_response',
  'chatgpt.wait_message',
  'deepseek.list_conversations',
  'deepseek.open_conversation',
  'deepseek.new_chat',
  'deepseek.sidebar_state',
  'deepseek.toggle_sidebar',
  'deepseek.models',
  'deepseek.select_model',
  'deepseek.read_latest',
  'deepseek.info',
  'deepseek.conversation_actions',
  'deepseek.conversation_action',
  'deepseek.rename_conversation',
  'deepseek.read_thread',
  'deepseek.current_conversation',
  'deepseek.export_thread',
  'deepseek.stop',
  'deepseek.continue',
  'deepseek.response_controls',
  'deepseek.previous_response',
  'deepseek.next_response',
  'deepseek.list_response_versions',
  'deepseek.select_response_version',
  'deepseek.regenerate',
  'deepseek.edit_message',
  'deepseek.send',
  'deepseek.ask',
  'deepseek.ask_thread',
  'deepseek.wait_idle',
  'deepseek.wait_response',
  'deepseek.wait_message',
  'x.search',
  'x.timeline',
  'x.bookmarks',
  'x.notifications',
  'x.messages',
  'x.open_message_thread',
  'x.send_message',
  'x.read_thread',
  'x.post',
  'x.open_post',
  'x.profile',
  'x.follow',
  'x.reply',
  'x.like',
  'x.repost'
] as const;

interface PersistedRoot {
  SIDOFUN_BROWSER_EXTENSION_ID?: string;
  providers?: {
    browserExtension?: {
      extensionId?: string;
      serverBaseUrl?: string;
      workspaces?: Record<string, BrowserExtensionWorkspace>;
      sessions?: Record<string, BrowserExtensionSession>;
      queue?: Record<string, BrowserExtensionQueuedCommand>;
      activeProvider?: {
        extensionId: string;
        protocolVersion: string;
        buildId?: string;
        connected: boolean;
        registeredAt: string;
        lastSeenAt: string;
        browserName?: string;
        browserVersion?: string;
        userAgent?: string;
      };
    };
  };
  [key: string]: unknown;
}

function nowIso() {
  return new Date().toISOString();
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveHumanDelay(delayMs = DEFAULT_HUMAN_DELAY_MS, jitterMs = DEFAULT_HUMAN_JITTER_MS) {
  const base = Math.max(0, delayMs);
  const jitter = Math.max(0, jitterMs);
  if (jitter <= 0) {
    return base;
  }
  const offset = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
  return Math.max(0, base + offset);
}

function queryMatchesField(
  field: BrowserExtensionFormFieldSummary,
  query: string,
  exact = false
) {
  const normalized = query.trim().toLowerCase();
  const predicate = (value?: string) => {
    if (!value) {
      return false;
    }
    const candidate = value.trim().toLowerCase();
    return exact ? candidate === normalized : candidate.includes(normalized);
  };
  if (field.labels?.some(predicate)) return 'label';
  if (predicate(field.name)) return 'name';
  if (predicate(field.placeholder)) return 'placeholder';
  if (predicate(field.text)) return 'text';
  if (predicate(field.selector)) return 'selector';
  return undefined;
}

function trimSessionEvents(events: BrowserExtensionSessionEvent[]) {
  return events.length > MAX_SESSION_EVENTS
    ? events.slice(events.length - MAX_SESSION_EVENTS)
    : events;
}

function trimNetworkEvents(events: BrowserExtensionNetworkEvent[]) {
  return events.length > 200
    ? events.slice(events.length - 200)
    : events;
}

function trimDomEvents(events: BrowserExtensionDomEvent[]) {
  return events.length > 200
    ? events.slice(events.length - 200)
    : events;
}

function mergeById<T extends { id: string }>(existing: T[] | undefined, incoming: T[] | undefined) {
  const map = new Map<string, T>();
  for (const item of existing ?? []) {
    map.set(item.id, item);
  }
  for (const item of incoming ?? []) {
    map.set(item.id, item);
  }
  return [...map.values()];
}

function coalesceNonEmptyString(...values: Array<string | undefined>) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
}

function normalizeFrameContextKey(frameSelectors?: string[]) {
  return frameSelectors?.length ? frameSelectors.join(' > ') : '__root__';
}

type ProviderStreamEventMap = {
  session_state: {
    sessionId: string;
    session: BrowserExtensionSession;
  };
  session_events: {
    sessionId: string;
    events: BrowserExtensionSessionEvent[];
  };
  network_events: {
    sessionId: string;
    events: BrowserExtensionNetworkEvent[];
  };
  dom_events: {
    sessionId: string;
    events: BrowserExtensionDomEvent[];
  };
};

function isActiveProvider(lastSeenAt?: string) {
  if (!lastSeenAt) {
    return false;
  }
  const lastSeenMs = new Date(lastSeenAt).getTime();
  return Number.isFinite(lastSeenMs) && Date.now() - lastSeenMs <= ACTIVE_PROVIDER_TTL_MS;
}

export class BrowserExtensionService {
  private static providerStreamListeners: {
    [K in keyof ProviderStreamEventMap]: Map<string, Set<(payload: ProviderStreamEventMap[K]) => void>>;
  } = {
    session_state: new Map(),
    session_events: new Map(),
    network_events: new Map(),
    dom_events: new Map()
  };

  static subscribeToProviderStream<K extends keyof ProviderStreamEventMap>(
    stream: K,
    sessionId: string,
    listener: (payload: ProviderStreamEventMap[K]) => void
  ) {
    const listenersBySession = this.providerStreamListeners[stream] as Map<string, Set<(payload: ProviderStreamEventMap[K]) => void>>;
    const listeners = listenersBySession.get(sessionId) ?? new Set<(payload: ProviderStreamEventMap[K]) => void>();
    listeners.add(listener);
    listenersBySession.set(sessionId, listeners);
    return () => {
      const existing = listenersBySession.get(sessionId);
      if (!existing) {
        return;
      }
      existing.delete(listener);
      if (existing.size === 0) {
        listenersBySession.delete(sessionId);
      }
    };
  }

  private static emitProviderStream<K extends keyof ProviderStreamEventMap>(
    stream: K,
    payload: ProviderStreamEventMap[K]
  ) {
    const listeners = this.providerStreamListeners[stream].get(payload.sessionId) as Set<(payload: ProviderStreamEventMap[K]) => void> | undefined;
    for (const listener of listeners ?? []) {
      listener(payload);
    }
  }

  getStatus(): BrowserExtensionStatus {
    this.pruneExternallyClosedSessions();
    const persisted = this.readPersisted();
    const provider = persisted.providers?.browserExtension;
    const sessions = Object.values(provider?.sessions ?? {});
    const workspaces = Object.values(provider?.workspaces ?? {});
    const queue = Object.values(provider?.queue ?? {});
    const activeProvider = provider?.activeProvider;
    const configuredExtensionId = this.resolveExtensionId(provider);
    const activeProviderMatchesConfigured = !configuredExtensionId || !activeProvider?.extensionId || activeProvider.extensionId === configuredExtensionId;
    const providerConnected = Boolean(activeProvider && isActiveProvider(activeProvider.lastSeenAt) && activeProviderMatchesConfigured);
    const notes: string[] = [];
    if (!fs.existsSync(MANIFEST_PATH)) {
      notes.push('Sidofun browser extension manifest is missing');
    }
    if (!configuredExtensionId) {
      notes.push('No SIDOFUN_BROWSER_EXTENSION_ID is configured yet');
    }
    if (!fs.existsSync(DIST_BACKGROUND_PATH) || !fs.existsSync(DIST_CONTENT_SCRIPT_PATH)) {
      notes.push('Browser extension dist artifacts are not built yet');
    }
    if (activeProvider?.extensionId && configuredExtensionId && activeProvider.extensionId !== configuredExtensionId) {
      notes.push(`Active provider ${activeProvider.extensionId} does not match configured extension id ${configuredExtensionId}`);
    }
    if (providerConnected && activeProvider?.buildId && activeProvider.buildId !== SIDOFUN_BROWSER_EXTENSION_BUILD_ID) {
      notes.push(
        `Active provider build ${activeProvider.buildId} does not match expected build ${SIDOFUN_BROWSER_EXTENSION_BUILD_ID}. Reload the unpacked extension after rebuilding dist.`
      );
    }
    if (providerConnected && activeProvider && !activeProvider.buildId) {
      notes.push('Active provider did not report a browser-extension build id. Reload the unpacked extension so Sidofun can verify the live bundle.');
    }
    if (!providerConnected) {
      notes.push('No live browser-extension provider is connected to the Sidofun server');
    }
    if (sessions.some((session) => session.stale)) {
      notes.push(`${sessions.filter((session) => session.stale).length} browser-extension session(s) are stale and may need reconnect`);
    }
    return {
      available: fs.existsSync(MANIFEST_PATH) && fs.existsSync(BACKGROUND_PATH) && fs.existsSync(CONTENT_SCRIPT_PATH),
      providerId: PROVIDER_ID,
      providerVersion: PROVIDER_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      expectedBuildId: SIDOFUN_BROWSER_EXTENSION_BUILD_ID,
      activeProviderBuildId: providerConnected ? activeProvider?.buildId : undefined,
      rootPath: EXTENSION_ROOT,
      manifestPath: MANIFEST_PATH,
      backgroundPath: BACKGROUND_PATH,
      contentScriptPath: CONTENT_SCRIPT_PATH,
      optionsPagePath: OPTIONS_PAGE_PATH,
      extensionIdConfigured: Boolean(configuredExtensionId),
      configuredExtensionId,
      providerConnected,
      activeProviderExtensionId: providerConnected ? activeProvider?.extensionId : undefined,
      providerLastSeenAt: providerConnected ? activeProvider?.lastSeenAt : undefined,
      connectedSessionCount: sessions.filter((session) => session.connected).length,
      staleSessionCount: sessions.filter((session) => session.stale).length,
      totalSessionCount: sessions.length,
      workspaceCount: workspaces.length,
      queuedCommandCount: queue.filter((entry) => entry.status === 'pending' || entry.status === 'in_progress').length,
      supportedSites: [...SUPPORTED_SITES],
      capabilities: [...CAPABILITIES],
      notes
    };
  }

  getCapabilities(): BrowserExtensionCapabilities {
    return {
      providerId: PROVIDER_ID,
      protocolVersion: PROTOCOL_VERSION,
      host: 'chrome',
      primitives: [...CAPABILITIES],
      siteModules: [
        {
          site: 'x.com',
          status: 'active',
          commands: ['session.create', 'tab.list', 'navigate', 'snapshot', 'screenshot', 'inspect', 'inspect_all', 'links', 'form.fill', 'form.fill_many', 'form.fields', 'form.find_field', 'form.options', 'form.fill_label', 'form.select', 'form.submit', 'form.submit_wait', 'x.search', 'x.timeline', 'x.bookmarks', 'x.notifications', 'x.messages', 'x.open_message_thread', 'x.send_message', 'x.read_thread', 'x.post', 'x.open_post', 'x.profile', 'x.follow', 'x.reply', 'x.like', 'x.repost']
        },
        {
          site: 'chatgpt.com',
          status: 'active',
          commands: ['session.create', 'session.wait_ready', 'tab.list', 'navigate', 'snapshot', 'screenshot', 'inspect', 'inspect_all', 'links', 'form.fill', 'form.fill_many', 'form.fields', 'form.find_field', 'form.options', 'form.fill_label', 'form.select', 'form.submit', 'form.submit_wait', 'chatgpt.list_conversations', 'chatgpt.open_conversation', 'chatgpt.new_chat', 'chatgpt.sidebar_state', 'chatgpt.toggle_sidebar', 'chatgpt.models', 'chatgpt.select_model', 'chatgpt.conversation_actions', 'chatgpt.conversation_action', 'chatgpt.rename_conversation', 'chatgpt.read_thread', 'chatgpt.current_conversation', 'chatgpt.export_thread', 'chatgpt.read_latest', 'chatgpt.info', 'chatgpt.stop', 'chatgpt.continue', 'chatgpt.response_controls', 'chatgpt.previous_response', 'chatgpt.next_response', 'chatgpt.list_response_versions', 'chatgpt.select_response_version', 'chatgpt.regenerate', 'chatgpt.edit_message', 'chatgpt.send', 'chatgpt.ask', 'chatgpt.ask_thread', 'chatgpt.wait_idle', 'chatgpt.wait_response', 'chatgpt.wait_message']
        },
        {
          site: 'deepseek.com',
          status: 'active',
          commands: ['session.create', 'session.wait_ready', 'tab.list', 'navigate', 'snapshot', 'screenshot', 'inspect', 'inspect_all', 'links', 'form.fill', 'form.fill_many', 'form.fields', 'form.find_field', 'form.options', 'form.fill_label', 'form.select', 'form.submit', 'form.submit_wait', 'deepseek.list_conversations', 'deepseek.open_conversation', 'deepseek.new_chat', 'deepseek.sidebar_state', 'deepseek.toggle_sidebar', 'deepseek.models', 'deepseek.select_model', 'deepseek.conversation_actions', 'deepseek.conversation_action', 'deepseek.rename_conversation', 'deepseek.read_thread', 'deepseek.current_conversation', 'deepseek.export_thread', 'deepseek.read_latest', 'deepseek.info', 'deepseek.stop', 'deepseek.continue', 'deepseek.response_controls', 'deepseek.previous_response', 'deepseek.next_response', 'deepseek.list_response_versions', 'deepseek.select_response_version', 'deepseek.regenerate', 'deepseek.edit_message', 'deepseek.send', 'deepseek.ask', 'deepseek.ask_thread', 'deepseek.wait_idle', 'deepseek.wait_response', 'deepseek.wait_message']
        }
      ]
    };
  }

  listSites() {
    return this.getCapabilities().siteModules;
  }

  listWorkspaces(): BrowserExtensionWorkspace[] {
    const provider = this.readPersisted().providers?.browserExtension;
    return Object.values(provider?.workspaces ?? {}).sort((left, right) => left.name.localeCompare(right.name));
  }

  getWorkspace(name: string): BrowserExtensionWorkspace | undefined {
    return this.readPersisted().providers?.browserExtension?.workspaces?.[name];
  }

  setWorkspace(name: string, workspacePath: string, sites?: string[]): BrowserExtensionWorkspace {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const now = nowIso();
      const existing = provider.workspaces?.[name];
      const workspace: BrowserExtensionWorkspace = {
        name,
        path: path.resolve(workspacePath),
        sites: sites?.length ? [...sites] : existing?.sites,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      };
      provider.workspaces ??= {};
      provider.workspaces[name] = workspace;
      return workspace;
    });
  }

  clearWorkspace(name: string) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const removed = Boolean(provider.workspaces?.[name]);
      if (provider.workspaces?.[name]) {
        delete provider.workspaces[name];
      }
      return { name, removed };
    });
  }

  createSession(options?: {
    workspace?: string;
    site?: string;
    targetUrl?: string;
    name?: string;
    privateMode?: boolean;
  }): BrowserExtensionSession {
    const sessionId = this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.sessions ??= {};
      const now = nowIso();
      const id = `browserext_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const session: BrowserExtensionSession = {
        id,
        provider: 'chrome-extension',
        workspace: options?.workspace,
        site: options?.site,
        targetUrl: options?.targetUrl,
        name: options?.name,
        privateMode: options?.privateMode === true,
        connected: false,
        tabs: [],
        networkEvents: [],
        domEvents: [],
        events: [{
          id: `browserextevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          kind: 'session_created',
          ok: true,
          summary: options?.site ? `Created browser-extension session for ${options.site}` : 'Created browser-extension session',
          url: options?.targetUrl,
          timestamp: now
        }],
        createdAt: now,
        updatedAt: now
      };
      provider.sessions[id] = session;
      this.enqueueCommandInProvider(provider, id, 'open_session', {
        workspace: options?.workspace,
        site: options?.site,
        targetUrl: options?.targetUrl,
        name: options?.name,
        privateMode: options?.privateMode === true
      });
      return id;
    });
    return this.getSession(sessionId)!;
  }

  listSessions(): BrowserExtensionSession[] {
    this.pruneExternallyClosedSessions();
    const provider = this.readPersisted().providers?.browserExtension;
    return Object.values(provider?.sessions ?? {}).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getSession(sessionId: string): BrowserExtensionSession | undefined {
    return this.readPersisted().providers?.browserExtension?.sessions?.[sessionId];
  }

  closeSession(sessionId: string) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const existing = provider.sessions?.[sessionId];
      if (!existing) {
        return { sessionId, removed: false };
      }
      delete provider.sessions?.[sessionId];
      if (provider.queue) {
        for (const [commandId, command] of Object.entries(provider.queue)) {
          if (command.sessionId === sessionId) {
            delete provider.queue[commandId];
          }
        }
      }
      return { sessionId, removed: true };
    });
  }

  nukeSessions(options?: {
    site?: string;
    staleOnly?: boolean;
    connectedOnly?: boolean;
    disconnectedOnly?: boolean;
    queue?: 'keep' | 'matching' | 'all';
  }) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.sessions ??= {};
      provider.queue ??= {};
      const sessions = Object.values(provider.sessions);
      const matches = sessions.filter((session) => {
        if (options?.site && session.site !== options.site) {
          return false;
        }
        if (options?.staleOnly && !session.stale) {
          return false;
        }
        if (options?.connectedOnly && !session.connected) {
          return false;
        }
        if (options?.disconnectedOnly && session.connected) {
          return false;
        }
        return true;
      });
      const removedSessionIds = matches.map((session) => session.id);
      for (const sessionId of removedSessionIds) {
        delete provider.sessions[sessionId];
      }
      let removedQueueCount = 0;
      const queueMode = options?.queue ?? 'matching';
      if (queueMode === 'all') {
        removedQueueCount = Object.keys(provider.queue).length;
        provider.queue = {};
      } else if (queueMode === 'matching') {
        const removedSet = new Set(removedSessionIds);
        for (const [commandId, command] of Object.entries(provider.queue)) {
          if (!removedSet.has(command.sessionId)) {
            continue;
          }
          delete provider.queue[commandId];
          removedQueueCount += 1;
        }
      }
      return {
        removedSessionCount: removedSessionIds.length,
        removedSessionIds,
        removedQueueCount,
        filters: {
          site: options?.site,
          staleOnly: options?.staleOnly ?? false,
          connectedOnly: options?.connectedOnly ?? false,
          disconnectedOnly: options?.disconnectedOnly ?? false,
          queue: queueMode
        }
      };
    });
  }

  clearQueuedCommands(options?: {
    sessionId?: string;
    site?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  }) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.sessions ??= {};
      provider.queue ??= {};
      const removedCommandIds: string[] = [];
      for (const [commandId, command] of Object.entries(provider.queue)) {
        if (options?.sessionId && command.sessionId !== options.sessionId) {
          continue;
        }
        if (options?.status && command.status !== options.status) {
          continue;
        }
        if (options?.site) {
          const session = provider.sessions[command.sessionId];
          if (session?.site !== options.site) {
            continue;
          }
        }
        delete provider.queue[commandId];
        removedCommandIds.push(commandId);
      }
      return {
        removedCommandCount: removedCommandIds.length,
        removedCommandIds,
        filters: {
          sessionId: options?.sessionId,
          site: options?.site,
          status: options?.status
        }
      };
    });
  }

  setConfiguredExtensionId(extensionId: string) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.extensionId = extensionId;
      return {
        providerId: PROVIDER_ID,
        extensionId,
        configPath: SIDOFUN_CONFIG_FILE
      };
    });
  }

  registerProvider(payload: BrowserExtensionProviderRegistration) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const mismatch = this.getConfiguredExtensionMismatch(provider.extensionId, payload.extensionId);
      if (mismatch) {
        return mismatch;
      }
      const now = nowIso();
      const recoveredCommandCount = this.recoverStaleCommands(provider, payload.extensionId, now);
      provider.activeProvider = {
        extensionId: payload.extensionId,
        protocolVersion: payload.protocolVersion,
        buildId: payload.buildId,
        connected: true,
        registeredAt: provider.activeProvider?.registeredAt ?? now,
        lastSeenAt: now,
        browserName: payload.browserName,
        browserVersion: payload.browserVersion,
        userAgent: payload.userAgent
      };
      return {
        ok: true,
        providerId: PROVIDER_ID,
        protocolVersion: PROTOCOL_VERSION,
        serverBaseUrl: this.getServerBaseUrl(),
        pollIntervalMs: 1000,
        recoveredCommandCount
      };
    });
  }

  heartbeat(payload: BrowserExtensionProviderHeartbeat) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const mismatch = this.getConfiguredExtensionMismatch(provider.extensionId, payload.extensionId);
      if (mismatch) {
        return mismatch;
      }
      const now = nowIso();
      this.recoverStaleCommands(provider, payload.extensionId, now);
      provider.activeProvider = {
        extensionId: payload.extensionId,
        protocolVersion: payload.protocolVersion,
        buildId: payload.buildId ?? provider.activeProvider?.buildId,
        connected: true,
        registeredAt: provider.activeProvider?.registeredAt ?? now,
        lastSeenAt: now,
        browserName: provider.activeProvider?.browserName,
        browserVersion: provider.activeProvider?.browserVersion,
        userAgent: provider.activeProvider?.userAgent
      };
      provider.sessions ??= {};
      const seenSessionIds = new Set((payload.sessions ?? []).map((entry) => entry.sessionId));
      for (const existing of Object.values(provider.sessions)) {
        if (existing.extensionId === payload.extensionId && existing.connected && !seenSessionIds.has(existing.id)) {
          provider.sessions[existing.id] = {
            ...existing,
            connected: false,
            stale: true,
            ready: false,
            disconnectedReason: 'missing_from_heartbeat',
            updatedAt: now
          };
        }
      }
      for (const sessionUpdate of payload.sessions ?? []) {
        const existing = provider.sessions[sessionUpdate.sessionId];
        if (!existing) {
          continue;
        }
        const targetUrl = coalesceNonEmptyString(
          sessionUpdate.targetUrl,
          sessionUpdate.tabs?.find((tab) => tab.active)?.url,
          existing.targetUrl
        );
        const ready = sessionUpdate.connected && typeof sessionUpdate.activeTabId === 'number';
        provider.sessions[sessionUpdate.sessionId] = {
          ...existing,
          connected: sessionUpdate.connected,
          stale: false,
          ready,
          disconnectedReason: sessionUpdate.connected ? undefined : 'reported_disconnected',
          extensionId: payload.extensionId,
          windowId: sessionUpdate.windowId ?? existing.windowId,
          activeTabId: sessionUpdate.activeTabId ?? existing.activeTabId,
          tabs: sessionUpdate.tabs ?? existing.tabs,
          site: sessionUpdate.site ?? existing.site,
          targetUrl,
          privateMode: sessionUpdate.privateMode ?? existing.privateMode,
          lastSnapshot: sessionUpdate.snapshot ?? existing.lastSnapshot,
          lastScreenshot: sessionUpdate.screenshot ?? existing.lastScreenshot,
          networkEvents: existing.networkEvents ?? [],
          domEvents: existing.domEvents ?? [],
          events: trimSessionEvents([
            ...(existing.events ?? []),
            {
              id: `browserextevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              kind: 'session_heartbeat',
              ok: true,
              summary: `Heartbeat from ${payload.extensionId}`,
              url: targetUrl,
              timestamp: now
            }
          ]),
          lastHeartbeatAt: now,
          lastReadyAt: ready ? now : existing.lastReadyAt,
          updatedAt: now
        };
      }
      return {
        ok: true,
        queuedCommandCount: Object.values(provider.queue ?? {}).filter((command) => command.status === 'pending').length,
        serverTime: now
      };
    });
  }

  upsertProviderSessionState(payload: BrowserExtensionProviderSessionStateUpsert) {
    let streamSession: BrowserExtensionSession | undefined;
    let sessionStateEvent: BrowserExtensionSessionEvent | undefined;
    const result = this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const mismatch = this.getConfiguredExtensionMismatch(provider.extensionId, payload.extensionId);
      if (mismatch) {
        return mismatch;
      }
      const now = nowIso();
      provider.activeProvider = {
        extensionId: payload.extensionId,
        protocolVersion: payload.protocolVersion,
        buildId: payload.buildId ?? provider.activeProvider?.buildId,
        connected: true,
        registeredAt: provider.activeProvider?.registeredAt ?? now,
        lastSeenAt: now,
        browserName: provider.activeProvider?.browserName,
        browserVersion: provider.activeProvider?.browserVersion,
        userAgent: provider.activeProvider?.userAgent
      };
      provider.sessions ??= {};
      const existing = provider.sessions[payload.session.sessionId];
      if (!existing) {
        return {
          ok: false,
          ignored: true,
          reason: `Unknown browser-extension session: ${payload.session.sessionId}`
        };
      }
      const targetUrl = coalesceNonEmptyString(
        payload.session.targetUrl,
        payload.session.tabs?.find((tab) => tab.active)?.url,
        existing.targetUrl
      );
      const ready = payload.session.connected && typeof payload.session.activeTabId === 'number';
      sessionStateEvent = {
        id: `browserextevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        kind: 'session_state',
        ok: true,
        summary: `Pushed state update from ${payload.extensionId}`,
        url: targetUrl,
        timestamp: now
      };
      provider.sessions[payload.session.sessionId] = {
        ...existing,
        connected: payload.session.connected,
        stale: false,
        ready,
        disconnectedReason: payload.session.connected ? undefined : 'reported_disconnected',
        extensionId: payload.extensionId,
        windowId: payload.session.windowId ?? existing.windowId,
        activeTabId: payload.session.activeTabId ?? existing.activeTabId,
        tabs: payload.session.tabs ?? existing.tabs,
        site: payload.session.site ?? existing.site,
        targetUrl,
        privateMode: payload.session.privateMode ?? existing.privateMode,
        lastSnapshot: payload.session.snapshot ?? existing.lastSnapshot,
        lastScreenshot: payload.session.screenshot ?? existing.lastScreenshot,
        events: trimSessionEvents([
          ...(existing.events ?? []),
          sessionStateEvent
        ]),
        lastHeartbeatAt: now,
        lastReadyAt: ready ? now : existing.lastReadyAt,
        updatedAt: now
      };
      streamSession = provider.sessions[payload.session.sessionId]!;
      return {
        ok: true,
        sessionId: payload.session.sessionId,
        ready,
        updatedAt: now
      };
    });
    if (streamSession && sessionStateEvent) {
      BrowserExtensionService.emitProviderStream('session_state', {
        sessionId: payload.session.sessionId,
        session: streamSession
      });
      BrowserExtensionService.emitProviderStream('session_events', {
        sessionId: payload.session.sessionId,
        events: [sessionStateEvent]
      });
    }
    return result;
  }

  upsertProviderEvents(payload: BrowserExtensionProviderEventsUpsert) {
    let mergedNetworkEvents: BrowserExtensionNetworkEvent[] = [];
    let mergedDomEvents: BrowserExtensionDomEvent[] = [];
    let mergedSessionEvents: BrowserExtensionSessionEvent[] = [];
    const result = this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const mismatch = this.getConfiguredExtensionMismatch(provider.extensionId, payload.extensionId);
      if (mismatch) {
        return mismatch;
      }
      const now = nowIso();
      provider.activeProvider = {
        extensionId: payload.extensionId,
        protocolVersion: payload.protocolVersion,
        buildId: payload.buildId ?? provider.activeProvider?.buildId,
        connected: true,
        registeredAt: provider.activeProvider?.registeredAt ?? now,
        lastSeenAt: now,
        browserName: provider.activeProvider?.browserName,
        browserVersion: provider.activeProvider?.browserVersion,
        userAgent: provider.activeProvider?.userAgent
      };
      provider.sessions ??= {};
      const existing = provider.sessions[payload.sessionId];
      if (!existing) {
        return {
          ok: false,
          ignored: true,
          reason: `Unknown browser-extension session: ${payload.sessionId}`
        };
      }
      mergedNetworkEvents = trimNetworkEvents(mergeById(existing.networkEvents, payload.networkEvents));
      mergedDomEvents = trimDomEvents(mergeById(existing.domEvents, payload.domEvents));
      mergedSessionEvents = trimSessionEvents(mergeById(existing.events, payload.events));
      provider.sessions[payload.sessionId] = {
        ...existing,
        extensionId: payload.extensionId,
        networkEvents: mergedNetworkEvents,
        domEvents: mergedDomEvents,
        events: mergedSessionEvents,
        updatedAt: now
      };
      return {
        ok: true,
        sessionId: payload.sessionId,
        networkEventCount: mergedNetworkEvents.length,
        domEventCount: mergedDomEvents.length,
        sessionEventCount: mergedSessionEvents.length,
        updatedAt: now
      };
    });
    if ((payload.networkEvents?.length ?? 0) > 0) {
      BrowserExtensionService.emitProviderStream('network_events', {
        sessionId: payload.sessionId,
        events: payload.networkEvents ?? []
      });
    }
    if ((payload.domEvents?.length ?? 0) > 0) {
      BrowserExtensionService.emitProviderStream('dom_events', {
        sessionId: payload.sessionId,
        events: payload.domEvents ?? []
      });
    }
    if ((payload.events?.length ?? 0) > 0) {
      BrowserExtensionService.emitProviderStream('session_events', {
        sessionId: payload.sessionId,
        events: payload.events ?? []
      });
    }
    return result;
  }

  pollCommands(extensionId: string, limit = 10) {
    const provider = this.readPersisted().providers?.browserExtension;
    if (provider?.extensionId && provider.extensionId !== extensionId) {
      return [];
    }
    return this.pollPendingCommands(extensionId, limit);
  }

  async waitForCommands(extensionId: string, options?: { limit?: number; waitMs?: number }) {
    const provider = this.readPersisted().providers?.browserExtension;
    if (provider?.extensionId && provider.extensionId !== extensionId) {
      return [];
    }
    const waitMs = Math.max(0, Math.min(30_000, options?.waitMs ?? 0));
    const limit = Math.max(1, options?.limit ?? 10);
    const immediate = this.pollPendingCommands(extensionId, limit);
    if (immediate.length > 0 || waitMs <= 0) {
      return immediate;
    }
    const deadline = Date.now() + waitMs;
    while (Date.now() < deadline) {
      await delay(Math.min(PROVIDER_POLL_WAIT_SLICE_MS, Math.max(1, deadline - Date.now())));
      const commands = this.pollPendingCommands(extensionId, limit);
      if (commands.length > 0) {
        return commands;
      }
    }
    return [];
  }

  private pollPendingCommands(extensionId: string, limit = 10) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.sessions ??= {};
      provider.queue ??= {};
      const now = nowIso();
      this.recoverStaleCommands(provider, extensionId, now);
      const commands = Object.values(provider.queue)
        .filter((command) => command.status === 'pending')
        .sort((left, right) => {
          const leftPriority = left.kind === 'open_session' ? 0 : 1;
          const rightPriority = right.kind === 'open_session' ? 0 : 1;
          if (leftPriority !== rightPriority) {
            return leftPriority - rightPriority;
          }
          return left.createdAt.localeCompare(right.createdAt);
        })
        .slice(0, Math.max(1, limit));
      for (const command of commands) {
        provider.queue[command.id] = {
          ...command,
          status: 'in_progress',
          dispatchedAt: now,
          updatedAt: now
        };
        const session = provider.sessions?.[command.sessionId];
        if (session) {
          provider.sessions[command.sessionId] = {
            ...session,
            extensionId,
            updatedAt: now
          };
        }
      }
      return commands.map((command) => ({
        ...command,
        status: 'in_progress' as const,
        dispatchedAt: now,
        updatedAt: now
      }));
    });
  }

  completeCommand(payload: BrowserExtensionCommandResult) {
    let streamSession: BrowserExtensionSession | undefined;
    let sessionEvent: BrowserExtensionSessionEvent | undefined;
    const result = this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const mismatch = this.getConfiguredExtensionMismatch(provider.extensionId, payload.extensionId);
      if (mismatch) {
        return mismatch;
      }
      provider.sessions ??= {};
      provider.queue ??= {};
      const existing = provider.queue[payload.commandId];
      if (!existing) {
        throw new Error(`Unknown browser-extension command: ${payload.commandId}`);
      }
      const now = nowIso();
      provider.queue[payload.commandId] = {
        ...existing,
        status: payload.ok ? 'completed' : 'failed',
        result: payload.result,
        error: payload.error,
        updatedAt: now
      };
      const session = provider.sessions?.[payload.sessionId];
      if (session) {
        const resultRecord = payload.result as
          | {
              tabs?: BrowserExtensionTab[];
              activeTabId?: number;
              windowId?: number;
              snapshot?: BrowserExtensionSnapshot;
              screenshot?: BrowserExtensionScreenshot;
              url?: string;
              networkEvents?: BrowserExtensionNetworkEvent[];
              domEvents?: BrowserExtensionDomEvent[];
            }
          | undefined;
        const connected = payload.ok && existing.kind === 'open_session'
          ? true
          : session.connected;
        const ready = connected && typeof (resultRecord?.activeTabId ?? session.activeTabId) === 'number';
        sessionEvent = this.buildSessionEvent(existing, payload, resultRecord, now);
        provider.sessions[payload.sessionId] = {
          ...session,
          connected,
          stale: connected ? false : session.stale,
          ready,
          disconnectedReason: connected ? undefined : session.disconnectedReason,
          extensionId: payload.extensionId,
          tabs: resultRecord?.tabs ?? session.tabs,
          activeTabId: resultRecord?.activeTabId ?? session.activeTabId,
          windowId: resultRecord?.windowId ?? session.windowId,
          targetUrl: typeof resultRecord?.url === 'string' ? resultRecord.url : session.targetUrl,
          lastSnapshot: resultRecord?.snapshot ?? session.lastSnapshot,
          lastScreenshot: resultRecord?.screenshot ?? session.lastScreenshot,
          networkEvents: Array.isArray(resultRecord?.networkEvents) ? resultRecord.networkEvents : session.networkEvents,
          domEvents: Array.isArray(resultRecord?.domEvents) ? resultRecord.domEvents : session.domEvents,
          events: trimSessionEvents([
            ...(session.events ?? []),
            sessionEvent
          ]),
          lastHeartbeatAt: connected ? now : session.lastHeartbeatAt,
          lastReadyAt: ready ? now : session.lastReadyAt,
          updatedAt: now
        };
        streamSession = provider.sessions[payload.sessionId]!;
      }
      return provider.queue[payload.commandId];
    });
    if (streamSession && sessionEvent) {
      BrowserExtensionService.emitProviderStream('session_state', {
        sessionId: payload.sessionId,
        session: streamSession
      });
      BrowserExtensionService.emitProviderStream('session_events', {
        sessionId: payload.sessionId,
        events: [sessionEvent]
      });
    }
    return result;
  }

  refreshSession(sessionId: string) {
    const session = this.requireSession(sessionId);
    const status = this.getStatus();
    const queued = Object.values(this.readPersisted().providers?.browserExtension?.queue ?? {})
      .filter((entry) => entry.sessionId === sessionId && (entry.status === 'pending' || entry.status === 'in_progress'));
    return {
      sessionId,
      providerConnected: status.providerConnected,
      queuedCommandCount: queued.length,
      session
    };
  }

  async reconnectSession(sessionId: string, options?: { timeoutMs?: number; intervalMs?: number }) {
    const session = this.requireSession(sessionId);
    const provider = await this.waitForProviderConnected(options);
    if (!provider.connected) {
      return {
        sessionId,
        reconnected: false,
        timedOut: true,
        provider
      };
    }
    this.enqueueCommand(sessionId, 'open_session', {
      workspace: session.workspace,
      site: session.site,
      targetUrl: session.targetUrl,
      name: session.name,
      reconnect: true
    });
    const ready = await this.waitForSessionReady(sessionId, options);
    return {
      sessionId,
      reconnected: ready.ready,
      timedOut: ready.timedOut,
      provider,
      session: ready.session
    };
  }

  async listTabs(sessionId: string) {
    const session = this.requireSession(sessionId);
    if (session.tabs?.length) {
      return {
        sessionId,
        tabs: session.tabs,
        activeTabId: session.activeTabId,
        networkEventCount: session.networkEvents?.length ?? 0
      };
    }
    const result = await this.dispatchAndWait(sessionId, 'list_tabs', {}, DEFAULT_COMMAND_TIMEOUT_MS) as
      | { tabs?: BrowserExtensionTab[]; activeTabId?: number }
      | undefined;
    return {
      sessionId,
      tabs: result?.tabs ?? [],
      activeTabId: result?.activeTabId,
      networkEventCount: this.getSession(sessionId)?.networkEvents?.length ?? 0
    };
  }

  async listFrames(sessionId: string, frameSelectors?: string[], timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'frames', { frameSelectors }, timeoutMs) as
      | { frames?: BrowserExtensionFrame[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      frames: result?.frames ?? []
    };
  }

  async navigate(sessionId: string, url: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'navigate', { url }, timeoutMs);
    return {
      sessionId,
      url,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async goBack(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'go_back', {}, timeoutMs);
    return {
      sessionId,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async goForward(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'go_forward', {}, timeoutMs);
    return {
      sessionId,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async reload(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'reload', {}, timeoutMs);
    return {
      sessionId,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async pageMetadata(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'metadata', {}, timeoutMs) as
      | BrowserExtensionPageMetadata
      | undefined;
    return {
      sessionId,
      ...(result ?? { metas: {} })
    };
  }

  async listStorage(
    sessionId: string,
    options?: {
      scope?: 'local' | 'session';
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'storage_list', {
      scope: options?.scope,
      limit: options?.limit
    }, timeoutMs) as
      | { count?: number; entries?: BrowserExtensionStorageEntry[] }
      | undefined;
    return {
      sessionId,
      scope: options?.scope ?? 'local',
      count: result?.count ?? result?.entries?.length ?? 0,
      entries: result?.entries ?? []
    };
  }

  async getStorageEntry(
    sessionId: string,
    key: string,
    options?: {
      scope?: 'local' | 'session';
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'storage_get', {
      scope: options?.scope,
      key
    }, timeoutMs) as
      | { found?: boolean; entry?: BrowserExtensionStorageEntry }
      | undefined;
    return {
      sessionId,
      scope: options?.scope ?? 'local',
      key,
      found: result?.found === true,
      entry: result?.entry
    };
  }

  async setStorageEntry(
    sessionId: string,
    key: string,
    value: string,
    options?: {
      scope?: 'local' | 'session';
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'storage_set', {
      scope: options?.scope,
      key,
      value
    }, timeoutMs) as
      | { updated?: boolean; entry?: BrowserExtensionStorageEntry }
      | undefined;
    return {
      sessionId,
      scope: options?.scope ?? 'local',
      key,
      value,
      updated: result?.updated === true,
      entry: result?.entry
    };
  }

  async removeStorageEntry(
    sessionId: string,
    key: string,
    options?: {
      scope?: 'local' | 'session';
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'storage_remove', {
      scope: options?.scope,
      key
    }, timeoutMs) as
      | { removed?: boolean; key?: string }
      | undefined;
    return {
      sessionId,
      scope: options?.scope ?? 'local',
      key: result?.key ?? key,
      removed: result?.removed === true
    };
  }

  async focusTab(sessionId: string, tabId: number, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'focus_tab', { tabId }, timeoutMs);
    return {
      sessionId,
      tabId,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async snapshot(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'snapshot', {}, timeoutMs);
    return {
      sessionId,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async pageDomTree(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'dom_tree', {
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      maxDepth: options?.maxDepth,
      maxChildren: options?.maxChildren
    }, timeoutMs) as
      | { tree?: BrowserExtensionDomTreeNode }
      | undefined;
    return {
      sessionId,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      maxDepth: options?.maxDepth,
      maxChildren: options?.maxChildren,
      tree: result?.tree
    };
  }

  private async resolveFrameContexts(
    sessionId: string,
    frameSelectors?: string[],
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    if (frameSelectors && frameSelectors.length > 0) {
      return [frameSelectors];
    }
    const listed = await this.listFrames(sessionId, undefined, timeoutMs).catch(() => ({ frames: [] as BrowserExtensionFrame[] }));
    const contexts = listed.frames
      .map((frame) => frame.path)
      .filter((path): path is string[] => Array.isArray(path) && path.length > 0)
      .sort((left, right) => left.length - right.length);
    const unique = new Map<string, string[] | undefined>();
    unique.set(normalizeFrameContextKey(undefined), undefined);
    for (const context of contexts) {
      unique.set(normalizeFrameContextKey(context), context);
    }
    return [...unique.values()];
  }

  private mergeFrameScopedItems<T extends { selector?: string; frameSelectors?: string[] }>(
    items: T[],
    limit?: number
  ) {
    const deduped = new Map<string, T>();
    for (const item of items) {
      const key = `${normalizeFrameContextKey(item.frameSelectors)}::${item.selector ?? JSON.stringify(item)}`;
      if (!deduped.has(key)) {
        deduped.set(key, item);
      }
    }
    const values = [...deduped.values()];
    return typeof limit === 'number' && limit > 0 ? values.slice(0, limit) : values;
  }

  async locateInPage(
    sessionId: string,
    query: string,
    options?: {
      by?: 'text' | 'selector' | 'role' | 'id' | 'name' | 'placeholder' | 'tag';
      selector?: string;
      frameSelectors?: string[];
      maxDepth?: number;
      maxChildren?: number;
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const contexts = await this.resolveFrameContexts(sessionId, options?.frameSelectors, options?.timeoutMs);
    const expected = query.trim().toLowerCase();
    const by = options?.by ?? 'text';
    const matches = (await Promise.all(contexts.map(async (context) => {
      const tree = await this.pageDomTree(sessionId, {
        ...options,
        frameSelectors: context
      });
      return flattenDomTree(tree.tree)
        .map((node) => {
          const value = by === 'selector'
            ? node.selector
            : by === 'role'
              ? node.role
              : by === 'id'
                ? node.id
                : by === 'name'
                  ? node.name
                  : by === 'placeholder'
                    ? node.placeholder
                    : by === 'tag'
                      ? node.tagName
                      : node.text;
          if (typeof value !== 'string') {
            return undefined;
          }
          const candidate = value.toLowerCase();
          if (!candidate.includes(expected)) {
            return undefined;
          }
          const exact = candidate === expected;
          const startsWith = candidate.startsWith(expected);
          const distancePenalty = Math.abs(candidate.length - expected.length);
          const framePenalty = (context?.length ?? 0) * 25;
          const score = [
            exact ? 10_000 : 0,
            startsWith ? 2_000 : 0,
            node.visible ? 500 : 0,
            by === 'text' && (node.tagName === 'button' || node.role === 'button') ? 350 : 0,
            by === 'text' && (node.tagName === 'input' || node.tagName === 'textarea' || node.tagName === 'select') ? 250 : 0,
            Math.max(0, 250 - distancePenalty),
            Math.max(0, 100 - (node.childCount * 10)),
            Math.max(0, 100 - framePenalty)
          ].reduce((sum, part) => sum + part, 0);
          return {
            node: {
              ...node,
              frameSelectors: context
            } as BrowserExtensionDomTreeNode,
            score
          };
        });
    })))
      .flat()
      .filter((entry): entry is { node: BrowserExtensionDomTreeNode; score: number } => Boolean(entry))
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.node);
    if (matches.length === 0 && by === 'text') {
      const [actionables, fields, pageState] = await Promise.all([
        this.listActionables(sessionId, {
          selector: options?.selector,
          frameSelectors: options?.frameSelectors,
          limit: Math.max(20, options?.limit ?? 10),
          timeoutMs: options?.timeoutMs
        }).catch(() => ({ actionables: [] as BrowserExtensionActionableSummary[] })),
        this.listFormFields(
          sessionId,
          options?.frameSelectors,
          Math.max(20, options?.limit ?? 10),
          options?.timeoutMs
        ).catch(() => ({ fields: [] as BrowserExtensionFormFieldSummary[] })),
        this.pageState(sessionId, {
          selector: options?.selector,
          frameSelectors: options?.frameSelectors,
          limit: Math.max(20, options?.limit ?? 10),
          timeoutMs: options?.timeoutMs
        }).catch(() => ({ pageState: undefined as BrowserExtensionPageStateSummary | undefined }))
      ]);
      const fallbackMatches = [
        ...actionables.actionables.map((entry) => {
          const label = coalesceNonEmptyString(entry.label, entry.text, entry.selector);
          if (!label || !label.toLowerCase().includes(expected)) {
            return undefined;
          }
          return {
            node: {
              selector: entry.selector,
              text: label,
              tagName: entry.tagName ?? 'div',
              role: entry.role,
              visible: entry.visible ?? true,
              frameSelectors: entry.frameSelectors
            } as BrowserExtensionDomTreeNode,
            score: (entry.score ?? 0) + 500
          };
        }),
        ...fields.fields.map((entry) => {
          const label = coalesceNonEmptyString(entry.labels?.[0], entry.placeholder, entry.name, entry.selector);
          if (!label || !label.toLowerCase().includes(expected)) {
            return undefined;
          }
          return {
            node: {
              selector: entry.selector,
              text: label,
              tagName: entry.tagName ?? 'input',
              role: entry.role,
              visible: entry.visible ?? true,
              frameSelectors: entry.frameSelectors
            } as BrowserExtensionDomTreeNode,
            score: 800
          };
        }),
        ...(pageState.pageState?.actionables ?? []).map((entry) => {
          const label = coalesceNonEmptyString(entry.label, entry.text, entry.selector);
          if (!label || !label.toLowerCase().includes(expected)) {
            return undefined;
          }
          return {
            node: {
              selector: entry.selector,
              text: label,
              tagName: entry.tagName ?? 'div',
              role: entry.role,
              visible: entry.visible ?? true,
              frameSelectors: entry.frameSelectors
            } as BrowserExtensionDomTreeNode,
            score: (entry.score ?? 0) + 300
          };
        })
      ]
        .filter((entry): entry is { node: BrowserExtensionDomTreeNode; score: number } => Boolean(entry))
        .sort((left, right) => right.score - left.score)
        .map((entry) => entry.node);
      matches.push(...fallbackMatches);
    }
    const limit = options?.limit && options.limit > 0 ? options.limit : 1;
    return {
      sessionId,
      query,
      by,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      count: Math.min(matches.length, limit),
      matches: matches.slice(0, limit)
    };
  }

  async clickByQuery(
    sessionId: string,
    query: string,
    options?: {
      by?: 'text' | 'selector' | 'role' | 'id' | 'name' | 'placeholder' | 'tag';
      selector?: string;
      frameSelectors?: string[];
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    const located = await this.locateInPage(sessionId, query, {
      ...options,
      limit: 1
    });
    const match = located.matches[0];
    if (!match?.selector) {
      throw new Error(`No browser-extension element matched query: ${query}`);
    }
    const clicked = await this.dispatchAndWait(sessionId, 'click', {
      selector: match.selector,
      frameSelectors: match.frameSelectors ?? options?.frameSelectors
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { clicked?: boolean; element?: BrowserExtensionElementSummary }
      | undefined;
    return {
      sessionId,
      query,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      match,
      clicked: {
        sessionId,
        selector: match.selector,
        frameSelectors: match.frameSelectors ?? options?.frameSelectors,
        clicked: clicked?.clicked === true,
        element: clicked?.element
      }
    };
  }

  async waitForDomQuiet(
    sessionId: string,
    options?: {
      quietMs?: number;
      timeoutMs?: number;
      intervalMs?: number;
      mutationType?: 'childList' | 'attributes' | 'characterData';
      textIncludes?: string;
    }
  ) {
    const quietMs = Math.max(250, options?.quietMs ?? DEFAULT_QUIET_WINDOW_MS);
    const timeoutMs = Math.max(500, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS);
    const intervalMs = Math.max(100, options?.intervalMs ?? 250);
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const session = this.requireSession(sessionId);
      const events = filterDomEvents(session.domEvents ?? [], {
        limit: 1,
        mutationType: options?.mutationType,
        textIncludes: options?.textIncludes
      });
      const lastTimestamp = events.at(-1)?.timestamp;
      const quietForMs = lastTimestamp ? Date.now() - Date.parse(lastTimestamp) : Number.POSITIVE_INFINITY;
      if (quietForMs >= quietMs) {
        return {
          sessionId,
          quiet: true,
          quietMs,
          quietForMs: Number.isFinite(quietForMs) ? quietForMs : quietMs,
          lastEvent: events.at(-1)
        };
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      quiet: false,
      quietMs,
      quietForMs: 0
    };
  }

  async waitForNetworkIdle(
    sessionId: string,
    options?: {
      quietMs?: number;
      timeoutMs?: number;
      intervalMs?: number;
      urlIncludes?: string;
      stage?: 'request' | 'response' | 'error';
      method?: string;
    }
  ) {
    const quietMs = Math.max(250, options?.quietMs ?? DEFAULT_QUIET_WINDOW_MS);
    const timeoutMs = Math.max(500, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS);
    const intervalMs = Math.max(100, options?.intervalMs ?? 250);
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const events = this.listNetworkEvents(sessionId, {
        limit: 1,
        urlIncludes: options?.urlIncludes,
        stage: options?.stage,
        method: options?.method
      });
      const lastTimestamp = events.events.at(-1)?.timestamp;
      const quietForMs = lastTimestamp ? Date.now() - Date.parse(lastTimestamp) : Number.POSITIVE_INFINITY;
      if (quietForMs >= quietMs) {
        return {
          sessionId,
          idle: true,
          quietMs,
          quietForMs: Number.isFinite(quietForMs) ? quietForMs : quietMs,
          lastEvent: events.events.at(-1)
        };
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      idle: false,
      quietMs,
      quietForMs: 0
    };
  }

  async waitForPageStable(
    sessionId: string,
    options?: {
      quietMs?: number;
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
    }
  ) {
    const timeoutMs = Math.max(500, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS);
    const intervalMs = Math.max(100, options?.intervalMs ?? 500);
    const stableReadsTarget = Math.max(1, options?.stableReads ?? 2);
    let stableReads = 0;
    let lastSignature: string | undefined;
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const [snapshot, domQuiet, networkIdle] = await Promise.all([
        this.snapshot(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs)) as Promise<{ sessionId: string; snapshot?: BrowserExtensionSnapshot }>,
        this.waitForDomQuiet(sessionId, { quietMs: options?.quietMs, timeoutMs: intervalMs + 500, intervalMs: Math.min(intervalMs, 250) }),
        this.waitForNetworkIdle(sessionId, { quietMs: options?.quietMs, timeoutMs: intervalMs + 500, intervalMs: Math.min(intervalMs, 250) })
      ]);
      const currentSignature = JSON.stringify({
        title: snapshot.snapshot?.title,
        url: snapshot.snapshot?.url,
        text: snapshot.snapshot?.text
      });
      stableReads = currentSignature === lastSignature && domQuiet.quiet && networkIdle.idle
        ? stableReads + 1
        : 1;
      lastSignature = currentSignature;
      if (stableReads >= stableReadsTarget && domQuiet.quiet && networkIdle.idle) {
        return {
          sessionId,
          stable: true,
          stableReads,
          snapshot: snapshot.snapshot,
          domQuiet,
          networkIdle
        };
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      stable: false,
      stableReads: 0
    };
  }

  async screenshot(
    sessionId: string,
    options?: {
      filename?: string;
      returnBase64?: boolean;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_HUMAN_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'screenshot', {}, timeoutMs) as
      | { screenshot?: BrowserExtensionScreenshot; windowId?: number; activeTabId?: number }
      | undefined;
    const screenshot = result?.screenshot;
    const filename = options?.filename
      ? path.resolve(options.filename)
      : undefined;
    const returnBase64 = options?.returnBase64 ?? !filename;
    let data: string | undefined;
    let filepath: string | undefined = filename;
    let byteLength = 0;
    if (screenshot?.dataUrl) {
      const encoded = this.extractBase64FromDataUrl(screenshot.dataUrl);
      const buffer = Buffer.from(encoded, 'base64');
      byteLength = buffer.byteLength;
      if (filename) {
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, buffer);
      }
      if (returnBase64) {
        data = encoded;
      }
    }
    return {
      sessionId,
      format: screenshot?.format ?? 'png',
      capturedAt: screenshot?.capturedAt,
      windowId: result?.windowId,
      activeTabId: result?.activeTabId,
      filepath,
      byteLength,
      data: returnBase64 ? data : undefined
    };
  }

  async inspect(sessionId: string, selector: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'inspect', { selector }, timeoutMs) as
      | { element?: BrowserExtensionElementSummary }
      | undefined;
    return {
      sessionId,
      selector,
      element: result?.element
    };
  }

  async inspectAll(sessionId: string, selector: string, limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'inspect_all', { selector, limit }, timeoutMs) as
      | { elements?: BrowserExtensionElementSummary[] }
      | undefined;
    return {
      sessionId,
      selector,
      limit,
      count: result?.elements?.length ?? 0,
      elements: result?.elements ?? []
    };
  }

  async links(sessionId: string, limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'links', { limit }, timeoutMs) as
      | { links?: BrowserExtensionLinkSummary[] }
      | undefined;
    return {
      sessionId,
      limit,
      count: result?.links?.length ?? 0,
      links: result?.links ?? []
    };
  }

  async listActionables(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const contexts = await this.resolveFrameContexts(sessionId, options?.frameSelectors, timeoutMs);
    const actionables = this.mergeFrameScopedItems(
      (await Promise.all(contexts.map(async (context) => {
        const result = await this.dispatchAndWait(sessionId, 'actionables', {
          selector: options?.selector,
          frameSelectors: context,
          limit: options?.limit
        }, timeoutMs) as
          | { actionables?: BrowserExtensionActionableSummary[]; count?: number }
          | undefined;
        return (result?.actionables ?? []).map((entry) => ({
          ...entry,
          frameSelectors: entry.frameSelectors ?? context
        }));
      }))).flat().sort((left, right) => (right.score ?? 0) - (left.score ?? 0)),
      options?.limit
    );
    return {
      sessionId,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      count: actionables.length,
      actionables
    };
  }

  async pageState(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const [result, fields, banners, loadingStates, emptyStates, dialogs, menus, disclosures, collections, collectionControls, collectionFilterTokens, paginations, tablists, steppers] = await Promise.all([
      this.dispatchAndWait(sessionId, 'page_state', {
        selector: options?.selector,
        frameSelectors: options?.frameSelectors,
        limit: options?.limit,
        maxDepth: options?.maxDepth,
        maxChildren: options?.maxChildren
      }, timeoutMs) as Promise<{ pageState?: BrowserExtensionPageStateSummary } | undefined>,
      this.listFormFields(sessionId, options?.frameSelectors, Math.max(50, options?.limit ?? 20), timeoutMs).catch(() => ({ fields: [] as BrowserExtensionFormFieldSummary[] })),
      this.listBanners(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), timeoutMs).catch(() => ({ banners: [] as BrowserExtensionBannerSummary[] })),
      this.listLoadingStates(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), timeoutMs).catch(() => ({ loadingStates: [] as BrowserExtensionLoadingStateSummary[] })),
      this.listEmptyStates(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), timeoutMs).catch(() => ({ emptyStates: [] as BrowserExtensionEmptyStateSummary[] })),
      this.listDialogs(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), timeoutMs).catch(() => ({ dialogs: [] as BrowserExtensionDialogSummary[] })),
      this.listMenus(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), timeoutMs).catch(() => ({ menus: [] as BrowserExtensionMenuSummary[] })),
      this.listDisclosures(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), timeoutMs).catch(() => ({ disclosures: [] as BrowserExtensionDisclosureSummary[] })),
      this.listCollections(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), timeoutMs).catch(() => ({ collections: [] as BrowserExtensionCollectionSummary[] })),
      this.listCollectionControls(sessionId, { frameSelectors: options?.frameSelectors, limit: Math.max(20, options?.limit ?? 20), timeoutMs }).catch(() => ({ controls: [] as BrowserExtensionCollectionControlSummary[] })),
      this.listCollectionFilterTokens(sessionId, { frameSelectors: options?.frameSelectors, limit: Math.max(20, options?.limit ?? 20), timeoutMs }).catch(() => ({ tokens: [] as BrowserExtensionCollectionFilterTokenSummary[] })),
      this.listPaginations(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), timeoutMs).catch(() => ({ paginations: [] as BrowserExtensionPaginationSummary[] })),
      this.listTablists(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), timeoutMs).catch(() => ({ groups: [] as BrowserExtensionTablistSummary[] })),
      this.listSteppers(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), timeoutMs).catch(() => ({ steppers: [] as BrowserExtensionStepperSummary[] }))
    ]);
    const formValueEntries = fields.fields.map((field) => ({
      selector: field.selector,
      name: field.name,
      type: field.type,
      value: field.value,
      checked: field.checked,
      labels: field.labels,
      placeholder: field.placeholder,
      required: field.required,
      formSelector: field.formSelector,
      frameSelectors: field.frameSelectors
    }));
    const formValues = formValueEntries.reduce<Record<string, unknown>>((acc, entry) => {
      const key = entry.name || entry.selector;
      acc[key] = entry.type === 'checkbox' || entry.type === 'radio'
        ? Boolean(entry.checked)
        : (entry.value ?? '');
      return acc;
    }, {});
    const activeCollectionFilters = (collectionControls.controls ?? []).filter((entry) =>
      (entry.controlType === 'filter' || entry.controlType === 'search') && entry.active === true
    );
    const collectionSortState = (collectionControls.controls ?? []).filter((entry) =>
      entry.controlType === 'sort' && (entry.active === true || typeof entry.sortDirection === 'string')
    );
    if (!options?.frameSelectors) {
      const contexts = await this.resolveFrameContexts(sessionId, undefined, timeoutMs);
      if (contexts.length > 1) {
        const aggregated = await Promise.all(contexts.map(async (context) => {
          const scoped = await this.dispatchAndWait(sessionId, 'page_state', {
            selector: options?.selector,
            frameSelectors: context,
            limit: options?.limit,
            maxDepth: options?.maxDepth,
            maxChildren: options?.maxChildren
          }, timeoutMs) as
            | { pageState?: BrowserExtensionPageStateSummary }
            | undefined;
          return scoped?.pageState;
        }));
        const mergedForms = this.mergeFrameScopedItems(
          aggregated.flatMap((entry) => entry?.forms ?? []),
          options?.limit
        );
        const mergedActionables = this.mergeFrameScopedItems(
          aggregated.flatMap((entry) => entry?.actionables ?? []),
          options?.limit
        );
        const mergedLinks = aggregated.flatMap((entry) => entry?.links ?? []);
        return {
          sessionId,
          selector: options?.selector,
          frameSelectors: options?.frameSelectors,
          pageState: {
            ...result?.pageState,
            forms: mergedForms,
            formValueEntries,
            formValues,
            banners: banners.banners,
            loadingStates: loadingStates.loadingStates,
            emptyStates: emptyStates.emptyStates,
            dialogs: dialogs.dialogs,
            menus: menus.menus,
            disclosures: disclosures.disclosures,
            collections: collections.collections,
            collectionControls: collectionControls.controls,
            activeCollectionFilters,
            collectionFilterTokens: collectionFilterTokens.tokens,
            collectionSortState,
            paginations: paginations.paginations,
            tablists: tablists.groups,
            steppers: steppers.steppers,
            actionables: mergedActionables,
            links: typeof options?.limit === 'number' && options.limit > 0 ? mergedLinks.slice(0, options.limit) : mergedLinks
          } satisfies BrowserExtensionPageStateSummary
        };
      }
    }
    return {
      sessionId,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      pageState: result?.pageState
        ? {
            ...result.pageState,
            formValueEntries,
            formValues,
            banners: banners.banners,
            loadingStates: loadingStates.loadingStates,
            emptyStates: emptyStates.emptyStates,
            dialogs: dialogs.dialogs,
            menus: menus.menus,
            disclosures: disclosures.disclosures,
            collections: collections.collections,
            collectionControls: collectionControls.controls,
            activeCollectionFilters,
            collectionFilterTokens: collectionFilterTokens.tokens,
            collectionSortState,
            paginations: paginations.paginations,
            tablists: tablists.groups,
            steppers: steppers.steppers
          }
        : result?.pageState
    };
  }

  async scrollPage(
    sessionId: string,
    options?: { direction?: 'down' | 'up'; amount?: number; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'scroll_page', {
      direction: options?.direction ?? 'down',
      amount: options?.amount ?? 0.85
    }, timeoutMs) as
      | { direction?: 'down' | 'up'; amount?: number; beforeY?: number; afterY?: number; moved?: boolean; atTop?: boolean; atBottom?: boolean }
      | undefined;
    return {
      sessionId,
      direction: result?.direction ?? options?.direction ?? 'down',
      amount: result?.amount ?? options?.amount ?? 0.85,
      beforeY: result?.beforeY,
      afterY: result?.afterY,
      moved: result?.moved === true,
      atTop: result?.atTop === true,
      atBottom: result?.atBottom === true
    };
  }

  async suggestNextActions(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      limit?: number;
      maxDepth?: number;
      maxChildren?: number;
      timeoutMs?: number;
    }
  ) {
    const [pageState, fields, banners, loadingStates, emptyStates, dialogs, menus, disclosures, collections, collectionControls, collectionFilterTokens, paginations, radios, segmenteds, tablists, steppers] = await Promise.all([
      this.pageState(sessionId, options),
      this.listFormFields(sessionId, options?.frameSelectors, Math.max(50, options?.limit ?? 20), options?.timeoutMs),
      this.listBanners(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), options?.timeoutMs).catch(() => ({ banners: [] as BrowserExtensionBannerSummary[] })),
      this.listLoadingStates(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), options?.timeoutMs).catch(() => ({ loadingStates: [] as BrowserExtensionLoadingStateSummary[] })),
      this.listEmptyStates(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), options?.timeoutMs).catch(() => ({ emptyStates: [] as BrowserExtensionEmptyStateSummary[] })),
      this.listDialogs(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), options?.timeoutMs).catch(() => ({ dialogs: [] as BrowserExtensionDialogSummary[] })),
      this.listMenus(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), options?.timeoutMs).catch(() => ({ menus: [] as BrowserExtensionMenuSummary[] })),
      this.listDisclosures(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), options?.timeoutMs).catch(() => ({ disclosures: [] as BrowserExtensionDisclosureSummary[] })),
      this.listCollections(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), options?.timeoutMs).catch(() => ({ collections: [] as BrowserExtensionCollectionSummary[] })),
      this.listCollectionControls(sessionId, { frameSelectors: options?.frameSelectors, limit: Math.max(20, options?.limit ?? 20), timeoutMs: options?.timeoutMs }).catch(() => ({ controls: [] as BrowserExtensionCollectionControlSummary[] })),
      this.listCollectionFilterTokens(sessionId, { frameSelectors: options?.frameSelectors, limit: Math.max(20, options?.limit ?? 20), timeoutMs: options?.timeoutMs }).catch(() => ({ tokens: [] as BrowserExtensionCollectionFilterTokenSummary[] })),
      this.listPaginations(sessionId, options?.frameSelectors, Math.max(10, options?.limit ?? 10), options?.timeoutMs).catch(() => ({ paginations: [] as BrowserExtensionPaginationSummary[] })),
      this.listRadioGroups(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), options?.timeoutMs),
      this.listSegmentedGroups(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), options?.timeoutMs),
      this.listTablists(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), options?.timeoutMs),
      this.listSteppers(sessionId, options?.frameSelectors, Math.max(20, options?.limit ?? 20), options?.timeoutMs)
    ]);
    const suggestions: BrowserExtensionSuggestedAction[] = [];
    for (const loadingState of loadingStates.loadingStates) {
      const label = coalesceNonEmptyString(loadingState.label, loadingState.text, loadingState.selector);
      if (!label) {
        continue;
      }
      suggestions.push({
        kind: 'status',
        query: label,
        score: loadingState.blocking ? 995 : 910,
        reason: loadingState.blocking ? 'Blocking loading state is visible' : 'Loading state is visible',
        selector: loadingState.selector,
        frameSelectors: loadingState.frameSelectors,
        valueHint: loadingState.variant
      });
    }
    for (const banner of banners.banners) {
      const label = coalesceNonEmptyString(banner.text, banner.label, banner.selector);
      if (!label) {
        continue;
      }
      suggestions.push({
        kind: 'status',
        query: label,
        score: banner.variant === 'error' ? 930 : banner.variant === 'warning' ? 860 : 620,
        reason: banner.variant === 'error'
          ? 'Visible error banner may require recovery'
          : banner.variant === 'warning'
            ? 'Visible warning banner may require attention'
            : 'Visible banner/status message',
        selector: banner.selector,
        frameSelectors: banner.frameSelectors,
        valueHint: banner.variant
      });
      if ((banner.dismissSelectors?.length ?? 0) > 0) {
        suggestions.push({
          kind: 'click',
          query: `Dismiss ${label}`,
          score: banner.variant === 'error' ? 820 : 640,
          reason: 'Visible banner can be dismissed',
          selector: banner.dismissSelectors?.[0],
          frameSelectors: banner.frameSelectors,
          valueHint: banner.variant
        });
      }
    }
    for (const emptyState of emptyStates.emptyStates) {
      const label = coalesceNonEmptyString(emptyState.text, emptyState.label, emptyState.selector);
      if (!label) {
        continue;
      }
      suggestions.push({
        kind: 'status',
        query: label,
        score: 700,
        reason: 'Empty state is visible; collection or page may need different input or navigation',
        selector: emptyState.selector,
        frameSelectors: emptyState.frameSelectors,
        valueHint: emptyState.kind
      });
    }
    for (const field of fields.fields) {
      const label = coalesceNonEmptyString(field.labels?.[0], field.placeholder, field.name, field.selector);
      const empty = !coalesceNonEmptyString(field.value, field.text);
      if (!label || !empty) {
        continue;
      }
      suggestions.push({
        kind: field.fieldType === 'select' ? 'select' : 'fill',
        query: label,
        score: field.required ? 980 : 760,
        reason: field.required ? 'Required form field is empty' : 'Visible form field is empty',
        selector: field.selector,
        frameSelectors: field.frameSelectors,
        formSelector: field.formSelector,
        valueHint: field.type
      });
    }
    for (const group of radios.groups) {
      if (group.options.some((option) => option.checked)) {
        continue;
      }
      const label = coalesceNonEmptyString(group.name, group.options[0]?.label, group.formSelector);
      if (!label) {
        continue;
      }
      suggestions.push({
        kind: 'radio',
        query: label,
        score: 720,
        reason: 'Radio group has no selected option',
        selector: group.options[0]?.selector,
        frameSelectors: group.frameSelectors,
        formSelector: group.formSelector,
        valueHint: group.options.map((option) => option.label ?? option.value ?? option.selector).filter(Boolean).join(' | ')
      });
    }
    for (const group of segmenteds.groups) {
      if (group.options.some((option) => option.pressed)) {
        continue;
      }
      const label = coalesceNonEmptyString(group.label, group.selector, group.formSelector);
      if (!label) {
        continue;
      }
      suggestions.push({
        kind: 'segment',
        query: label,
        score: 700,
        reason: 'Segmented control has no active option',
        selector: group.selector ?? group.options[0]?.selector,
        frameSelectors: group.frameSelectors,
        formSelector: group.formSelector,
        valueHint: group.options.map((option) => option.label ?? option.value ?? option.selector).filter(Boolean).join(' | ')
      });
    }
    for (const dialog of dialogs.dialogs) {
      const label = coalesceNonEmptyString(dialog.label, dialog.selector);
      if (!label) {
        continue;
      }
      suggestions.push({
        kind: 'dialog',
        query: label,
        score: 990,
        reason: 'Visible dialog may block the page until dismissed',
        selector: dialog.selector,
        frameSelectors: dialog.frameSelectors,
        valueHint: dialog.actionLabels?.filter(Boolean).join(' | ')
      });
    }
    for (const menu of menus.menus) {
      const label = coalesceNonEmptyString(menu.label, menu.selector);
      if (!label || menu.options.length === 0) {
        continue;
      }
      suggestions.push({
        kind: 'menu',
        query: label,
        score: 675,
        reason: 'Open menu has selectable options',
        selector: menu.selector,
        frameSelectors: menu.frameSelectors,
        valueHint: menu.options.map((option) => option.label ?? option.value ?? option.selector).filter(Boolean).join(' | ')
      });
    }
    for (const disclosure of disclosures.disclosures) {
      const label = coalesceNonEmptyString(disclosure.label, disclosure.selector);
      if (!label || disclosure.expanded) {
        continue;
      }
      suggestions.push({
        kind: 'disclosure',
        query: label,
        score: 660,
        reason: 'Collapsed disclosure can reveal more controls or content',
        selector: disclosure.selector,
        frameSelectors: disclosure.frameSelectors
      });
    }
    for (const collection of collections.collections) {
      const label = coalesceNonEmptyString(collection.label, collection.selector);
      const firstItem = collection.items.find((item) => item.label || item.text);
      if (!label || !firstItem) {
        continue;
      }
      suggestions.push({
        kind: 'collection',
        query: label,
        score: 650,
        reason: 'Visible collection contains actionable items',
        selector: collection.selector,
        frameSelectors: collection.frameSelectors,
        valueHint: firstItem.label ?? firstItem.text
      });
      if ((collection.selectedCount ?? 0) > 0) {
        suggestions.push({
          kind: 'collection',
          query: label,
          score: 685,
          reason: `${collection.selectedCount} row(s) are selected and may support a bulk action`,
          selector: collection.selector,
          frameSelectors: collection.frameSelectors,
          valueHint: 'selected rows'
        });
      }
      const expandable = collection.items.find((item) => !item.expanded && item.actions?.length);
      if (expandable) {
        suggestions.push({
          kind: 'collection',
          query: expandable.label ?? expandable.text ?? label,
          score: 645,
          reason: 'Collection row has available actions or hidden details',
          selector: expandable.selector,
          frameSelectors: collection.frameSelectors,
          valueHint: expandable.actions?.map((action) => action.label ?? action.actionableType ?? action.selector).filter(Boolean).join(' | ')
        });
      }
    }
    for (const control of collectionControls.controls) {
      const label = coalesceNonEmptyString(control.label, control.selector);
      if (!label || control.active !== true) {
        continue;
      }
      if (control.controlType === 'sort') {
        suggestions.push({
          kind: 'status',
          query: label,
          score: 610,
          reason: 'Collection currently has an active sort state',
          selector: control.selector,
          frameSelectors: control.frameSelectors,
          valueHint: control.sortDirection ?? control.value
        });
        continue;
      }
      suggestions.push({
        kind: 'status',
        query: label,
        score: 640,
        reason: 'Collection currently has an active filter/search state',
        selector: control.selector,
        frameSelectors: control.frameSelectors,
        valueHint: control.value
      });
    }
    for (const token of collectionFilterTokens.tokens) {
      const label = coalesceNonEmptyString(token.label, token.value, token.selector);
      if (!label) {
        continue;
      }
      suggestions.push({
        kind: 'status',
        query: label,
        score: 635,
        reason: token.removable ? 'Active collection filter token can be cleared' : 'Active collection filter token is visible',
        selector: token.selector,
        frameSelectors: token.frameSelectors,
        valueHint: token.removeSelector
      });
    }
    for (const pagination of paginations.paginations) {
      const label = coalesceNonEmptyString(pagination.label, pagination.selector);
      const nextOption = pagination.options.find((option) => !option.disabled && (option.kind === 'next' || option.kind === 'page' || option.kind === 'load_more'));
      if (!label || !nextOption) {
        continue;
      }
      suggestions.push({
        kind: nextOption.kind === 'load_more' ? 'load_more' : 'paginate',
        query: nextOption.label ?? label,
        score: nextOption.kind === 'load_more' ? 680 : 670,
        reason: nextOption.kind === 'load_more' ? 'More results can be loaded' : 'Pagination has more navigable options',
        selector: nextOption.selector,
        frameSelectors: pagination.frameSelectors,
        valueHint: pagination.options.map((option) => option.label ?? option.selector).filter(Boolean).join(' | ')
      });
    }
    for (const group of tablists.groups) {
      const active = group.options.find((option) => option.selected);
      const alternatives = group.options.filter((option) => !option.selected && !option.disabled);
      const label = coalesceNonEmptyString(group.label, group.selector, group.formSelector);
      if (!label || alternatives.length === 0) {
        continue;
      }
      suggestions.push({
        kind: 'tab',
        query: label,
        score: 690,
        reason: active ? `Tablist can switch away from ${active.label ?? active.value ?? 'current tab'}` : 'Tablist has available options',
        selector: group.selector ?? alternatives[0]?.selector,
        frameSelectors: group.frameSelectors,
        formSelector: group.formSelector,
        valueHint: alternatives.map((option) => option.label ?? option.value ?? option.selector).filter(Boolean).join(' | ')
      });
    }
    for (const stepper of steppers.steppers) {
      const label = coalesceNonEmptyString(stepper.label, stepper.selector, stepper.formSelector);
      if (stepper.next && !stepper.next.disabled) {
        suggestions.push({
          kind: 'step',
          query: label || stepper.next.label || 'stepper next',
          score: 710,
          reason: 'Stepper can advance to the next step',
          selector: stepper.next.selector,
          frameSelectors: stepper.frameSelectors,
          formSelector: stepper.formSelector,
          valueHint: stepper.next.label
        });
      }
      if (stepper.previous && !stepper.previous.disabled) {
        suggestions.push({
          kind: 'step',
          query: label || stepper.previous.label || 'stepper previous',
          score: 640,
          reason: 'Stepper can move to the previous step',
          selector: stepper.previous.selector,
          frameSelectors: stepper.frameSelectors,
          formSelector: stepper.formSelector,
          valueHint: stepper.previous.label
        });
      }
    }
    for (const actionable of pageState.pageState?.actionables ?? []) {
      const label = coalesceNonEmptyString(actionable.label, actionable.text, actionable.selector);
      if (!label) {
        continue;
      }
      const submitLike = actionable.actionableType === 'submit'
        || /submit|save|continue|search|next|apply|sign in|sign up|log in|send/i.test(label);
      suggestions.push({
        kind: submitLike ? 'submit' : actionable.actionableType === 'link' ? 'open_link' : 'click',
        query: label,
        score: (actionable.score ?? 0) + (submitLike ? 150 : 0),
        reason: submitLike ? 'Visible primary action' : `Visible ${actionable.actionableType} control`,
        selector: actionable.selector,
        frameSelectors: actionable.frameSelectors,
        formSelector: actionable.formSelector,
        actionableType: actionable.actionableType
      });
    }
    const deduped = new Map<string, BrowserExtensionSuggestedAction>();
    for (const suggestion of suggestions.sort((left, right) => right.score - left.score)) {
      const key = [
        suggestion.kind,
        suggestion.query.trim().toLowerCase(),
        normalizeFrameContextKey(suggestion.frameSelectors),
        suggestion.formSelector ?? '',
        suggestion.selector ?? ''
      ].join('::');
      if (!deduped.has(key)) {
        deduped.set(key, suggestion);
      }
    }
    const limit = options?.limit && options.limit > 0 ? options.limit : 20;
    return {
      sessionId,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      count: Math.min(deduped.size, limit),
      suggestions: [...deduped.values()].slice(0, limit),
      pageState: pageState.pageState
    };
  }

  async pageMarkdown(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'markdown', {
      selector: options?.selector,
      frameSelectors: options?.frameSelectors
    }, timeoutMs) as
      | { markdown?: string }
      | undefined;
    return {
      sessionId,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      markdown: result?.markdown ?? ''
    };
  }

  async pageReadability(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'readability', {
      selector: options?.selector,
      frameSelectors: options?.frameSelectors
    }, timeoutMs) as
      | { readability?: BrowserExtensionReadabilitySummary }
      | undefined;
    return {
      sessionId,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      readability: result?.readability
    };
  }

  async listDialogs(sessionId: string, frameSelectors?: string[], limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'dialogs', { frameSelectors, limit }, timeoutMs) as
      | { dialogs?: BrowserExtensionDialogSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.dialogs?.length ?? 0,
      dialogs: result?.dialogs ?? []
    };
  }

  async listDialogActions(
    sessionId: string,
    query?: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'dialog_actions', {
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { dialog?: BrowserExtensionDialogSummary; actions?: BrowserExtensionDialogActionSummary[] }
      | undefined;
    return {
      sessionId,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      dialog: result?.dialog,
      count: result?.actions?.length ?? 0,
      actions: result?.actions ?? []
    };
  }

  async listBanners(sessionId: string, frameSelectors?: string[], limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'banners', { frameSelectors, limit }, timeoutMs) as
      | { banners?: BrowserExtensionBannerSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.banners?.length ?? 0,
      banners: result?.banners ?? []
    };
  }

  async dismissBanner(
    sessionId: string,
    query?: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'banner_dismiss', {
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { banner?: BrowserExtensionBannerSummary; dismissed?: boolean; clicked?: boolean; selector?: string }
      | undefined;
    return {
      sessionId,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      dismissed: result?.dismissed === true,
      clicked: result?.clicked === true,
      selector: result?.selector,
      banner: result?.banner
    };
  }

  async listLoadingStates(sessionId: string, frameSelectors?: string[], limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'loading_states', { frameSelectors, limit }, timeoutMs) as
      | { loadingStates?: BrowserExtensionLoadingStateSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.loadingStates?.length ?? 0,
      loadingStates: result?.loadingStates ?? []
    };
  }

  async listEmptyStates(sessionId: string, frameSelectors?: string[], limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'empty_states', { frameSelectors, limit }, timeoutMs) as
      | { emptyStates?: BrowserExtensionEmptyStateSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.emptyStates?.length ?? 0,
      emptyStates: result?.emptyStates ?? []
    };
  }

  async closeDialog(
    sessionId: string,
    query?: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'dialog_close', {
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; dialog?: BrowserExtensionDialogSummary; closed?: boolean }
      | undefined;
    return {
      sessionId,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      closed: result?.closed === true,
      dialog: result?.dialog,
      field: result?.field
    };
  }

  async clickDialogAction(
    sessionId: string,
    actionQuery?: string,
    options?: { dialogQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'dialog_action', {
      dialogQuery: options?.dialogQuery,
      actionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { dialog?: BrowserExtensionDialogSummary; action?: BrowserExtensionDialogActionSummary; clicked?: boolean; selector?: string }
      | undefined;
    return {
      sessionId,
      dialogQuery: options?.dialogQuery,
      actionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      clicked: result?.clicked === true,
      selector: result?.selector,
      dialog: result?.dialog,
      action: result?.action
    };
  }

  async listMenus(sessionId: string, frameSelectors?: string[], limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'menus', { frameSelectors, limit }, timeoutMs) as
      | { menus?: BrowserExtensionMenuSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.menus?.length ?? 0,
      menus: result?.menus ?? []
    };
  }

  async selectMenuOption(
    sessionId: string,
    optionQuery: string,
    options?: { menuQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'menu_select', {
      menuQuery: options?.menuQuery,
      optionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; menu?: BrowserExtensionMenuSummary; option?: unknown }
      | undefined;
    return {
      sessionId,
      menuQuery: options?.menuQuery,
      optionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      menu: result?.menu,
      option: result?.option
    };
  }

  async listDisclosures(sessionId: string, frameSelectors?: string[], limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'disclosures', { frameSelectors, limit }, timeoutMs) as
      | { disclosures?: BrowserExtensionDisclosureSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.disclosures?.length ?? 0,
      disclosures: result?.disclosures ?? []
    };
  }

  async toggleDisclosure(
    sessionId: string,
    query: string,
    options?: { desiredState?: 'open' | 'closed' | 'toggle'; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'disclosure_toggle', {
      query,
      desiredState: options?.desiredState,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; disclosure?: BrowserExtensionDisclosureSummary }
      | undefined;
    return {
      sessionId,
      query,
      desiredState: options?.desiredState ?? 'toggle',
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      disclosure: result?.disclosure
    };
  }

  async listCollections(sessionId: string, frameSelectors?: string[], limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'collections', { frameSelectors, limit }, timeoutMs) as
      | { collections?: BrowserExtensionCollectionSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.collections?.length ?? 0,
      collections: result?.collections ?? []
    };
  }

  async listCollectionControls(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_controls', {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      limit: options?.limit,
      exact: options?.exact
    }, timeoutMs) as
      | { controls?: BrowserExtensionCollectionControlSummary[] }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      count: result?.controls?.length ?? 0,
      controls: result?.controls ?? []
    };
  }

  async listActiveCollectionFilters(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_active_filters', {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      limit: options?.limit,
      exact: options?.exact
    }, timeoutMs) as
      | { controls?: BrowserExtensionCollectionControlSummary[] }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      count: result?.controls?.length ?? 0,
      controls: result?.controls ?? []
    };
  }

  async listCollectionFilterTokens(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_filter_tokens', {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      limit: options?.limit,
      exact: options?.exact
    }, timeoutMs) as
      | { tokens?: BrowserExtensionCollectionFilterTokenSummary[] }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      count: result?.tokens?.length ?? 0,
      tokens: result?.tokens ?? []
    };
  }

  async clickCollectionItem(
    sessionId: string,
    itemQuery: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_click', {
      collectionQuery: options?.collectionQuery,
      itemQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; collection?: BrowserExtensionCollectionSummary; item?: unknown }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      itemQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      collection: result?.collection,
      item: result?.item
    };
  }

  async listCollectionRowActions(
    sessionId: string,
    options: { rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_row_actions', {
      collectionQuery: options?.collectionQuery,
      rowQuery: options.rowQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { collection?: BrowserExtensionCollectionSummary; row?: BrowserExtensionCollectionItemSummary; actions?: Array<{ selector: string; label?: string; actionableType?: string }> }
      | undefined;
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      collection: result?.collection,
      row: result?.row,
      count: result?.actions?.length ?? 0,
      actions: result?.actions ?? []
    };
  }

  async clickCollectionRowAction(
    sessionId: string,
    options: { rowQuery: string; actionQuery?: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_row_click', {
      collectionQuery: options?.collectionQuery,
      rowQuery: options.rowQuery,
      actionQuery: options.actionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; collection?: BrowserExtensionCollectionSummary; row?: BrowserExtensionCollectionItemSummary; action?: unknown }
      | undefined;
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      actionQuery: options.actionQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      field: result?.field,
      collection: result?.collection,
      row: result?.row,
      action: result?.action
    };
  }

  async getCollectionSelectionState(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_selection_state', {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { collection?: BrowserExtensionCollectionSummary; rows?: BrowserExtensionCollectionSummary['items']; selectedRows?: BrowserExtensionCollectionSummary['items']; count?: number; selectedCount?: number }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      collection: result?.collection,
      count: typeof result?.count === 'number' ? result.count : (result?.rows?.length ?? 0),
      selectedCount: typeof result?.selectedCount === 'number' ? result.selectedCount : (result?.selectedRows?.length ?? 0),
      rows: result?.rows ?? [],
      selectedRows: result?.selectedRows ?? []
    };
  }

  async selectCollectionRow(
    sessionId: string,
    options: { rowQuery: string; desiredState?: 'on' | 'off' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_row_select', {
      collectionQuery: options?.collectionQuery,
      rowQuery: options.rowQuery,
      desiredState: options.desiredState,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; collection?: BrowserExtensionCollectionSummary; row?: BrowserExtensionCollectionItemSummary; checked?: boolean }
      | undefined;
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      desiredState: options.desiredState ?? 'toggle',
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      field: result?.field,
      collection: result?.collection,
      row: result?.row,
      checked: result?.checked
    };
  }

  async selectAllCollectionRows(
    sessionId: string,
    options?: { desiredState?: 'on' | 'off' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_select_all', {
      collectionQuery: options?.collectionQuery,
      desiredState: options?.desiredState,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; collection?: BrowserExtensionCollectionSummary; checked?: boolean }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      desiredState: options?.desiredState ?? 'toggle',
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      collection: result?.collection,
      checked: result?.checked
    };
  }

  async getCollectionRowDetails(
    sessionId: string,
    options: { rowQuery: string; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_row_details', {
      collectionQuery: options?.collectionQuery,
      rowQuery: options.rowQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { collection?: BrowserExtensionCollectionSummary; row?: BrowserExtensionCollectionItemSummary; expanded?: boolean; detailText?: string }
      | undefined;
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      collection: result?.collection,
      row: result?.row,
      expanded: result?.expanded,
      detailText: result?.detailText
    };
  }

  async expandCollectionRow(
    sessionId: string,
    options: { rowQuery: string; desiredState?: 'open' | 'closed' | 'toggle'; collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_row_expand', {
      collectionQuery: options?.collectionQuery,
      rowQuery: options.rowQuery,
      desiredState: options.desiredState,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; collection?: BrowserExtensionCollectionSummary; row?: BrowserExtensionCollectionItemSummary; changed?: boolean }
      | undefined;
    return {
      sessionId,
      collectionQuery: options.collectionQuery,
      rowQuery: options.rowQuery,
      desiredState: options.desiredState ?? 'toggle',
      frameSelectors: options.frameSelectors,
      exact: options.exact ?? false,
      field: result?.field,
      collection: result?.collection,
      row: result?.row,
      changed: result?.changed
    };
  }

  async sortCollection(
    sessionId: string,
    valueQuery: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_sort', {
      collectionQuery: options?.collectionQuery,
      valueQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; control?: BrowserExtensionCollectionControlSummary; value?: string }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      valueQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      control: result?.control,
      value: result?.value
    };
  }

  async filterCollection(
    sessionId: string,
    query: string,
    value: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_filter', {
      collectionQuery: options?.collectionQuery,
      query,
      value,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; control?: BrowserExtensionCollectionControlSummary; query?: string; value?: string }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      query,
      value,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      control: result?.control
    };
  }

  async clearCollectionFilter(
    sessionId: string,
    query: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_filter_clear', {
      collectionQuery: options?.collectionQuery,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; control?: BrowserExtensionCollectionControlSummary; query?: string; cleared?: boolean }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      control: result?.control,
      cleared: result?.cleared ?? false
    };
  }

  async clearCollectionFilterToken(
    sessionId: string,
    query: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_filter_token_clear', {
      collectionQuery: options?.collectionQuery,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; token?: BrowserExtensionCollectionFilterTokenSummary; cleared?: boolean }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      token: result?.token,
      cleared: result?.cleared ?? false
    };
  }

  async listCollectionRows(
    sessionId: string,
    options?: { collectionQuery?: string; frameSelectors?: string[]; limit?: number; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'collection_rows', {
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      limit: options?.limit,
      exact: options?.exact
    }, timeoutMs) as
      | { collection?: BrowserExtensionCollectionSummary; rows?: BrowserExtensionCollectionSummary['items'] }
      | undefined;
    return {
      sessionId,
      collectionQuery: options?.collectionQuery,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      count: result?.rows?.length ?? 0,
      collection: result?.collection,
      rows: result?.rows ?? []
    };
  }

  async listPaginations(sessionId: string, frameSelectors?: string[], limit = 20, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'paginations', { frameSelectors, limit }, timeoutMs) as
      | { paginations?: BrowserExtensionPaginationSummary[] }
      | undefined;
    return {
      sessionId,
      frameSelectors,
      count: result?.paginations?.length ?? 0,
      paginations: result?.paginations ?? []
    };
  }

  async clickPagination(
    sessionId: string,
    query: string,
    options?: { frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'pagination_click', {
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; pagination?: BrowserExtensionPaginationSummary; option?: unknown }
      | undefined;
    return {
      sessionId,
      query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      pagination: result?.pagination,
      option: result?.option
    };
  }

  async clickLoadMore(
    sessionId: string,
    options?: { query?: string; frameSelectors?: string[]; exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'load_more', {
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary; label?: string }
      | undefined;
    return {
      sessionId,
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      field: result?.field,
      label: result?.label
    };
  }

  async evaluate(sessionId: string, expression: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'evaluate', { expression }, timeoutMs);
    return {
      sessionId,
      expression,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async click(sessionId: string, selector: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'click', { selector }, timeoutMs);
    return {
      sessionId,
      selector,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async clickHuman(
    sessionId: string,
    selector: string,
    options?: { frameSelectors?: string[]; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'click_human', {
      selector,
      frameSelectors: options?.frameSelectors
    }, timeoutMs);
    return {
      sessionId,
      selector,
      frameSelectors: options?.frameSelectors,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async focusElement(
    sessionId: string,
    selector: string,
    options?: { frameSelectors?: string[]; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'focus', {
      selector,
      frameSelectors: options?.frameSelectors
    }, timeoutMs);
    return {
      sessionId,
      selector,
      frameSelectors: options?.frameSelectors,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async blurElement(
    sessionId: string,
    selector?: string,
    options?: { frameSelectors?: string[]; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'blur', {
      selector,
      frameSelectors: options?.frameSelectors
    }, timeoutMs);
    return {
      sessionId,
      selector,
      frameSelectors: options?.frameSelectors,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async type(sessionId: string, selector: string, text: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'type', { selector, text }, timeoutMs);
    return {
      sessionId,
      selector,
      text,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async press(sessionId: string, selector: string | undefined, key: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'press', { selector, key }, timeoutMs);
    return {
      sessionId,
      selector,
      key,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async editorRead(
    sessionId: string,
    selector: string,
    frameSelectors?: string[],
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    const result = await this.dispatchAndWait(sessionId, 'editor_read', { selector, frameSelectors }, timeoutMs) as
      | { editor?: BrowserExtensionElementSummary & { text?: string; html?: string; editorType?: string } }
      | undefined;
    return {
      sessionId,
      selector,
      frameSelectors,
      editor: result?.editor
    };
  }

  async editorFill(
    sessionId: string,
    selector: string,
    value: string,
    frameSelectors?: string[],
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    const result = await this.dispatchAndWait(sessionId, 'editor_fill', { selector, value, text: value, frameSelectors }, timeoutMs) as
      | { editor?: BrowserExtensionElementSummary & { text?: string; html?: string; editorType?: string; filled?: boolean } }
      | undefined;
    return {
      sessionId,
      selector,
      value,
      frameSelectors,
      filled: result?.editor?.filled === true,
      editor: result?.editor
    };
  }

  async formFill(sessionId: string, selector: string, value: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    return this.formFillInFrames(sessionId, selector, value, undefined, timeoutMs);
  }

  async formFillInFrames(
    sessionId: string,
    selector: string,
    value: string,
    frameSelectors?: string[],
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_fill', { selector, value, text: value, frameSelectors }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean }; selector?: string; value?: string; filled?: boolean }
      | undefined;
    const field = result?.field ?? ((result?.selector || result?.value || result?.filled) ? result as BrowserExtensionElementSummary & { filled?: boolean } : undefined);
    return {
      sessionId,
      selector,
      value,
      frameSelectors,
      filled: field?.filled === true,
      field
    };
  }

  async formFillHuman(
    sessionId: string,
    selector: string,
    value: string,
    options?: {
      frameSelectors?: string[];
      delayMs?: number;
      jitterMs?: number;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'form_fill_human', {
      selector,
      value,
      text: value,
      frameSelectors: options?.frameSelectors,
      delayMs: options?.delayMs,
      jitterMs: options?.jitterMs
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean; humanLike?: boolean } }
      | undefined;
    return {
      sessionId,
      selector,
      value,
      frameSelectors: options?.frameSelectors,
      delayMs: options?.delayMs,
      jitterMs: options?.jitterMs,
      filled: result?.field?.filled === true,
      field: result?.field
    };
  }

  async formClear(
    sessionId: string,
    selector: string,
    options?: {
      frameSelectors?: string[];
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'form_clear', {
      selector,
      frameSelectors: options?.frameSelectors,
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean } }
      | undefined;
    return {
      sessionId,
      selector,
      frameSelectors: options?.frameSelectors,
      cleared: result?.field?.filled === true,
      field: result?.field
    };
  }

  async formCommit(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'form_commit', {
      selector: options?.selector,
      frameSelectors: options?.frameSelectors
    }, timeoutMs);
    return {
      sessionId,
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      ...(result as Record<string, unknown> | undefined)
    };
  }

  async formValidation(
    sessionId: string,
    selector: string,
    options?: {
      frameSelectors?: string[];
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'form_validation', {
      selector,
      frameSelectors: options?.frameSelectors,
    }, timeoutMs) as
      | { validation?: BrowserExtensionFormValidationSummary }
      | undefined;
    return {
      sessionId,
      selector,
      frameSelectors: options?.frameSelectors,
      validation: result?.validation
    };
  }

  async formFillMany(
    sessionId: string,
    fields: Array<{ selector: string; value: string }>,
    frameSelectors?: string[],
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    const normalizedFields = fields
      .filter((entry) => typeof entry.selector === 'string' && entry.selector.trim().length > 0)
      .map((entry) => ({ selector: entry.selector, value: entry.value ?? '', frameSelectors }));
    const result = await this.dispatchAndWait(sessionId, 'form_fill_many', { fields: normalizedFields }, timeoutMs) as
      | { fields?: Array<BrowserExtensionElementSummary & { filled?: boolean }>; count?: number }
      | undefined;
    const fieldsResult = result?.fields ?? [];
    return {
      sessionId,
      frameSelectors,
      count: result?.count ?? fieldsResult.length ?? 0,
      fields: fieldsResult,
      requested: normalizedFields
    };
  }

  async listFormFields(sessionId: string, frameSelectors?: string[], limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const contexts = await this.resolveFrameContexts(sessionId, frameSelectors, timeoutMs);
    const fields = this.mergeFrameScopedItems(
      (await Promise.all(contexts.map(async (context) => {
        const result = await this.dispatchAndWait(sessionId, 'form_fields', { frameSelectors: context, limit }, timeoutMs) as
          | { fields?: BrowserExtensionFormFieldSummary[]; count?: number }
          | undefined;
        return (result?.fields ?? []).map((field) => ({
          ...field,
          frameSelectors: field.frameSelectors ?? context
        }));
      }))).flat(),
      limit
    );
    return {
      sessionId,
      frameSelectors,
      count: fields.length,
      fields
    };
  }

  async listFormContexts(sessionId: string, frameSelectors?: string[], limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const contexts = await this.resolveFrameContexts(sessionId, frameSelectors, timeoutMs);
    const resolvedContexts = this.mergeFrameScopedItems(
      (await Promise.all(contexts.map(async (context) => {
        const result = await this.dispatchAndWait(sessionId, 'form_contexts', { frameSelectors: context, limit }, timeoutMs) as
          | { contexts?: BrowserExtensionFormContextSummary[]; count?: number }
          | undefined;
        return (result?.contexts ?? []).map((entry) => ({
          ...entry,
          frameSelectors: entry.frameSelectors ?? context,
          selector: entry.formSelector ?? `${normalizeFrameContextKey(context)}::form_context`
        }));
      }))).flat() as Array<BrowserExtensionFormContextSummary & { selector: string }>,
      limit
    ).map(({ selector: _selector, ...context }) => context as BrowserExtensionFormContextSummary);
    return {
      sessionId,
      frameSelectors,
      count: resolvedContexts.length,
      contexts: resolvedContexts
    };
  }

  async listRadioGroups(sessionId: string, frameSelectors?: string[], limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const contexts = await this.resolveFrameContexts(sessionId, frameSelectors, timeoutMs);
    const groups = this.mergeFrameScopedItems(
      (await Promise.all(contexts.map(async (context) => {
        const result = await this.dispatchAndWait(sessionId, 'form_radio_groups', { frameSelectors: context, limit }, timeoutMs) as
          | { groups?: BrowserExtensionRadioGroupSummary[]; count?: number }
          | undefined;
        return (result?.groups ?? []).map((group) => ({
          ...group,
          frameSelectors: group.frameSelectors ?? context,
          selector: `${group.formSelector ?? ''}::${group.name ?? group.options.map((option) => option.label ?? option.value ?? option.selector).join('|')}`
        }));
      }))).flat() as Array<BrowserExtensionRadioGroupSummary & { selector: string }>,
      limit
    ).map(({ selector: _selector, ...group }) => group as BrowserExtensionRadioGroupSummary);
    return {
      sessionId,
      frameSelectors,
      count: groups.length,
      groups
    };
  }

  async listSegmentedGroups(sessionId: string, frameSelectors?: string[], limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const contexts = await this.resolveFrameContexts(sessionId, frameSelectors, timeoutMs);
    const groups = this.mergeFrameScopedItems(
      (await Promise.all(contexts.map(async (context) => {
        const result = await this.dispatchAndWait(sessionId, 'form_segmented_options', { frameSelectors: context, limit }, timeoutMs) as
          | { groups?: BrowserExtensionSegmentedGroupSummary[]; count?: number }
          | undefined;
        return (result?.groups ?? []).map((group) => ({
          ...group,
          frameSelectors: group.frameSelectors ?? context,
          selector: group.selector ?? `${group.formSelector ?? ''}::${group.label ?? group.options.map((option) => option.label ?? option.value ?? option.selector).join('|')}`
        }));
      }))).flat() as Array<BrowserExtensionSegmentedGroupSummary & { selector: string }>,
      limit
    ).map(({ selector: _selector, ...group }) => group as BrowserExtensionSegmentedGroupSummary);
    return {
      sessionId,
      frameSelectors,
      count: groups.length,
      groups
    };
  }

  async listTablists(sessionId: string, frameSelectors?: string[], limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const contexts = await this.resolveFrameContexts(sessionId, frameSelectors, timeoutMs);
    const groups = this.mergeFrameScopedItems(
      (await Promise.all(contexts.map(async (context) => {
        const result = await this.dispatchAndWait(sessionId, 'form_tablist_options', { frameSelectors: context, limit }, timeoutMs) as
          | { groups?: BrowserExtensionTablistSummary[]; count?: number }
          | undefined;
        return (result?.groups ?? []).map((group) => ({
          ...group,
          frameSelectors: group.frameSelectors ?? context,
          selector: group.selector ?? `${group.formSelector ?? ''}::${group.label ?? group.options.map((option) => option.label ?? option.value ?? option.selector).join('|')}`
        }));
      }))).flat() as Array<BrowserExtensionTablistSummary & { selector: string }>,
      limit
    ).map(({ selector: _selector, ...group }) => group as BrowserExtensionTablistSummary);
    return {
      sessionId,
      frameSelectors,
      count: groups.length,
      groups
    };
  }

  async listSteppers(sessionId: string, frameSelectors?: string[], limit = 50, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const contexts = await this.resolveFrameContexts(sessionId, frameSelectors, timeoutMs);
    const steppers = this.mergeFrameScopedItems(
      (await Promise.all(contexts.map(async (context) => {
        const result = await this.dispatchAndWait(sessionId, 'form_stepper', { frameSelectors: context, limit }, timeoutMs) as
          | { steppers?: BrowserExtensionStepperSummary[]; count?: number }
          | undefined;
        return (result?.steppers ?? []).map((entry) => ({
          ...entry,
          frameSelectors: entry.frameSelectors ?? context,
          selector: entry.selector ?? `${entry.formSelector ?? ''}::${entry.label ?? entry.next?.label ?? entry.previous?.label ?? 'stepper'}`
        }));
      }))).flat() as Array<BrowserExtensionStepperSummary & { selector: string }>,
      limit
    ).map(({ selector: _selector, ...entry }) => entry as BrowserExtensionStepperSummary);
    return {
      sessionId,
      frameSelectors,
      count: steppers.length,
      steppers
    };
  }

  async findFormField(
    sessionId: string,
    query: string,
    frameSelectors?: string[],
    exact = false,
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS,
    preferredFormSelector?: string
  ) {
    const contexts = await this.resolveFrameContexts(sessionId, frameSelectors, timeoutMs);
    let field: (BrowserExtensionFormFieldSummary & { matchedBy?: string; query?: string }) | undefined;
    for (const context of contexts) {
      try {
        const result = await this.dispatchAndWait(sessionId, 'form_find_field', {
          query,
          frameSelectors: context,
          exact,
          preferredFormSelector
        }, timeoutMs) as
          | { field?: BrowserExtensionFormFieldSummary & { matchedBy?: string; query?: string }; selector?: string }
          | undefined;
        const candidate = result?.field ?? ((result?.selector) ? result as BrowserExtensionFormFieldSummary & { matchedBy?: string; query?: string } : undefined);
        if (candidate) {
          field = {
            ...candidate,
            frameSelectors: candidate.frameSelectors ?? context
          };
          break;
        }
      } catch {
        // Try the next same-origin frame context.
      }
    }
    return {
      sessionId,
      query,
      frameSelectors,
      exact,
      field
    };
  }

  async listFormOptions(
    sessionId: string,
    selector: string,
    frameSelectors?: string[],
    limit = 100,
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_options', { selector, frameSelectors, limit }, timeoutMs) as
      | { options?: BrowserExtensionSelectOptionSummary[] }
      | undefined;
    return {
      sessionId,
      selector,
      frameSelectors,
      options: result?.options ?? []
    };
  }

  async selectRadioOption(
    sessionId: string,
    query: string,
    option: string,
    options?: {
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_radio_select', {
      query,
      option,
      exact: options?.exact,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.preferredFormSelector
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean }; option?: unknown; group?: BrowserExtensionRadioGroupSummary; selector?: string; filled?: boolean }
      | undefined;
    const field = result?.field ?? ((result?.selector || result?.filled) ? result as BrowserExtensionElementSummary & { filled?: boolean } : undefined);
    return {
      sessionId,
      query,
      optionQuery: option,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector,
      filled: field?.filled === true,
      field,
      group: result?.group,
      option: result?.option
    };
  }

  async toggleControl(
    sessionId: string,
    query: string,
    options?: {
      desiredState?: 'on' | 'off' | 'toggle';
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_toggle', {
      query,
      desiredState: options?.desiredState,
      exact: options?.exact,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.preferredFormSelector
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { field?: BrowserExtensionElementSummary & { checked?: boolean; changed?: boolean; desiredState?: string }; selector?: string; changed?: boolean }
      | undefined;
    const field = result?.field ?? ((result?.selector || result?.changed !== undefined) ? result as BrowserExtensionElementSummary & { checked?: boolean; changed?: boolean; desiredState?: string } : undefined);
    return {
      sessionId,
      query,
      desiredState: options?.desiredState ?? 'toggle',
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector,
      field
    };
  }

  async selectSegmentedOption(
    sessionId: string,
    query: string,
    option: string,
    options?: {
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_segmented_select', {
      query,
      option,
      exact: options?.exact,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.preferredFormSelector
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { field?: BrowserExtensionElementSummary & { clicked?: boolean }; option?: unknown; group?: BrowserExtensionSegmentedGroupSummary; selector?: string }
      | undefined;
    const field = result?.field ?? ((result?.selector) ? result as BrowserExtensionElementSummary & { clicked?: boolean } : undefined);
    return {
      sessionId,
      query,
      optionQuery: option,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector,
      field,
      group: result?.group,
      option: result?.option
    };
  }

  async selectTablistOption(
    sessionId: string,
    query: string,
    option: string,
    options?: {
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_tablist_select', {
      query,
      option,
      exact: options?.exact,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.preferredFormSelector
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { field?: BrowserExtensionElementSummary & { clicked?: boolean }; option?: unknown; group?: BrowserExtensionTablistSummary; selector?: string }
      | undefined;
    const field = result?.field ?? ((result?.selector) ? result as BrowserExtensionElementSummary & { clicked?: boolean } : undefined);
    return {
      sessionId,
      query,
      optionQuery: option,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector,
      field,
      group: result?.group,
      option: result?.option
    };
  }

  async moveStepper(
    sessionId: string,
    direction: 'next' | 'previous',
    options?: {
      query?: string;
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_stepper_move', {
      query: options?.query,
      direction,
      exact: options?.exact,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.preferredFormSelector
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { field?: BrowserExtensionElementSummary & { clicked?: boolean }; control?: unknown; group?: BrowserExtensionStepperSummary; selector?: string }
      | undefined;
    const field = result?.field ?? ((result?.selector) ? result as BrowserExtensionElementSummary & { clicked?: boolean } : undefined);
    return {
      sessionId,
      direction,
      query: options?.query,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector,
      field,
      control: result?.control,
      group: result?.group
    };
  }

  async setTypedFieldByQuery(
    sessionId: string,
    kind: 'form_date_set' | 'form_time_set' | 'form_datetime_set',
    query: string,
    value: string,
    options?: {
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, kind, {
      query,
      value,
      exact: options?.exact,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.preferredFormSelector
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean; matchedBy?: string; query?: string; expectedType?: string }; selector?: string; filled?: boolean }
      | undefined;
    const field = result?.field ?? ((result?.selector || result?.filled !== undefined) ? result as BrowserExtensionElementSummary & { filled?: boolean; matchedBy?: string; query?: string; expectedType?: string } : undefined);
    return {
      sessionId,
      query,
      value,
      field,
      filled: field?.filled === true,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector
    };
  }

  async setRangeByQuery(
    sessionId: string,
    query: string,
    value: string,
    options?: {
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_range_set', {
      query,
      value,
      exact: options?.exact,
      frameSelectors: options?.frameSelectors,
      preferredFormSelector: options?.preferredFormSelector
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean; matchedBy?: string; query?: string }; selector?: string; filled?: boolean }
      | undefined;
    const field = result?.field ?? ((result?.selector || result?.filled !== undefined) ? result as BrowserExtensionElementSummary & { filled?: boolean; matchedBy?: string; query?: string } : undefined);
    return {
      sessionId,
      query,
      value,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector,
      filled: field?.filled === true,
      field
    };
  }

  async selectFormOption(
    sessionId: string,
    selector: string,
    option: string,
    by: 'text' | 'value' | 'label' = 'text',
    frameSelectors?: string[],
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_select', { selector, option, by, frameSelectors }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean }; option?: BrowserExtensionSelectOptionSummary; selector?: string; filled?: boolean }
      | undefined;
    const field = result?.field ?? ((result?.selector || result?.filled) ? result as BrowserExtensionElementSummary & { filled?: boolean } : undefined);
    return {
      sessionId,
      selector,
      optionQuery: option,
      by,
      frameSelectors,
      filled: field?.filled === true,
      field,
      option: result?.option
    };
  }

  async fillFormFieldByLabel(
    sessionId: string,
    query: string,
    value: string,
    frameSelectors?: string[],
    exact = false,
    timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS
  ) {
    const result = await this.dispatchAndWait(sessionId, 'form_fill_label', { query, value, frameSelectors, exact }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean; matchedBy?: string; query?: string }; selector?: string; value?: string; filled?: boolean }
      | undefined;
    const field = result?.field ?? ((result?.selector || result?.value || result?.filled) ? result as BrowserExtensionElementSummary & { filled?: boolean; matchedBy?: string; query?: string } : undefined);
    return {
      sessionId,
      query,
      value,
      frameSelectors,
      exact,
      filled: field?.filled === true,
      field
    };
  }

  async fillFormFieldByQuery(
    sessionId: string,
    query: string,
    value: string,
    options?: {
      frameSelectors?: string[];
      exact?: boolean;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const field = await this.findFormField(
      sessionId,
      query,
      options?.frameSelectors,
      options?.exact,
      options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
      options?.preferredFormSelector
    );
    const selector = field.field?.selector;
    if (!selector) {
      throw new Error(`No browser-extension form field matched query: ${query}`);
    }
    const filled = await this.formFillInFrames(
      sessionId,
      selector,
      value,
      options?.frameSelectors,
      options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS
    );
    return {
      sessionId,
      query,
      value,
      frameSelectors: options?.frameSelectors,
      exact: options?.exact ?? false,
      formSelector: options?.preferredFormSelector,
      match: field.field,
      filled
    };
  }

  async uploadFormFile(
    sessionId: string,
    selector: string,
    filepath: string,
    options?: {
      frameSelectors?: string[];
      filename?: string;
      mimeType?: string;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const file = Bun.file(filepath);
    if (!(await file.exists())) {
      throw new Error(`File was not found for browser-extension upload: ${filepath}`);
    }
    const data = Buffer.from(await file.arrayBuffer()).toString('base64');
    const filename = options?.filename ?? path.basename(filepath);
    const mimeType = options?.mimeType ?? file.type ?? 'application/octet-stream';
    const result = await this.dispatchAndWait(sessionId, 'form_upload', {
      selector,
      fileName: filename,
      mimeType,
      fileData: data,
      lastModified: Date.now(),
      frameSelectors: options?.frameSelectors
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean; uploadedFile?: BrowserExtensionUploadedFileSummary } }
      | undefined;
    return {
      sessionId,
      selector,
      filepath,
      frameSelectors: options?.frameSelectors,
      filename,
      mimeType,
      uploaded: result?.field?.filled === true,
      field: result?.field,
      uploadedFile: result?.field?.uploadedFile
    };
  }

  async listFormComboboxOptions(
    sessionId: string,
    selector: string,
    options?: {
      frameSelectors?: string[];
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'form_combobox_options', {
      selector,
      frameSelectors: options?.frameSelectors,
      limit: options?.limit
    }, timeoutMs) as
      | { options?: BrowserExtensionSelectOptionSummary[] }
      | undefined;
    return {
      sessionId,
      selector,
      frameSelectors: options?.frameSelectors,
      options: result?.options ?? []
    };
  }

  async selectFormComboboxOption(
    sessionId: string,
    selector: string,
    option: string,
    options?: {
      frameSelectors?: string[];
      match?: 'exact' | 'includes';
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'form_combobox_select', {
      selector,
      option,
      match: options?.match,
      frameSelectors: options?.frameSelectors
    }, timeoutMs) as
      | { field?: BrowserExtensionElementSummary & { filled?: boolean }; option?: BrowserExtensionSelectOptionSummary }
      | undefined;
    return {
      sessionId,
      selector,
      optionQuery: option,
      match: options?.match ?? 'includes',
      frameSelectors: options?.frameSelectors,
      filled: result?.field?.filled === true,
      field: result?.field,
      option: result?.option
    };
  }

  async formSubmit(sessionId: string, selector?: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS, frameSelectors?: string[]) {
    const result = await this.dispatchAndWait(sessionId, 'form_submit', { selector, frameSelectors }, timeoutMs) as
      | { submitted?: boolean; method?: 'click' | 'requestSubmit' | 'submit'; selector?: string; formAction?: string }
      | undefined;
    return {
      sessionId,
      selector,
      frameSelectors,
      submitted: result?.submitted === true,
      method: result?.method,
      resolvedSelector: result?.selector,
      formAction: result?.formAction
    };
  }

  async formSubmitAndWait(
    sessionId: string,
    options?: {
      selector?: string;
      frameSelectors?: string[];
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'form_submit_wait', {
      selector: options?.selector,
      frameSelectors: options?.frameSelectors,
      waitUrlIncludes: options?.waitUrlIncludes,
      waitText: options?.waitText,
      waitSelector: options?.waitSelector,
      waitNoSelector: options?.waitNoSelector,
      intervalMs: options?.intervalMs
    }, timeoutMs) as
      | {
          submitted?: boolean;
          method?: 'click' | 'requestSubmit' | 'submit';
          selector?: string;
          formAction?: string;
          matched?: { urlIncludes?: boolean; text?: boolean; selector?: boolean; noSelector?: boolean };
          snapshot?: BrowserExtensionSnapshot;
        }
      | undefined;
    return {
      sessionId,
      ...options,
      submitted: result?.submitted === true,
      method: result?.method,
      resolvedSelector: result?.selector,
      formAction: result?.formAction,
      matched: result?.matched,
      snapshot: result?.snapshot
    };
  }

  private async fillFieldByQueries(
    sessionId: string,
    queries: string[],
    value: string,
    options?: {
      frameSelectors?: string[];
      exact?: boolean;
      humanLike?: boolean;
      delayMs?: number;
      jitterMs?: number;
      timeoutMs?: number;
      preferredFormSelector?: string;
    }
  ) {
    const availableFields = await this.listFormFields(
      sessionId,
      options?.frameSelectors,
      200,
      options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS
    );
    for (const query of queries) {
      const field = availableFields.fields.find((candidate) => {
        if (options?.preferredFormSelector && candidate.formSelector !== options.preferredFormSelector) {
          return false;
        }
        return Boolean(queryMatchesField(candidate, query, options?.exact));
      });
      if (!field?.selector) {
        continue;
      }
      const humanLike = options?.humanLike !== false;
      if (humanLike) {
        const pauses = Math.max(1, Math.min(String(value).length || 1, 12));
        for (let index = 0; index < pauses; index += 1) {
          await delay(resolveHumanDelay(options?.delayMs, options?.jitterMs));
        }
      }
      const filled = await this.formFillInFrames(sessionId, field.selector, value, options?.frameSelectors, options?.timeoutMs);
      if (filled.filled) {
        return {
          query,
          matchedBy: queryMatchesField(field, query, options?.exact),
          selector: field.selector,
          formSelector: field.formSelector,
          result: {
            ...filled,
            humanLike
          }
        };
      }
    }
    return undefined;
  }

  async authLogin(
    sessionId: string,
    options: {
      email?: string;
      username?: string;
      password: string;
      frameSelectors?: string[];
      delayMs?: number;
      jitterMs?: number;
      humanLike?: boolean;
      skipSubmit?: boolean;
      submitSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_AUTH_WORKFLOW_TIMEOUT_MS;
    const steps: Array<Record<string, unknown>> = [];
    const identityValue = options.email ?? options.username;
    if (!identityValue) {
      throw new Error('auth login requires --email or --username');
    }
    const identityQueries = options.email
      ? ['email', 'e-mail', 'email address', 'username', 'user name', 'login']
      : ['username', 'user name', 'login', 'email', 'e-mail'];
    const identity = await this.fillFieldByQueries(sessionId, identityQueries, identityValue, {
      frameSelectors: options.frameSelectors,
      humanLike: options.humanLike,
      delayMs: options.delayMs,
      jitterMs: options.jitterMs,
      timeoutMs
    });
    if (!identity) {
      throw new Error('Could not locate a login identity field');
    }
    steps.push({ kind: 'identity', ...identity });
    const preferredFormSelector = identity.formSelector;
    const password = await this.fillFieldByQueries(sessionId, ['password', 'passcode'], options.password, {
      frameSelectors: options.frameSelectors,
      humanLike: options.humanLike,
      delayMs: options.delayMs,
      jitterMs: options.jitterMs,
      timeoutMs,
      preferredFormSelector
    });
    if (!password) {
      throw new Error('Could not locate a password field');
    }
    steps.push({ kind: 'password', ...password });
    if (options.humanLike !== false) {
      await delay(resolveHumanDelay(options.delayMs, options.jitterMs));
    }
    if (options.skipSubmit) {
      return { sessionId, submitted: false, skippedSubmit: true, steps };
    }
    const submitResult = await this.formSubmitAndWait(sessionId, {
      selector: options.submitSelector ?? (preferredFormSelector
        ? `${preferredFormSelector} button[type="submit"], ${preferredFormSelector} input[type="submit"], ${preferredFormSelector} button, ${preferredFormSelector} [role="button"]`
        : undefined),
      frameSelectors: options.frameSelectors,
      waitUrlIncludes: options.waitUrlIncludes,
      waitText: options.waitText,
      waitSelector: options.waitSelector,
      waitNoSelector: options.waitNoSelector,
      timeoutMs,
      intervalMs: options.intervalMs
    });
    return {
      sessionId,
      submitted: submitResult.submitted,
      steps,
      submit: submitResult
    };
  }

  async authSignup(
    sessionId: string,
    options: {
      fullName?: string;
      username?: string;
      email?: string;
      password: string;
      confirmPassword?: string;
      frameSelectors?: string[];
      delayMs?: number;
      jitterMs?: number;
      humanLike?: boolean;
      skipSubmit?: boolean;
      submitSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options.timeoutMs ?? DEFAULT_AUTH_WORKFLOW_TIMEOUT_MS;
    const steps: Array<Record<string, unknown>> = [];
    let preferredFormSelector: string | undefined;
    if (options.fullName) {
      const nameResult = await this.fillFieldByQueries(sessionId, ['full name', 'name', 'display name'], options.fullName, {
        frameSelectors: options.frameSelectors,
        humanLike: options.humanLike,
        delayMs: options.delayMs,
        jitterMs: options.jitterMs,
        timeoutMs
      });
      if (nameResult) {
        steps.push({ kind: 'full_name', ...nameResult });
        preferredFormSelector ??= nameResult.formSelector;
      }
    }
    if (options.username) {
      const usernameResult = await this.fillFieldByQueries(sessionId, ['username', 'user name', 'handle', 'login'], options.username, {
        frameSelectors: options.frameSelectors,
        humanLike: options.humanLike,
        delayMs: options.delayMs,
        jitterMs: options.jitterMs,
        timeoutMs,
        preferredFormSelector
      });
      if (usernameResult) {
        steps.push({ kind: 'username', ...usernameResult });
        preferredFormSelector ??= usernameResult.formSelector;
      }
    }
    if (options.email) {
      const emailResult = await this.fillFieldByQueries(sessionId, ['email', 'e-mail', 'email address'], options.email, {
        frameSelectors: options.frameSelectors,
        humanLike: options.humanLike,
        delayMs: options.delayMs,
        jitterMs: options.jitterMs,
        timeoutMs,
        preferredFormSelector
      });
      if (!emailResult) {
        throw new Error('Could not locate an email field for signup');
      }
      steps.push({ kind: 'email', ...emailResult });
      preferredFormSelector ??= emailResult.formSelector;
    }
    const passwordResult = await this.fillFieldByQueries(sessionId, ['password', 'create password', 'new password'], options.password, {
      frameSelectors: options.frameSelectors,
      humanLike: options.humanLike,
      delayMs: options.delayMs,
      jitterMs: options.jitterMs,
      timeoutMs,
      preferredFormSelector
    });
    if (!passwordResult) {
      throw new Error('Could not locate a signup password field');
    }
    steps.push({ kind: 'password', ...passwordResult });
    if (options.confirmPassword) {
      const confirmResult = await this.fillFieldByQueries(sessionId, ['confirm password', 'repeat password', 'password confirmation'], options.confirmPassword, {
        frameSelectors: options.frameSelectors,
        humanLike: options.humanLike,
        delayMs: options.delayMs,
        jitterMs: options.jitterMs,
        timeoutMs,
        preferredFormSelector
      });
      if (confirmResult) {
        steps.push({ kind: 'confirm_password', ...confirmResult });
      }
    }
    if (options.humanLike !== false) {
      await delay(resolveHumanDelay(options.delayMs, options.jitterMs));
    }
    if (options.skipSubmit) {
      return { sessionId, submitted: false, skippedSubmit: true, steps };
    }
    const submitResult = await this.formSubmitAndWait(sessionId, {
      selector: options.submitSelector ?? (preferredFormSelector
        ? `${preferredFormSelector} button[type="submit"], ${preferredFormSelector} input[type="submit"], ${preferredFormSelector} button, ${preferredFormSelector} [role="button"]`
        : undefined),
      frameSelectors: options.frameSelectors,
      waitUrlIncludes: options.waitUrlIncludes,
      waitText: options.waitText,
      waitSelector: options.waitSelector,
      waitNoSelector: options.waitNoSelector,
      timeoutMs,
      intervalMs: options.intervalMs
    });
    return {
      sessionId,
      submitted: submitResult.submitted,
      steps,
      submit: submitResult
    };
  }

  async cookies(sessionId: string, targetUrl?: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'cookies', { targetUrl }, timeoutMs) as
      | { cookies?: BrowserExtensionCookie[]; url?: string }
      | undefined;
    return {
      sessionId,
      url: result?.url ?? targetUrl,
      cookies: result?.cookies ?? []
    };
  }

  async getCookie(
    sessionId: string,
    name: string,
    options?: {
      targetUrl?: string;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'cookie_get', {
      name,
      targetUrl: options?.targetUrl
    }, timeoutMs) as
      | { url?: string; found?: boolean; cookie?: BrowserExtensionCookie }
      | undefined;
    return {
      sessionId,
      url: result?.url ?? options?.targetUrl,
      name,
      found: result?.found === true,
      cookie: result?.cookie
    };
  }

  async setCookie(
    sessionId: string,
    name: string,
    value: string,
    options?: {
      targetUrl?: string;
      domain?: string;
      path?: string;
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: 'no_restriction' | 'lax' | 'strict' | 'unspecified';
      expirationDate?: number;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'cookie_set', {
      name,
      value,
      targetUrl: options?.targetUrl,
      domain: options?.domain,
      path: options?.path,
      secure: options?.secure,
      httpOnly: options?.httpOnly,
      sameSite: options?.sameSite,
      expirationDate: options?.expirationDate
    }, timeoutMs) as
      | { url?: string; updated?: boolean; cookie?: BrowserExtensionCookie }
      | undefined;
    return {
      sessionId,
      url: result?.url ?? options?.targetUrl,
      name,
      value,
      updated: result?.updated === true,
      cookie: result?.cookie
    };
  }

  async removeCookie(
    sessionId: string,
    name: string,
    options?: {
      targetUrl?: string;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'cookie_remove', {
      name,
      targetUrl: options?.targetUrl
    }, timeoutMs) as
      | { url?: string; removed?: boolean; name?: string }
      | undefined;
    return {
      sessionId,
      url: result?.url ?? options?.targetUrl,
      name: result?.name ?? name,
      removed: result?.removed === true
    };
  }

  async listDownloads(
    sessionId: string,
    options?: {
      query?: string;
      state?: 'in_progress' | 'interrupted' | 'complete';
      limit?: number;
      exact?: boolean;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'downloads', {
      query: options?.query,
      state: options?.state,
      limit: options?.limit,
      exact: options?.exact
    }, timeoutMs) as
      | { downloads?: BrowserExtensionDownloadSummary[] }
      | undefined;
    return {
      sessionId,
      query: options?.query,
      state: options?.state,
      limit: options?.limit,
      exact: options?.exact ?? false,
      count: result?.downloads?.length ?? 0,
      downloads: result?.downloads ?? []
    };
  }

  async cancelDownload(
    sessionId: string,
    query?: string,
    options?: { exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'download_cancel', {
      query,
      exact: options?.exact
    }, timeoutMs) as
      | { cancelled?: boolean; download?: BrowserExtensionDownloadSummary }
      | undefined;
    return {
      sessionId,
      query,
      exact: options?.exact ?? false,
      cancelled: result?.cancelled === true,
      download: result?.download
    };
  }

  async eraseDownload(
    sessionId: string,
    query?: string,
    options?: { exact?: boolean; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'download_erase', {
      query,
      exact: options?.exact
    }, timeoutMs) as
      | { erased?: boolean; erasedCount?: number; download?: BrowserExtensionDownloadSummary }
      | undefined;
    return {
      sessionId,
      query,
      exact: options?.exact ?? false,
      erased: result?.erased === true,
      erasedCount: result?.erasedCount ?? 0,
      download: result?.download
    };
  }

  async listDomEvents(
    sessionId: string,
    options?: {
      limit?: number;
      mutationType?: 'childList' | 'attributes' | 'characterData';
      textIncludes?: string;
      timeoutMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'dom_events', {}, timeoutMs) as
      | { domEvents?: BrowserExtensionDomEvent[] }
      | undefined;
    const session = this.readPersisted().providers?.browserExtension?.sessions?.[sessionId];
    const domEvents = Array.isArray(result?.domEvents) ? result.domEvents : (session?.domEvents ?? []);
    if (session && Array.isArray(result?.domEvents)) {
      this.withPersistedMutation((persisted) => {
        const provider = this.ensureProvider(persisted);
        const existing = provider.sessions?.[sessionId];
        if (existing) {
          provider.sessions![sessionId] = {
            ...existing,
            domEvents,
            updatedAt: nowIso()
          };
        }
      });
    }
    const events = filterDomEvents(domEvents, options);
    return {
      sessionId,
      count: events.length,
      totalCount: domEvents.length,
      events
    };
  }

  async clearDomEvents(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'clear_dom_events', {}, timeoutMs) as
      | { cleared?: number; domEvents?: BrowserExtensionDomEvent[] }
      | undefined;
    return {
      sessionId,
      cleared: result?.cleared ?? 0,
      remaining: result?.domEvents?.length ?? 0
    };
  }

  listNetworkEvents(
    sessionId: string,
    options?: {
      limit?: number;
      urlIncludes?: string;
      stage?: 'request' | 'response' | 'error';
      method?: string;
    }
  ) {
    const session = this.requireSession(sessionId);
    let events = [...(session.networkEvents ?? [])];
    if (options?.urlIncludes) {
      events = events.filter((event) => event.url.includes(options.urlIncludes!));
    }
    if (options?.stage) {
      events = events.filter((event) => event.stage === options.stage);
    }
    if (options?.method) {
      const expected = options.method.toUpperCase();
      events = events.filter((event) => (event.method ?? '').toUpperCase() === expected);
    }
    if (options?.limit && options.limit > 0) {
      events = events.slice(-options.limit);
    }
    return {
      sessionId,
      count: events.length,
      totalCount: session.networkEvents?.length ?? 0,
      events
    };
  }

  async clearNetworkEvents(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'clear_network_events', {}, timeoutMs) as
      | { cleared?: number; networkEvents?: BrowserExtensionNetworkEvent[] }
      | undefined;
    return {
      sessionId,
      cleared: result?.cleared ?? 0,
      remaining: result?.networkEvents?.length ?? 0
    };
  }

  listSessionEvents(
    sessionId: string,
    options?: {
      limit?: number;
      kind?: string;
      ok?: boolean;
    }
  ) {
    const session = this.requireSession(sessionId);
    let events = [...(session.events ?? [])];
    if (options?.kind) {
      events = events.filter((event) => event.kind === options.kind);
    }
    if (typeof options?.ok === 'boolean') {
      events = events.filter((event) => event.ok === options.ok);
    }
    if (options?.limit && options.limit > 0) {
      events = events.slice(-options.limit);
    }
    return {
      sessionId,
      count: events.length,
      totalCount: session.events?.length ?? 0,
      events
    };
  }

  clearSessionEvents(sessionId: string) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const session = provider.sessions?.[sessionId];
      if (!session) {
        throw new Error(`Unknown browser-extension session: ${sessionId}`);
      }
      const cleared = session.events?.length ?? 0;
      provider.sessions![sessionId] = {
        ...session,
        events: [],
        updatedAt: nowIso()
      };
      return {
        sessionId,
        cleared,
        remaining: 0
      };
    });
  }

  async waitForText(
    sessionId: string,
    needle: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const normalizedNeedle = needle.trim();
    if (!normalizedNeedle) {
      throw new Error('A non-empty text needle is required for browser-extension wait-text');
    }
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(200, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let lastSnapshot: BrowserExtensionSnapshot | undefined;
    while (Date.now() < deadline) {
      const result = await this.snapshot(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, Math.max(2_000, intervalMs))) as
        | { sessionId: string; snapshot?: BrowserExtensionSnapshot }
        | undefined;
      lastSnapshot = result?.snapshot;
      if ((lastSnapshot?.text ?? '').includes(normalizedNeedle)) {
        return {
          sessionId,
          needle: normalizedNeedle,
          matched: true,
          timedOut: false,
          snapshot: lastSnapshot
        };
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      needle: normalizedNeedle,
      matched: false,
      timedOut: true,
      snapshot: lastSnapshot
    };
  }

  async waitForUrl(
    sessionId: string,
    needle: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const normalizedNeedle = needle.trim();
    if (!normalizedNeedle) {
      throw new Error('A non-empty URL needle is required for browser-extension wait-url');
    }
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(200, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let lastSnapshot: BrowserExtensionSnapshot | undefined;
    while (Date.now() < deadline) {
      const result = await this.snapshot(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, Math.max(2_000, intervalMs))) as
        | { sessionId: string; snapshot?: BrowserExtensionSnapshot }
        | undefined;
      lastSnapshot = result?.snapshot;
      if ((lastSnapshot?.url ?? '').includes(normalizedNeedle)) {
        return {
          sessionId,
          needle: normalizedNeedle,
          matched: true,
          timedOut: false,
          snapshot: lastSnapshot
        };
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      needle: normalizedNeedle,
      matched: false,
      timedOut: true,
      snapshot: lastSnapshot
    };
  }

  async waitForSelector(
    sessionId: string,
    selector: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const normalizedSelector = selector.trim();
    if (!normalizedSelector) {
      throw new Error('A non-empty selector is required for browser-extension wait-selector');
    }
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(200, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let lastElement: BrowserExtensionElementSummary | undefined;
    while (Date.now() < deadline) {
      try {
        const result = await this.inspect(sessionId, normalizedSelector, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, Math.max(2_000, intervalMs))) as
          | { sessionId: string; selector: string; element?: BrowserExtensionElementSummary }
          | undefined;
        lastElement = result?.element;
        if (lastElement) {
          return {
            sessionId,
            selector: normalizedSelector,
            matched: true,
            timedOut: false,
            element: lastElement
          };
        }
      } catch {
        // Ignore transient inspect failures while polling for appearance.
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      selector: normalizedSelector,
      matched: false,
      timedOut: true,
      element: lastElement
    };
  }

  async waitForNoSelector(
    sessionId: string,
    selector: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const normalizedSelector = selector.trim();
    if (!normalizedSelector) {
      throw new Error('A non-empty selector is required for browser-extension wait-no-selector');
    }
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(200, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let lastElement: BrowserExtensionElementSummary | undefined;
    while (Date.now() < deadline) {
      try {
        const result = await this.inspect(sessionId, normalizedSelector, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, Math.max(2_000, intervalMs))) as
          | { sessionId: string; selector: string; element?: BrowserExtensionElementSummary }
          | undefined;
        lastElement = result?.element;
        if (!lastElement) {
          return {
            sessionId,
            selector: normalizedSelector,
            missing: true,
            timedOut: false
          };
        }
      } catch {
        return {
          sessionId,
          selector: normalizedSelector,
          missing: true,
          timedOut: false
        };
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      selector: normalizedSelector,
      missing: false,
      timedOut: true,
      element: lastElement
    };
  }

  async xSearch(
    sessionId: string,
    query: string,
    options?: {
      mode?: 'top' | 'latest' | 'live' | 'people' | 'media';
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const normalizedMode = (options?.mode ?? 'top') === 'latest' ? 'live' : (options?.mode ?? 'top');
    this.supersedeQueuedCommands(sessionId, ['x_search'], 'Superseded by a newer x_search request');
    const result = await this.dispatchAndWait(sessionId, 'x_search', {
      query,
      mode: normalizedMode,
      limit: options?.limit ?? 10
    }, options?.timeoutMs ?? 45_000) as
      | { url?: string; posts?: BrowserExtensionXPost[] }
      | undefined;
    return {
      sessionId,
      query,
      mode: options?.mode ?? 'top',
      url: result?.url,
      count: result?.posts?.length ?? 0,
      posts: result?.posts ?? []
    };
  }

  async xTimeline(
    sessionId: string,
    options?: {
      timelineType?: 'for-you' | 'following';
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const timelineType = options?.timelineType === 'following' ? 'following' : 'for-you';
    const result = await this.dispatchAndWait(sessionId, 'x_timeline', {
      timelineType,
      limit: options?.limit ?? 10
    }, options?.timeoutMs ?? 45_000) as
      | { url?: string; type?: 'for-you' | 'following'; posts?: BrowserExtensionXPost[] }
      | undefined;
    return {
      sessionId,
      type: result?.type ?? timelineType,
      url: result?.url,
      count: result?.posts?.length ?? 0,
      posts: result?.posts ?? []
    };
  }

  async xBookmarks(
    sessionId: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'x_bookmarks', {
      limit: options?.limit ?? 10
    }, options?.timeoutMs ?? 45_000) as
      | { url?: string; posts?: BrowserExtensionXPost[] }
      | undefined;
    return {
      sessionId,
      url: result?.url,
      count: result?.posts?.length ?? 0,
      posts: result?.posts ?? []
    };
  }

  async xNotifications(
    sessionId: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'x_notifications', {
      limit: options?.limit ?? 10
    }, options?.timeoutMs ?? 45_000) as
      | { url?: string; posts?: BrowserExtensionXPost[] }
      | undefined;
    return {
      sessionId,
      url: result?.url,
      options: {
        limit: options?.limit,
        timeoutMs: options?.timeoutMs
      },
      count: result?.posts?.length ?? 0,
      posts: result?.posts ?? []
    };
  }

  async xMessages(
    sessionId: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'x_messages', {
      limit: options?.limit ?? 20
    }, options?.timeoutMs ?? 45_000) as
      | { url?: string; threads?: BrowserExtensionXMessageThread[] }
      | undefined;
    return {
      sessionId,
      url: result?.url,
      options: {
        limit: options?.limit,
        timeoutMs: options?.timeoutMs
      },
      count: result?.threads?.length ?? 0,
      threads: result?.threads ?? []
    };
  }

  async xOpenMessageThread(
    sessionId: string,
    thread: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const normalizedThread = thread.trim();
    if (!normalizedThread) {
      throw new Error('A non-empty thread URL or query is required for browser-extension x open-message-thread');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_open_message_thread', {
      thread: normalizedThread,
      limit: options?.limit ?? 20
    }, options?.timeoutMs ?? 20_000) as
      | { url?: string; thread?: BrowserExtensionXMessageThread; messages?: BrowserExtensionXDirectMessage[] }
      | undefined;
    return {
      sessionId,
      query: normalizedThread,
      url: result?.url,
      thread: result?.thread,
      count: result?.messages?.length ?? 0,
      messages: result?.messages ?? []
    };
  }

  async xSendMessage(
    sessionId: string,
    text: string,
    options?: {
      thread?: string;
      timeoutMs?: number;
    }
  ) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error('A non-empty direct-message text is required for browser-extension x send-message');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_send_message', {
      text: normalizedText,
      thread: options?.thread
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { url?: string; sent?: boolean; thread?: BrowserExtensionXMessageThread; messages?: BrowserExtensionXDirectMessage[] }
      | undefined;
    return {
      sessionId,
      text: normalizedText,
      query: options?.thread,
      url: result?.url,
      sent: result?.sent === true,
      thread: result?.thread,
      count: result?.messages?.length ?? 0,
      messages: result?.messages ?? []
    };
  }

  async xReadThread(
    sessionId: string,
    postUrl: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const normalizedUrl = postUrl.trim();
    if (!normalizedUrl) {
      throw new Error('A non-empty post URL is required for browser-extension x read-thread');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_read_thread', {
      postUrl: normalizedUrl,
      limit: options?.limit ?? 10
    }, options?.timeoutMs ?? 20_000) as
      | { url?: string; posts?: BrowserExtensionXPost[] }
      | undefined;
    return {
      sessionId,
      url: result?.url ?? normalizedUrl,
      options: {
        limit: options?.limit,
        timeoutMs: options?.timeoutMs
      },
      count: result?.posts?.length ?? 0,
      posts: result?.posts ?? []
    };
  }

  async xPost(sessionId: string, text: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error('A non-empty text is required for browser-extension x post');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_post', { text: normalizedText }, timeoutMs) as
      | { url?: string; sent?: boolean }
      | undefined;
    return {
      sessionId,
      text: normalizedText,
      url: result?.url,
      sent: result?.sent === true
    };
  }

  async xOpenPost(sessionId: string, postUrl: string, timeoutMs = 20_000) {
    const normalizedUrl = postUrl.trim();
    if (!normalizedUrl) {
      throw new Error('A non-empty post URL is required for browser-extension x open-post');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_open_post', {
      postUrl: normalizedUrl
    }, timeoutMs) as
      | { url?: string; post?: BrowserExtensionXPost }
      | undefined;
    return {
      sessionId,
      url: result?.url ?? normalizedUrl,
      post: result?.post
    };
  }

  async xProfile(
    sessionId: string,
    handleOrUrl: string,
    options?: {
      limit?: number;
      timeoutMs?: number;
    }
  ) {
    const normalized = handleOrUrl.trim();
    if (!normalized) {
      throw new Error('A non-empty handle or URL is required for browser-extension x profile');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_profile', {
      handleOrUrl: normalized,
      limit: options?.limit ?? 5
    }, options?.timeoutMs ?? 20_000) as
      | { url?: string; profile?: BrowserExtensionXProfile }
      | undefined;
    return {
      sessionId,
      query: normalized,
      url: result?.url,
      profile: result?.profile
    };
  }

  async xFollow(
    sessionId: string,
    handleOrUrl: string,
    options?: {
      timeoutMs?: number;
    }
  ) {
    const normalized = handleOrUrl.trim();
    if (!normalized) {
      throw new Error('A non-empty handle or URL is required for browser-extension x follow');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_follow', {
      handleOrUrl: normalized
    }, options?.timeoutMs ?? 20_000) as
      | { url?: string; followed?: boolean; alreadyFollowing?: boolean; buttonLabel?: string }
      | undefined;
    return {
      sessionId,
      query: normalized,
      url: result?.url,
      followed: result?.followed === true,
      alreadyFollowing: result?.alreadyFollowing === true,
      buttonLabel: result?.buttonLabel
    };
  }

  async xReply(
    sessionId: string,
    text: string,
    options?: {
      postUrl?: string;
      timeoutMs?: number;
    }
  ) {
    const normalizedText = text.trim();
    if (!normalizedText) {
      throw new Error('A non-empty reply text is required for browser-extension x reply');
    }
    const result = await this.dispatchAndWait(sessionId, 'x_reply', {
      text: normalizedText,
      postUrl: options?.postUrl
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { url?: string; replied?: boolean }
      | undefined;
    return {
      sessionId,
      text: normalizedText,
      url: result?.url,
      replied: result?.replied === true
    };
  }

  async xLike(sessionId: string, options?: { postUrl?: string; timeoutMs?: number }) {
    const result = await this.dispatchAndWait(sessionId, 'x_like', {
      postUrl: options?.postUrl
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { url?: string; liked?: boolean }
      | undefined;
    return {
      sessionId,
      url: result?.url,
      liked: result?.liked === true
    };
  }

  async xRepost(sessionId: string, options?: { postUrl?: string; timeoutMs?: number }) {
    const result = await this.dispatchAndWait(sessionId, 'x_repost', {
      postUrl: options?.postUrl
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { url?: string; reposted?: boolean }
      | undefined;
    return {
      sessionId,
      url: result?.url,
      reposted: result?.reposted === true
    };
  }

  async chatGptReadLatest(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_read_latest', {}, timeoutMs) as
      | { text?: string }
      | undefined;
    return {
      sessionId,
      text: result?.text ?? ''
    };
  }

  async chatGptListConversations(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_list_conversations', {
      limit: options?.limit ?? 20
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversations?: BrowserExtensionConversationSummary[] }
      | undefined;
    const conversations = result?.conversations ?? [];
    return {
      sessionId,
      count: conversations.length,
      conversations
    };
  }

  async chatGptOpenConversation(
    sessionId: string,
    options: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_open_conversation', {
      titleQuery: options.titleQuery,
      url: options.url,
      index: options.index
    }, options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary }
      | undefined;
    return {
      sessionId,
      conversation: result?.conversation
    };
  }

  async chatGptConversationActions(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_conversation_actions', {
      titleQuery: options?.titleQuery,
      url: options?.url,
      index: options?.index
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary; actions?: Array<{ title?: string; selector?: string }> }
      | undefined;
    const actions = Array.isArray(result?.actions) ? result.actions : [];
    return {
      sessionId,
      conversation: result?.conversation,
      count: actions.length,
      actions
    };
  }

  async chatGptConversationAction(
    sessionId: string,
    actionQuery: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_conversation_action', {
      actionQuery,
      titleQuery: options?.titleQuery,
      url: options?.url,
      index: options?.index
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary; action?: string }
      | undefined;
    return {
      sessionId,
      conversation: result?.conversation,
      action: result?.action
    };
  }

  async chatGptRenameConversation(
    sessionId: string,
    title: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_rename_conversation', {
      title,
      titleQuery: options?.titleQuery,
      url: options?.url,
      index: options?.index
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary; action?: string; title?: string }
      | undefined;
    return {
      sessionId,
      conversation: result?.conversation,
      action: result?.action,
      title: result?.title ?? title
    };
  }

  async chatGptReadThread(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_read_thread', {
      limit: options?.limit ?? 20
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { messages?: BrowserExtensionConversationMessage[]; latestAssistant?: string; latestUser?: string }
      | undefined;
    const messages = result?.messages ?? [];
    return {
      sessionId,
      count: messages.length,
      latestAssistant: result?.latestAssistant ?? '',
      latestUser: result?.latestUser ?? '',
      messages
    };
  }

  async chatGptReadMessage(
    sessionId: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    const thread = await this.chatGptReadThread(sessionId, {
      limit: options?.limit ?? 50,
      timeoutMs: options?.timeoutMs
    });
    const message = this.selectConversationMessage(thread.messages, options);
    return {
      sessionId,
      message,
      count: thread.count
    };
  }

  async chatGptCurrentConversation(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const info = await this.chatGptInfo(sessionId, options);
    return {
      sessionId,
      conversation: info.activeConversation,
      page: info.page,
      sidebar: info.sidebar,
      currentModel: info.currentModel,
      conversationCount: info.conversationCount,
      busy: info.busy,
      latestAssistant: info.latestAssistant,
      latestUser: info.latestUser,
      threadCount: info.threadCount
    };
  }

  async chatGptExportThread(sessionId: string, options?: { limit?: number; timeoutMs?: number; format?: 'json' | 'markdown' }) {
    const format = options?.format === 'markdown' ? 'markdown' : 'json';
    const info = await this.chatGptInfo(sessionId, options);
    const exportData = {
      sessionId,
      site: 'chatgpt.com',
      conversation: info.activeConversation,
      page: info.page,
      count: info.threadCount,
      latestAssistant: info.latestAssistant,
      latestUser: info.latestUser,
      messages: info.messages
    };
    return {
      ...exportData,
      format,
      content: format === 'markdown'
        ? this.renderConversationMarkdown(info.activeConversation?.title ?? 'ChatGPT Conversation', info.messages)
        : JSON.stringify(exportData, null, 2)
    };
  }

  async chatGptInfo(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const [snapshotResult, busyResult, threadResult, conversationsResult, sidebarResult, modelsResult] = await Promise.all([
      this.snapshot(sessionId, timeoutMs).catch(() => ({ sessionId, snapshot: undefined })) as Promise<{ sessionId: string; snapshot?: BrowserExtensionSnapshot }>,
      this.dispatchAndWait(sessionId, 'chatgpt_busy', {}, timeoutMs).catch(() => undefined) as Promise<{ busy?: boolean } | undefined>,
      this.chatGptReadThread(sessionId, { limit: options?.limit ?? 20, timeoutMs }).catch(() => ({
        sessionId,
        count: 0,
        latestAssistant: '',
        latestUser: '',
        messages: [] as BrowserExtensionConversationMessage[]
      })),
      this.chatGptListConversations(sessionId, { limit: 50, timeoutMs }).catch(() => ({
        sessionId,
        count: 0,
        conversations: [] as BrowserExtensionConversationSummary[]
      })),
      this.chatGptSidebarState(sessionId, timeoutMs).catch(() => ({
        sessionId,
        site: 'chatgpt.com',
        open: false,
        toggleLabel: undefined,
        toggleSelector: undefined
      })),
      this.chatGptModels(sessionId, timeoutMs).catch(() => ({
        sessionId,
        site: 'chatgpt.com',
        currentModel: undefined,
        count: 0,
        models: [] as string[]
      }))
    ]);
    const activeConversation = conversationsResult.conversations.find((conversation) => conversation.active)
      ?? conversationsResult.conversations.find((conversation) => conversation.url && conversation.url === snapshotResult.snapshot?.url);
    return {
      sessionId,
      site: 'chatgpt.com',
      busy: busyResult?.busy === true,
      page: snapshotResult.snapshot,
      sidebar: {
        open: sidebarResult.open,
        toggleLabel: sidebarResult.toggleLabel,
        toggleSelector: sidebarResult.toggleSelector
      },
      currentModel: modelsResult.currentModel,
      models: modelsResult.models,
      activeConversation,
      conversationCount: conversationsResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      threadCount: threadResult.count,
      messages: threadResult.messages
    };
  }

  async chatGptNewChat(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_new_chat', {}, timeoutMs) as
      | { started?: boolean }
      | undefined;
    return {
      sessionId,
      started: result?.started === true
    };
  }

  async chatGptSidebarState(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_sidebar_state', {}, timeoutMs).catch(() => undefined) as
      | { sidebar?: { open?: boolean; toggleLabel?: string; toggleSelector?: string } }
      | undefined;
    return {
      sessionId,
      site: 'chatgpt.com',
      open: result?.sidebar?.open === true,
      toggleLabel: result?.sidebar?.toggleLabel,
      toggleSelector: result?.sidebar?.toggleSelector
    };
  }

  async chatGptToggleSidebar(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_toggle_sidebar', {}, timeoutMs) as
      | { sidebar?: { open?: boolean; toggleLabel?: string; toggleSelector?: string } }
      | undefined;
    return {
      sessionId,
      site: 'chatgpt.com',
      open: result?.sidebar?.open === true,
      toggleLabel: result?.sidebar?.toggleLabel,
      toggleSelector: result?.sidebar?.toggleSelector
    };
  }

  async chatGptModels(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_models', {}, timeoutMs).catch(() => undefined) as
      | { currentModel?: string; models?: Array<{ title?: string; selector?: string; active?: boolean }> }
      | undefined;
    const models = Array.isArray(result?.models) ? result.models : [];
    return {
      sessionId,
      site: 'chatgpt.com',
      currentModel: result?.currentModel,
      count: models.length,
      models
    };
  }

  async chatGptSelectModel(sessionId: string, query: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_select_model', { query }, timeoutMs) as
      | { selected?: string }
      | undefined;
    return {
      sessionId,
      site: 'chatgpt.com',
      query,
      selected: result?.selected
    };
  }

  async chatGptStop(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_stop', {}, timeoutMs) as
      | { stopped?: boolean }
      | undefined;
    return {
      sessionId,
      stopped: result?.stopped === true
    };
  }

  async chatGptContinue(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_continue', {}, timeoutMs) as
      | { continued?: boolean }
      | undefined;
    return {
      sessionId,
      continued: result?.continued === true
    };
  }

  async chatGptResponseControls(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const [controlsResult, threadResult] = await Promise.all([
      this.dispatchAndWait(sessionId, 'chatgpt_response_controls', {}, timeoutMs).catch(() => undefined) as Promise<{
        controls?: {
          previousAvailable?: boolean;
          nextAvailable?: boolean;
          previousLabel?: string;
          nextLabel?: string;
        };
      } | undefined>,
      this.chatGptReadThread(sessionId, {
        limit: options?.limit ?? 20,
        timeoutMs
      }).catch(() => ({
        sessionId,
        count: 0,
        latestAssistant: '',
        latestUser: '',
        messages: [] as BrowserExtensionConversationMessage[]
      }))
    ]);
    return {
      sessionId,
      site: 'chatgpt.com',
      previousAvailable: controlsResult?.controls?.previousAvailable === true,
      nextAvailable: controlsResult?.controls?.nextAvailable === true,
      previousLabel: controlsResult?.controls?.previousLabel,
      nextLabel: controlsResult?.controls?.nextLabel,
      threadCount: threadResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      messages: threadResult.messages
    };
  }

  async chatGptPreviousResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_previous_response', {}, timeoutMs) as
      | { moved?: boolean; direction?: string }
      | undefined;
    await delay(400);
    const threadResult = await this.chatGptReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    const controls = await this.chatGptResponseControls(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    return {
      sessionId,
      moved: result?.moved === true,
      direction: result?.direction ?? 'previous',
      threadCount: threadResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      messages: threadResult.messages,
      previousAvailable: controls.previousAvailable,
      nextAvailable: controls.nextAvailable,
      previousLabel: controls.previousLabel,
      nextLabel: controls.nextLabel
    };
  }

  async chatGptNextResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_next_response', {}, timeoutMs) as
      | { moved?: boolean; direction?: string }
      | undefined;
    await delay(400);
    const threadResult = await this.chatGptReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    const controls = await this.chatGptResponseControls(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    return {
      sessionId,
      moved: result?.moved === true,
      direction: result?.direction ?? 'next',
      threadCount: threadResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      messages: threadResult.messages,
      previousAvailable: controls.previousAvailable,
      nextAvailable: controls.nextAvailable,
      previousLabel: controls.previousLabel,
      nextLabel: controls.nextLabel
    };
  }

  async chatGptListResponseVersions(
    sessionId: string,
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    return this.listAiResponseVersions(sessionId, 'chatgpt', options);
  }

  async chatGptSelectResponseVersion(
    sessionId: string,
    targetIndex: number,
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    return this.selectAiResponseVersion(sessionId, 'chatgpt', targetIndex, options);
  }

  async chatGptRegenerate(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_regenerate', {}, timeoutMs) as
      | { regenerated?: boolean }
      | undefined;
    return {
      sessionId,
      regenerated: result?.regenerated === true
    };
  }

  async chatGptEditMessage(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    const thread = await this.chatGptReadThread(sessionId, {
      limit: options?.limit ?? 50,
      timeoutMs: options?.timeoutMs
    });
    const message = this.selectConversationMessage(thread.messages, options);
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_edit_message', {
      text,
      index: message.index,
      role: message.role
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { edited?: boolean; message?: BrowserExtensionConversationMessage }
      | undefined;
    return {
      sessionId,
      text,
      target: message,
      edited: result?.edited === true,
      message: result?.message
    };
  }

  async chatGptSend(sessionId: string, text: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_send', { text }, timeoutMs) as
      | { sent?: boolean }
      | undefined;
    return {
      sessionId,
      text,
      sent: result?.sent === true
    };
  }

  async chatGptAsk(sessionId: string, text: string, timeoutMs = 45_000) {
    const result = await this.dispatchAndWait(sessionId, 'chatgpt_ask', { text, timeoutMs }, timeoutMs + 20_000) as
      | { response?: string; timedOut?: boolean }
      | undefined;
    return {
      sessionId,
      prompt: text,
      response: result?.response ?? '',
      timedOut: result?.timedOut === true
    };
  }

  async chatGptAskThread(sessionId: string, text: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const commandTimeoutMs = timeoutMs + 20_000;
    const baseline = await this.chatGptReadLatest(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, commandTimeoutMs));
    const sendResult = await this.chatGptSend(sessionId, text, commandTimeoutMs);
    await delay(1200);
    const waitResult = await this.chatGptWaitResponse(sessionId, {
      baselineText: baseline.text,
      timeoutMs: commandTimeoutMs
    });
    await delay(800);
    const threadResult = await this.chatGptReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs: commandTimeoutMs
    });
    const messages = threadResult.count > 0
      ? threadResult.messages
      : this.buildSynthesizedAiThread(text, waitResult.text);
    return {
      sessionId,
      prompt: text,
      sent: sendResult.sent,
      response: waitResult.text,
      timedOut: waitResult.timedOut,
      threadCount: messages.length,
      latestAssistant: threadResult.latestAssistant || waitResult.text,
      latestUser: threadResult.latestUser || text,
      messages
    };
  }

  async chatGptRewriteThread(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const threadBefore = await this.chatGptReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs)
    });
    const editResult = await this.chatGptEditMessage(sessionId, text, options);
    const waitResult = await this.chatGptWaitResponse(sessionId, {
      baselineText: threadBefore.latestAssistant,
      timeoutMs
    });
    const threadAfter = await this.chatGptReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs)
    });
    return {
      sessionId,
      text,
      edited: editResult.edited,
      target: editResult.target,
      response: waitResult.text,
      timedOut: waitResult.timedOut,
      threadCount: threadAfter.count,
      latestAssistant: threadAfter.latestAssistant,
      latestUser: threadAfter.latestUser,
      messages: threadAfter.messages
    };
  }

  async chatGptWaitIdle(
    sessionId: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const intervalMs = Math.max(300, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let stableReads = 0;
    while (Date.now() < deadline) {
      const result = await this.dispatchAndWait(sessionId, 'chatgpt_wait_idle', {}, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs)) as
        | { busy?: boolean }
        | undefined;
      const busy = result?.busy === true;
      if (!busy) {
        stableReads += 1;
        if (stableReads >= 2) {
          return {
            sessionId,
            idle: true,
            timedOut: false
          };
        }
      } else {
        stableReads = 0;
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      idle: false,
      timedOut: true
    };
  }

  async chatGptWaitResponse(
    sessionId: string,
    options?: {
      baselineText?: string;
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
    }
  ) {
    return this.waitForAiResponse(sessionId, 'chatgpt', options);
  }

  async chatGptWaitMessage(
    sessionId: string,
    options?: {
      text?: string;
      role?: 'user' | 'assistant' | 'system';
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
      limit?: number;
    }
  ) {
    return this.waitForAiMessage(sessionId, 'chatgpt', options);
  }

  async chatGptWaitSidebar(
    sessionId: string,
    options?: { open?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.waitForAiSidebar(sessionId, 'chatgpt', options);
  }

  async chatGptWaitModel(
    sessionId: string,
    options?: { query?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.waitForAiModel(sessionId, 'chatgpt', options);
  }

  async chatGptWaitConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; active?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.waitForAiConversation(sessionId, 'chatgpt', options);
  }

  async chatGptPrepare(
    sessionId: string,
    options?: {
      ensureSidebarOpen?: boolean;
      model?: string;
      newChat?: boolean;
      titleQuery?: string;
      url?: string;
      index?: number;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    return this.prepareAiSession(sessionId, 'chatgpt', options);
  }

  async chatGptDeleteConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.invokeAiConversationLifecycle(sessionId, 'chatgpt', 'delete', options);
  }

  async chatGptArchiveConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.invokeAiConversationLifecycle(sessionId, 'chatgpt', 'archive', options);
  }

  async deepSeekReadLatest(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_read_latest', {}, timeoutMs) as
      | { text?: string }
      | undefined;
    return {
      sessionId,
      text: result?.text ?? ''
    };
  }

  async deepSeekListConversations(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_list_conversations', {
      limit: options?.limit ?? 20
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversations?: BrowserExtensionConversationSummary[] }
      | undefined;
    const conversations = result?.conversations ?? [];
    return {
      sessionId,
      count: conversations.length,
      conversations
    };
  }

  async deepSeekOpenConversation(
    sessionId: string,
    options: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_open_conversation', {
      titleQuery: options.titleQuery,
      url: options.url,
      index: options.index
    }, options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary }
      | undefined;
    return {
      sessionId,
      conversation: result?.conversation
    };
  }

  async deepSeekConversationActions(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_conversation_actions', {
      titleQuery: options?.titleQuery,
      url: options?.url,
      index: options?.index
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary; actions?: Array<{ title?: string; selector?: string }> }
      | undefined;
    const actions = Array.isArray(result?.actions) ? result.actions : [];
    return {
      sessionId,
      conversation: result?.conversation,
      count: actions.length,
      actions
    };
  }

  async deepSeekConversationAction(
    sessionId: string,
    actionQuery: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_conversation_action', {
      actionQuery,
      titleQuery: options?.titleQuery,
      url: options?.url,
      index: options?.index
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary; action?: string }
      | undefined;
    return {
      sessionId,
      conversation: result?.conversation,
      action: result?.action
    };
  }

  async deepSeekRenameConversation(
    sessionId: string,
    title: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_rename_conversation', {
      title,
      titleQuery: options?.titleQuery,
      url: options?.url,
      index: options?.index
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { conversation?: BrowserExtensionConversationSummary; action?: string; title?: string }
      | undefined;
    return {
      sessionId,
      conversation: result?.conversation,
      action: result?.action,
      title: result?.title ?? title
    };
  }

  async deepSeekReadThread(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_read_thread', {
      limit: options?.limit ?? 20
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { messages?: BrowserExtensionConversationMessage[]; latestAssistant?: string; latestUser?: string }
      | undefined;
    const messages = result?.messages ?? [];
    return {
      sessionId,
      count: messages.length,
      latestAssistant: result?.latestAssistant ?? '',
      latestUser: result?.latestUser ?? '',
      messages
    };
  }

  async deepSeekReadMessage(
    sessionId: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    const thread = await this.deepSeekReadThread(sessionId, {
      limit: options?.limit ?? 50,
      timeoutMs: options?.timeoutMs
    });
    const message = this.selectConversationMessage(thread.messages, options);
    return {
      sessionId,
      message,
      count: thread.count
    };
  }

  async deepSeekCurrentConversation(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const info = await this.deepSeekInfo(sessionId, options);
    return {
      sessionId,
      conversation: info.activeConversation,
      page: info.page,
      sidebar: info.sidebar,
      currentModel: info.currentModel,
      conversationCount: info.conversationCount,
      busy: info.busy,
      latestAssistant: info.latestAssistant,
      latestUser: info.latestUser,
      threadCount: info.threadCount
    };
  }

  async deepSeekExportThread(sessionId: string, options?: { limit?: number; timeoutMs?: number; format?: 'json' | 'markdown' }) {
    const format = options?.format === 'markdown' ? 'markdown' : 'json';
    const info = await this.deepSeekInfo(sessionId, options);
    const exportData = {
      sessionId,
      site: 'deepseek.com',
      conversation: info.activeConversation,
      page: info.page,
      count: info.threadCount,
      latestAssistant: info.latestAssistant,
      latestUser: info.latestUser,
      messages: info.messages
    };
    return {
      ...exportData,
      format,
      content: format === 'markdown'
        ? this.renderConversationMarkdown(info.activeConversation?.title ?? 'DeepSeek Conversation', info.messages)
        : JSON.stringify(exportData, null, 2)
    };
  }

  async deepSeekInfo(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const [snapshotResult, busyResult, threadResult, conversationsResult, sidebarResult, modelsResult] = await Promise.all([
      this.snapshot(sessionId, timeoutMs).catch(() => ({ sessionId, snapshot: undefined })) as Promise<{ sessionId: string; snapshot?: BrowserExtensionSnapshot }>,
      this.dispatchAndWait(sessionId, 'deepseek_busy', {}, timeoutMs).catch(() => undefined) as Promise<{ busy?: boolean } | undefined>,
      this.deepSeekReadThread(sessionId, { limit: options?.limit ?? 20, timeoutMs }).catch(() => ({
        sessionId,
        count: 0,
        latestAssistant: '',
        latestUser: '',
        messages: [] as BrowserExtensionConversationMessage[]
      })),
      this.deepSeekListConversations(sessionId, { limit: 50, timeoutMs }).catch(() => ({
        sessionId,
        count: 0,
        conversations: [] as BrowserExtensionConversationSummary[]
      })),
      this.deepSeekSidebarState(sessionId, timeoutMs).catch(() => ({
        sessionId,
        site: 'deepseek.com',
        open: false,
        toggleLabel: undefined,
        toggleSelector: undefined
      })),
      this.deepSeekModels(sessionId, timeoutMs).catch(() => ({
        sessionId,
        site: 'deepseek.com',
        currentModel: undefined,
        count: 0,
        models: [] as string[]
      }))
    ]);
    const activeConversation = conversationsResult.conversations.find((conversation) => conversation.active)
      ?? conversationsResult.conversations.find((conversation) => conversation.url && conversation.url === snapshotResult.snapshot?.url);
    return {
      sessionId,
      site: 'deepseek.com',
      busy: busyResult?.busy === true,
      page: snapshotResult.snapshot,
      sidebar: {
        open: sidebarResult.open,
        toggleLabel: sidebarResult.toggleLabel,
        toggleSelector: sidebarResult.toggleSelector
      },
      currentModel: modelsResult.currentModel,
      models: modelsResult.models,
      activeConversation,
      conversationCount: conversationsResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      threadCount: threadResult.count,
      messages: threadResult.messages
    };
  }

  async deepSeekNewChat(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_new_chat', {}, timeoutMs) as
      | { started?: boolean }
      | undefined;
    return {
      sessionId,
      started: result?.started === true
    };
  }

  async deepSeekSidebarState(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_sidebar_state', {}, timeoutMs).catch(() => undefined) as
      | { sidebar?: { open?: boolean; toggleLabel?: string; toggleSelector?: string } }
      | undefined;
    return {
      sessionId,
      site: 'deepseek.com',
      open: result?.sidebar?.open === true,
      toggleLabel: result?.sidebar?.toggleLabel,
      toggleSelector: result?.sidebar?.toggleSelector
    };
  }

  async deepSeekToggleSidebar(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_toggle_sidebar', {}, timeoutMs) as
      | { sidebar?: { open?: boolean; toggleLabel?: string; toggleSelector?: string } }
      | undefined;
    return {
      sessionId,
      site: 'deepseek.com',
      open: result?.sidebar?.open === true,
      toggleLabel: result?.sidebar?.toggleLabel,
      toggleSelector: result?.sidebar?.toggleSelector
    };
  }

  async deepSeekModels(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_models', {}, timeoutMs).catch(() => undefined) as
      | { currentModel?: string; models?: Array<{ title?: string; selector?: string; active?: boolean }> }
      | undefined;
    const models = Array.isArray(result?.models) ? result.models : [];
    return {
      sessionId,
      site: 'deepseek.com',
      currentModel: result?.currentModel,
      count: models.length,
      models
    };
  }

  async deepSeekSelectModel(sessionId: string, query: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_select_model', { query }, timeoutMs) as
      | { selected?: string }
      | undefined;
    return {
      sessionId,
      site: 'deepseek.com',
      query,
      selected: result?.selected
    };
  }

  async deepSeekStop(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_stop', {}, timeoutMs) as
      | { stopped?: boolean }
      | undefined;
    return {
      sessionId,
      stopped: result?.stopped === true
    };
  }

  async deepSeekContinue(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_continue', {}, timeoutMs) as
      | { continued?: boolean }
      | undefined;
    return {
      sessionId,
      continued: result?.continued === true
    };
  }

  async deepSeekResponseControls(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const [controlsResult, threadResult] = await Promise.all([
      this.dispatchAndWait(sessionId, 'deepseek_response_controls', {}, timeoutMs).catch(() => undefined) as Promise<{
        controls?: {
          previousAvailable?: boolean;
          nextAvailable?: boolean;
          previousLabel?: string;
          nextLabel?: string;
        };
      } | undefined>,
      this.deepSeekReadThread(sessionId, {
        limit: options?.limit ?? 20,
        timeoutMs
      }).catch(() => ({
        sessionId,
        count: 0,
        latestAssistant: '',
        latestUser: '',
        messages: [] as BrowserExtensionConversationMessage[]
      }))
    ]);
    return {
      sessionId,
      site: 'deepseek.com',
      previousAvailable: controlsResult?.controls?.previousAvailable === true,
      nextAvailable: controlsResult?.controls?.nextAvailable === true,
      previousLabel: controlsResult?.controls?.previousLabel,
      nextLabel: controlsResult?.controls?.nextLabel,
      threadCount: threadResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      messages: threadResult.messages
    };
  }

  async deepSeekPreviousResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'deepseek_previous_response', {}, timeoutMs) as
      | { moved?: boolean; direction?: string }
      | undefined;
    await delay(400);
    const threadResult = await this.deepSeekReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    const controls = await this.deepSeekResponseControls(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    return {
      sessionId,
      moved: result?.moved === true,
      direction: result?.direction ?? 'previous',
      threadCount: threadResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      messages: threadResult.messages,
      previousAvailable: controls.previousAvailable,
      nextAvailable: controls.nextAvailable,
      previousLabel: controls.previousLabel,
      nextLabel: controls.nextLabel
    };
  }

  async deepSeekNextResponse(sessionId: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const result = await this.dispatchAndWait(sessionId, 'deepseek_next_response', {}, timeoutMs) as
      | { moved?: boolean; direction?: string }
      | undefined;
    await delay(400);
    const threadResult = await this.deepSeekReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    const controls = await this.deepSeekResponseControls(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs
    });
    return {
      sessionId,
      moved: result?.moved === true,
      direction: result?.direction ?? 'next',
      threadCount: threadResult.count,
      latestAssistant: threadResult.latestAssistant,
      latestUser: threadResult.latestUser,
      messages: threadResult.messages,
      previousAvailable: controls.previousAvailable,
      nextAvailable: controls.nextAvailable,
      previousLabel: controls.previousLabel,
      nextLabel: controls.nextLabel
    };
  }

  async deepSeekListResponseVersions(
    sessionId: string,
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    return this.listAiResponseVersions(sessionId, 'deepseek', options);
  }

  async deepSeekSelectResponseVersion(
    sessionId: string,
    targetIndex: number,
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    return this.selectAiResponseVersion(sessionId, 'deepseek', targetIndex, options);
  }

  async deepSeekRegenerate(sessionId: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_regenerate', {}, timeoutMs) as
      | { regenerated?: boolean }
      | undefined;
    return {
      sessionId,
      regenerated: result?.regenerated === true
    };
  }

  async deepSeekEditMessage(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    const thread = await this.deepSeekReadThread(sessionId, {
      limit: options?.limit ?? 50,
      timeoutMs: options?.timeoutMs
    });
    const message = this.selectConversationMessage(thread.messages, options);
    const result = await this.dispatchAndWait(sessionId, 'deepseek_edit_message', {
      text,
      index: message.index,
      role: message.role
    }, options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS) as
      | { edited?: boolean; message?: BrowserExtensionConversationMessage }
      | undefined;
    return {
      sessionId,
      text,
      target: message,
      edited: result?.edited === true,
      message: result?.message
    };
  }

  async deepSeekSend(sessionId: string, text: string, timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_send', { text }, timeoutMs) as
      | { sent?: boolean }
      | undefined;
    return {
      sessionId,
      text,
      sent: result?.sent === true
    };
  }

  async deepSeekAsk(sessionId: string, text: string, timeoutMs = 45_000) {
    const result = await this.dispatchAndWait(sessionId, 'deepseek_ask', { text, timeoutMs }, timeoutMs + 20_000) as
      | { response?: string; timedOut?: boolean }
      | undefined;
    return {
      sessionId,
      prompt: text,
      response: result?.response ?? '',
      timedOut: result?.timedOut === true
    };
  }

  async deepSeekAskThread(sessionId: string, text: string, options?: { limit?: number; timeoutMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const commandTimeoutMs = timeoutMs + 20_000;
    const baseline = await this.deepSeekReadLatest(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, commandTimeoutMs));
    const sendResult = await this.deepSeekSend(sessionId, text, commandTimeoutMs);
    await delay(1200);
    const waitResult = await this.deepSeekWaitResponse(sessionId, {
      baselineText: baseline.text,
      timeoutMs: commandTimeoutMs
    });
    await delay(800);
    const threadResult = await this.deepSeekReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs: commandTimeoutMs
    });
    const messages = threadResult.count > 0
      ? threadResult.messages
      : this.buildSynthesizedAiThread(text, waitResult.text);
    return {
      sessionId,
      prompt: text,
      sent: sendResult.sent,
      response: waitResult.text,
      timedOut: waitResult.timedOut,
      threadCount: messages.length,
      latestAssistant: threadResult.latestAssistant || waitResult.text,
      latestUser: threadResult.latestUser || text,
      messages
    };
  }

  async deepSeekRewriteThread(
    sessionId: string,
    text: string,
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number; limit?: number; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const threadBefore = await this.deepSeekReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs)
    });
    const editResult = await this.deepSeekEditMessage(sessionId, text, options);
    const waitResult = await this.deepSeekWaitResponse(sessionId, {
      baselineText: threadBefore.latestAssistant,
      timeoutMs
    });
    const threadAfter = await this.deepSeekReadThread(sessionId, {
      limit: options?.limit ?? 20,
      timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs)
    });
    return {
      sessionId,
      text,
      edited: editResult.edited,
      target: editResult.target,
      response: waitResult.text,
      timedOut: waitResult.timedOut,
      threadCount: threadAfter.count,
      latestAssistant: threadAfter.latestAssistant,
      latestUser: threadAfter.latestUser,
      messages: threadAfter.messages
    };
  }

  async deepSeekWaitIdle(
    sessionId: string,
    options?: {
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const intervalMs = Math.max(300, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let stableReads = 0;
    while (Date.now() < deadline) {
      const result = await this.dispatchAndWait(sessionId, 'deepseek_wait_idle', {}, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs)) as
        | { busy?: boolean }
        | undefined;
      const busy = result?.busy === true;
      if (!busy) {
        stableReads += 1;
        if (stableReads >= 2) {
          return {
            sessionId,
            idle: true,
            timedOut: false
          };
        }
      } else {
        stableReads = 0;
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      idle: false,
      timedOut: true
    };
  }

  async deepSeekWaitResponse(
    sessionId: string,
    options?: {
      baselineText?: string;
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
    }
  ) {
    return this.waitForAiResponse(sessionId, 'deepseek', options);
  }

  async deepSeekWaitMessage(
    sessionId: string,
    options?: {
      text?: string;
      role?: 'user' | 'assistant' | 'system';
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
      limit?: number;
    }
  ) {
    return this.waitForAiMessage(sessionId, 'deepseek', options);
  }

  async deepSeekWaitSidebar(
    sessionId: string,
    options?: { open?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.waitForAiSidebar(sessionId, 'deepseek', options);
  }

  async deepSeekWaitModel(
    sessionId: string,
    options?: { query?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.waitForAiModel(sessionId, 'deepseek', options);
  }

  async deepSeekWaitConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; active?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    return this.waitForAiConversation(sessionId, 'deepseek', options);
  }

  async deepSeekPrepare(
    sessionId: string,
    options?: {
      ensureSidebarOpen?: boolean;
      model?: string;
      newChat?: boolean;
      titleQuery?: string;
      url?: string;
      index?: number;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    return this.prepareAiSession(sessionId, 'deepseek', options);
  }

  async deepSeekDeleteConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.invokeAiConversationLifecycle(sessionId, 'deepseek', 'delete', options);
  }

  async deepSeekArchiveConversation(
    sessionId: string,
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    return this.invokeAiConversationLifecycle(sessionId, 'deepseek', 'archive', options);
  }

  getServerBaseUrl() {
    const provider = this.readPersisted().providers?.browserExtension;
    return provider?.serverBaseUrl || `http://127.0.0.1:${DEFAULT_PORT}`;
  }

  async waitForProviderConnected(options?: { timeoutMs?: number; intervalMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(200, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let lastStatus = this.getStatus();
    while (Date.now() < deadline) {
      lastStatus = this.getStatus();
      if (lastStatus.providerConnected) {
        return {
          connected: true,
          timedOut: false,
          status: lastStatus
        };
      }
      await delay(intervalMs);
    }
    return {
      connected: false,
      timedOut: true,
      status: lastStatus
    };
  }

  async waitForSessionReady(sessionId: string, options?: { timeoutMs?: number; intervalMs?: number }) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(200, options?.intervalMs ?? 1_000);
    const deadline = Date.now() + timeoutMs;
    let lastSession = this.getSession(sessionId);
    while (Date.now() < deadline) {
      lastSession = this.getSession(sessionId);
      const activeTab = lastSession?.tabs?.find((tab) => tab.active) ?? lastSession?.tabs?.[0];
      const tabReady = Boolean(activeTab?.id && typeof activeTab.url === 'string' && activeTab.url.length > 0);
      if (lastSession?.connected && lastSession.ready && tabReady) {
        return {
          sessionId,
          ready: true,
          timedOut: false,
          session: lastSession
        };
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      ready: false,
      timedOut: true,
      session: lastSession
    };
  }

  private requireSession(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) {
      const known = this.listSessions()
        .slice(0, 8)
        .map((entry) => entry.id)
        .join(', ');
      throw new Error(
        known.length > 0
          ? `Unknown browser-extension session: ${sessionId}. Run "sidofun browserext session list --json" and use a real id. Known sessions: ${known}`
          : `Unknown browser-extension session: ${sessionId}. Run "sidofun browserext session create ..." first, then "sidofun browserext session list --json".`
      );
    }
    return session;
  }

  private isRecoverableDispatchError(kind: BrowserExtensionQueuedCommand['kind'], error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const recoverableKinds: BrowserExtensionQueuedCommand['kind'][] = [
      'frames',
      'dom_tree',
      'inspect',
      'inspect_all',
      'links',
      'actionables',
      'page_state',
      'markdown',
      'readability',
      'editor_read',
      'editor_fill',
      'form_fields',
      'form_contexts',
      'form_find_field',
      'form_radio_groups',
      'form_segmented_options',
      'form_fill',
      'form_fill_many',
      'form_fill_label',
      'form_options',
      'form_select',
      'form_submit',
      'click'
    ];
    if (!recoverableKinds.includes(kind)) {
      return false;
    }
    if (message.includes('Timed out waiting for browser-extension command:')) {
      return true;
    }
    if (message.includes('No active tab is tracked for browser-extension session')) {
      return true;
    }
    if (message.includes('missing_from_heartbeat')) {
      return true;
    }
    return message.includes('Browser-extension command failed');
  }

  private async ensureSessionDispatchReady(
    sessionId: string,
    timeoutMs: number
  ) {
    const session = this.requireSession(sessionId);
    const provider = this.getStatus();
    if (!provider.providerConnected) {
      return;
    }
    const refreshed = this.refreshSession(sessionId);
    const current = refreshed.session;
    if (current.connected && typeof current.activeTabId === 'number') {
      return;
    }
    await this.reconnectSession(sessionId, {
      timeoutMs: Math.min(10_000, Math.max(1_000, Math.floor(timeoutMs / 2))),
      intervalMs: 200
    }).catch(() => undefined);
    const latest = this.getSession(sessionId) ?? session;
    if (!latest.connected || !latest.ready || typeof latest.activeTabId !== 'number') {
      await this.waitForSessionReady(sessionId, {
        timeoutMs: Math.min(10_000, Math.max(1_000, Math.floor(timeoutMs / 2))),
        intervalMs: 200
      }).catch(() => undefined);
    }
  }

  private async dispatchAndWait(
    sessionId: string,
    kind: BrowserExtensionQueuedCommand['kind'],
    payload: Record<string, unknown>,
    timeoutMs: number
  ) {
    this.requireSession(sessionId);
    let lastError: unknown;
    let previousCommandId: string | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt > 0) {
        if (previousCommandId) {
          this.supersedeQueuedCommand(
            previousCommandId,
            `Superseded stale browser-extension command before retry: ${kind}`
          );
        }
        await this.ensureSessionDispatchReady(sessionId, timeoutMs);
      }
      const command = this.enqueueCommand(sessionId, kind, payload);
      previousCommandId = command.id;
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        const latest = this.readPersisted().providers?.browserExtension?.queue?.[command.id];
        if (latest?.status === 'completed') {
          return latest.result;
        }
        if (latest?.status === 'failed') {
          const error = new Error(latest.error || `Browser-extension command failed: ${kind}`);
          if (attempt === 0 && this.isRecoverableDispatchError(kind, error)) {
            lastError = error;
            break;
          }
          throw error;
        }
        await delay(COMMAND_POLL_INTERVAL_MS);
      }
      const error = new Error(`Timed out waiting for browser-extension command: ${kind}`);
      if (attempt === 0 && this.isRecoverableDispatchError(kind, error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
    throw (lastError instanceof Error ? lastError : new Error(`Timed out waiting for browser-extension command: ${kind}`));
  }

  private enqueueCommand(
    sessionId: string,
    kind: BrowserExtensionQueuedCommand['kind'],
    payload: Record<string, unknown>
  ) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      return this.enqueueCommandInProvider(provider, sessionId, kind, payload);
    });
  }

  private supersedeQueuedCommands(
    sessionId: string,
    kinds: BrowserExtensionQueuedCommand['kind'][],
    reason: string
  ) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.queue ??= {};
      const now = nowIso();
      for (const [commandId, command] of Object.entries(provider.queue)) {
        if (command.sessionId !== sessionId) {
          continue;
        }
        if (!kinds.includes(command.kind)) {
          continue;
        }
        if (command.status !== 'pending' && command.status !== 'in_progress') {
          continue;
        }
        provider.queue[commandId] = {
          ...command,
          status: 'failed',
          error: reason,
          updatedAt: now
        };
      }
      return undefined;
    });
  }

  private supersedeQueuedCommand(commandId: string, reason: string) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.queue ??= {};
      const command = provider.queue[commandId];
      if (!command) {
        return undefined;
      }
      if (command.status !== 'pending' && command.status !== 'in_progress') {
        return undefined;
      }
      provider.queue[commandId] = {
        ...command,
        status: 'failed',
        error: reason,
        updatedAt: nowIso()
      };
      return provider.queue[commandId];
    });
  }

  supersedeQueuedCommandsForSite(
    site: 'x.com' | 'chatgpt.com' | 'deepseek.com',
    kinds: BrowserExtensionQueuedCommand['kind'][],
    reason: string
  ) {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      provider.sessions ??= {};
      provider.queue ??= {};
      const now = nowIso();
      const siteSessionIds = new Set(
        Object.values(provider.sessions)
          .filter((session) => session.site === site)
          .map((session) => session.id)
      );
      for (const [commandId, command] of Object.entries(provider.queue)) {
        if (!siteSessionIds.has(command.sessionId)) {
          continue;
        }
        if (!kinds.includes(command.kind)) {
          continue;
        }
        if (command.status !== 'pending' && command.status !== 'in_progress') {
          continue;
        }
        provider.queue[commandId] = {
          ...command,
          status: 'failed',
          error: reason,
          updatedAt: now
        };
      }
      return undefined;
    });
  }

  private enqueueCommandInProvider(
    provider: NonNullable<ReturnType<BrowserExtensionService['ensureProvider']>>,
    sessionId: string,
    kind: BrowserExtensionQueuedCommand['kind'],
    payload: Record<string, unknown>
  ) {
    provider.queue ??= {};
    const now = nowIso();
    const id = `browserextcmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const command: BrowserExtensionQueuedCommand = {
      id,
      sessionId,
      kind,
      payload,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    provider.queue[id] = command;
    return command;
  }

  private ensureProvider(root: PersistedRoot): NonNullable<NonNullable<PersistedRoot['providers']>['browserExtension']> {
    root.providers ??= {};
    root.providers.browserExtension ??= {};
    return root.providers.browserExtension;
  }

  private getConfiguredExtensionMismatch(configuredExtensionId: string | undefined, extensionId: string) {
    if (!configuredExtensionId || configuredExtensionId === extensionId) {
      return undefined;
    }
    return {
      ok: false,
      ignored: true,
      reason: `Configured browser-extension id is ${configuredExtensionId}, but received ${extensionId}`
    };
  }

  private readPersisted(): PersistedRoot {
    const config = this.readJson(SIDOFUN_CONFIG_FILE);
    const state = this.readJson(SIDOFUN_STATE_FILE);
    const configProvider = this.extractProvider(config);
    const stateProvider = this.extractProvider(state);
    const resolvedExtensionId =
      (typeof config.SIDOFUN_BROWSER_EXTENSION_ID === 'string' && config.SIDOFUN_BROWSER_EXTENSION_ID.length > 0
        ? config.SIDOFUN_BROWSER_EXTENSION_ID
        : undefined)
      ?? this.resolveExtensionId(configProvider)
      ?? this.resolveExtensionId(stateProvider);
    return this.normalizePersisted({
      ...config,
      providers: {
        ...(config.providers ?? {}),
        browserExtension: {
          extensionId: resolvedExtensionId,
          serverBaseUrl: configProvider.serverBaseUrl ?? stateProvider.serverBaseUrl,
          workspaces: configProvider.workspaces ?? {},
          sessions: stateProvider.sessions ?? {},
          queue: stateProvider.queue ?? {},
          activeProvider: stateProvider.activeProvider
        }
      }
    });
  }

  private writePersisted(root: PersistedRoot): void {
    fs.mkdirSync(SIDOFUN_APP_DIR, { recursive: true });
    const config = this.readJson(SIDOFUN_CONFIG_FILE);
    const state = this.readJson(SIDOFUN_STATE_FILE);
    const provider = root.providers?.browserExtension ?? {};
    const nextConfig = this.ensureProviderRoot(config);
    if (provider.extensionId) {
      nextConfig.SIDOFUN_BROWSER_EXTENSION_ID = provider.extensionId;
    }
    nextConfig.providers!.browserExtension = {
      ...(nextConfig.providers!.browserExtension ?? {}),
      extensionId: provider.extensionId,
      serverBaseUrl: provider.serverBaseUrl,
      workspaces: provider.workspaces ?? {}
    };
    const nextState = this.ensureProviderRoot(state);
    nextState.providers!.browserExtension = {
      ...(nextState.providers!.browserExtension ?? {}),
      extensionId: provider.extensionId,
      serverBaseUrl: provider.serverBaseUrl,
      sessions: provider.sessions ?? {},
      queue: provider.queue ?? {},
      activeProvider: provider.activeProvider
    };
    this.writeJsonAtomic(SIDOFUN_CONFIG_FILE, nextConfig);
    this.writeJsonAtomic(SIDOFUN_STATE_FILE, nextState);
  }

  private withPersistedMutation<T>(mutate: (persisted: PersistedRoot) => T): T {
    const release = this.acquirePersistedLock();
    try {
      const persisted = this.readPersisted();
      const result = mutate(persisted);
      this.writePersisted(persisted);
      return result;
    } finally {
      release();
    }
  }

  private pruneExternallyClosedSessions() {
    return this.withPersistedMutation((persisted) => {
      const provider = this.ensureProvider(persisted);
      const activeProvider = provider.activeProvider;
      const providerConnected = Boolean(activeProvider?.connected && isActiveProvider(activeProvider.lastSeenAt));
      if (!providerConnected) {
        return {
          removedSessionIds: [],
          removedQueueCount: 0
        };
      }
      provider.sessions ??= {};
      provider.queue ??= {};
      const removedSessionIds: string[] = [];
      for (const session of Object.values(provider.sessions)) {
        const missingFromHeartbeat = session.disconnectedReason === 'missing_from_heartbeat';
        const disconnectedWithoutTabs =
          session.disconnectedReason === 'reported_disconnected'
          && !session.connected
          && (session.tabs?.length ?? 0) === 0;
        if (!missingFromHeartbeat && !disconnectedWithoutTabs) {
          continue;
        }
        delete provider.sessions[session.id];
        removedSessionIds.push(session.id);
      }
      let removedQueueCount = 0;
      if (removedSessionIds.length > 0) {
        const removedSessionIdSet = new Set(removedSessionIds);
        for (const [commandId, command] of Object.entries(provider.queue)) {
          if (!removedSessionIdSet.has(command.sessionId)) {
            continue;
          }
          delete provider.queue[commandId];
          removedQueueCount += 1;
        }
      }
      return {
        removedSessionIds,
        removedQueueCount
      };
    });
  }

  private acquirePersistedLock(): () => void {
    fs.mkdirSync(SIDOFUN_APP_DIR, { recursive: true });
    const deadline = Date.now() + PERSISTED_LOCK_TIMEOUT_MS;
    while (true) {
      try {
        const fd = fs.openSync(BROWSER_EXTENSION_LOCK_FILE, 'wx');
        return () => {
          fs.closeSync(fd);
          if (fs.existsSync(BROWSER_EXTENSION_LOCK_FILE)) {
            fs.unlinkSync(BROWSER_EXTENSION_LOCK_FILE);
          }
        };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
          throw error;
        }
        if (Date.now() >= deadline) {
          throw new Error(`Timed out acquiring browser-extension persistence lock at ${BROWSER_EXTENSION_LOCK_FILE}`);
        }
        sleepSync(PERSISTED_LOCK_RETRY_MS);
      }
    }
  }

  private readJson(targetPath: string): PersistedRoot {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (!fs.existsSync(targetPath)) {
        return {};
      }
      try {
        const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf8')) as PersistedRoot;
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        if (attempt === 4) {
          return {};
        }
        sleepSync(10);
      }
    }
    return {};
  }

  private writeJsonAtomic(targetPath: string, value: PersistedRoot) {
    const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
    fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    try {
      fs.renameSync(tempPath, targetPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EPERM') {
        fs.rmSync(tempPath, { force: true });
        throw error;
      }
      fs.copyFileSync(tempPath, targetPath);
      fs.rmSync(tempPath, { force: true });
    }
  }

  private ensureProviderRoot(root: PersistedRoot): PersistedRoot {
    root.providers ??= {};
    return root;
  }

  private extractProvider(root: PersistedRoot) {
    return root.providers?.browserExtension ?? {};
  }

  private resolveExtensionId(provider: { extensionId?: unknown; activeProvider?: { extensionId?: unknown } } | undefined): string | undefined {
    if (!provider || typeof provider !== 'object') {
      return undefined;
    }
    const direct = typeof provider.extensionId === 'string' && provider.extensionId.length > 0
      ? provider.extensionId
      : undefined;
    if (direct) {
      return direct;
    }
    return typeof provider.activeProvider?.extensionId === 'string' && provider.activeProvider.extensionId.length > 0
      ? provider.activeProvider.extensionId
      : undefined;
  }

  private normalizePersisted(root: PersistedRoot): PersistedRoot {
    const provider = root.providers?.browserExtension;
    if (!provider) {
      return root;
    }
    const activeProvider = provider.activeProvider;
    const providerActive = Boolean(activeProvider && isActiveProvider(activeProvider.lastSeenAt));
    if (activeProvider && !providerActive) {
      provider.activeProvider = {
        ...activeProvider,
        connected: false
      };
    }
    if (provider.sessions) {
      const now = Date.now();
      for (const [sessionId, session] of Object.entries(provider.sessions)) {
        const lastHeartbeatMs = session.lastHeartbeatAt ? new Date(session.lastHeartbeatAt).getTime() : Number.NaN;
        const heartbeatFresh = Number.isFinite(lastHeartbeatMs) && now - lastHeartbeatMs <= SESSION_HEARTBEAT_TTL_MS;
        const connected = providerActive && session.connected && heartbeatFresh;
        const stale = !connected && Boolean(session.connected || session.stale || session.lastHeartbeatAt);
        provider.sessions[sessionId] = {
          ...session,
          connected,
          stale,
          ready: connected && typeof session.activeTabId === 'number',
          disconnectedReason: connected ? undefined : (session.disconnectedReason ?? (providerActive ? 'heartbeat_timeout' : 'provider_inactive'))
        };
      }
    }
    return root;
  }

  private recoverStaleCommands(provider: NonNullable<NonNullable<PersistedRoot['providers']>['browserExtension']>, extensionId: string, now: string) {
    provider.queue ??= {};
    let recovered = 0;
    const nowMs = new Date(now).getTime();
    for (const [commandId, command] of Object.entries(provider.queue)) {
      if (command.status !== 'in_progress') {
        continue;
      }
      const session = provider.sessions?.[command.sessionId];
      if (session?.extensionId && session.extensionId !== extensionId) {
        continue;
      }
      const dispatchedMs = command.dispatchedAt ? new Date(command.dispatchedAt).getTime() : Number.NaN;
      if (Number.isFinite(dispatchedMs) && nowMs - dispatchedMs < COMMAND_RECOVERY_STALE_MS) {
        continue;
      }
      provider.queue[commandId] = {
        ...command,
        status: 'pending',
        dispatchedAt: undefined,
        updatedAt: now
      };
      recovered += 1;
    }
    return recovered;
  }

  private buildSessionEvent(
    command: BrowserExtensionQueuedCommand,
    payload: BrowserExtensionCommandResult,
    resultRecord: {
      url?: string;
      response?: string;
      text?: string;
      posts?: BrowserExtensionXPost[];
      snapshot?: BrowserExtensionSnapshot;
    } | undefined,
    timestamp: string
  ): BrowserExtensionSessionEvent {
    return {
      id: `browserextevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      commandId: command.id,
      kind: command.kind,
      ok: payload.ok,
      summary: this.describeCommandResult(command, payload, resultRecord),
      url: resultRecord?.url,
      text: typeof resultRecord?.response === 'string'
        ? resultRecord.response
        : typeof resultRecord?.text === 'string'
          ? resultRecord.text
          : resultRecord?.snapshot?.text,
      error: payload.error,
      timestamp
    };
  }

  private async waitForAiResponse(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: {
      baselineText?: string;
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const commandTimeoutMs = Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs + 5_000);
    const intervalMs = Math.max(300, options?.intervalMs ?? 1_000);
    const stableTarget = Math.max(1, options?.stableReads ?? 2);
    const readLatest = async () => {
      const latest = site === 'chatgpt'
        ? await this.chatGptReadLatest(sessionId, commandTimeoutMs)
        : await this.deepSeekReadLatest(sessionId, commandTimeoutMs);
      return {
        text: latest.text ?? ''
      };
    };
    const waitIdle = async () => site === 'chatgpt'
      ? this.chatGptWaitIdle(sessionId, { timeoutMs: commandTimeoutMs, intervalMs: Math.min(intervalMs, 1000) })
      : this.deepSeekWaitIdle(sessionId, { timeoutMs: commandTimeoutMs, intervalMs: Math.min(intervalMs, 1000) });

    const initial = await readLatest();
    const baselineText = options?.baselineText ?? initial.text ?? '';
    const deadline = Date.now() + timeoutMs;
    let stableReads = 0;
    let latestText = baselineText;

    while (Date.now() < deadline) {
      const latest = await readLatest();
      latestText = latest.text ?? '';
      if (latestText && latestText !== baselineText) {
        const idle = await waitIdle();
        if (idle.idle) {
          stableReads += 1;
          if (stableReads >= stableTarget) {
            return {
              sessionId,
              site,
              baselineText,
              text: latestText,
              changed: true,
              idle: true,
              timedOut: false
            };
          }
        } else {
          stableReads = 0;
        }
      }
      await delay(intervalMs);
    }

    return {
      sessionId,
      site,
      baselineText,
      text: latestText,
      changed: latestText !== baselineText,
      idle: false,
      timedOut: true
    };
  }

  private buildSynthesizedAiThread(prompt: string, response: string): BrowserExtensionConversationMessage[] {
    const messages: BrowserExtensionConversationMessage[] = [];
    if (prompt.trim()) {
      messages.push({
        id: `synth_user_${Date.now()}`,
        role: 'user',
        text: prompt,
        index: 0
      });
    }
    if (response.trim()) {
      messages.push({
        id: `synth_assistant_${Date.now()}`,
        role: 'assistant',
        text: response,
        index: messages.length
      });
    }
    return messages;
  }

  private async waitForAiMessage(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: {
      text?: string;
      role?: 'user' | 'assistant' | 'system';
      timeoutMs?: number;
      intervalMs?: number;
      stableReads?: number;
      limit?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const intervalMs = Math.max(300, options?.intervalMs ?? 1_000);
    const stableTarget = Math.max(1, options?.stableReads ?? 2);
    const normalizedNeedle = options?.text?.trim() ?? '';
    const role = options?.role;
    const limit = options?.limit ?? 20;
    const deadline = Date.now() + timeoutMs;
    let stableReads = 0;
    let lastMessage: BrowserExtensionConversationMessage | undefined;
    let lastCount = 0;
    while (Date.now() < deadline) {
      const thread = site === 'chatgpt'
        ? await this.chatGptReadThread(sessionId, { limit, timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs) })
        : await this.deepSeekReadThread(sessionId, { limit, timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs) });
      lastCount = thread.count;
      const matchedMessage = [...thread.messages].reverse().find((message) => {
        if (role && message.role !== role) {
          return false;
        }
        if (normalizedNeedle && !message.text.includes(normalizedNeedle)) {
          return false;
        }
        return true;
      });
      lastMessage = matchedMessage;
      if (matchedMessage) {
        stableReads += 1;
        if (stableReads >= stableTarget) {
          return {
            sessionId,
            site,
            role: role ?? matchedMessage.role,
            needle: normalizedNeedle || undefined,
            matched: true,
            timedOut: false,
            count: lastCount,
            message: matchedMessage
          };
        }
      } else {
        stableReads = 0;
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      site,
      role,
      needle: normalizedNeedle || undefined,
      matched: false,
      timedOut: true,
      count: lastCount,
      message: lastMessage
    };
  }

  private async waitForAiSidebar(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: { open?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(300, options?.intervalMs ?? 1_000);
    const stableTarget = Math.max(1, options?.stableReads ?? 2);
    const expectedOpen = options?.open ?? true;
    const deadline = Date.now() + timeoutMs;
    let stableReads = 0;
    let lastState: { open: boolean; toggleLabel?: string; toggleSelector?: string } | undefined;
    while (Date.now() < deadline) {
      const current = site === 'chatgpt'
        ? await this.chatGptSidebarState(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs))
        : await this.deepSeekSidebarState(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs));
      lastState = current;
      if (current.open === expectedOpen) {
        stableReads += 1;
        if (stableReads >= stableTarget) {
          return {
            sessionId,
            site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
            open: current.open,
            matched: true,
            timedOut: false,
            toggleLabel: current.toggleLabel,
            toggleSelector: current.toggleSelector
          };
        }
      } else {
        stableReads = 0;
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
      open: lastState?.open ?? false,
      matched: false,
      timedOut: true,
      toggleLabel: lastState?.toggleLabel,
      toggleSelector: lastState?.toggleSelector
    };
  }

  private async waitForAiModel(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: { query?: string; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(300, options?.intervalMs ?? 1_000);
    const stableTarget = Math.max(1, options?.stableReads ?? 2);
    const needle = options?.query?.trim().toLowerCase();
    const deadline = Date.now() + timeoutMs;
    let stableReads = 0;
    let lastModel: string | undefined;
    while (Date.now() < deadline) {
      const current = site === 'chatgpt'
        ? await this.chatGptModels(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs))
        : await this.deepSeekModels(sessionId, Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs));
      lastModel = current.currentModel;
      const matched = !needle || (current.currentModel ?? '').toLowerCase().includes(needle);
      if (matched) {
        stableReads += 1;
        if (stableReads >= stableTarget) {
          return {
            sessionId,
            site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
            query: options?.query,
            currentModel: current.currentModel,
            count: current.count,
            models: current.models,
            matched: true,
            timedOut: false
          };
        }
      } else {
        stableReads = 0;
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
      query: options?.query,
      currentModel: lastModel,
      matched: false,
      timedOut: true
    };
  }

  private async waitForAiConversation(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: { titleQuery?: string; url?: string; active?: boolean; timeoutMs?: number; intervalMs?: number; stableReads?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? 30_000;
    const intervalMs = Math.max(300, options?.intervalMs ?? 1_000);
    const stableTarget = Math.max(1, options?.stableReads ?? 2);
    const titleNeedle = options?.titleQuery?.trim().toLowerCase();
    const activeTarget = options?.active;
    const deadline = Date.now() + timeoutMs;
    let stableReads = 0;
    let lastConversation: BrowserExtensionConversationSummary | undefined;
    while (Date.now() < deadline) {
      const info = site === 'chatgpt'
        ? await this.chatGptCurrentConversation(sessionId, { timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs), limit: 20 })
        : await this.deepSeekCurrentConversation(sessionId, { timeoutMs: Math.min(DEFAULT_COMMAND_TIMEOUT_MS, timeoutMs), limit: 20 });
      lastConversation = info.conversation;
      const matched = Boolean(info.conversation)
        && (!titleNeedle || info.conversation?.title.toLowerCase().includes(titleNeedle))
        && (!options?.url || info.conversation?.url === options.url)
        && (activeTarget === undefined || info.conversation?.active === activeTarget);
      if (matched) {
        stableReads += 1;
        if (stableReads >= stableTarget) {
          return {
            sessionId,
            site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
            matched: true,
            timedOut: false,
            conversation: info.conversation
          };
        }
      } else {
        stableReads = 0;
      }
      await delay(intervalMs);
    }
    return {
      sessionId,
      site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
      matched: false,
      timedOut: true,
      conversation: lastConversation
    };
  }

  private async prepareAiSession(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: {
      ensureSidebarOpen?: boolean;
      model?: string;
      newChat?: boolean;
      titleQuery?: string;
      url?: string;
      index?: number;
      limit?: number;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) {
    const timeoutMs = options?.timeoutMs ?? 45_000;
    const intervalMs = options?.intervalMs ?? 1_000;
    const warnings: string[] = [];
    let initialInfo:
      | Awaited<ReturnType<BrowserExtensionService['chatGptInfo']>>
      | Awaited<ReturnType<BrowserExtensionService['deepSeekInfo']>>
      | undefined;
    if (options?.ensureSidebarOpen) {
      const sidebar = site === 'chatgpt'
        ? await this.chatGptSidebarState(sessionId, timeoutMs)
        : await this.deepSeekSidebarState(sessionId, timeoutMs);
      if (!sidebar.open) {
        try {
          if (site === 'chatgpt') {
            await this.chatGptToggleSidebar(sessionId, timeoutMs);
            await this.chatGptWaitSidebar(sessionId, { open: true, timeoutMs, intervalMs });
          } else {
            await this.deepSeekToggleSidebar(sessionId, timeoutMs);
            await this.deepSeekWaitSidebar(sessionId, { open: true, timeoutMs, intervalMs });
          }
        } catch (error) {
          warnings.push(error instanceof Error ? error.message : String(error));
        }
      }
    }
    if (options?.newChat) {
      try {
        if (site === 'chatgpt') {
          initialInfo = await this.chatGptInfo(sessionId, { limit: options?.limit ?? 20, timeoutMs }).catch(() => undefined);
          const alreadyFresh = Boolean(
            initialInfo
            && !initialInfo.activeConversation
            && !initialInfo.latestAssistant
            && !initialInfo.latestUser
            && (initialInfo.page?.url === 'https://chatgpt.com/' || initialInfo.page?.url === 'https://chatgpt.com')
          );
          if (!alreadyFresh) {
            await this.chatGptNewChat(sessionId, timeoutMs);
          }
        } else {
          await this.deepSeekNewChat(sessionId, timeoutMs);
        }
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    } else if (options?.titleQuery || options?.url || options?.index !== undefined) {
      try {
        if (site === 'chatgpt') {
          await this.chatGptOpenConversation(sessionId, {
            titleQuery: options.titleQuery,
            url: options.url,
            index: options.index,
            timeoutMs
          });
        } else {
          await this.deepSeekOpenConversation(sessionId, {
            titleQuery: options.titleQuery,
            url: options.url,
            index: options.index,
            timeoutMs
          });
        }
        await this.waitForAiConversation(sessionId, site, {
          titleQuery: options.titleQuery,
          url: options.url,
          active: true,
          timeoutMs
        });
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
    if (options?.model) {
      try {
        if (site === 'chatgpt') {
          await this.chatGptSelectModel(sessionId, options.model, timeoutMs);
        } else {
          await this.deepSeekSelectModel(sessionId, options.model, timeoutMs);
        }
        await this.waitForAiModel(sessionId, site, {
          query: options.model,
          timeoutMs,
          intervalMs
        });
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }
    const info = site === 'chatgpt'
      ? (initialInfo as Awaited<ReturnType<BrowserExtensionService['chatGptInfo']>> | undefined)
        ?? await this.chatGptInfo(sessionId, { limit: options?.limit ?? 20, timeoutMs })
      : await this.deepSeekInfo(sessionId, { limit: options?.limit ?? 20, timeoutMs });
    return {
      sessionId,
      site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
      prepared: warnings.length === 0,
      warnings,
      sidebar: info.sidebar,
      currentModel: info.currentModel,
      conversation: info.activeConversation,
      busy: info.busy,
      latestAssistant: info.latestAssistant,
      latestUser: info.latestUser,
      threadCount: info.threadCount,
      page: info.page
    };
  }

  private async invokeAiConversationLifecycle(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    actionQuery: 'delete' | 'archive',
    options?: { titleQuery?: string; url?: string; index?: number; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    return site === 'chatgpt'
      ? this.chatGptConversationAction(sessionId, actionQuery, {
          titleQuery: options?.titleQuery,
          url: options?.url,
          index: options?.index,
          timeoutMs
        })
      : this.deepSeekConversationAction(sessionId, actionQuery, {
          titleQuery: options?.titleQuery,
          url: options?.url,
          index: options?.index,
          timeoutMs
        });
  }

  private async listAiResponseVersions(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
    const limit = options?.limit ?? 20;
    const maxVersions = Math.max(1, options?.maxVersions ?? 10);
    const initialControls = await this.getAiResponseControls(sessionId, site, { limit, timeoutMs });
    const previousStates: AiResponseVersionState[] = [];
    let currentState = initialControls;
    while (currentState.previousAvailable && previousStates.length < maxVersions - 1) {
      currentState = await this.moveAiResponse(sessionId, site, 'previous', { limit, timeoutMs });
      previousStates.push(currentState);
    }

    const currentIndex = previousStates.length;
    const versions: Array<{
      index: number;
      current: boolean;
      threadCount: number;
      latestAssistant: string;
      latestUser: string;
      previousAvailable: boolean;
      nextAvailable: boolean;
      previousLabel?: string;
      nextLabel?: string;
      messages: BrowserExtensionConversationMessage[];
    }> = [];
    versions.push(this.buildAiResponseVersionSnapshot(currentState, 0, currentIndex));
    while (currentState.nextAvailable && versions.length < maxVersions) {
      currentState = await this.moveAiResponse(sessionId, site, 'next', { limit, timeoutMs });
      versions.push(this.buildAiResponseVersionSnapshot(currentState, versions.length, currentIndex));
    }

    const latestIndex = versions.length - 1;
    for (let index = latestIndex; index > currentIndex; index -= 1) {
      await this.moveAiResponse(sessionId, site, 'previous', { limit, timeoutMs });
    }

    return {
      sessionId,
      site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
      currentIndex,
      count: versions.length,
      versions
    };
  }

  private async selectAiResponseVersion(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    targetIndex: number,
    options?: { limit?: number; maxVersions?: number; timeoutMs?: number }
  ) {
    const versionList = await this.listAiResponseVersions(sessionId, site, options);
    const target = versionList.versions.find((version) => version.index === targetIndex);
    if (!target) {
      throw new Error(`Response version index ${targetIndex} is out of range (0-${Math.max(0, versionList.count - 1)})`);
    }
    let selected = this.toAiResponseVersionState(versionList.versions[versionList.currentIndex]!);
    const direction = targetIndex < versionList.currentIndex ? 'previous' : 'next';
    const moveCount = Math.abs(targetIndex - versionList.currentIndex);
    for (let index = 0; index < moveCount; index += 1) {
      selected = await this.moveAiResponse(sessionId, site, direction, {
        limit: options?.limit ?? 20,
        timeoutMs: options?.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS
      });
    }
    return {
      sessionId,
      site: site === 'chatgpt' ? 'chatgpt.com' : 'deepseek.com',
      currentIndex: targetIndex,
      selectedIndex: targetIndex,
      selected: this.buildAiResponseVersionSnapshot(selected, targetIndex, targetIndex),
      count: versionList.count,
      versions: versionList.versions.map((version) => ({
        ...version,
        current: version.index === targetIndex
      }))
    };
  }

  private async getAiResponseControls(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    options?: { limit?: number; timeoutMs?: number }
  ): Promise<AiResponseVersionState> {
    if (site === 'chatgpt') {
      return this.chatGptResponseControls(sessionId, options);
    }
    return this.deepSeekResponseControls(sessionId, options);
  }

  private async moveAiResponse(
    sessionId: string,
    site: 'chatgpt' | 'deepseek',
    direction: 'previous' | 'next',
    options?: { limit?: number; timeoutMs?: number }
  ): Promise<AiResponseVersionState> {
    if (site === 'chatgpt') {
      return direction === 'previous'
        ? this.chatGptPreviousResponse(sessionId, options)
        : this.chatGptNextResponse(sessionId, options);
    }
    return direction === 'previous'
      ? this.deepSeekPreviousResponse(sessionId, options)
      : this.deepSeekNextResponse(sessionId, options);
  }

  private buildAiResponseVersionSnapshot(
    state: AiResponseVersionState,
    index: number,
    currentIndex: number
  ) {
    return {
      index,
      current: index === currentIndex,
      threadCount: state.threadCount,
      latestAssistant: state.latestAssistant,
      latestUser: state.latestUser,
      previousAvailable: state.previousAvailable,
      nextAvailable: state.nextAvailable,
      previousLabel: state.previousLabel,
      nextLabel: state.nextLabel,
      messages: state.messages
    };
  }

  private toAiResponseVersionState(
    state: AiResponseVersionState | {
      threadCount: number;
      latestAssistant: string;
      latestUser: string;
      previousAvailable: boolean;
      nextAvailable: boolean;
      previousLabel?: string;
      nextLabel?: string;
      messages: BrowserExtensionConversationMessage[];
    }
  ): AiResponseVersionState {
    return {
      threadCount: state.threadCount,
      latestAssistant: state.latestAssistant,
      latestUser: state.latestUser,
      previousAvailable: state.previousAvailable,
      nextAvailable: state.nextAvailable,
      previousLabel: state.previousLabel,
      nextLabel: state.nextLabel,
      messages: state.messages
    };
  }

  private describeCommandResult(
    command: BrowserExtensionQueuedCommand,
    payload: BrowserExtensionCommandResult,
    resultRecord: {
      url?: string;
      posts?: BrowserExtensionXPost[];
      snapshot?: BrowserExtensionSnapshot;
    } | undefined
  ) {
    if (!payload.ok) {
      return payload.error || `Browser-extension command failed: ${command.kind}`;
    }
    switch (command.kind) {
      case 'navigate':
        return `Navigated to ${String(command.payload.url ?? resultRecord?.url ?? '')}`.trim();
      case 'snapshot':
        return `Captured snapshot for ${resultRecord?.snapshot?.title ?? 'active tab'}`;
      case 'screenshot':
        return 'Captured browser-extension screenshot for active tab';
      case 'inspect':
        return `Inspected selector ${String(command.payload.selector ?? '')}`.trim();
      case 'inspect_all':
        return `Inspected selector list ${String(command.payload.selector ?? '')}`.trim();
      case 'links':
        return 'Collected visible page links';
      case 'dom_events':
        return 'Collected browser-extension DOM mutation events';
      case 'clear_dom_events':
        return 'Cleared browser-extension DOM mutation events';
      case 'x_search':
        return `X search returned ${resultRecord?.posts?.length ?? 0} visible post(s)`;
      case 'x_timeline':
        return `X timeline returned ${resultRecord?.posts?.length ?? 0} visible post(s)`;
      case 'x_bookmarks':
        return `X bookmarks returned ${resultRecord?.posts?.length ?? 0} visible post(s)`;
      case 'x_notifications':
        return `X notifications returned ${resultRecord?.posts?.length ?? 0} visible post(s)`;
      case 'x_messages':
        return 'Read X direct-message inbox threads';
      case 'x_open_message_thread':
        return 'Opened an X direct-message thread';
      case 'x_send_message':
        return 'Sent an X direct message';
      case 'x_read_thread':
        return `X thread returned ${resultRecord?.posts?.length ?? 0} visible post(s)`;
      case 'x_post':
        return 'Posted to X';
      case 'x_open_post':
        return 'Opened X post thread';
      case 'x_profile':
        return 'Read X profile';
      case 'x_follow':
        return 'Followed X profile';
      case 'x_reply':
        return 'Replied on X';
      case 'x_like':
        return 'Liked an X post';
      case 'x_repost':
        return 'Reposted an X post';
      case 'chatgpt_ask':
      case 'deepseek_ask':
        return `Received assistant response for ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_read_thread':
      case 'deepseek_read_thread':
        return `Read conversation thread from ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_busy':
      case 'deepseek_busy':
        return `Checked ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} busy state`;
      case 'chatgpt_list_conversations':
      case 'deepseek_list_conversations':
        return `Listed sidebar conversations from ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_open_conversation':
      case 'deepseek_open_conversation':
        return `Opened a saved conversation in ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_conversation_actions':
      case 'deepseek_conversation_actions':
        return `Listed conversation actions from ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_conversation_action':
      case 'deepseek_conversation_action':
        return `Invoked a conversation action in ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_rename_conversation':
      case 'deepseek_rename_conversation':
        return `Renamed a saved conversation in ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_new_chat':
      case 'deepseek_new_chat':
        return `Started a new ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} chat`;
      case 'chatgpt_sidebar_state':
      case 'deepseek_sidebar_state':
        return `Read sidebar state from ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_toggle_sidebar':
      case 'deepseek_toggle_sidebar':
        return `Toggled sidebar visibility in ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_models':
      case 'deepseek_models':
        return `Listed available models in ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_select_model':
      case 'deepseek_select_model':
        return `Selected a model in ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_stop':
      case 'deepseek_stop':
        return `Stopped ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} generation`;
      case 'chatgpt_continue':
      case 'deepseek_continue':
        return `Continued ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} generation`;
      case 'chatgpt_response_controls':
      case 'deepseek_response_controls':
        return `Read ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} response navigation controls`;
      case 'chatgpt_previous_response':
      case 'deepseek_previous_response':
        return `Moved to the previous ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} response variant`;
      case 'chatgpt_next_response':
      case 'deepseek_next_response':
        return `Moved to the next ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} response variant`;
      case 'chatgpt_regenerate':
      case 'deepseek_regenerate':
        return `Triggered ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} regeneration`;
      case 'chatgpt_edit_message':
      case 'deepseek_edit_message':
        return `Edited a ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} message`;
      case 'chatgpt_wait_idle':
      case 'deepseek_wait_idle':
        return `${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'} became idle`;
      case 'chatgpt_send':
      case 'deepseek_send':
        return `Sent prompt through ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      case 'chatgpt_read_latest':
      case 'deepseek_read_latest':
        return `Read latest assistant response from ${command.kind.startsWith('chatgpt') ? 'ChatGPT' : 'DeepSeek'}`;
      default:
        return `Completed browser-extension command: ${command.kind}`;
    }
  }

  private selectConversationMessage(
    messages: BrowserExtensionConversationMessage[],
    options?: { index?: number; role?: 'user' | 'assistant' | 'system'; offset?: number }
  ) {
    if (messages.length === 0) {
      throw new Error('No visible conversation messages were found');
    }
    if (typeof options?.index === 'number') {
      const direct = messages.find((entry) => entry.index === options.index) ?? messages[options.index];
      if (!direct) {
        throw new Error(`No conversation message matched index ${options.index}`);
      }
      return direct;
    }
    const filtered = options?.role
      ? messages.filter((entry) => entry.role === options.role)
      : messages;
    if (filtered.length === 0) {
      throw new Error(options?.role ? `No visible ${options.role} messages were found` : 'No visible conversation messages were found');
    }
    const offset = Math.max(0, options?.offset ?? 0);
    const target = filtered[filtered.length - 1 - offset];
    if (!target) {
      throw new Error(`No conversation message matched offset ${offset}`);
    }
    return target;
  }

  private renderConversationMarkdown(title: string, messages: BrowserExtensionConversationMessage[]) {
    const lines = [`# ${title}`, ''];
    for (const message of messages) {
      lines.push(`## ${message.role}`);
      lines.push('');
      lines.push(message.text ?? '');
      lines.push('');
    }
    return lines.join('\n').trim();
  }

  private extractBase64FromDataUrl(dataUrl: string) {
    const match = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl);
    if (!match?.[1]) {
      throw new Error('Browser-extension screenshot did not return a valid base64 data URL');
    }
    return match[1];
  }
}
