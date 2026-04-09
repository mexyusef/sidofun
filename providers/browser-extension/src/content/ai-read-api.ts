import {
  createAiSharedApi,
} from './ai-shared.js';
import {
  createChatGptSiteApi,
} from './chatgpt-site.js';
import {
  clickElementLikeUser,
  findButtonByLabelNeedles,
  findButtonsByLabelNeedles,
  findEnabledButtonByLabelNeedles,
  isDisabledControl,
  sleep,
  buildElementSelector,
} from './interaction-helpers.js';
import {
  findFirstVisibleElement,
  focusElement,
  isVisibleElement,
} from './dom-helpers.js';
import {
  createDeepSeekSiteApi,
} from './deepseek-site.js';

function setElementValue(_element: Element, _value: string) {
  throw new Error('AI read API does not support element mutation');
}

function pressKey(_element: Element | undefined, _key: string) {
  throw new Error('AI read API does not support keyboard input');
}

export function createAiReadApi() {
  const sharedDeps = {
    sleep,
    focusElement,
    findFirstVisibleElement,
    isVisibleElement,
    clickElementLikeUser,
    setElementValue,
    pressKey,
    buildElementSelector,
    findButtonsByLabelNeedles,
    findEnabledButtonByLabelNeedles,
    isDisabledControl,
  };

  const chatGptSiteApi = createChatGptSiteApi({
    ...sharedDeps,
    findButtonByLabelNeedles,
  });
  const deepSeekSiteApi = createDeepSeekSiteApi({
    ...sharedDeps,
    findButtonByLabelNeedles,
  });
  const aiSharedApi = createAiSharedApi({
    ...sharedDeps,
    listChatGptConversations: chatGptSiteApi.listChatGptConversations,
    listDeepSeekConversations: deepSeekSiteApi.listDeepSeekConversations,
  });

  return {
    readChatGptSidebarState: () => aiSharedApi.readSidebarState('chatgpt'),
    readDeepSeekSidebarState: () => aiSharedApi.readSidebarState('deepseek'),
    toggleChatGptSidebar: () => aiSharedApi.toggleSidebar('chatgpt'),
    toggleDeepSeekSidebar: () => aiSharedApi.toggleSidebar('deepseek'),
    listChatGptModels: () => aiSharedApi.listModels('chatgpt'),
    listDeepSeekModels: () => aiSharedApi.listModels('deepseek'),
    listChatGptConversations: (limit = 20) => chatGptSiteApi.listChatGptConversations(limit),
    listDeepSeekConversations: (limit = 20) => deepSeekSiteApi.listDeepSeekConversations(limit),
    startChatGptNewChat: () => chatGptSiteApi.startNewChatGptConversation(),
    startDeepSeekNewChat: () => deepSeekSiteApi.startDeepSeekNewChat(),
    readChatGptLatestAssistantMessage: () => chatGptSiteApi.readChatGptLatestAssistantMessage(),
    readDeepSeekLatestAssistantMessage: () => deepSeekSiteApi.readDeepSeekLatestAssistantMessage(),
    readChatGptResponseControls: () => chatGptSiteApi.readChatGptResponseControls(),
    readDeepSeekResponseControls: () => deepSeekSiteApi.readDeepSeekResponseControls(),
    readChatGptThread: (limit = 20) => {
      const messages = chatGptSiteApi.collectChatGptConversation(limit);
      return {
        messages,
        latestAssistant: messages.filter((entry) => entry.role === 'assistant').slice(-1)[0]?.text ?? '',
        latestUser: messages.filter((entry) => entry.role === 'user').slice(-1)[0]?.text ?? '',
      };
    },
    readDeepSeekThread: (limit = 20) => {
      const messages = deepSeekSiteApi.collectDeepSeekConversation(limit);
      return {
        messages,
        latestAssistant: messages.filter((entry) => entry.role === 'assistant').slice(-1)[0]?.text ?? '',
        latestUser: messages.filter((entry) => entry.role === 'user').slice(-1)[0]?.text ?? '',
      };
    },
    isChatGptBusy: () => chatGptSiteApi.isChatGptBusy(),
    isDeepSeekBusy: () => deepSeekSiteApi.isDeepSeekBusy(),
  };
}
