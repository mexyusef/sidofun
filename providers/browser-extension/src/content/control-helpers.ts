export function clickElementLikeUser(element: HTMLElement, focusElement: (element: Element) => void) {
  focusElement(element);
  element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
  element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerType: 'mouse' }));
  element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
  element.click();
}

export function setNativeInputValue(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, text);
}

export function parseBooleanLike(value: string) {
  return /^(1|true|yes|on|checked)$/i.test(value.trim());
}

export function readMetricNumber(text: string | undefined) {
  if (!text) {
    return undefined;
  }
  const normalized = text.replace(/,/g, '').trim().toLowerCase();
  const match = normalized.match(/([0-9]*\.?[0-9]+)\s*([km]?)/i);
  if (!match) {
    return undefined;
  }
  const value = Number.parseFloat(match[1] || '0');
  if (Number.isNaN(value)) {
    return undefined;
  }
  if (match[2] === 'k') {
    return Math.round(value * 1000);
  }
  if (match[2] === 'm') {
    return Math.round(value * 1_000_000);
  }
  return Math.round(value);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function resolveHumanDelay(delayMs = 60, jitterMs = 20) {
  const base = Math.max(0, delayMs);
  const jitter = Math.max(0, jitterMs);
  if (jitter <= 0) {
    return base;
  }
  const offset = Math.floor(Math.random() * (jitter * 2 + 1)) - jitter;
  return Math.max(0, base + offset);
}
