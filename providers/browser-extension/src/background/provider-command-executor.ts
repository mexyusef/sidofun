import type {
  SidofunBrowserExtensionXPost,
  SidofunBrowserProviderQueuedCommand,
} from '../protocol.js';

interface SessionRecordLike {
  sessionId: string;
  tabs?: Array<{ id: number; url?: string; active?: boolean }>;
}

interface ProviderCommandDeps<TSession extends SessionRecordLike> {
  navigateActiveSessionTab: (sessionId: string, existing: TSession, targetUrl: string) => Promise<number>;
  getTrackedActiveTabId: (existing: TSession, sessionId: string) => Promise<number>;
  send: (tabId: number, payload: Record<string, unknown>, sessionId: string) => Promise<Record<string, any>>;
  executeDomBridgeWithFallback: <T>(
    tabId: number,
    sessionId: string,
    bridgeKind: string,
    payload: Record<string, unknown>,
    fallbackKind: string,
    fallbackKey: string
  ) => Promise<T | undefined>;
  normalizeXProfileUrl: (handleOrUrl: string) => string;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildXSearchUrl(query: string, modeRaw: unknown) {
  const mode = String(modeRaw || 'latest').toLowerCase();
  const filter =
    mode === 'top'
      ? undefined
      : mode === 'people'
        ? 'user'
        : mode === 'media'
          ? 'image'
          : 'live';
  const searchUrl = new URL('https://x.com/search');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('src', 'typed_query');
  if (filter) {
    searchUrl.searchParams.set('f', filter);
  }
  return searchUrl.toString();
}

async function waitForStableXPosts(
  extractor: () => Promise<Record<string, any> | undefined>,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    minWaitMs?: number;
    stableReads?: number;
  }
) {
  const timeoutMs = Math.max(5_000, options?.timeoutMs ?? 20_000);
  const intervalMs = Math.max(500, options?.intervalMs ?? 1_000);
  const minWaitMs = Math.max(intervalMs, options?.minWaitMs ?? 5_000);
  const stableReadsTarget = Math.max(2, options?.stableReads ?? 3);
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  let lastResponse: Record<string, any> | undefined;
  let lastCount = -1;
  let stableReads = 0;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      const response = await extractor();
      const posts = Array.isArray(response.posts) ? response.posts : [];
      const count = posts.length;
      lastResponse = response;
      lastError = undefined;
      if (count > 0) {
        return response;
      }
      stableReads = count === lastCount ? stableReads + 1 : 1;
      lastCount = count;
      if (Date.now() - startedAt >= minWaitMs && stableReads >= stableReadsTarget) {
        return response;
      }
    } catch (error) {
      lastError = error;
    }
    await wait(intervalMs);
  }

  if (lastResponse) {
    return lastResponse;
  }
  throw (lastError instanceof Error ? lastError : new Error('Timed out waiting for X posts'));
}

async function handleAsk(
  deps: { send: (tabId: number, payload: Record<string, unknown>, sessionId: string) => Promise<Record<string, any>> },
  tabId: number,
  sessionId: string,
  promptKind: string,
  readKind: string,
  text: string,
  timeoutMsRaw: unknown
) {
  const baselineResponse = await deps.send(tabId, { kind: readKind }, sessionId);
  const baselineText = String(baselineResponse.text ?? '').trim();
  await deps.send(tabId, { kind: promptKind, text }, sessionId);
  const timeoutMs = Number.parseInt(String(timeoutMsRaw ?? '45000'), 10);
  const deadline = Date.now() + (Number.isNaN(timeoutMs) ? 45_000 : timeoutMs);
  let lastSeen = '';
  let stableReads = 0;
  while (Date.now() < deadline) {
    await wait(1200);
    const latestResponse = await deps.send(tabId, { kind: readKind }, sessionId);
    const latestText = String(latestResponse.text ?? '').trim();
    if (!latestText || latestText === baselineText) {
      continue;
    }
    if (latestText === lastSeen) {
      stableReads += 1;
    } else {
      lastSeen = latestText;
      stableReads = 1;
    }
    if (stableReads >= 2) {
      return { prompt: text, response: latestText };
    }
  }
  return { prompt: text, response: lastSeen || baselineText, timedOut: true };
}

