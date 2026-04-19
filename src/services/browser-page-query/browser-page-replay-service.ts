import type {
  BrowserPageDomSnapshotResult,
  BrowserPageInfo,
  BrowserPageQueryActionResult,
  BrowserPageRecordedAction,
  BrowserPageReplayResult,
  BrowserPageScrollResult,
  BrowserPageScrollTextResult,
  BrowserPageSelectOptionResult,
  BrowserPageSendKeysResult
} from '../browser-automation/types.js';
import type { BrowserPageDomService } from './browser-page-dom-service.js';
import type { BrowserPageQueryService } from './browser-page-query-service.js';

interface BrowserReplayDriver {
  getPage(pageId: string): Promise<BrowserPageInfo>;
  openPage(runtimeId: string, url?: string): Promise<BrowserPageInfo>;
  waitFor(pageId: string, waitFor: 'load' | 'selector' | 'title' | 'url', query?: string, timeoutMs?: number): Promise<{ matched: boolean }>;
}

interface BrowserReplayPrimitives {
  queries: BrowserPageQueryService;
  dom: BrowserPageDomService;
  scroll(pageId: string, direction: 'up' | 'down' | 'top' | 'bottom', query?: string): Promise<BrowserPageScrollResult>;
  scrollToText(pageId: string, text: string, nth?: number): Promise<BrowserPageScrollTextResult>;
  sendKeys(pageId: string, keys: string, query?: string): Promise<BrowserPageSendKeysResult>;
  selectOption(pageId: string, query: string, text: string, options?: {
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
  }): Promise<BrowserPageSelectOptionResult>;
}

export class BrowserPageReplayService {
  constructor(
    private readonly driver: BrowserReplayDriver,
    private readonly primitives: BrowserReplayPrimitives
  ) {}

  async replay(pageId: string, actions: BrowserPageRecordedAction[]): Promise<BrowserPageReplayResult> {
    const steps: BrowserPageReplayResult['steps'] = [];
    for (const action of actions) {
      const resolved = await this.resolveAction(pageId, action);
      let detail: unknown;
      let matched = true;
      switch (resolved.kind) {
        case 'fill':
          detail = await this.primitives.queries.fillQuery(pageId, resolved.query || '', resolved.value || '', {
            exact: resolved.exact,
            formSelector: resolved.formSelector,
            rootSelector: resolved.rootSelector
          });
          matched = (detail as BrowserPageQueryActionResult).matched;
          break;
        case 'click':
          detail = await this.primitives.queries.clickQuery(pageId, resolved.query || '', {
            exact: resolved.exact,
            formSelector: resolved.formSelector,
            rootSelector: resolved.rootSelector
          });
          matched = (detail as BrowserPageQueryActionResult).matched;
          break;
        case 'submit':
          detail = await this.primitives.queries.submit(pageId, resolved);
          matched = (detail as BrowserPageQueryActionResult).matched;
          break;
        case 'wait_text':
          detail = await this.primitives.queries.waitForText(pageId, resolved.text || '', {
            timeoutMs: 10000,
            intervalMs: 250
          });
          matched = (detail as { matched: boolean }).matched;
          break;
        case 'wait_url':
          detail = await this.driver.waitFor(pageId, 'url', resolved.value || resolved.url || resolved.text, 10000);
          matched = (detail as { matched: boolean }).matched;
          break;
        case 'scroll':
          detail = await this.primitives.scroll(pageId, resolved.direction || 'down', resolved.query);
          matched = (detail as BrowserPageScrollResult).matched;
          break;
        case 'scroll_text':
          detail = await this.primitives.scrollToText(pageId, resolved.text || '', resolved.nth);
          matched = (detail as BrowserPageScrollTextResult).matched;
          break;
        case 'send_keys':
          detail = await this.primitives.sendKeys(pageId, resolved.keys || '', resolved.query);
          matched = (detail as BrowserPageSendKeysResult).matched;
          break;
        case 'select_option':
          detail = await this.primitives.selectOption(pageId, resolved.query || '', resolved.text || '', resolved);
          matched = (detail as BrowserPageSelectOptionResult).matched;
          break;
        case 'open':
        case 'done':
          detail = { skipped: true };
          matched = true;
          break;
      }
      steps.push({ action: resolved, matched, detail });
      if (!matched) {
        break;
      }
    }
    return {
      page: await this.driver.getPage(pageId),
      steps
    };
  }

  async openAndReplay(runtimeId: string, url: string | undefined, actions: BrowserPageRecordedAction[]): Promise<BrowserPageReplayResult> {
    const page = await this.driver.openPage(runtimeId, url);
    return this.replay(page.id, actions);
  }

  private async resolveAction(pageId: string, action: BrowserPageRecordedAction): Promise<BrowserPageRecordedAction> {
    if (!action.fingerprint) {
      return action;
    }
    const snapshot = await this.primitives.dom.snapshot(pageId);
    const remapped = this.findBestMatch(snapshot, action.fingerprint);
    if (!remapped) {
      return action;
    }
    return {
      ...action,
      selector: remapped.selector,
      query: action.query ?? remapped.text
    };
  }

  private findBestMatch(snapshot: BrowserPageDomSnapshotResult, fingerprint: string) {
    return snapshot.elements.find((element) => element.fingerprint === fingerprint)
      || snapshot.elements.find((element) => fingerprint.includes(element.path) && fingerprint.includes(element.tagName));
  }
}
