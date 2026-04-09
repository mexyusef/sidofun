export interface AiProviderSiteDeps {
  sleep: (ms: number) => Promise<void>;
  focusElement: (element: Element) => void;
  findFirstVisibleElement: <T extends Element>(selectors: string[]) => T | undefined;
  isVisibleElement: (element: Element | null | undefined) => boolean;
  isDisabledControl: (node: HTMLElement | undefined) => boolean;
  clickElementLikeUser: (element: HTMLElement) => void;
  setElementValue: (element: Element, value: string) => void;
  pressKey: (element: Element | undefined, key: string) => void;
  findButtonByLabelNeedles: (needles: string[]) => HTMLElement | undefined;
  findButtonsByLabelNeedles: (needles: string[]) => HTMLElement[];
}

export interface ConversationTarget {
  titleQuery?: string;
  url?: string;
  index?: number;
}

export interface MessageTarget {
  index?: number;
  role?: string;
  offset?: number;
}

export function collectConversationEntries(candidates: HTMLElement[]) {
  const seen = new Set<string>();
  return candidates
    .map((node, index) => {
      const anchor = node.closest('a') as HTMLAnchorElement | null;
      const url = anchor?.href;
      const title = node.innerText.trim() || anchor?.innerText?.trim() || anchor?.getAttribute('aria-label')?.trim() || '';
      const key = `${url || ''}|${title}`;
      if (!title || seen.has(key)) {
        return undefined;
      }
      seen.add(key);
      const active = node.getAttribute('aria-current') === 'page'
        || anchor?.getAttribute('aria-current') === 'page'
        || node.getAttribute('data-state') === 'active'
        || node.className.toLowerCase().includes('active')
        || anchor?.className?.toLowerCase().includes('active');
      return {
        id: anchor?.id || node.id || `conversation_${index}`,
        title,
        url,
        index,
        active: Boolean(active)
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
}

export function pickConversationEntry<T extends { role: string; index: number }>(entries: T[], target: MessageTarget) {
  if (typeof target.index === 'number') {
    return entries.find((entry) => entry.index === target.index);
  }
  const filtered = typeof target.role === 'string' ? entries.filter((entry) => entry.role === target.role) : entries;
  const offset = Math.max(0, Number(target.offset ?? 0));
  return filtered[filtered.length - 1 - offset];
}
