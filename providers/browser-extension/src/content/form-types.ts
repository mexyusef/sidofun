export interface FormApiDeps {
  summarizeElement: (element: Element, selector?: string) => unknown;
  withDocumentRoot: (frameSelectors?: string[]) => Document;
  isVisibleElement: (element: Element | null | undefined) => boolean;
  findVisibleElement: (selector: string, frameSelectors?: string[]) => Element;
  buildElementSelector: (element: Element) => string;
  buildFormSelector: (element: HTMLFormElement) => string;
  readAssociatedLabels: (element: Element) => string[];
  parseBooleanLike: (value: string) => boolean;
  clickElementLikeUser: (element: HTMLElement) => void;
  setNativeInputValue: (element: HTMLInputElement | HTMLTextAreaElement, text: string) => void;
  setElementValue: (element: Element, text: string) => void;
  sleep: (ms: number) => Promise<void>;
  resolveHumanDelay: (delayMs?: number, jitterMs?: number) => number;
}

export function decodeBase64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
