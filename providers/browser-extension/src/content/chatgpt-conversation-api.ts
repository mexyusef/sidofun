import {
  type AiProviderSiteDeps,
  collectConversationEntries,
  type ConversationTarget,
  type MessageTarget,
  pickConversationEntry,
} from './ai-provider-types.js';

export function createChatGptConversationApi(deps: AiProviderSiteDeps) {
  function listChatGptConversations(limit = 20) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      'nav a, aside a, [data-testid="history-item"] a, [data-testid="conversation-turn"], [data-testid="history-item"], a[href*="/c/"]'
    ));
    return collectConversationEntries(candidates).slice(0, Math.max(1, limit));
  }

  function openChatGptConversation(target: ConversationTarget) {
    const entries = listChatGptConversations(100);
    let match = entries.find((entry) => typeof target.url === 'string' && target.url.length > 0 && entry.url === target.url);
    if (!match && typeof target.index === 'number') {
      match = entries.find((entry) => entry.index === target.index);
    }
    if (!match && typeof target.titleQuery === 'string' && target.titleQuery.trim().length > 0) {
      const needle = target.titleQuery.trim().toLowerCase();
      match = entries.find((entry) => entry.title.toLowerCase().includes(needle));
    }
    if (!match) {
      throw new Error('ChatGPT conversation was not found');
    }
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('nav a, aside a, a[href*="/c/"]'));
    const targetNode = candidates.find((node) => {
      const anchor = node.closest('a') as HTMLAnchorElement | null;
      return (match!.url && anchor?.href === match!.url) || node.innerText.trim() === match!.title;
    });
    if (!targetNode) {
      throw new Error('ChatGPT conversation entry element was not found');
    }
    deps.focusElement(targetNode);
    targetNode.click();
    return match;
  }

  function collectChatGptConversationEntries(limit = 20) {
    const messages = Array.from(document.querySelectorAll<HTMLElement>('[data-message-author-role]'))
      .map((node, index) => {
        const roleRaw = node.getAttribute('data-message-author-role') || 'unknown';
        const role = roleRaw === 'user' || roleRaw === 'assistant' || roleRaw === 'system' ? roleRaw : 'unknown';
        const text = node.innerText.trim();
        return { id: node.id || `chatgpt_${index}`, role, text, index, node };
      })
      .filter((entry) => entry.text.length > 0);
    if (messages.length > 0) {
      return messages.slice(Math.max(0, messages.length - Math.max(1, limit)));
    }

    const fallbackNodes = Array.from(document.querySelectorAll<HTMLElement>(
      'main [data-testid*="conversation"], main [data-testid*="response"], main .prose, main .markdown, main article'
    ))
      .filter((node) => deps.isVisibleElement(node))
      .map((node, index) => {
        const text = node.innerText.trim();
        if (!text || text.length < 2) {
          return undefined;
        }
        return { id: node.id || `chatgpt_fallback_${index}`, role: 'assistant' as const, text, index, node };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    return fallbackNodes.slice(Math.max(0, fallbackNodes.length - Math.max(1, limit)));
  }

  function collectChatGptConversation(limit = 20) {
    return collectChatGptConversationEntries(limit).map(({ node: _node, ...entry }) => entry);
  }

  async function editChatGptMessage(text: string, target: MessageTarget, findComposer: () => Element | null | undefined) {
    const entries = collectChatGptConversationEntries(100);
    const match = pickConversationEntry(entries, target);
    if (!match) {
      throw new Error('ChatGPT target message was not found');
    }
    const editButton = match.node.querySelector<HTMLElement>('button[aria-label*="Edit"], button[title*="Edit"], [data-testid*="edit"]')
      ?? (match.node.parentElement?.querySelector<HTMLElement>('button[aria-label*="Edit"], button[title*="Edit"], [data-testid*="edit"]') || undefined);
    if (!editButton) {
      throw new Error('ChatGPT edit control was not found for the selected message');
    }
    deps.focusElement(editButton);
    editButton.click();
    await deps.sleep(250);
    const composer = findComposer();
    if (!composer) {
      throw new Error('ChatGPT edit composer was not found');
    }
    deps.setElementValue(composer, text);
    await deps.sleep(100);
    const saveButton = deps.findButtonByLabelNeedles(['save', 'send', 'submit', 'update'])
      ?? document.querySelector<HTMLElement>('button[data-testid="send-button"], button[aria-label*="Send"], button[aria-label*="send"]');
    if (saveButton && !saveButton.hasAttribute('disabled')) {
      saveButton.click();
    } else {
      deps.pressKey(composer, 'Enter');
    }
    return { id: match.id, role: match.role, text, index: match.index };
  }

  return {
    listChatGptConversations,
    openChatGptConversation,
    collectChatGptConversation,
    editChatGptMessage,
  };
}
