import type {
  BrowserPageAgreementResult,
  BrowserPageActionResult,
  BrowserPageClickTextResult,
  BrowserPageCompleteProfileResult,
  BrowserPageDomSnapshotResult,
  BrowserPageFileUploaderResult,
  BrowserPageFillCommitResult,
  BrowserPageInfo,
  BrowserPageLocateResult,
  BrowserPageQueryActionResult,
  BrowserPageQueryKind,
  BrowserPageQueryMatch,
  BrowserPageScrollResult,
  BrowserPageScrollTextResult,
  BrowserPageSelectOptionResult,
  BrowserPageSelectOptionsResult,
  BrowserPageSendKeysResult,
  BrowserPageSettleResult,
  BrowserPageSignupStepResult,
  BrowserPageWaitResult,
  BrowserPageWaitReadyResult,
  BrowserPageFormFieldInput,
  BrowserPageFormWorkflowResult
} from '../browser-automation/types.js';
import { deriveIdentity } from './browser-page-workflow-primitives.js';

interface BrowserPageQueryDriver {
  getPage(pageId: string): Promise<BrowserPageInfo>;
  evaluate(pageId: string, expression: string): Promise<{ page: BrowserPageInfo; value: unknown }>;
  waitFor(
    pageId: string,
    waitFor: 'load' | 'selector' | 'title' | 'url',
    query?: string,
    timeoutMs?: number
  ): Promise<BrowserPageWaitResult>;
}

export interface BrowserPageQueryOptions {
  kind?: BrowserPageQueryKind;
  exact?: boolean;
  formSelector?: string;
  rootSelector?: string;
  limit?: number;
}

export interface BrowserPageSubmitOptions extends Omit<BrowserPageQueryOptions, 'kind' | 'limit'> {
  query?: string;
}

export interface BrowserPageWaitTextOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

export interface BrowserPageWaitReadyOptions extends BrowserPageWaitTextOptions {
  stableReads?: number;
}

export interface BrowserPageClickTextOptions {
  exact?: boolean;
  withinSelector?: string;
  topRegionOnly?: boolean;
  topRegionMax?: number;
  allowLinks?: boolean;
  settleAfter?: 'dom' | 'page' | 'network';
  settleTimeoutMs?: number;
  settleStableReads?: number;
}

export interface BrowserPageAgreementOptions {
  selector?: string;
  labelTextIncludes?: string[];
}

export interface BrowserPageSettleOptions extends BrowserPageWaitTextOptions {
  stableReads?: number;
  quietMs?: number;
}

export interface BrowserPageCompleteProfileOptions {
  email: string;
  username?: string;
  fullName?: string;
  usernameSelector?: string;
  fullNameSelector?: string;
  agreementSelector?: string;
  agreementTextIncludes?: string[];
  submitText?: string;
  waitReadyTimeoutMs?: number;
}

export interface BrowserPageSignupStepOptions {
  email: string;
  password: string;
  emailSelector?: string;
  passwordSelector?: string;
  submitText?: string;
  waitReadyTimeoutMs?: number;
}

export interface BrowserPageFormWorkflowOptions extends Omit<BrowserPageQueryOptions, 'kind' | 'limit'> {
  fields: BrowserPageFormFieldInput[];
  submit?: boolean;
  submitQuery?: string;
  waitUrlIncludes?: string;
  waitText?: string;
  waitSelector?: string;
  waitNoSelector?: string;
  timeoutMs?: number;
  intervalMs?: number;
}

export class BrowserPageQueryService {
  private readonly driver: BrowserPageQueryDriver;

  constructor(driver: BrowserPageQueryDriver) {
    this.driver = driver;
  }

  async locate(pageId: string, query: string, options: BrowserPageQueryOptions = {}): Promise<BrowserPageLocateResult> {
    const page = await this.driver.getPage(pageId);
    const located = await this.runDomQuery(pageId, {
      operation: 'locate',
      query,
      kind: options.kind ?? 'any',
      exact: options.exact ?? false,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector,
      limit: options.limit ?? 5
    });
    return {
      page,
      query,
      kind: options.kind ?? 'any',
      exact: options.exact ?? false,
      matches: located.matches
    };
  }

