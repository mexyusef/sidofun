export interface XSiteDeps {
  sleep: (ms: number) => Promise<void>;
  focusElement: (element: Element) => void;
  setElementValue: (element: Element, value: string) => void;
  pressKey: (element: Element | undefined, key: string) => void;
  readMetricNumber: (value: string | null | undefined) => number | undefined;
  findClickableElementByText: (text: string) => HTMLElement | undefined;
  findButtonByLabelNeedles: (needles: string[]) => HTMLElement | undefined;
}

export function normalizeXUrl(url: string | undefined) {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url, location.origin);
    return parsed.href;
  } catch {
    return undefined;
  }
}
