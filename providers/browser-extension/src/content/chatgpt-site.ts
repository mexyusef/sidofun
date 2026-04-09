import {
  createChatGptComposerApi,
} from './chatgpt-composer-api.js';
import {
  createChatGptConversationApi,
} from './chatgpt-conversation-api.js';
import {
  createChatGptResponseApi,
} from './chatgpt-response-api.js';
import type { AiProviderSiteDeps } from './ai-provider-types.js';

export function createChatGptSiteApi(deps: AiProviderSiteDeps) {
  const composerApi = createChatGptComposerApi(deps);
  const responseApi = createChatGptResponseApi(deps);
  const conversationApi = createChatGptConversationApi(deps);

  return {
    ...composerApi,
    ...responseApi,
    ...conversationApi,
    editChatGptMessage: (text: string, target: { index?: number; role?: string; offset?: number }) =>
      conversationApi.editChatGptMessage(text, target, composerApi.findChatGptComposer),
  };
}
