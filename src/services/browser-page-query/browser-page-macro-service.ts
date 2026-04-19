import type {
  BrowserPageFormWorkflowResult,
  BrowserPageInfo,
  BrowserPageQueryActionResult,
  BrowserPageWaitResult,
} from '../browser-automation/types.js';
import type {
  BrowserPageFormWorkflowOptions,
  BrowserPageQueryOptions,
  BrowserPageSubmitOptions,
  BrowserPageWaitTextOptions,
} from './browser-page-query-service.js';
import { BrowserPageQueryService } from './browser-page-query-service.js';

interface BrowserPageMacroDriver {
  openPage(runtimeId: string, url?: string): Promise<BrowserPageInfo>;
  getPage(pageId: string): Promise<BrowserPageInfo>;
  waitFor(
    pageId: string,
    waitFor: 'load' | 'selector' | 'title' | 'url',
    query?: string,
    timeoutMs?: number
  ): Promise<BrowserPageWaitResult>;
}

export interface BrowserPageMacroWaitOptions {
  waitUrlIncludes?: string;
  waitText?: string;
  waitSelector?: string;
  waitNoSelector?: string;
  timeoutMs?: number;
  intervalMs?: number;
}

export interface BrowserPageAuthLoginOptions extends BrowserPageMacroWaitOptions {
  email?: string;
  username?: string;
  password: string;
  submitQuery?: string;
  skipSubmit?: boolean;
  exact?: boolean;
  formSelector?: string;
  rootSelector?: string;
}

export interface BrowserPageAuthSignupOptions extends BrowserPageMacroWaitOptions {
  fullName?: string;
  username?: string;
  email?: string;
  password: string;
  confirmPassword?: string;
  submitQuery?: string;
  skipSubmit?: boolean;
  exact?: boolean;
  formSelector?: string;
  rootSelector?: string;
}

export interface BrowserPageOpenWorkflowOptions extends BrowserPageFormWorkflowOptions {
  url: string;
}

export interface BrowserPageOpenAndLoginOptions extends BrowserPageAuthLoginOptions {
  url: string;
}

export interface BrowserPageOpenAndSignupOptions extends BrowserPageAuthSignupOptions {
  url: string;
}

export interface BrowserPageOpenWorkflowResult {
  page: BrowserPageInfo;
  workflow: BrowserPageFormWorkflowResult;
}

export interface BrowserPageAuthWorkflowResult extends BrowserPageFormWorkflowResult {}

export interface BrowserPageOpenAndAuthResult {
  page: BrowserPageInfo;
  auth: BrowserPageAuthWorkflowResult;
}

export class BrowserPageMacroService {
  private readonly queries: BrowserPageQueryService;
  private readonly driver: BrowserPageMacroDriver;

  constructor(queries: BrowserPageQueryService, driver: BrowserPageMacroDriver) {
    this.queries = queries;
    this.driver = driver;
  }

  async authLogin(pageId: string, options: BrowserPageAuthLoginOptions): Promise<BrowserPageAuthWorkflowResult> {
    if (!options.email && !options.username) {
      throw new Error('browser page auth-login requires --email or --username');
    }

    const fields = [
      ...(options.email ? [{ query: 'Email', value: options.email }] : []),
      ...(options.username ? [{ query: 'Username', value: options.username }] : []),
      { query: 'Password', value: options.password }
    ];

    return this.executeAuthWorkflow(pageId, fields, {
      submitQuery: options.submitQuery,
      submitCandidates: ['Log in', 'Login', 'Sign in', 'Continue'],
      skipSubmit: options.skipSubmit,
      exact: options.exact,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector,
      waitUrlIncludes: options.waitUrlIncludes,
      waitText: options.waitText,
      waitSelector: options.waitSelector,
      waitNoSelector: options.waitNoSelector,
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs
    });
  }

  async authSignup(pageId: string, options: BrowserPageAuthSignupOptions): Promise<BrowserPageAuthWorkflowResult> {
    const fields = [
      ...(options.fullName ? [{ query: 'Full name', value: options.fullName }] : []),
      ...(options.username ? [{ query: 'Username', value: options.username }] : []),
      ...(options.email ? [{ query: 'Email', value: options.email }] : []),
      { query: 'Password', value: options.password },
      ...(options.confirmPassword ? [{ query: 'Confirm password', value: options.confirmPassword }] : [])
    ];

    return this.executeAuthWorkflow(pageId, fields, {
      submitQuery: options.submitQuery,
      submitCandidates: ['Sign up', 'Create account', 'Continue', 'Register'],
      skipSubmit: options.skipSubmit,
      exact: options.exact,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector,
      waitUrlIncludes: options.waitUrlIncludes,
      waitText: options.waitText,
      waitSelector: options.waitSelector,
      waitNoSelector: options.waitNoSelector,
      timeoutMs: options.timeoutMs,
      intervalMs: options.intervalMs
    });
  }

  async openWorkflow(runtimeId: string, options: BrowserPageOpenWorkflowOptions): Promise<BrowserPageOpenWorkflowResult> {
    const page = await this.driver.openPage(runtimeId, options.url);
    const workflow = await this.queries.formWorkflow(page.id, options);
    return {
      page: await this.driver.getPage(page.id),
      workflow
    };
  }

