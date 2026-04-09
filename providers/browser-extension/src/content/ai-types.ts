export type ProviderSite = 'chatgpt' | 'deepseek';

export interface ConversationTarget {
  titleQuery?: string;
  url?: string;
  index?: number;
}

export interface VisibleTextButton {
  element: HTMLElement;
  text: string;
}

export interface AiSharedDeps {
  sleep: (ms: number) => Promise<void>;
  focusElement: (element: Element) => void;
  findFirstVisibleElement: <T extends Element>(selectors: string[]) => T | undefined;
  isVisibleElement: (element: Element | null | undefined) => boolean;
  clickElementLikeUser: (element: HTMLElement) => void;
  setElementValue: (element: Element, value: string) => void;
  pressKey: (element: Element | undefined, key: string) => void;
  buildElementSelector: (element: Element) => string;
  listChatGptConversations: (limit: number) => Array<{ title: string; url?: string; index: number; active?: boolean }>;
  listDeepSeekConversations: (limit: number) => Array<{ title: string; url?: string; index: number; active?: boolean }>;
  findButtonsByLabelNeedles: (needles: string[]) => HTMLElement[];
  findEnabledButtonByLabelNeedles: (needles: string[]) => HTMLElement | undefined;
  isDisabledControl: (node: HTMLElement | undefined) => boolean;
}
