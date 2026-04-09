type ContentMessage = Record<string, unknown>;
type SendResponse = (response: Record<string, unknown>) => void;

interface XCommandDeps {
  collectXSearchPosts: (limit: number) => unknown;
  collectXTimelinePosts: (timelineType: 'for-you' | 'following', limit: number) => Promise<unknown>;
  collectXNotifications: (limit: number) => unknown;
  collectXMessageThreads: (limit: number) => unknown;
  openXMessageThread: (thread?: string) => Promise<{ thread: unknown; messages: unknown[] }>;
  sendXDirectMessage: (text: string, thread?: string) => Promise<{ thread: unknown; messages: unknown[] }>;
  collectXThread: (limit: number, postUrl?: string) => unknown;
  sendXPost: (text: string) => void;
  collectSingleXPost: (postUrl?: string) => unknown;
  collectXProfile: (limit: number) => unknown;
  followXProfile: () => Record<string, unknown>;
  sendXReply: (text: string, postUrl?: string) => void;
  likeXPost: (postUrl?: string) => void;
  repostXPost: (postUrl?: string) => Promise<void>;
}

function parseLimit(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : Math.max(1, parsed);
}

export async function handleXCommand(
  message: ContentMessage,
  sendResponse: SendResponse,
  deps: XCommandDeps
) {
  switch (message.kind) {
    case 'x_search_extract':
      sendResponse({ ok: true, posts: deps.collectXSearchPosts(parseLimit(message.limit, 10)) });
      return true;

    case 'x_timeline_extract': {
      const timelineType = String(message.timelineType || 'for-you') === 'following' ? 'following' : 'for-you';
      sendResponse({
        ok: true,
        type: timelineType,
        posts: await deps.collectXTimelinePosts(timelineType, parseLimit(message.limit, 10))
      });
      return true;
    }

    case 'x_bookmarks_extract':
      sendResponse({ ok: true, posts: deps.collectXSearchPosts(parseLimit(message.limit, 10)) });
      return true;

    case 'x_notifications_extract':
      sendResponse({ ok: true, posts: deps.collectXNotifications(parseLimit(message.limit, 10)) });
      return true;

    case 'x_messages_extract':
      sendResponse({ ok: true, threads: deps.collectXMessageThreads(parseLimit(message.limit, 20)) });
      return true;

    case 'x_open_message_thread': {
      const limit = parseLimit(message.limit, 20);
      const result = await deps.openXMessageThread(typeof message.thread === 'string' ? message.thread : undefined);
      sendResponse({
        ok: true,
        thread: result.thread,
        messages: result.messages.slice(Math.max(0, result.messages.length - limit))
      });
      return true;
    }

    case 'x_send_message': {
      const result = await deps.sendXDirectMessage(
        String(message.text || ''),
        typeof message.thread === 'string' ? message.thread : undefined
      );
      sendResponse({ ok: true, sent: true, thread: result.thread, messages: result.messages });
      return true;
    }

    case 'x_thread_read':
      sendResponse({
        ok: true,
        posts: deps.collectXThread(parseLimit(message.limit, 10), typeof message.postUrl === 'string' ? message.postUrl : undefined)
      });
      return true;

    case 'x_post_send':
      deps.sendXPost(String(message.text || ''));
      sendResponse({ ok: true, sent: true });
      return true;

    case 'x_open_post_read':
      sendResponse({
        ok: true,
        post: deps.collectSingleXPost(typeof message.postUrl === 'string' ? message.postUrl : undefined)
      });
      return true;

    case 'x_profile_read':
      sendResponse({ ok: true, profile: deps.collectXProfile(parseLimit(message.limit, 5)) });
      return true;

    case 'x_follow_profile':
      sendResponse({ ok: true, ...deps.followXProfile() });
      return true;

    case 'x_reply_send':
      deps.sendXReply(String(message.text || ''), typeof message.postUrl === 'string' ? message.postUrl : undefined);
      sendResponse({ ok: true, replied: true });
      return true;

    case 'x_like_post':
      deps.likeXPost(typeof message.postUrl === 'string' ? message.postUrl : undefined);
      sendResponse({ ok: true, liked: true });
      return true;

    case 'x_repost_post':
      await deps.repostXPost(typeof message.postUrl === 'string' ? message.postUrl : undefined);
      sendResponse({ ok: true, reposted: true });
      return true;

    default:
      return false;
  }
}
