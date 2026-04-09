import { findVisibleElement, withDocumentRoot } from './dom-frame-helpers.js';

function toMarkdownFromElement(element: Element | null | undefined, depth = 0): string {
  if (!element || depth > 12) {
    return '';
  }
  if (element.nodeType === Node.TEXT_NODE) {
    return element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }
  const html = element as HTMLElement;
  const tag = element.tagName.toLowerCase();
  if (['script', 'style', 'noscript', 'template'].includes(tag)) {
    return '';
  }
  const directText = () => Array.from(element.childNodes)
    .filter((child) => child.nodeType === Node.TEXT_NODE)
    .map((child) => child.textContent?.replace(/\s+/g, ' ').trim() ?? '')
    .filter(Boolean)
    .join(' ');
  const children = Array.from(element.children)
    .map((child) => toMarkdownFromElement(child, depth + 1))
    .filter(Boolean);
  const text = html.innerText?.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    || directText()
    || children.join('\n').trim();
  if (!text) {
    return '';
  }
  if (tag === 'h1') return `# ${text}`;
  if (tag === 'h2') return `## ${text}`;
  if (tag === 'h3') return `### ${text}`;
  if (tag === 'h4') return `#### ${text}`;
  if (tag === 'h5') return `##### ${text}`;
  if (tag === 'h6') return `###### ${text}`;
  if (tag === 'li') return `- ${text}`;
  if (tag === 'pre') return `\`\`\`\n${text}\n\`\`\``;
  if (tag === 'code') return `\`${text}\``;
  if (tag === 'blockquote') return text.split('\n').map((line) => `> ${line}`).join('\n');
  if (tag === 'a') {
    const href = (element as HTMLAnchorElement).href || html.getAttribute('href');
    return href ? `[${text}](${href})` : text;
  }
  if (['p', 'article', 'section', 'main', 'div'].includes(tag)) {
    return text;
  }
  return [directText(), ...children].filter(Boolean).join('\n').trim() || text;
}

export function readMarkdown(selector?: string, frameSelectors?: string[]) {
  const root = withDocumentRoot(frameSelectors);
  const element = selector ? findVisibleElement(selector, frameSelectors) : root.body ?? root.documentElement;
  const markdown = toMarkdownFromElement(element).replace(/\n{3,}/g, '\n\n').trim();
  return { selector, frameSelectors, markdown };
}

export function readReadability(selector?: string, frameSelectors?: string[]) {
  const root = withDocumentRoot(frameSelectors);
  const element = selector
    ? findVisibleElement(selector, frameSelectors)
    : (root.querySelector('main, article, [role="main"]') ?? root.body ?? root.documentElement);
  const title = root.title || document.title || (element instanceof HTMLElement ? element.innerText?.split('\n').find(Boolean) : '') || '';
  const textContent = (element instanceof HTMLElement ? element.innerText : element?.textContent || '')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const excerpt = textContent.split('\n').find((line) => line.trim().length > 0)?.slice(0, 240);
  const byline = root.querySelector('[rel="author"], [itemprop="author"], .author, [class*="author"]')?.textContent?.trim() || undefined;
  const lang = root.documentElement.getAttribute('lang') || document.documentElement.getAttribute('lang') || undefined;
  const siteName = root.location?.hostname || location.hostname;
  const contentHtml = element instanceof HTMLElement ? element.innerHTML : undefined;
  return {
    title: title.trim(),
    textContent,
    excerpt,
    byline,
    siteName,
    lang,
    length: textContent.length,
    contentHtml
  };
}
