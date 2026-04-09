import type { XSiteDeps } from './x-types.js';
import { normalizeXUrl } from './x-types.js';

export function createXMessageApi(deps: XSiteDeps) {
  function collectXMessageThreads(limit = 20) {
    const seen = new Set<string>();
    const threads: Array<{ id: string; url?: string; title?: string; snippet?: string; unread?: boolean; active?: boolean; }> = [];
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/messages/"]'));
    for (const anchor of anchors) {
      const href = normalizeXUrl(anchor.href);
      if (!href || /\/messages\/compose/i.test(href) || seen.has(href)) {
        continue;
      }
      seen.add(href);
      const textLines = (anchor.innerText || anchor.textContent || '').split('\n').map((value) => value.trim()).filter(Boolean);
      const title = textLines[0] || anchor.getAttribute('aria-label') || anchor.getAttribute('title') || undefined;
      const snippet = textLines.slice(1).join(' ').trim() || undefined;
      const unread = anchor.getAttribute('aria-label')?.toLowerCase().includes('unread')
        || Boolean(anchor.querySelector('[aria-label*="unread" i], [data-testid*="unread"]'));
      threads.push({
        id: href.split('/').filter(Boolean).slice(-1)[0] || href,
        url: href,
        title,
        snippet,
        unread,
        active: href === location.href
      });
      if (threads.length >= Math.max(1, limit)) {
        break;
      }
    }
    return threads;
  }

  function collectXThreadMessages(limit = 20) {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      '[data-testid="messageEntry"], [data-testid*="messageEntry"], main [dir="auto"]'
    ));
    const messages = candidates
      .map((node, index) => {
        const text = node.innerText.trim();
        if (!text) {
          return undefined;
        }
        const sender = node.querySelector<HTMLElement>('[dir="ltr"], time + span, header span')?.innerText?.trim()
          || node.getAttribute('aria-label')
          || undefined;
        const timestamp = node.querySelector<HTMLTimeElement>('time')?.dateTime;
        const outgoing = Boolean(node.closest('[data-testid*="sent"], [data-testid*="outgoing"]'))
          || /\byou\b/i.test(sender || '');
        return {
          id: node.id || `x_dm_${index}`,
          text,
          sender,
          timestamp,
          outgoing
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
    return messages.slice(Math.max(0, messages.length - Math.max(1, limit)));
  }

  async function openXMessageThread(target?: string) {
    const normalized = target?.trim();
    if (normalized && !/^https?:\/\//i.test(normalized)) {
      const needle = normalized.toLowerCase();
      const thread = collectXMessageThreads(100).find((entry) =>
        (entry.title || '').toLowerCase().includes(needle)
        || (entry.snippet || '').toLowerCase().includes(needle)
        || (entry.id || '').toLowerCase() === needle
      );
      if (!thread?.url) {
        throw new Error(`X message thread matching "${normalized}" was not found`);
      }
      const anchor = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/messages/"]'))
        .find((node) => normalizeXUrl(node.href) === thread.url);
      if (!anchor) {
        throw new Error(`X message thread anchor matching "${normalized}" was not found`);
      }
      deps.focusElement(anchor);
      anchor.click();
      await deps.sleep(1200);
    }
    const threads = collectXMessageThreads(100);
    const activeThread = threads.find((entry) => entry.active)
      ?? (normalized && /^https?:\/\//i.test(normalized)
        ? threads.find((entry) => entry.url === normalizeXUrl(normalized))
        : undefined)
      ?? threads[0];
    return {
      thread: activeThread,
      messages: collectXThreadMessages(20)
    };
  }

  async function sendXDirectMessage(text: string, target?: string) {
    if (target?.trim()) {
      await openXMessageThread(target);
    }
    const composer = document.querySelector<HTMLElement>(
      '[data-testid="dmComposerTextInput"][contenteditable="true"], [data-testid*="dmComposer"] [contenteditable="true"], div[role="textbox"][contenteditable="true"]'
    );
    if (!composer) {
      throw new Error('X direct-message composer was not found');
    }
    deps.setElementValue(composer, text);
    await deps.sleep(100);
    const sendButton = document.querySelector<HTMLElement>(
      '[data-testid="dmComposerSendButton"], button[aria-label*="Send"], [role="button"][aria-label*="Send"]'
    );
    if (sendButton && !sendButton.hasAttribute('disabled')) {
      deps.focusElement(sendButton);
      sendButton.click();
    } else {
      deps.pressKey(composer, 'Enter');
    }
    await deps.sleep(500);
    return {
      thread: (await openXMessageThread(undefined)).thread,
      messages: collectXThreadMessages(20)
    };
  }

  return {
    collectXMessageThreads,
    openXMessageThread,
    sendXDirectMessage,
  };
}
