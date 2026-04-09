type ContentMessage = Record<string, unknown>;
type SendResponse = (response: Record<string, unknown>) => void;
type ProviderSite = 'chatgpt' | 'deepseek';

interface ConversationQuery {
  titleQuery?: string;
  url?: string;
  index?: number;
}

interface MessageQuery {
  index?: number;
  role?: string;
  offset?: number;
}

interface AiCommandDeps {
  startNewChatGptConversation: () => void;
  readSidebarState: (site: ProviderSite) => unknown;
  toggleSidebar: (site: ProviderSite) => unknown;
  listModels: (site: ProviderSite) => Promise<Record<string, unknown>>;
  selectModel: (site: ProviderSite, query: string) => Promise<Record<string, unknown>>;
  readChatGptLatestAssistantMessage: () => string;
  listChatGptConversations: (limit: number) => unknown;
  openChatGptConversation: (query: ConversationQuery) => unknown;
  listConversationActions: (site: ProviderSite, query: ConversationQuery) => Promise<Record<string, unknown>>;
  invokeConversationAction: (site: ProviderSite, actionQuery: string, query: ConversationQuery) => Promise<Record<string, unknown>>;
  renameConversation: (site: ProviderSite, title: string, query: ConversationQuery) => Promise<Record<string, unknown>>;
  collectChatGptConversation: (limit: number) => Array<{ role: string; text?: string }>;
  isChatGptBusy: () => boolean;
  stopChatGptGeneration: () => void;
  continueChatGptResponse: () => void;
  readChatGptResponseControls: () => unknown;
  openChatGptPreviousResponse: () => void;
  openChatGptNextResponse: () => void;
  regenerateChatGptResponse: () => void;
  editChatGptMessage: (text: string, query: MessageQuery) => Promise<unknown>;
  sendChatGptPrompt: (text: string) => void;
  readDeepSeekLatestAssistantMessage: () => string;
  listDeepSeekConversations: (limit: number) => unknown;
  openDeepSeekConversation: (query: ConversationQuery) => unknown;
  collectDeepSeekConversation: (limit: number) => Array<{ role: string; text?: string }>;
  startDeepSeekNewChat: () => void;
  sendDeepSeekPrompt: (text: string) => void;
  stopDeepSeekGeneration: () => void;
  continueDeepSeekResponse: () => void;
  readDeepSeekResponseControls: () => unknown;
  openDeepSeekPreviousResponse: () => void;
  openDeepSeekNextResponse: () => void;
  regenerateDeepSeekResponse: () => void;
  editDeepSeekMessage: (text: string, query: MessageQuery) => Promise<unknown>;
  isDeepSeekBusy: () => boolean;
}

function parseLimit(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : Math.max(1, parsed);
}

function parseConversationQuery(message: ContentMessage): ConversationQuery {
  return {
    titleQuery: typeof message.titleQuery === 'string' ? message.titleQuery : undefined,
    url: typeof message.url === 'string' ? message.url : undefined,
    index: Number.isFinite(Number(message.index)) ? Number(message.index) : undefined
  };
}

function parseMessageQuery(message: ContentMessage): MessageQuery {
  return {
    index: Number.isFinite(Number(message.index)) ? Number(message.index) : undefined,
    role: typeof message.role === 'string' ? message.role : undefined,
    offset: Number.isFinite(Number(message.offset)) ? Number(message.offset) : undefined
  };
}

function buildThreadResponse(messages: Array<{ role: string; text?: string }>) {
  return {
    messages,
    latestAssistant: messages.filter((entry) => entry.role === 'assistant').slice(-1)[0]?.text ?? '',
    latestUser: messages.filter((entry) => entry.role === 'user').slice(-1)[0]?.text ?? ''
  };
}