  async fillQuery(pageId: string, query: string, value: string, options: BrowserPageQueryOptions = {}): Promise<BrowserPageQueryActionResult> {
    const result = await this.runDomQuery(pageId, {
      operation: 'fill',
      query,
      value,
      kind: 'field',
      exact: options.exact ?? false,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector,
      limit: 1
    });
    return {
      page: await this.driver.getPage(pageId),
      query,
      value,
      matched: result.matched,
      match: result.match
    };
  }

  async clickQuery(pageId: string, query: string, options: BrowserPageQueryOptions = {}): Promise<BrowserPageQueryActionResult> {
    const result = await this.runDomQuery(pageId, {
      operation: 'click',
      query,
      kind: options.kind ?? 'button',
      exact: options.exact ?? false,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector,
      limit: 1
    });
    return {
      page: await this.driver.getPage(pageId),
      query,
      matched: result.matched,
      match: result.match
    };
  }

  async submit(pageId: string, options: BrowserPageSubmitOptions = {}): Promise<BrowserPageQueryActionResult> {
    const result = await this.runDomQuery(pageId, {
      operation: 'submit',
      query: options.query,
      kind: 'button',
      exact: options.exact ?? false,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector,
      limit: 1
    });
    return {
      page: await this.driver.getPage(pageId),
      query: options.query,
      matched: result.matched,
      match: result.match
    };
  }