  async openAndLogin(runtimeId: string, options: BrowserPageOpenAndLoginOptions): Promise<BrowserPageOpenAndAuthResult> {
    const page = await this.driver.openPage(runtimeId, options.url);
    const auth = await this.authLogin(page.id, options);
    return {
      page: await this.driver.getPage(page.id),
      auth
    };
  }

  async openAndSignup(runtimeId: string, options: BrowserPageOpenAndSignupOptions): Promise<BrowserPageOpenAndAuthResult> {
    const page = await this.driver.openPage(runtimeId, options.url);
    const auth = await this.authSignup(page.id, options);
    return {
      page: await this.driver.getPage(page.id),
      auth
    };
  }

  private async executeAuthWorkflow(
    pageId: string,
    fields: Array<{ query: string; value: string }>,
    options: {
      submitQuery?: string;
      submitCandidates: string[];
      skipSubmit?: boolean;
      exact?: boolean;
      formSelector?: string;
      rootSelector?: string;
      waitUrlIncludes?: string;
      waitText?: string;
      waitSelector?: string;
      waitNoSelector?: string;
      timeoutMs?: number;
      intervalMs?: number;
    }
  ): Promise<BrowserPageAuthWorkflowResult> {
    const fieldResults: BrowserPageFormWorkflowResult['fields'] = [];
    for (const field of fields) {
      const result = await this.queries.fillQuery(pageId, field.query, field.value, {
        exact: options.exact,
        formSelector: options.formSelector,
        rootSelector: options.rootSelector
      });
      fieldResults.push({
        ...field,
        matched: result.matched,
        match: result.match
      });
      if (!result.matched) {
        throw new Error(`Could not locate field "${field.query}"`);
      }
    }

    let submit: BrowserPageFormWorkflowResult['submit'] | undefined;
    if (!options.skipSubmit) {
      submit = await this.submitWithFallback(pageId, {
        submitQuery: options.submitQuery,
        submitCandidates: options.submitCandidates,
        exact: options.exact,
        formSelector: options.formSelector,
        rootSelector: options.rootSelector
      });
    }

    const waits = await this.applyWaits(pageId, options);
    return {
      page: await this.driver.getPage(pageId),
      fields: fieldResults,
      submit,
      waits
    };
  }

  private async submitWithFallback(
    pageId: string,
    options: {
      submitQuery?: string;
      submitCandidates: string[];
      exact?: boolean;
      formSelector?: string;
      rootSelector?: string;
    }
  ): Promise<BrowserPageFormWorkflowResult['submit']> {
    const queryOptions: BrowserPageQueryOptions = {
      kind: 'button',
      exact: options.exact,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector
    };
    const candidates = options.submitQuery
      ? [options.submitQuery]
      : options.submitCandidates;

    for (const candidate of candidates) {
      const clicked = await this.queries.clickQuery(pageId, candidate, queryOptions);
      if (clicked.matched) {
        return {
          query: candidate,
          matched: true,
          match: clicked.match
        };
      }
    }

    const submitted = await this.queries.submit(pageId, {
      query: options.submitQuery,
      exact: options.exact,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector
    });
    return {
      query: options.submitQuery,
      matched: submitted.matched,
      match: submitted.match
    };
  }

  private async applyWaits(pageId: string, options: BrowserPageMacroWaitOptions): Promise<BrowserPageFormWorkflowResult['waits']> {
    const waits: BrowserPageFormWorkflowResult['waits'] = {
      urlIncludes: options.waitUrlIncludes,
      text: options.waitText,
      selector: options.waitSelector,
      noSelector: options.waitNoSelector,
      matched: true
    };
    const timeoutMs = options.timeoutMs ?? 10000;

    if (options.waitUrlIncludes) {
      const waited = await this.driver.waitFor(pageId, 'url', options.waitUrlIncludes, timeoutMs);
      waits.matched = waits.matched && waited.matched;
    }
    if (options.waitSelector) {
      const waited = await this.driver.waitFor(pageId, 'selector', options.waitSelector, timeoutMs);
      waits.matched = waits.matched && waited.matched;
    }
    if (options.waitNoSelector) {
      const noSelector = await this.waitForNoSelector(pageId, options.waitNoSelector, {
        timeoutMs,
        intervalMs: options.intervalMs
      });
      waits.matched = waits.matched && noSelector.matched;
    }
    if (options.waitText) {
      const waited = await this.queries.waitForText(pageId, options.waitText, {
        timeoutMs,
        intervalMs: options.intervalMs
      });
      waits.matched = waits.matched && waited.matched;
    }
    return waits;
  }

  private async waitForNoSelector(pageId: string, selector: string, options: BrowserPageWaitTextOptions): Promise<BrowserPageQueryActionResult> {
    const timeoutMs = options.timeoutMs ?? 10000;
    const intervalMs = options.intervalMs ?? 250;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const located = await this.queries.locate(pageId, selector, {
        kind: 'any',
        exact: true,
        rootSelector: selector,
        limit: 1
      }).catch(() => null);
      if (!located || located.matches.length === 0) {
        return {
          page: await this.driver.getPage(pageId),
          query: selector,
          matched: true
        };
      }
      await delay(intervalMs);
    }
    return {
      page: await this.driver.getPage(pageId),
      query: selector,
      matched: false
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