export async function handleAiCommand(
  message: ContentMessage,
  sendResponse: SendResponse,
  deps: AiCommandDeps
) {
  switch (message.kind) {
    case 'chatgpt_new_chat':
      deps.startNewChatGptConversation();
      sendResponse({ ok: true, started: true });
      return true;
    case 'chatgpt_sidebar_state':
      sendResponse({ ok: true, sidebar: deps.readSidebarState('chatgpt') });
      return true;
    case 'chatgpt_toggle_sidebar':
      sendResponse({ ok: true, sidebar: deps.toggleSidebar('chatgpt') });
      return true;
    case 'chatgpt_models':
      sendResponse({ ok: true, ...(await deps.listModels('chatgpt')) });
      return true;
    case 'chatgpt_select_model':
      sendResponse({ ok: true, ...(await deps.selectModel('chatgpt', String(message.query || ''))) });
      return true;
    case 'chatgpt_read_latest':
      sendResponse({ ok: true, text: deps.readChatGptLatestAssistantMessage() });
      return true;
    case 'chatgpt_list_conversations':
      sendResponse({ ok: true, conversations: deps.listChatGptConversations(parseLimit(message.limit, 20)) });
      return true;
    case 'chatgpt_open_conversation':
      sendResponse({ ok: true, conversation: deps.openChatGptConversation(parseConversationQuery(message)) });
      return true;
    case 'chatgpt_conversation_actions':
      sendResponse({ ok: true, ...(await deps.listConversationActions('chatgpt', parseConversationQuery(message))) });
      return true;
    case 'chatgpt_conversation_action':
      sendResponse({ ok: true, ...(await deps.invokeConversationAction('chatgpt', String(message.actionQuery || ''), parseConversationQuery(message))) });
      return true;
    case 'chatgpt_rename_conversation':
      sendResponse({ ok: true, ...(await deps.renameConversation('chatgpt', String(message.title || ''), parseConversationQuery(message))) });
      return true;
    case 'chatgpt_read_thread':
      sendResponse({ ok: true, ...buildThreadResponse(deps.collectChatGptConversation(parseLimit(message.limit, 20))) });
      return true;
    case 'chatgpt_busy':
      sendResponse({ ok: true, busy: deps.isChatGptBusy() });
      return true;
    case 'chatgpt_stop':
      deps.stopChatGptGeneration();
      sendResponse({ ok: true, stopped: true });
      return true;
    case 'chatgpt_continue':
      deps.continueChatGptResponse();
      sendResponse({ ok: true, continued: true });
      return true;
    case 'chatgpt_response_controls':
      sendResponse({ ok: true, controls: deps.readChatGptResponseControls() });
      return true;
    case 'chatgpt_previous_response':
      deps.openChatGptPreviousResponse();
      sendResponse({ ok: true, moved: true, direction: 'previous' });
      return true;
    case 'chatgpt_next_response':
      deps.openChatGptNextResponse();
      sendResponse({ ok: true, moved: true, direction: 'next' });
      return true;
    case 'chatgpt_regenerate':
      deps.regenerateChatGptResponse();
      sendResponse({ ok: true, regenerated: true });
      return true;
    case 'chatgpt_edit_message':
      sendResponse({ ok: true, edited: true, message: await deps.editChatGptMessage(String(message.text || ''), parseMessageQuery(message)) });
      return true;
    case 'chatgpt_send':
      deps.sendChatGptPrompt(String(message.text || ''));
      sendResponse({ ok: true, sent: true });
      return true;
    case 'deepseek_read_latest':
      sendResponse({ ok: true, text: deps.readDeepSeekLatestAssistantMessage() });
      return true;
    case 'deepseek_sidebar_state':
      sendResponse({ ok: true, sidebar: deps.readSidebarState('deepseek') });
      return true;
    case 'deepseek_toggle_sidebar':
      sendResponse({ ok: true, sidebar: deps.toggleSidebar('deepseek') });
      return true;
    case 'deepseek_models':
      sendResponse({ ok: true, ...(await deps.listModels('deepseek')) });
      return true;
    case 'deepseek_select_model':
      sendResponse({ ok: true, ...(await deps.selectModel('deepseek', String(message.query || ''))) });
      return true;
    case 'deepseek_list_conversations':
      sendResponse({ ok: true, conversations: deps.listDeepSeekConversations(parseLimit(message.limit, 20)) });
      return true;
    case 'deepseek_open_conversation':
      sendResponse({ ok: true, conversation: deps.openDeepSeekConversation(parseConversationQuery(message)) });
      return true;
    case 'deepseek_conversation_actions':
      sendResponse({ ok: true, ...(await deps.listConversationActions('deepseek', parseConversationQuery(message))) });
      return true;
    case 'deepseek_conversation_action':
      sendResponse({ ok: true, ...(await deps.invokeConversationAction('deepseek', String(message.actionQuery || ''), parseConversationQuery(message))) });
      return true;
    case 'deepseek_rename_conversation':
      sendResponse({ ok: true, ...(await deps.renameConversation('deepseek', String(message.title || ''), parseConversationQuery(message))) });
      return true;
    case 'deepseek_read_thread':
      sendResponse({ ok: true, ...buildThreadResponse(deps.collectDeepSeekConversation(parseLimit(message.limit, 20))) });
      return true;
    case 'deepseek_new_chat':
      deps.startDeepSeekNewChat();
      sendResponse({ ok: true, started: true });
      return true;
    case 'deepseek_send':
      deps.sendDeepSeekPrompt(String(message.text || ''));
      sendResponse({ ok: true, sent: true });
      return true;
    case 'deepseek_stop':
      deps.stopDeepSeekGeneration();
      sendResponse({ ok: true, stopped: true });
      return true;
    case 'deepseek_continue':
      deps.continueDeepSeekResponse();
      sendResponse({ ok: true, continued: true });
      return true;
    case 'deepseek_response_controls':
      sendResponse({ ok: true, controls: deps.readDeepSeekResponseControls() });
      return true;
    case 'deepseek_previous_response':
      deps.openDeepSeekPreviousResponse();
      sendResponse({ ok: true, moved: true, direction: 'previous' });
      return true;
    case 'deepseek_next_response':
      deps.openDeepSeekNextResponse();
      sendResponse({ ok: true, moved: true, direction: 'next' });
      return true;
    case 'deepseek_regenerate':
      deps.regenerateDeepSeekResponse();
      sendResponse({ ok: true, regenerated: true });
      return true;
    case 'deepseek_edit_message':
      sendResponse({ ok: true, edited: true, message: await deps.editDeepSeekMessage(String(message.text || ''), parseMessageQuery(message)) });
      return true;
    case 'deepseek_busy':
      sendResponse({ ok: true, busy: deps.isDeepSeekBusy() });
      return true;
    default:
      return false;
  }
}
