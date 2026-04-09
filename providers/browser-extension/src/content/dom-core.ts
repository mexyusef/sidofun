export type BuildElementSelector = (element: Element) => string;

export function collectVisibleText(limit = 6000) {
  const text = document.body?.innerText || document.documentElement?.innerText || '';
  return text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, limit);
}

export function summarizeElement(element: Element, selector?: string) {
  const html = element as HTMLElement;
  const rect = typeof html.getBoundingClientRect === 'function' ? html.getBoundingClientRect() : undefined;
  const classes = (html.className || '')
    .toString()
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const text = html.innerText?.trim() || html.textContent?.trim() || undefined;
  return {
    selector,
    tagName: element.tagName.toLowerCase(),
    id: html.id || undefined,
    classes: classes.length > 0 ? classes : undefined,
    role: html.getAttribute('role') || undefined,
    name: html.getAttribute('name') || undefined,
    type: html.getAttribute('type') || undefined,
    href: (element as HTMLAnchorElement).href || html.getAttribute('href') || undefined,
    value: (element as HTMLInputElement).value || undefined,
    text,
    placeholder: html.getAttribute('placeholder') || undefined,
    disabled: 'disabled' in html ? Boolean((html as HTMLInputElement | HTMLButtonElement).disabled) : undefined,
    checked: 'checked' in html ? Boolean((html as HTMLInputElement).checked) : undefined,
    visible: rect ? rect.width > 0 && rect.height > 0 : undefined,
    rect: rect
      ? {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      : undefined
  };
}

export function focusElement(element: Element) {
  if ('focus' in element && typeof (element as HTMLElement).focus === 'function') {
    (element as HTMLElement).focus();
  }
}

export function isVisibleElement(element: Element | null | undefined) {
  if (!element || !(element instanceof HTMLElement)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function findFirstVisibleElement<T extends Element>(selectors: string[]) {
  for (const selector of selectors) {
    const match = Array.from(document.querySelectorAll<T>(selector)).find((element) => isVisibleElement(element));
    if (match) {
      return match;
    }
  }
  return undefined;
}
