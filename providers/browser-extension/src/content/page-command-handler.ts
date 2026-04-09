type ContentMessage = Record<string, unknown>;
type SendResponse = (response: Record<string, unknown>) => void;

interface PageCommandDeps {
  collectVisibleText: (limit?: number) => string;
  inspectSelectorInFrames: (selector: string, frameSelectors?: string[]) => unknown;
  inspectAllInFrames: (selector: string, limit?: number, frameSelectors?: string[]) => unknown;
  listFrames: (frameSelectors?: string[], path?: string[]) => unknown;
  collectLinksInFrames: (limit?: number, frameSelectors?: string[]) => unknown;
  readMarkdown: (selector?: string, frameSelectors?: string[]) => unknown;
  readReadability: (selector?: string, frameSelectors?: string[]) => unknown;
  evaluateExpression: (expression: string) => unknown;
  requireElement: (selector: string) => Element;
  focusElement: (element: Element) => void;
  setElementValue: (element: Element, value: string) => void;
  pressKey: (element: Element | undefined, key: string) => void;
  readEditor: (selector: string, frameSelectors?: string[]) => unknown;
  fillEditor: (selector: string, value: string, frameSelectors?: string[]) => unknown;
}

function parseLimit(value: unknown, fallback: number) {
  const parsed = Number.parseInt(String(value ?? fallback), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseFrameSelectors(message: ContentMessage) {
  return Array.isArray(message.frameSelectors)
    ? message.frameSelectors.filter((entry): entry is string => typeof entry === 'string')
    : undefined;
}

export async function handlePageCommand(
  message: ContentMessage,
  sendResponse: SendResponse,
  deps: PageCommandDeps
) {
  const frameSelectors = parseFrameSelectors(message);

  switch (message.kind) {
    case 'snapshot':
      sendResponse({
        ok: true,
        snapshot: {
          title: document.title,
          url: location.href,
          text: deps.collectVisibleText(),
          capturedAt: new Date().toISOString()
        }
      });
      return true;

    case 'inspect':
      sendResponse({
        ok: true,
        element: deps.inspectSelectorInFrames(String(message.selector || ''), frameSelectors)
      });
      return true;

    case 'inspect_all':
      sendResponse({
        ok: true,
        elements: deps.inspectAllInFrames(String(message.selector || ''), parseLimit(message.limit, 20), frameSelectors)
      });
      return true;

    case 'frames':
      sendResponse({
        ok: true,
        frames: deps.listFrames(frameSelectors, frameSelectors)
      });
      return true;

    case 'links':
      sendResponse({
        ok: true,
        links: deps.collectLinksInFrames(parseLimit(message.limit, 50), frameSelectors)
      });
      return true;

    case 'markdown':
      sendResponse({
        ok: true,
        markdown: deps.readMarkdown(typeof message.selector === 'string' ? message.selector : undefined, frameSelectors)
      });
      return true;

    case 'readability':
      sendResponse({
        ok: true,
        readability: deps.readReadability(typeof message.selector === 'string' ? message.selector : undefined, frameSelectors)
      });
      return true;

    case 'evaluate':
      sendResponse({ ok: true, value: deps.evaluateExpression(String(message.expression || 'undefined')) });
      return true;

    case 'click': {
      const element = deps.requireElement(String(message.selector || ''));
      deps.focusElement(element);
      (element as HTMLElement).click();
      sendResponse({ ok: true, clicked: true });
      return true;
    }

    case 'type': {
      const element = deps.requireElement(String(message.selector || ''));
      deps.setElementValue(element, String(message.text || ''));
      sendResponse({ ok: true, typed: true });
      return true;
    }

    case 'press': {
      const selector = typeof message.selector === 'string' ? message.selector : undefined;
      const element = selector ? deps.requireElement(selector) : undefined;
      deps.pressKey(element, String(message.key || ''));
      sendResponse({ ok: true, pressed: true });
      return true;
    }

    case 'editor_read':
      sendResponse({
        ok: true,
        editor: deps.readEditor(String(message.selector || ''), frameSelectors)
      });
      return true;

    case 'editor_fill':
      sendResponse({
        ok: true,
        editor: deps.fillEditor(String(message.selector || ''), String(message.value ?? message.text ?? ''), frameSelectors)
      });
      return true;

    default:
      return false;
  }
}
