import type {
  BrowserPageDomSnapshotResult,
  BrowserPageInfo
} from '../browser-automation/types.js';

interface BrowserPageDomDriver {
  getPage(pageId: string): Promise<BrowserPageInfo>;
  evaluate(pageId: string, expression: string): Promise<{ page: BrowserPageInfo; value: unknown }>;
}

export class BrowserPageDomService {
  constructor(private readonly driver: BrowserPageDomDriver) {}

  async snapshot(pageId: string): Promise<BrowserPageDomSnapshotResult> {
    const page = await this.driver.getPage(pageId);
    const { value } = await this.driver.evaluate(pageId, buildDomSnapshotExpression());
    const elements = Array.isArray((value as { elements?: unknown[] })?.elements)
      ? (value as { elements: BrowserPageDomSnapshotResult['elements'] }).elements
      : [];
    return { page, elements };
  }
}

function buildDomSnapshotExpression(): string {
  return `
    (() => {
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim();
      const cssEscape = (value) => {
        if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
          return globalThis.CSS.escape(value);
        }
        return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
      };
      const selectorFor = (element) => {
        if (!(element instanceof Element)) return '';
        if (element.id) return '#' + cssEscape(element.id);
        const parts = [];
        let current = element;
        while (current && current.nodeType === 1 && parts.length < 8) {
          let part = current.tagName.toLowerCase();
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
            if (siblings.length > 1) {
              part += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
            }
          }
          parts.unshift(part);
          current = parent;
        }
        return parts.join(' > ');
      };
      const pathFor = (element) => {
        const parts = [];
        let current = element;
        while (current && current.nodeType === 1 && parts.length < 12) {
          parts.unshift(current.tagName.toLowerCase());
          current = current.parentElement;
        }
        return parts.join('/');
      };
      const isVisible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      const isInteractive = (element) => {
        const tag = element.tagName.toLowerCase();
        return tag === 'input' || tag === 'textarea' || tag === 'select' || tag === 'button' || tag === 'a'
          || element.hasAttribute('contenteditable')
          || ['button', 'link', 'textbox', 'combobox'].includes(element.getAttribute('role') || '');
      };
      const inViewport = (element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
      };
      const fingerprintFor = (element, selector, text) => {
        return [
          element.tagName.toLowerCase(),
          element.getAttribute('type') || '',
          element.getAttribute('role') || '',
          selector,
          pathFor(element),
          text.slice(0, 120)
        ].join('|');
      };
      const selectors = 'input:not([type="hidden"]), textarea, select, button, a[href], [role="button"], [role="link"], [role="textbox"], [role="combobox"], [contenteditable="true"]';
      const elements = Array.from(document.querySelectorAll(selectors)).map((element, index) => {
        const selector = selectorFor(element);
        const text = normalize(element.textContent || element.getAttribute('aria-label') || element.getAttribute('value') || element.getAttribute('placeholder') || '');
        return {
          index: index + 1,
          selector,
          fingerprint: fingerprintFor(element, selector, text),
          text,
          tagName: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || undefined,
          role: element.getAttribute('role') || undefined,
          path: pathFor(element),
          interactive: isInteractive(element),
          visible: isVisible(element),
          inViewport: inViewport(element)
        };
      }).filter((element) => element.selector);
      return { elements };
    })()
  `;
}

