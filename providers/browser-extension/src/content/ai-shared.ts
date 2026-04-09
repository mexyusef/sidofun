import {
  createAiConversationActionsApi,
} from './ai-conversation-actions.js';
import {
  createAiSidebarModelApi,
} from './ai-sidebar-model.js';
import type { AiSharedDeps } from './ai-types.js';

export function createAiSharedApi(deps: AiSharedDeps) {
  const sidebarModelApi = createAiSidebarModelApi(deps);
  const conversationActionsApi = createAiConversationActionsApi(deps, {
    listVisibleTextButtons: sidebarModelApi.listVisibleTextButtons,
  });

  return {
    ...sidebarModelApi,
    ...conversationActionsApi,
  };
}
