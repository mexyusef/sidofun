import {
  createDeepSeekComposerApi,
} from './deepseek-composer-api.js';
import {
  createDeepSeekConversationApi,
} from './deepseek-conversation-api.js';
import {
  createDeepSeekResponseApi,
} from './deepseek-response-api.js';
import type { AiProviderSiteDeps } from './ai-provider-types.js';

export function createDeepSeekSiteApi(deps: AiProviderSiteDeps) {
  const composerApi = createDeepSeekComposerApi(deps);
  const responseApi = createDeepSeekResponseApi(deps);
  const conversationApi = createDeepSeekConversationApi(deps);

  return {
    ...composerApi,
    ...responseApi,
    ...conversationApi,
    editDeepSeekMessage: (text: string, target: { index?: number; role?: string; offset?: number }) =>
      conversationApi.editDeepSeekMessage(text, target, composerApi.findDeepSeekComposer),
  };
}
