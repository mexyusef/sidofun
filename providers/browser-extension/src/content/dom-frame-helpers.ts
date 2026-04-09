import { isVisibleElement, summarizeElement, type BuildElementSelector } from './dom-core.js';

export function withDocumentRoot(frameSelectors?: string[]) {
  let currentDocument = document;
  for (const selector of frameSelectors ?? []) {
    const frameElement = currentDocument.querySelector(selector);
    if (!(frameElement instanceof HTMLIFrameElement)) {
      throw new Error(`Frame selector did not resolve to an iframe: ${selector}`);
    }
    if (!frameElement.contentDocument) {
      throw new Error(`Iframe is not ready for selector: ${selector}`);
    }
    currentDocument = frameElement.contentDocument;
  }
  return currentDocument;
}

export function listFrames(buildElementSelector: BuildElementSelector, frameSelectors?: string[], path: string[] = []) {
  const root = withDocumentRoot(frameSelectors);
  const frames = Array.from(root.querySelectorAll('iframe, frame'));
  return frames.flatMap((frame) => {
    const html = frame as HTMLIFrameElement;
    const selector = buildElementSelector(frame);
    const nextPath = [...path, selector];
    const rect = typeof html.getBoundingClientRect === 'function' ? html.getBoundingClientRect() : undefined;
    const current = {
      path: nextPath,
      selector,
      tagName: frame.tagName.toLowerCase(),
      name: html.getAttribute('name') || undefined,
      title: html.getAttribute('title') || undefined,
      url: html.src || html.getAttribute('src') || html.contentWindow?.location?.href || undefined,
      visible: rect ? rect.width > 0 && rect.height > 0 : undefined,
      width: rect ? Math.round(rect.width) : undefined,
      height: rect ? Math.round(rect.height) : undefined,
      depth: path.length + 1
    };
    try {
      if (html.contentDocument) {
        return [current, ...listFrames(buildElementSelector, nextPath, nextPath)];
      }
    } catch {
      // Cross-origin or inaccessible child frames stay as leaf entries.
    }
    return [current];
  });
}

export function findVisibleElement(selector: string, frameSelectors?: string[]) {
  const root = withDocumentRoot(frameSelectors);
  const matches = Array.from(root.querySelectorAll(selector));
  if (matches.length === 0) {
    throw new Error(`No element matched selector: ${selector}`);
  }
  return matches.find((element) => isVisibleElement(element)) ?? matches[0]!;
}

export function requireElement(selector: string) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`No element matched selector: ${selector}`);
  }
  return element;
}

export function inspectSelectorInFrames(selector: string, frameSelectors?: string[]) {
  return summarizeElement(findVisibleElement(selector, frameSelectors), selector);
}

export function inspectAllInFrames(selector: string, limit = 20, frameSelectors?: string[]) {
  const root = withDocumentRoot(frameSelectors);
  return Array.from(root.querySelectorAll(selector))
    .slice(0, limit)
    .map((element) => summarizeElement(element, selector));
}

export function collectLinksInFrames(limit = 50, frameSelectors?: string[]) {
  const root = withDocumentRoot(frameSelectors);
  return Array.from(root.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .slice(0, limit)
    .map((link) => ({
      href: link.href,
      text: link.innerText?.trim() || link.textContent?.trim() || undefined,
      title: link.title || undefined,
      target: link.target || undefined,
      rel: link.rel || undefined
    }))
    .filter((entry) => Boolean(entry.href));
}