  async waitForText(pageId: string, text: string, options: BrowserPageWaitTextOptions = {}): Promise<BrowserPageWaitResult> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const intervalMs = options.intervalMs ?? 250;
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const { value } = await this.driver.evaluate(pageId, `
        (() => {
          const bodyText = (document.body?.innerText || '').replace(/\\s+/g, ' ').trim();
          return bodyText.includes(${JSON.stringify(text)});
        })()
      `);
      if (value === true) {
        return {
          page: await this.driver.getPage(pageId),
          matched: true,
          waitFor: 'text',
          query: text
        };
      }
      await delay(intervalMs);
    }

    return {
      page: await this.driver.getPage(pageId),
      matched: false,
      waitFor: 'text',
      query: text
    };
  }

  async formWorkflow(pageId: string, options: BrowserPageFormWorkflowOptions): Promise<BrowserPageFormWorkflowResult> {
    if (options.fields.length === 0) {
      throw new Error('browser page form-workflow requires at least one field');
    }

    const fieldResults: BrowserPageFormWorkflowResult['fields'] = [];
    for (const field of options.fields) {
      const filled = await this.fillQuery(pageId, field.query, field.value, {
        exact: options.exact,
        formSelector: options.formSelector,
        rootSelector: options.rootSelector
      });
      fieldResults.push({
        ...field,
        matched: filled.matched,
        match: filled.match
      });
      if (!filled.matched) {
        throw new Error(`Could not locate field "${field.query}"`);
      }
    }

    let submitResult: BrowserPageFormWorkflowResult['submit'] | undefined;
    if (options.submit || options.submitQuery) {
      const submitted = await this.submit(pageId, {
        query: options.submitQuery,
        exact: options.exact,
        formSelector: options.formSelector,
        rootSelector: options.rootSelector
      });
      submitResult = {
        query: options.submitQuery,
        matched: submitted.matched,
        match: submitted.match
      };
    }

    const waitState: BrowserPageFormWorkflowResult['waits'] = {
      urlIncludes: options.waitUrlIncludes,
      text: options.waitText,
      selector: options.waitSelector,
      noSelector: options.waitNoSelector,
      matched: true
    };

    if (options.waitUrlIncludes) {
      const waited = await this.driver.waitFor(pageId, 'url', options.waitUrlIncludes, options.timeoutMs ?? 10000);
      waitState.matched = waitState.matched && waited.matched;
    }
    if (options.waitSelector) {
      const waited = await this.driver.waitFor(pageId, 'selector', options.waitSelector, options.timeoutMs ?? 10000);
      waitState.matched = waitState.matched && waited.matched;
    }
    if (options.waitNoSelector) {
      const waited = await this.waitForNoSelector(pageId, options.waitNoSelector, options.timeoutMs ?? 10000, options.intervalMs ?? 250);
      waitState.matched = waitState.matched && waited;
    }
    if (options.waitText) {
      const waited = await this.waitForText(pageId, options.waitText, {
        timeoutMs: options.timeoutMs,
        intervalMs: options.intervalMs
      });
      waitState.matched = waitState.matched && waited.matched;
    }

    return {
      page: await this.driver.getPage(pageId),
      fields: fieldResults,
      submit: submitResult,
      waits: waitState
    };
  }

  async scroll(pageId: string, direction: 'up' | 'down' | 'top' | 'bottom', query?: string): Promise<BrowserPageScrollResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'scroll',
      direction,
      query
    }));
    const result = (value || {}) as { matched?: boolean };
    return {
      page: await this.driver.getPage(pageId),
      direction,
      query,
      matched: result.matched === true
    };
  }

  async scrollToText(pageId: string, text: string, nth = 1): Promise<BrowserPageScrollTextResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'scroll-text',
      text,
      nth
    }));
    const result = (value || {}) as { matched?: boolean };
    return {
      page: await this.driver.getPage(pageId),
      text,
      nth,
      matched: result.matched === true
    };
  }

  async sendKeys(pageId: string, keys: string, query?: string): Promise<BrowserPageSendKeysResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'send-keys',
      keys,
      query
    }));
    const result = (value || {}) as { matched?: boolean };
    return {
      page: await this.driver.getPage(pageId),
      keys,
      query,
      matched: result.matched === true
    };
  }

  async getSelectOptions(pageId: string, query: string, options: BrowserPageQueryOptions = {}): Promise<BrowserPageSelectOptionsResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'get-select-options',
      query,
      exact: options.exact ?? false,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector
    }));
    const result = (value || {}) as { matched?: boolean; options?: BrowserPageSelectOptionsResult['options']; match?: BrowserPageQueryMatch };
    return {
      page: await this.driver.getPage(pageId),
      query,
      matched: result.matched === true,
      options: Array.isArray(result.options) ? result.options : [],
      match: result.match
    };
  }

  async selectOption(pageId: string, query: string, text: string, options: BrowserPageQueryOptions = {}): Promise<BrowserPageSelectOptionResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'select-option',
      query,
      text,
      exact: options.exact ?? false,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector
    }));
    const result = (value || {}) as { matched?: boolean; match?: BrowserPageQueryMatch };
    return {
      page: await this.driver.getPage(pageId),
      query,
      text,
      matched: result.matched === true,
      match: result.match
    };
  }

  async detectFileUploader(pageId: string, query: string, options: BrowserPageQueryOptions = {}): Promise<BrowserPageFileUploaderResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'detect-file-uploader',
      query,
      exact: options.exact ?? false,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector
    }));
    const result = (value || {}) as { matched?: boolean; isFileUploader?: boolean; match?: BrowserPageQueryMatch };
    return {
      page: await this.driver.getPage(pageId),
      query,
      matched: result.matched === true,
      isFileUploader: result.isFileUploader === true,
      match: result.match
    };
  }

  async fillCommit(pageId: string, selector: string, value: string): Promise<BrowserPageFillCommitResult> {
    const { value: evaluated } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'fill-commit',
      selector,
      value
    }));
    return {
      page: await this.driver.getPage(pageId),
      selector,
      value,
      matched: evaluated === true || (evaluated as { matched?: boolean } | null)?.matched === true
    };
  }

  async waitReady(pageId: string, selectors: string[], options: BrowserPageWaitReadyOptions = {}): Promise<BrowserPageWaitReadyResult> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const intervalMs = options.intervalMs ?? 250;
    const stableReads = Math.max(1, options.stableReads ?? 1);
    const started = Date.now();
    let consecutiveMatches = 0;

    while (Date.now() - started < timeoutMs) {
      const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
        operation: 'wait-ready',
        selectors
      }));
      if (value === true) {
        consecutiveMatches += 1;
        if (consecutiveMatches >= stableReads) {
          return {
            page: await this.driver.getPage(pageId),
            selectors,
            matched: true,
            stableReads
          };
        }
      } else {
        consecutiveMatches = 0;
      }
      await delay(intervalMs);
    }

    return {
      page: await this.driver.getPage(pageId),
      selectors,
      matched: false,
      stableReads
    };
  }

  async clickButtonText(pageId: string, text: string, options: BrowserPageClickTextOptions = {}): Promise<BrowserPageClickTextResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'click-text',
      text,
      exact: options.exact !== false,
      withinSelector: options.withinSelector,
      topRegionOnly: options.topRegionOnly === true,
      topRegionMax: options.topRegionMax ?? 140,
      allowLinks: options.allowLinks !== false
    }));
    const matched = value === true || (value as { matched?: boolean } | null)?.matched === true;
    if (matched && options.settleAfter) {
      await this.settle(pageId, options.settleAfter, {
        timeoutMs: options.settleTimeoutMs,
        stableReads: options.settleStableReads
      });
    }
    return {
      page: await this.driver.getPage(pageId),
      text,
      matched
    };
  }

  async checkAgreement(pageId: string, options: BrowserPageAgreementOptions = {}): Promise<BrowserPageAgreementResult> {
    const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
      operation: 'check-agreement',
      selector: options.selector,
      labelTextIncludes: options.labelTextIncludes ?? ['i agree', 'terms of service', 'code of conduct', 'privacy policy']
    }));
    const result = (value || {}) as { matched?: boolean; checked?: boolean };
    return {
      page: await this.driver.getPage(pageId),
      matched: result.matched === true,
      checked: result.checked === true
    };
  }

  async settle(pageId: string, mode: 'dom' | 'page' | 'network', options: BrowserPageSettleOptions = {}): Promise<BrowserPageSettleResult> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const intervalMs = options.intervalMs ?? 250;
    const quietMs = Math.max(intervalMs, options.quietMs ?? 0);
    const stableReads = Math.max(1, options.stableReads ?? 2);

    if (mode === 'page') {
      await this.driver.waitFor(pageId, 'load', undefined, timeoutMs);
    }

    const started = Date.now();
    let previousSample = '';
    let consecutiveStable = 0;
    while (Date.now() - started < timeoutMs) {
      const { value } = await this.driver.evaluate(pageId, buildPagePrimitiveExpression({
        operation: 'settle-sample',
        mode
      }));
      const currentSample = typeof value === 'string' ? value : JSON.stringify(value);
      if (currentSample === previousSample && currentSample.length > 0) {
        consecutiveStable += 1;
        if (consecutiveStable >= stableReads) {
          return {
            page: await this.driver.getPage(pageId),
            mode,
            matched: true
          };
        }
      } else {
        previousSample = currentSample;
        consecutiveStable = 0;
      }
      await delay(quietMs);
    }

    return {
      page: await this.driver.getPage(pageId),
      mode,
      matched: false
    };
  }

  async completeProfile(pageId: string, options: BrowserPageCompleteProfileOptions): Promise<BrowserPageCompleteProfileResult> {
    const derived = deriveIdentity(options.email);
    const username = options.username ?? derived.username;
    const fullName = options.fullName ?? derived.fullName;
    const usernameSelector = options.usernameSelector ?? "input[placeholder='Username']";
    const fullNameSelector = options.fullNameSelector ?? "input[placeholder='Full name']";
    const agreementTextIncludes = options.agreementTextIncludes ?? ['terms of service', 'code of conduct'];

    const ready = await this.waitReady(pageId, [usernameSelector, fullNameSelector], {
      timeoutMs: options.waitReadyTimeoutMs ?? 20000,
      stableReads: 1
    });

    const usernameFilled = ready.matched ? await this.fillCommit(pageId, usernameSelector, username) : {
      page: await this.driver.getPage(pageId),
      selector: usernameSelector,
      value: username,
      matched: false
    };
    const fullNameFilled = ready.matched ? await this.fillCommit(pageId, fullNameSelector, fullName) : {
      page: await this.driver.getPage(pageId),
      selector: fullNameSelector,
      value: fullName,
      matched: false
    };
    const agreement = await this.checkAgreement(pageId, {
      selector: options.agreementSelector,
      labelTextIncludes: agreementTextIncludes
    });
    const submit = await this.clickButtonText(pageId, options.submitText ?? 'Create Account');

    return {
      page: await this.driver.getPage(pageId),
      username,
      fullName,
      usernameFilled: usernameFilled.matched,
      fullNameFilled: fullNameFilled.matched,
      agreementChecked: agreement.checked,
      submitClicked: submit.matched,
      matched: usernameFilled.matched && fullNameFilled.matched && agreement.checked && submit.matched
    };
  }

  async signupStep(pageId: string, options: BrowserPageSignupStepOptions): Promise<BrowserPageSignupStepResult> {
    const emailSelector = options.emailSelector ?? "input[type='email'], input[name='email']";
    const passwordSelector = options.passwordSelector ?? "input[type='password'], input[name='password']";
    const ready = await this.waitReady(pageId, [emailSelector, passwordSelector], {
      timeoutMs: options.waitReadyTimeoutMs ?? 15000,
      stableReads: 1
    });
    const emailFilled = ready.matched ? await this.fillCommit(pageId, emailSelector, options.email) : {
      page: await this.driver.getPage(pageId),
      selector: emailSelector,
      value: options.email,
      matched: false
    };
    const passwordFilled = ready.matched ? await this.fillCommit(pageId, passwordSelector, options.password) : {
      page: await this.driver.getPage(pageId),
      selector: passwordSelector,
      value: options.password,
      matched: false
    };
    const submit = await this.clickButtonText(pageId, options.submitText ?? 'Continue');
    return {
      page: await this.driver.getPage(pageId),
      email: options.email,
      emailFilled: emailFilled.matched,
      passwordFilled: passwordFilled.matched,
      submitClicked: submit.matched,
      matched: emailFilled.matched && passwordFilled.matched && submit.matched
    };
  }

  private async waitForNoSelector(pageId: string, selector: string, timeoutMs: number, intervalMs: number): Promise<boolean> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const { value } = await this.driver.evaluate(pageId, `
        (() => !document.querySelector(${JSON.stringify(selector)}))()
      `);
      if (value === true) {
        return true;
      }
      await delay(intervalMs);
    }
    return false;
  }

  private async runDomQuery(
    pageId: string,
    payload: {
      operation: 'locate' | 'fill' | 'click' | 'submit';
      query?: string;
      value?: string;
      kind: BrowserPageQueryKind;
      exact: boolean;
      formSelector?: string;
      rootSelector?: string;
      limit: number;
    }
  ): Promise<{ matches: BrowserPageQueryMatch[]; matched: boolean; match?: BrowserPageQueryMatch }> {
    const { value } = await this.driver.evaluate(pageId, buildSemanticPageExpression(payload));
    const result = (value || {}) as {
      matches?: BrowserPageQueryMatch[];
      matched?: boolean;
      match?: BrowserPageQueryMatch;
    };
    return {
      matches: Array.isArray(result.matches) ? result.matches : [],
      matched: result.matched === true,
      match: result.match
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildSemanticPageExpression(payload: Record<string, unknown>): string {
  return `
    (() => {
      const request = ${JSON.stringify(payload)};
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const cssEscape = (value) => {
        if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
          return globalThis.CSS.escape(value);
        }
        return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
      };
      const toSelector = (element) => {
        if (!(element instanceof Element)) {
          return '';
        }
        if (element.id) {
          return '#' + cssEscape(element.id);
        }
        const parts = [];
        let current = element;
        while (current && current.nodeType === 1 && parts.length < 6) {
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
      const associatedLabelText = (element) => {
        const texts = [];
        if (!(element instanceof Element)) {
          return texts;
        }
        const id = element.getAttribute('id');
        if (id) {
          texts.push(...Array.from(document.querySelectorAll('label[for="' + cssEscape(id) + '"]')).map((label) => label.textContent || ''));
        }
        const closestLabel = element.closest('label');
        if (closestLabel) {
          texts.push(closestLabel.textContent || '');
        }
        return texts;
      };
      const collectCandidates = (scope, kind) => {
        const selectorsByKind = {
          field: 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"]',
          button: 'button, input[type="submit"], input[type="button"], input[type="reset"], [role="button"], a[role="button"]',
          link: 'a[href]',
          any: 'input:not([type="hidden"]), textarea, select, button, a[href], [role="button"], [role="textbox"], [role="combobox"], [contenteditable="true"]'
        };
        return Array.from(scope.querySelectorAll(selectorsByKind[kind] || selectorsByKind.any));
      };
      const scopeRoot = (() => {
        const root = request.rootSelector ? document.querySelector(request.rootSelector) : document;
        if (!root) {
          return document;
        }
        if (request.formSelector) {
          return root.querySelector(request.formSelector) || root;
        }
        return root;
      })();
      const query = normalize(request.query);
      const exact = request.exact === true;
      const limit = Math.max(1, Number(request.limit || 5));
      const candidates = collectCandidates(scopeRoot, request.kind || 'any').map((element) => {
        const textSources = [
          element.textContent || '',
          element.getAttribute('aria-label') || '',
          element.getAttribute('title') || '',
          element.getAttribute('placeholder') || '',
          element.getAttribute('name') || '',
          element.getAttribute('id') || '',
          element.getAttribute('value') || '',
          ...associatedLabelText(element)
        ];
        const normalizedSources = textSources.map(normalize).filter(Boolean);
        let score = 0;
        let bestText = '';
        for (const source of normalizedSources) {
          if (!source) {
            continue;
          }
          if (source === query) {
            score = Math.max(score, 120);
            bestText = source;
            continue;
          }
          if (!exact && source.includes(query)) {
            score = Math.max(score, 70);
            bestText = source;
          }
        }
        const disabled = element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
        if (disabled) {
          score = 0;
        }
        return {
          element,
          selector: toSelector(element),
          text: (element.textContent || element.getAttribute('aria-label') || element.getAttribute('value') || '').replace(/\\s+/g, ' ').trim(),
          tagName: element.tagName.toLowerCase(),
          type: element.getAttribute('type') || undefined,
          role: element.getAttribute('role') || undefined,
          score
        };
      }).filter((candidate) => candidate.score > 0 && candidate.selector);

      candidates.sort((left, right) => right.score - left.score);
      const matches = candidates.slice(0, limit).map((candidate) => ({
        selector: candidate.selector,
        text: candidate.text,
        tagName: candidate.tagName,
        type: candidate.type,
        role: candidate.role,
        score: candidate.score
      }));
      const top = candidates[0];

      const setValue = (element, value) => {
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
          const prototype = Object.getPrototypeOf(element);
          const descriptor = prototype ? Object.getOwnPropertyDescriptor(prototype, 'value') : null;
          if (descriptor && typeof descriptor.set === 'function') {
            descriptor.set.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          return true;
        }
        if (element.getAttribute('contenteditable') === 'true') {
          element.textContent = value;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
          return true;
        }
        return false;
      };

      if (request.operation === 'fill' && top) {
        top.element.focus();
        const matched = setValue(top.element, String(request.value || ''));
        return { matches, matched, match: matches[0] };
      }
      if (request.operation === 'click' && top) {
        top.element.click();
        return { matches, matched: true, match: matches[0] };
      }
      if (request.operation === 'submit') {
        if (top) {
          top.element.click();
          return { matches, matched: true, match: matches[0] };
        }
        const forms = scopeRoot instanceof Element || scopeRoot instanceof Document ? Array.from(scopeRoot.querySelectorAll('form')) : [];
        const form = forms[0];
        if (form) {
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.submit();
          }
          return { matches: [], matched: true };
        }
        return { matches, matched: false };
      }
      return {
        matches,
        matched: Boolean(top),
        match: matches[0]
      };
    })()
  `;
}

function buildPagePrimitiveExpression(payload: Record<string, unknown>): string {
  return `
    (() => {
      const request = ${JSON.stringify(payload)};
      const normalize = (value) => String(value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
      const cssEscape = (value) => {
        if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') {
          return globalThis.CSS.escape(value);
        }
        return String(value).replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');
      };
      const toSelector = (element) => {
        if (!(element instanceof Element)) return '';
        if (element.id) return '#' + cssEscape(element.id);
        const parts = [];
        let current = element;
        while (current && current.nodeType === 1 && parts.length < 6) {
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
      const associatedLabelText = (element) => {
        const texts = [];
        const id = element.getAttribute('id');
        if (id) {
          texts.push(...Array.from(document.querySelectorAll('label[for="' + cssEscape(id) + '"]')).map((label) => label.textContent || ''));
        }
        const closestLabel = element.closest('label');
        if (closestLabel) {
          texts.push(closestLabel.textContent || '');
        }
        return texts;
      };
      const scopeRoot = (() => {
        const root = request.rootSelector ? document.querySelector(request.rootSelector) : document;
        if (!root) return document;
        if (request.formSelector) {
          return root.querySelector(request.formSelector) || root;
        }
        return root;
      })();
      const collectCandidates = () => {
        const selectors = 'input:not([type="hidden"]), textarea, select, button, a[href], [role="button"], [role="textbox"], [role="combobox"], [contenteditable="true"]';
        return Array.from(scopeRoot.querySelectorAll(selectors)).map((element) => {
          const texts = [
            element.textContent || '',
            element.getAttribute('aria-label') || '',
            element.getAttribute('title') || '',
            element.getAttribute('placeholder') || '',
            element.getAttribute('name') || '',
            element.getAttribute('value') || '',
            ...associatedLabelText(element)
          ];
          const normalizedQuery = normalize(request.query);
          const matchedSource = texts.find((source) => {
            const normalizedSource = normalize(source);
            return request.exact === true ? normalizedSource === normalizedQuery : normalizedSource.includes(normalizedQuery);
          });
          return {
            element,
            matched: Boolean(matchedSource),
            selector: toSelector(element),
            match: {
              selector: toSelector(element),
              text: (element.textContent || element.getAttribute('aria-label') || element.getAttribute('value') || '').replace(/\\s+/g, ' ').trim(),
              tagName: element.tagName.toLowerCase(),
              type: element.getAttribute('type') || undefined,
              role: element.getAttribute('role') || undefined,
              score: matchedSource ? 100 : 0
            }
          };
        }).filter((entry) => entry.matched && entry.selector);
      };
      const first = collectCandidates()[0];
      if (request.operation === 'fill-commit') {
        const input = document.querySelector(String(request.selector || ''));
        if (!(input instanceof HTMLElement)) return false;
        input.focus();
        if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement) {
          const prototype = Object.getPrototypeOf(input);
          const descriptor = prototype ? Object.getOwnPropertyDescriptor(prototype, 'value') : null;
          if (descriptor && typeof descriptor.set === 'function') {
            descriptor.set.call(input, String(request.value || ''));
          } else {
            input.value = String(request.value || '');
          }
        } else if (input.getAttribute('contenteditable') === 'true') {
          input.textContent = String(request.value || '');
        } else {
          return false;
        }
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: String(request.value || '') }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        const currentValue =
          input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement || input instanceof HTMLSelectElement
            ? input.value
            : input.textContent || '';
        return currentValue === String(request.value || '');
      }
      if (request.operation === 'wait-ready') {
        const selectors = Array.isArray(request.selectors) ? request.selectors : [];
        return selectors.every((selector) => typeof selector === 'string' && Boolean(document.querySelector(selector)));
      }
      if (request.operation === 'click-text') {
        const normalizeText = normalize(request.text);
        const exact = request.exact !== false;
        const allowLinks = request.allowLinks !== false;
        const topRegionOnly = request.topRegionOnly === true;
        const topRegionMax = Math.max(0, Number(request.topRegionMax || 140));
        const root = request.withinSelector ? document.querySelector(String(request.withinSelector)) : document;
        if (!root) return { matched: false };
        const selector = allowLinks ? 'button, a, [role="button"], input[type="submit"], input[type="button"]' : 'button, [role="button"], input[type="submit"], input[type="button"]';
        const candidates = Array.from(root.querySelectorAll(selector));
        const target = candidates.find((node) => {
          if (!(node instanceof HTMLElement)) return false;
          const text = normalize(node.textContent || node.getAttribute('value') || node.getAttribute('aria-label') || '');
          const disabled = node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true';
          const rect = node.getBoundingClientRect();
          if (disabled || rect.width <= 0 || rect.height <= 0) return false;
          if (topRegionOnly && rect.top > topRegionMax) return false;
          return exact ? text === normalizeText : text.includes(normalizeText);
        });
        if (!target) return { matched: false };
        target.click();
        return { matched: true };
      }
      if (request.operation === 'check-agreement') {
        const hints = Array.isArray(request.labelTextIncludes) ? request.labelTextIncludes.map((entry) => normalize(entry)) : [];
        let input = null;
        if (request.selector) {
          const candidate = document.querySelector(String(request.selector));
          if (candidate instanceof HTMLInputElement && candidate.type === 'checkbox') {
            input = candidate;
          }
        }
        if (!input) {
          const candidates = Array.from(document.querySelectorAll('input[type="checkbox"]'));
          input = candidates.find((node) => {
            const label = node.closest('label');
            const text = normalize(label?.textContent || node.parentElement?.textContent || '');
            return hints.length === 0 || hints.some((hint) => text.includes(hint));
          }) || null;
        }
        if (!(input instanceof HTMLInputElement)) return { matched: false, checked: false };
        if (!input.checked) {
          input.click();
        }
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return { matched: true, checked: input.checked === true };
      }
      if (request.operation === 'settle-sample') {
        if (request.mode === 'network') {
          return JSON.stringify({ readyState: document.readyState, resources: performance.getEntriesByType('resource').length, href: location.href });
        }
        return JSON.stringify({
          readyState: document.readyState,
          title: document.title,
          textLength: (document.body?.innerText || '').length,
          nodeCount: document.querySelectorAll('*').length
        });
      }
      if (request.operation === 'scroll') {
        if (!request.query) {
          if (request.direction === 'top') window.scrollTo({ top: 0, behavior: 'auto' });
          else if (request.direction === 'bottom') window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
          else window.scrollBy({ top: request.direction === 'up' ? -window.innerHeight * 0.85 : window.innerHeight * 0.85, behavior: 'auto' });
          return { matched: true };
        }
        if (!first || !(first.element instanceof HTMLElement)) return { matched: false };
        if (request.direction === 'top') first.element.scrollTop = 0;
        else if (request.direction === 'bottom') first.element.scrollTop = first.element.scrollHeight;
        else first.element.scrollBy({ top: request.direction === 'up' ? -first.element.clientHeight * 0.85 : first.element.clientHeight * 0.85, behavior: 'auto' });
        return { matched: true, match: first.match };
      }
      if (request.operation === 'scroll-text') {
        const text = String(request.text || '');
        const nth = Math.max(1, Number(request.nth || 1));
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const matches = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if ((node.textContent || '').includes(text)) matches.push(node);
        }
        const target = matches[nth - 1];
        if (!target || !target.parentElement) return { matched: false };
        target.parentElement.scrollIntoView({ block: 'center', inline: 'nearest' });
        return { matched: true };
      }
      if (request.operation === 'send-keys') {
        const element = first?.element instanceof HTMLElement ? first.element : document.activeElement;
        if (!(element instanceof HTMLElement)) return { matched: false };
        element.focus();
        const keys = String(request.keys || '');
        const parts = keys.split('+').map((part) => part.trim()).filter(Boolean);
        for (const key of parts) {
          element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
        }
        if (parts.length === 1 && parts[0].length === 1 && 'value' in element) {
          element.value = (element.value || '') + parts[0];
          element.dispatchEvent(new Event('input', { bubbles: true }));
        }
        for (const key of parts.slice().reverse()) {
          element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
        }
        return { matched: true, match: first?.match };
      }
      if (request.operation === 'get-select-options') {
        if (!first || !(first.element instanceof HTMLSelectElement)) return { matched: false, options: [] };
        return {
          matched: true,
          match: first.match,
          options: Array.from(first.element.options).map((option) => ({
            value: option.value,
            text: option.text,
            selected: option.selected
          }))
        };
      }
      if (request.operation === 'select-option') {
        if (!first || !(first.element instanceof HTMLSelectElement)) return { matched: false };
        const option = Array.from(first.element.options).find((entry) => normalize(entry.text) === normalize(request.text) || normalize(entry.value) === normalize(request.text));
        if (!option) return { matched: false, match: first.match };
        first.element.value = option.value;
        first.element.dispatchEvent(new Event('input', { bubbles: true }));
        first.element.dispatchEvent(new Event('change', { bubbles: true }));
        return { matched: true, match: first.match };
      }
      if (request.operation === 'detect-file-uploader') {
        if (!first) return { matched: false, isFileUploader: false };
        const element = first.element;
        const isFileUploader = element instanceof HTMLInputElement && (element.type === 'file' || element.accept.length > 0);
        return { matched: true, isFileUploader, match: first.match };
      }
      return { matched: false };
    })()
  `;
}
