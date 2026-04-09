import type {
  AiSharedDeps,
  ConversationTarget,
  ProviderSite,
  VisibleTextButton,
} from './ai-types.js';

interface ListVisibleButtonsApi {
  listVisibleTextButtons: (root?: ParentNode) => VisibleTextButton[];
}

function resolveConversationEntryNode(deps: AiSharedDeps, site: ProviderSite, target: ConversationTarget) {
  const entries = site === 'chatgpt' ? deps.listChatGptConversations(100) : deps.listDeepSeekConversations(100);
  const normalizedTitle = target.titleQuery?.trim().toLowerCase();
  const match = entries.find((entry) =>
    (typeof target.url === 'string' && target.url.length > 0 && entry.url === target.url)
    || (typeof target.index === 'number' && entry.index === target.index)
    || (normalizedTitle && entry.title.toLowerCase().includes(normalizedTitle))
    || (!target.url && target.index === undefined && !normalizedTitle && entry.active)
  ) ?? (!target.url && target.index === undefined && !normalizedTitle ? entries[0] : undefined);
  if (!match) {
    throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} conversation was not found`);
  }
  const selectors = site === 'chatgpt'
    ? 'nav a, aside a, [data-testid*="conversation"], [data-testid*="history"] a, a[href*="/c/"]'
    : 'nav a, aside a, [data-testid="conversation-item"], [data-testid="history-item"], a[href*="/chat/"]';
  const node = Array.from(document.querySelectorAll<HTMLElement>(selectors)).find((candidate) => {
    const anchor = candidate.closest('a') as HTMLAnchorElement | null;
    return (match.url && anchor?.href === match.url) || candidate.innerText.trim() === match.title;
  });
  if (!node) {
    throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} conversation entry element was not found`);
  }
  return { match, node };
}

export function createAiConversationActionsApi(deps: AiSharedDeps, buttonsApi: ListVisibleButtonsApi) {
  async function listConversationActions(site: ProviderSite, target: ConversationTarget) {
    const { match, node } = resolveConversationEntryNode(deps, site, target);
    const menuButton = node.querySelector<HTMLElement>('button, [role="button"]')
      ?? node.parentElement?.querySelector<HTMLElement>('button, [role="button"]')
      ?? Array.from(node.parentElement?.querySelectorAll<HTMLElement>('button, [role="button"]') ?? [])
        .find((element) => /more|menu|options|actions|\.\.\./i.test(
          `${element.getAttribute('aria-label') || ''} ${element.getAttribute('title') || ''} ${element.innerText || ''}`
        ));
    if (!menuButton) {
      return { conversation: match, actions: [] };
    }
    deps.focusElement(menuButton);
    deps.clickElementLikeUser(menuButton);
    await deps.sleep(250);
    const actions = buttonsApi.listVisibleTextButtons()
      .filter(({ text }) => /rename|delete|archive|share|pin|unpin|more|menu/.test(text.toLowerCase()) && !text.toLowerCase().includes(match.title.toLowerCase()))
      .map(({ element, text }) => ({ title: text, selector: deps.buildElementSelector(element) }))
      .filter((entry, index, array) => array.findIndex((candidate) => candidate.title === entry.title) === index);
    return { conversation: match, actions };
  }

  async function invokeConversationAction(site: ProviderSite, actionQuery: string, target: ConversationTarget) {
    const result = await listConversationActions(site, target);
    const normalized = actionQuery.trim().toLowerCase();
    const action = result.actions.find((entry) => entry.title.toLowerCase().includes(normalized));
    if (!action) {
      throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} conversation action matching "${actionQuery}" was not found`);
    }
    const element = buttonsApi.listVisibleTextButtons().find(({ text }) => text === action.title)?.element;
    if (!element) {
      throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} conversation action element was not found`);
    }
    deps.focusElement(element);
    deps.clickElementLikeUser(element);
    await deps.sleep(250);
    return { conversation: result.conversation, action: action.title };
  }

  async function renameConversation(site: ProviderSite, title: string, target: ConversationTarget) {
    const actionResult = await invokeConversationAction(site, 'rename', target);
    await deps.sleep(250);
    const input = deps.findFirstVisibleElement<HTMLInputElement | HTMLTextAreaElement>([
      'input[type="text"]',
      'textarea',
      '[role="dialog"] input',
      '[role="menu"] input'
    ]);
    if (!input) {
      throw new Error(`${site === 'chatgpt' ? 'ChatGPT' : 'DeepSeek'} rename input was not found`);
    }
    deps.setElementValue(input, title);
    await deps.sleep(100);
    const saveButton = deps.findEnabledButtonByLabelNeedles(['save', 'rename', 'confirm', 'done']);
    if (saveButton) {
      deps.clickElementLikeUser(saveButton);
    } else {
      deps.pressKey(input, 'Enter');
    }
    return { ...actionResult, title };
  }

  return {
    listConversationActions,
    invokeConversationAction,
    renameConversation,
  };
}