export function createProviderCommandExecutor<TSession extends SessionRecordLike>(
  deps: ProviderCommandDeps<TSession>
) {
  return async function executeProviderCommand(command: SidofunBrowserProviderQueuedCommand, existing: TSession) {
    switch (command.kind) {
      case 'x_search': {
        const limit = Number.parseInt(String(command.payload.limit ?? '10'), 10);
        const searchUrl = buildXSearchUrl(String(command.payload.query || ''), command.payload.mode);
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, searchUrl);
        const normalizedLimit = Number.isNaN(limit) ? 10 : Math.max(1, limit);
        const response = await waitForStableXPosts(
          () => deps.executeDomBridgeWithFallback<Record<string, any>>(
            tabId,
            command.sessionId,
            'x_search_extract',
            { limit: normalizedLimit },
            'x_search_extract',
            'posts'
          ).then((posts) => ({ posts: Array.isArray(posts) ? posts : [] })),
          {
            timeoutMs: Number.parseInt(String(command.payload.timeoutMs ?? '20000'), 10),
            intervalMs: 1_000,
            minWaitMs: 5_000,
            stableReads: 3,
          }
        );
        return { handled: true, result: { url: searchUrl, posts: (response.posts ?? []) as SidofunBrowserExtensionXPost[] } };
      }

      case 'x_timeline': {
        const limit = Number.parseInt(String(command.payload.limit ?? '10'), 10);
        const timelineType = String(command.payload.timelineType || 'for-you') === 'following' ? 'following' : 'for-you';
        const timelineUrl = 'https://x.com/home';
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, timelineUrl);
        await wait(1200);
        const response = await deps.executeDomBridgeWithFallback<Record<string, any>>(
          tabId,
          command.sessionId,
          'x_timeline_extract',
          {
            timelineType,
            limit: Number.isNaN(limit) ? 10 : Math.max(1, limit)
          },
          'x_timeline_extract',
          'posts'
        ).then((posts) => ({ posts: Array.isArray(posts) ? posts : [] }));
        return { handled: true, result: { type: timelineType, url: timelineUrl, posts: (response.posts ?? []) as SidofunBrowserExtensionXPost[] } };
      }

      case 'x_bookmarks': {
        const limit = Number.parseInt(String(command.payload.limit ?? '10'), 10);
        const bookmarksUrl = 'https://x.com/i/bookmarks';
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, bookmarksUrl);
        await wait(1200);
        const response = await deps.send(tabId, { kind: 'x_bookmarks_extract', limit: Number.isNaN(limit) ? 10 : Math.max(1, limit) }, command.sessionId);
        return { handled: true, result: { url: bookmarksUrl, posts: (response.posts ?? []) as SidofunBrowserExtensionXPost[] } };
      }

      case 'x_notifications': {
        const limit = Number.parseInt(String(command.payload.limit ?? '10'), 10);
        const notificationsUrl = 'https://x.com/notifications';
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, notificationsUrl);
        await wait(1200);
        const response = await deps.executeDomBridgeWithFallback<Record<string, any>>(
          tabId,
          command.sessionId,
          'x_notifications_extract',
          { limit: Number.isNaN(limit) ? 10 : Math.max(1, limit) },
          'x_notifications_extract',
          'posts'
        ).then((posts) => ({ posts: Array.isArray(posts) ? posts : [] }));
        return { handled: true, result: { url: notificationsUrl, posts: (response.posts ?? []) as SidofunBrowserExtensionXPost[] } };
      }

      case 'x_messages': {
        const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
        const messagesUrl = 'https://x.com/messages';
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, messagesUrl);
        await wait(1200);
        const response = await deps.send(tabId, { kind: 'x_messages_extract', limit: Number.isNaN(limit) ? 20 : Math.max(1, limit) }, command.sessionId);
        return { handled: true, result: { url: messagesUrl, threads: Array.isArray(response.threads) ? response.threads : [] } };
      }

      case 'x_open_message_thread': {
        const thread = typeof command.payload.thread === 'string' ? command.payload.thread.trim() : '';
        const limit = Number.parseInt(String(command.payload.limit ?? '20'), 10);
        const threadUrl = thread && /^https?:\/\//i.test(thread) ? thread : 'https://x.com/messages';
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, threadUrl);
        await wait(1200);
        const response = await deps.send(tabId, { kind: 'x_open_message_thread', thread: thread || undefined, limit: Number.isNaN(limit) ? 20 : Math.max(1, limit) }, command.sessionId);
        return { handled: true, result: { url: typeof response.thread?.url === 'string' ? response.thread.url : threadUrl, thread: response.thread, messages: Array.isArray(response.messages) ? response.messages : [] } };
      }

      case 'x_send_message': {
        const text = String(command.payload.text || '').trim();
        const thread = typeof command.payload.thread === 'string' ? command.payload.thread.trim() : '';
        if (!text) throw new Error('A direct-message text is required for x_send_message');
        const threadUrl = thread && /^https?:\/\//i.test(thread) ? thread : 'https://x.com/messages';
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, threadUrl);
        await wait(1200);
        const response = await deps.send(tabId, { kind: 'x_send_message', text, thread: thread || undefined }, command.sessionId);
        return { handled: true, result: { url: typeof response.thread?.url === 'string' ? response.thread.url : threadUrl, text, sent: response.sent === true, thread: response.thread, messages: Array.isArray(response.messages) ? response.messages : [] } };
      }

      case 'x_read_thread': {
        const postUrl = String(command.payload.postUrl || '').trim();
        if (!postUrl) throw new Error('A post URL is required for x_read_thread');
        const limit = Number.parseInt(String(command.payload.limit ?? '10'), 10);
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, postUrl);
        await wait(1200);
        const response = await deps.executeDomBridgeWithFallback<Record<string, any>>(
          tabId,
          command.sessionId,
          'x_thread_read',
          { postUrl, limit: Number.isNaN(limit) ? 10 : Math.max(1, limit) },
          'x_thread_read',
          'posts'
        ).then((posts) => ({ posts: Array.isArray(posts) ? posts : [] }));
        return { handled: true, result: { url: postUrl, posts: (response.posts ?? []) as SidofunBrowserExtensionXPost[] } };
      }

      case 'x_post': {
        const text = String(command.payload.text || '').trim();
        if (!text) throw new Error('A post text is required for x_post');
        const composeUrl = 'https://x.com/compose/post';
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, composeUrl);
        await wait(1200);
        const response = await deps.send(tabId, { kind: 'x_post_send', text }, command.sessionId);
        return { handled: true, result: { url: composeUrl, text, sent: response.sent === true } };
      }

      case 'x_open_post': {
        const postUrl = String(command.payload.postUrl || '').trim();
        if (!postUrl) throw new Error('A post URL is required for x_open_post');
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, postUrl);
        await wait(1200);
        const response = await deps.executeDomBridgeWithFallback<Record<string, any>>(
          tabId,
          command.sessionId,
          'x_open_post_read',
          { postUrl },
          'x_open_post_read',
          'post'
        ).then((post) => ({ post }));
        return { handled: true, result: { url: postUrl, post: response.post } };
      }

      case 'x_profile': {
        const handleOrUrl = String(command.payload.handleOrUrl || '').trim();
        const limit = Number.parseInt(String(command.payload.limit ?? '5'), 10);
        const profileUrl = deps.normalizeXProfileUrl(handleOrUrl);
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, profileUrl);
        await wait(1200);
        const response = await deps.executeDomBridgeWithFallback<Record<string, any>>(
          tabId,
          command.sessionId,
          'x_profile_read',
          { limit: Number.isNaN(limit) ? 5 : Math.max(1, limit) },
          'x_profile_read',
          'profile'
        ).then((profile) => ({ profile }));
        return { handled: true, result: { url: profileUrl, profile: response.profile } };
      }

      case 'x_follow': {
        const handleOrUrl = String(command.payload.handleOrUrl || '').trim();
        if (!handleOrUrl) throw new Error('A handle or URL is required for x_follow');
        const profileUrl = deps.normalizeXProfileUrl(handleOrUrl);
        const tabId = await deps.navigateActiveSessionTab(command.sessionId, existing, profileUrl);
        await wait(1200);
        const response = await deps.send(tabId, { kind: 'x_follow_profile' }, command.sessionId);
        return { handled: true, result: { url: profileUrl, followed: response.followed === true, alreadyFollowing: response.alreadyFollowing === true, buttonLabel: typeof response.buttonLabel === 'string' ? response.buttonLabel : undefined } };
      }

      case 'x_reply': {
        const text = String(command.payload.text || '').trim();
        const postUrl = typeof command.payload.postUrl === 'string' ? command.payload.postUrl.trim() : '';
        if (!text) throw new Error('A reply text is required for x_reply');
        const tabId = postUrl ? await deps.navigateActiveSessionTab(command.sessionId, existing, postUrl) : await deps.getTrackedActiveTabId(existing, command.sessionId);
        await wait(1200);
        const response = await deps.send(tabId, { kind: 'x_reply_send', text, postUrl: postUrl || undefined }, command.sessionId);
        return { handled: true, result: { url: postUrl || existing.tabs?.find((tab) => tab.active)?.url, text, replied: response.replied === true } };
      }

      case 'x_like': {
        const postUrl = typeof command.payload.postUrl === 'string' ? command.payload.postUrl.trim() : '';
        const tabId = postUrl ? await deps.navigateActiveSessionTab(command.sessionId, existing, postUrl) : await deps.getTrackedActiveTabId(existing, command.sessionId);
        await wait(900);
        const response = await deps.send(tabId, { kind: 'x_like_post', postUrl: postUrl || undefined }, command.sessionId);
        return { handled: true, result: { url: postUrl || existing.tabs?.find((tab) => tab.active)?.url, liked: response.liked === true } };
      }

      case 'x_repost': {
        const postUrl = typeof command.payload.postUrl === 'string' ? command.payload.postUrl.trim() : '';
        const tabId = postUrl ? await deps.navigateActiveSessionTab(command.sessionId, existing, postUrl) : await deps.getTrackedActiveTabId(existing, command.sessionId);
        await wait(900);
        const response = await deps.send(tabId, { kind: 'x_repost_post', postUrl: postUrl || undefined }, command.sessionId);
        return { handled: true, result: { url: postUrl || existing.tabs?.find((tab) => tab.active)?.url, reposted: response.reposted === true } };
      }

      case 'chatgpt_read_latest':
      case 'chatgpt_sidebar_state':
      case 'chatgpt_toggle_sidebar':
      case 'chatgpt_models':
      case 'chatgpt_list_conversations':
      case 'chatgpt_read_thread':
      case 'chatgpt_response_controls':
      case 'chatgpt_new_chat':
      case 'chatgpt_wait_idle':
      case 'deepseek_read_latest':
      case 'deepseek_sidebar_state':
      case 'deepseek_toggle_sidebar':
      case 'deepseek_models':
      case 'deepseek_list_conversations':
      case 'deepseek_read_thread':
      case 'deepseek_response_controls':
      case 'deepseek_new_chat':
      case 'deepseek_wait_idle': {
        const tabId = await deps.getTrackedActiveTabId(existing, command.sessionId);
        const bridgeKindMap: Record<string, string> = {
          chatgpt_read_latest: 'chatgpt_read_latest',
          chatgpt_sidebar_state: 'chatgpt_sidebar_state',
          chatgpt_toggle_sidebar: 'chatgpt_toggle_sidebar',
          chatgpt_models: 'chatgpt_models',
          chatgpt_list_conversations: 'chatgpt_list_conversations',
          chatgpt_read_thread: 'chatgpt_read_thread',
          chatgpt_response_controls: 'chatgpt_response_controls',
          chatgpt_new_chat: 'chatgpt_new_chat',
          chatgpt_wait_idle: 'chatgpt_busy',
          deepseek_read_latest: 'deepseek_read_latest',
          deepseek_sidebar_state: 'deepseek_sidebar_state',
          deepseek_toggle_sidebar: 'deepseek_toggle_sidebar',
          deepseek_models: 'deepseek_models',
          deepseek_list_conversations: 'deepseek_list_conversations',
          deepseek_read_thread: 'deepseek_read_thread',
          deepseek_response_controls: 'deepseek_response_controls',
          deepseek_new_chat: 'deepseek_new_chat',
          deepseek_wait_idle: 'deepseek_busy',
        };
        const response = await deps.executeDomBridgeWithFallback<Record<string, any>>(
          tabId,
          command.sessionId,
          bridgeKindMap[command.kind],
          {
            titleQuery: command.payload.titleQuery,
            url: command.payload.url,
            index: command.payload.index,
            limit: command.payload.limit,
          },
          bridgeKindMap[command.kind],
          command.kind.endsWith('_list_conversations')
            ? 'conversations'
            : command.kind.endsWith('_read_thread')
              ? 'messages'
              : command.kind.endsWith('_models')
                ? 'models'
                : command.kind.endsWith('_response_controls')
                  ? 'controls'
                : command.kind.endsWith('_toggle_sidebar')
                  ? 'sidebar'
                : command.kind.endsWith('_sidebar_state')
                  ? 'sidebar'
                  : command.kind.endsWith('_new_chat')
                    ? 'started'
                  : command.kind.endsWith('_wait_idle')
                    ? 'busy'
                    : 'text'
        ) ?? {};
        const shaped: Record<string, unknown> = {};
        if (command.kind.endsWith('_read_latest')) shaped.text = String(response.text ?? '');
        if (command.kind.endsWith('_sidebar_state') || command.kind.endsWith('_toggle_sidebar')) shaped.sidebar = response.sidebar;
        if (command.kind.endsWith('_models')) {
          shaped.currentModel = typeof response.currentModel === 'string' ? response.currentModel : undefined;
          shaped.models = Array.isArray(response.models) ? response.models : [];
        }
        if (command.kind.endsWith('_list_conversations')) shaped.conversations = Array.isArray(response.conversations) ? response.conversations : [];
        if (command.kind.endsWith('_read_thread')) {
          shaped.messages = Array.isArray(response.messages) ? response.messages : [];
          shaped.latestAssistant = String(response.latestAssistant ?? '');
          shaped.latestUser = String(response.latestUser ?? '');
        }
        if (command.kind.endsWith('_response_controls')) shaped.controls = response.controls;
        if (command.kind.endsWith('_new_chat')) shaped.started = response.started === true;
        if (command.kind.endsWith('_wait_idle')) shaped.busy = response.busy === true;
        return { handled: true, result: shaped };
      }

      case 'chatgpt_open_conversation':
      case 'chatgpt_conversation_actions':
      case 'chatgpt_stop':
      case 'chatgpt_continue':
      case 'chatgpt_previous_response':
      case 'chatgpt_next_response':
      case 'chatgpt_regenerate':
      case 'deepseek_open_conversation':
      case 'deepseek_conversation_actions':
      case 'deepseek_stop':
      case 'deepseek_continue':
      case 'deepseek_previous_response':
      case 'deepseek_next_response':
      case 'deepseek_regenerate': {
        const tabId = await deps.getTrackedActiveTabId(existing, command.sessionId);
        const response = await deps.send(tabId, {
          kind: command.kind,
          titleQuery: command.payload.titleQuery,
          url: command.payload.url,
          index: command.payload.index,
          limit: command.payload.limit,
        }, command.sessionId);
        const shaped: Record<string, unknown> = {};
        if (command.kind.endsWith('_open_conversation')) shaped.conversation = response.conversation;
        if (command.kind.endsWith('_conversation_actions')) {
          shaped.conversation = response.conversation;
          shaped.actions = Array.isArray(response.actions) ? response.actions : [];
        }
        if (command.kind.endsWith('_stop')) shaped.stopped = response.stopped === true;
        if (command.kind.endsWith('_continue')) shaped.continued = response.continued === true;
        if (command.kind.endsWith('_previous_response') || command.kind.endsWith('_next_response')) {
          shaped.moved = response.moved === true;
          shaped.direction = typeof response.direction === 'string' ? response.direction : undefined;
        }
        if (command.kind.endsWith('_regenerate')) shaped.regenerated = response.regenerated === true;
        return { handled: true, result: shaped };
      }

      case 'chatgpt_select_model':
      case 'deepseek_select_model': {
        const tabId = await deps.getTrackedActiveTabId(existing, command.sessionId);
        const query = String(command.payload.query || '');
        if (!query.trim()) {
          throw new Error(`A model query is required for ${command.kind}`);
        }
        const response = await deps.send(tabId, { kind: command.kind, query }, command.sessionId);
        return { handled: true, result: { selected: typeof response.selected === 'string' ? response.selected : undefined } };
      }

      case 'chatgpt_conversation_action':
      case 'deepseek_conversation_action': {
        const tabId = await deps.getTrackedActiveTabId(existing, command.sessionId);
        const actionQuery = String(command.payload.actionQuery || '');
        if (!actionQuery.trim()) {
          throw new Error(`An action query is required for ${command.kind}`);
        }
        const response = await deps.send(tabId, { kind: command.kind, actionQuery, titleQuery: command.payload.titleQuery, url: command.payload.url, index: command.payload.index }, command.sessionId);
        return { handled: true, result: { conversation: response.conversation, action: typeof response.action === 'string' ? response.action : undefined } };
      }

      case 'chatgpt_rename_conversation':
      case 'deepseek_rename_conversation': {
        const tabId = await deps.getTrackedActiveTabId(existing, command.sessionId);
        const title = String(command.payload.title || '');
        if (!title.trim()) {
          throw new Error(`A title is required for ${command.kind}`);
        }
        const response = await deps.send(tabId, { kind: command.kind, title, titleQuery: command.payload.titleQuery, url: command.payload.url, index: command.payload.index }, command.sessionId);
        return { handled: true, result: { conversation: response.conversation, action: typeof response.action === 'string' ? response.action : undefined, title: typeof response.title === 'string' ? response.title : title } };
      }

      case 'chatgpt_send':
      case 'deepseek_send': {
        const tabId = await deps.getTrackedActiveTabId(existing, command.sessionId);
        const text = String(command.payload.text || '');
        if (!text.trim()) {
          throw new Error(`A prompt is required for ${command.kind}`);
        }
        const response = await deps.send(tabId, { kind: command.kind, text }, command.sessionId);
        return { handled: true, result: { sent: response.sent === true } };
      }

      case 'chatgpt_ask':
      case 'deepseek_ask': {
        const tabId = await deps.getTrackedActiveTabId(existing, command.sessionId);
        const text = String(command.payload.text || '');
        if (!text.trim()) {
          throw new Error(`A prompt is required for ${command.kind}`);
        }
        const isChatGpt = command.kind.startsWith('chatgpt_');
        const result = await handleAsk(
          { send: deps.send },
          tabId,
          command.sessionId,
          isChatGpt ? 'chatgpt_send' : 'deepseek_send',
          isChatGpt ? 'chatgpt_read_latest' : 'deepseek_read_latest',
          text,
          command.payload.timeoutMs
        );
        return { handled: true, result };
      }

      default:
        return { handled: false as const };
    }
  };
}
