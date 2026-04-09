import {
  type AiProviderSiteDeps,
  collectConversationEntries,
  type ConversationTarget,
  type MessageTarget,
  pickConversationEntry,
} from './ai-provider-types.js';

export function createDeepSeekConversationApi(deps: AiProviderSiteDeps) {
  function listDeepSeekConversations(limit = 20) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      'nav a, aside a, [data-testid="conversation-item"], [data-testid="history-item"], a[href*="/chat/"]'
    ));
    return collectConversationEntries(candidates).slice(0, Math.max(1, limit));
  }

  function openDeepSeekConversation(target: ConversationTarget) {
    const entries = listDeepSeekConversations(100);
    let match = entries.find((entry) => typeof target.url === 'string' && target.url.length > 0 && entry.url === target.url);
    if (!match && typeof target.index === 'number') {
      match = entries.find((entry) => entry.index === target.index);
    }
    if (!match && typeof target.titleQuery === 'string' && target.titleQuery.trim().length > 0) {
      const needle = target.titleQuery.trim().toLowerCase();
      match = entries.find((entry) => entry.title.toLowerCase().includes(needle));
    }
    if (!match) {
      throw new Error('DeepSeek conversation was not found');
    }
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('nav a, aside a, a[href*="/chat/"]'));
    const targetNode = candidates.find((node) => {
      const anchor = node.closest('a') as HTMLAnchorElement | null;
      return (match!.url && anchor?.href === match!.url) || node.innerText.trim() === match!.title;
    });
    if (!targetNode) {
      throw new Error('DeepSeek conversation entry element was not found');
    }
    deps.focusElement(targetNode);
    targetNode.click();
    return match;
  }

  function collectDeepSeekConversationEntries(limit = 20) {
    const roleNodes = Array.from(document.querySelectorAll<HTMLElement>(
      '[data-role], [data-message-author-role], [class*="assistant"], [class*="user"]'
    ));
    const normalized = roleNodes.map((node, index) => {
      const dataRole = (node.getAttribute('data-role') || node.getAttribute('data-message-author-role') || '').toLowerCase();
      const className = typeof node.className === 'string' ? node.className.toLowerCase() : '';
      let role: 'user' | 'assistant' | 'system' | 'unknown' = 'unknown';
      if (dataRole.includes('assistant') || className.includes('assistant')) {
        role = 'assistant';
      } else if (dataRole.includes('user') || className.includes('user')) {
        role = 'user';
      } else if (dataRole.includes('system') || className.includes('system')) {
        role = 'system';
      }
      return { id: node.id || `deepseek_${index}`, role, text: node.innerText.trim(), index, node };
    }).filter((entry) => entry.text.length > 0 && entry.role !== 'unknown');

    if (normalized.length > 0) {
      return normalized.slice(Math.max(0, normalized.length - Math.max(1, limit)));
    }

    const proseBlocks = Array.from(document.querySelectorAll<HTMLElement>('main article, main .markdown, main .prose'))
      .map((node, index) => ({
        id: node.id || `deepseek_fallback_${index}`,
        role: 'assistant' as const,
        text: node.innerText.trim(),
        index,
        node
      }))
      .filter((entry) => entry.text.length > 0);
    return proseBlocks.slice(Math.max(0, proseBlocks.length - Math.max(1, limit)));
  }

  function collectDeepSeekConversation(limit = 20) {
    return collectDeepSeekConversationEntries(limit).map(({ node: _node, ...entry }) => entry);
  }

  async function editDeepSeekMessage(text: string, target: MessageTarget, findComposer: () => Element | null | undefined) {
    const entries = collectDeepSeekConversationEntries(100);
    const match = pickConversationEntry(entries, target);
    if (!match) {
      throw new Error('DeepSeek target message was not found');
    }
    const editButton = match.node.querySelector<HTMLElement>('button[aria-label*="Edit"], button[title*="Edit"], [data-testid*="edit"]')
      ?? (match.node.parentElement?.querySelector<HTMLElement>('button[aria-label*="Edit"], button[title*="Edit"], [data-testid*="edit"]') || undefined);
    if (!editButton) {
      throw new Error('DeepSeek edit control was not found for the selected message');
    }
    deps.focusElement(editButton);
    editButton.click();
    await deps.sleep(250);
    const composer = findComposer();
    if (!composer) {
      throw new Error('DeepSeek edit composer was not found');
    }
    deps.setElementValue(composer, text);
    await deps.sleep(100);
    const saveButton = deps.findButtonByLabelNeedles(['save', 'send', 'submit', 'update'])
      ?? document.querySelector<HTMLElement>('button[aria-label*="Send"], button[aria-label*="send"], button[type="submit"], [data-testid="send-button"]');
    if (saveButton && !saveButton.hasAttribute('disabled')) {
      saveButton.click();
    } else {
      deps.pressKey(composer, 'Enter');
    }
    return { id: match.id, role: match.role, text, index: match.index };
  }

  return {
    listDeepSeekConversations,
    openDeepSeekConversation,
    collectDeepSeekConversation,
    editDeepSeekMessage,
  };
}
