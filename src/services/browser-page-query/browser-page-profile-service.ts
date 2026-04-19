import type { BrowserPageInfo } from '../browser-automation/types.js';
import type { BrowserPageQueryService } from './browser-page-query-service.js';

export type BrowserPageProfileStep =
  | { kind: 'fill'; query: string; valueFrom: 'email' | 'username' | 'password' | 'confirmPassword' | 'fullName' }
  | { kind: 'click'; query: string; queryKind?: 'field' | 'button' | 'link' | 'any'; exact?: boolean }
  | { kind: 'submit'; query?: string }
  | { kind: 'wait-text'; text: string }
  | { kind: 'wait-url'; includes: string };

export interface BrowserPageProfile {
  id: string;
  name: string;
  description: string;
  defaultUrl: string;
  login?: {
    steps: BrowserPageProfileStep[];
  };
  signup?: {
    steps: BrowserPageProfileStep[];
  };
}

export interface BrowserPageProfileRunOptions {
  url?: string;
  email?: string;
  username?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  exact?: boolean;
  formSelector?: string;
  rootSelector?: string;
  timeoutMs?: number;
  intervalMs?: number;
}

export interface BrowserPageProfileRunResult {
  profile: BrowserPageProfile;
  page: BrowserPageInfo;
  steps: Array<{
    kind: BrowserPageProfileStep['kind'];
    ok: boolean;
    detail?: unknown;
  }>;
}

const BUILTIN_PROFILES: BrowserPageProfile[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'Email-first ChatGPT auth flow with continue-to-password steps.',
    defaultUrl: 'https://chatgpt.com/',
    login: {
      steps: [
        { kind: 'click', query: 'Log in', queryKind: 'button' },
        { kind: 'fill', query: 'Email', valueFrom: 'email' },
        { kind: 'click', query: 'Continue', queryKind: 'button' },
        { kind: 'fill', query: 'Password', valueFrom: 'password' },
        { kind: 'click', query: 'Continue', queryKind: 'button' }
      ]
    },
    signup: {
      steps: [
        { kind: 'click', query: 'Sign up', queryKind: 'button' },
        { kind: 'fill', query: 'Email', valueFrom: 'email' },
        { kind: 'click', query: 'Continue', queryKind: 'button' }
      ]
    }
  }
];

export function mergeBrowserPageProfiles(
  builtins: BrowserPageProfile[],
  extras: BrowserPageProfile[] = []
): BrowserPageProfile[] {
  const merged = new Map<string, BrowserPageProfile>();
  for (const profile of builtins) {
    merged.set(profile.id, profile);
  }
  for (const profile of extras) {
    merged.set(profile.id, profile);
  }
  return [...merged.values()];
}

interface BrowserPageProfileDriver {
  openPage(runtimeId: string, url?: string): Promise<BrowserPageInfo>;
  getPage(pageId: string): Promise<BrowserPageInfo>;
  waitFor(
    pageId: string,
    waitFor: 'load' | 'selector' | 'title' | 'url',
    query?: string,
    timeoutMs?: number
  ): Promise<unknown>;
}

export class BrowserPageProfileService {
  private readonly queryService: BrowserPageQueryService;
  private readonly driver: BrowserPageProfileDriver;
  private readonly profiles: BrowserPageProfile[];

  constructor(
    queryService: BrowserPageQueryService,
    driver: BrowserPageProfileDriver,
    profiles: BrowserPageProfile[] = BUILTIN_PROFILES
  ) {
    this.queryService = queryService;
    this.driver = driver;
    this.profiles = profiles;
  }

  withProfiles(profiles: BrowserPageProfile[]) {
    return new BrowserPageProfileService(
      this.queryService,
      this.driver,
      mergeBrowserPageProfiles(BUILTIN_PROFILES, profiles)
    );
  }

  listProfiles() {
    return this.profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      defaultUrl: profile.defaultUrl,
      capabilities: {
        login: Boolean(profile.login),
        signup: Boolean(profile.signup)
      }
    }));
  }

  getProfile(profileId: string): BrowserPageProfile {
    const profile = this.profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error(`Unknown browser page profile: ${profileId}`);
    }
    return profile;
  }

  async login(runtimeId: string, profileId: string, options: BrowserPageProfileRunOptions): Promise<BrowserPageProfileRunResult> {
    const profile = this.getProfile(profileId);
    if (!profile.login) {
      throw new Error(`Browser page profile "${profileId}" does not define a login flow`);
    }
    const page = await this.driver.openPage(runtimeId, options.url ?? profile.defaultUrl);
    const steps = await this.runSteps(page.id, profile.login.steps, options);
    return {
      profile,
      page: await this.driver.getPage(page.id),
      steps
    };
  }

  async signup(runtimeId: string, profileId: string, options: BrowserPageProfileRunOptions): Promise<BrowserPageProfileRunResult> {
    const profile = this.getProfile(profileId);
    if (!profile.signup) {
      throw new Error(`Browser page profile "${profileId}" does not define a signup flow`);
    }
    const page = await this.driver.openPage(runtimeId, options.url ?? profile.defaultUrl);
    const steps = await this.runSteps(page.id, profile.signup.steps, options);
    return {
      profile,
      page: await this.driver.getPage(page.id),
      steps
    };
  }

  private async runSteps(
    pageId: string,
    steps: BrowserPageProfileStep[],
    options: BrowserPageProfileRunOptions
  ): Promise<BrowserPageProfileRunResult['steps']> {
    const results: BrowserPageProfileRunResult['steps'] = [];
    for (const step of steps) {
      switch (step.kind) {
        case 'fill': {
          const value = this.resolveValue(step.valueFrom, options);
          const detail = await this.retryFill(pageId, step.query, value, options);
          results.push({ kind: step.kind, ok: detail.matched, detail });
          if (!detail.matched) {
            throw new Error(`Profile step fill failed for query "${step.query}"`);
          }
          break;
        }
        case 'click': {
          const detail = await this.retryClick(pageId, step.query, {
            queryKind: step.queryKind,
            exact: step.exact ?? options.exact,
            formSelector: options.formSelector,
            rootSelector: options.rootSelector,
            timeoutMs: options.timeoutMs,
            intervalMs: options.intervalMs
          });
          results.push({ kind: step.kind, ok: detail.matched, detail });
          if (!detail.matched) {
            throw new Error(`Profile step click failed for query "${step.query}"`);
          }
          break;
        }
        case 'submit': {
          const submitted = await this.queryService.submit(pageId, {
            query: step.query,
            exact: options.exact,
            formSelector: options.formSelector,
            rootSelector: options.rootSelector
          });
          results.push({ kind: step.kind, ok: submitted.matched, detail: submitted });
          if (!submitted.matched) {
            throw new Error('Profile submit step failed');
          }
          break;
        }
        case 'wait-text': {
          const detail = await this.queryService.waitForText(pageId, step.text, {
            timeoutMs: options.timeoutMs,
            intervalMs: options.intervalMs
          });
          results.push({ kind: step.kind, ok: detail.matched, detail });
          if (!detail.matched) {
            throw new Error(`Profile wait-text step failed for "${step.text}"`);
          }
          break;
        }
        case 'wait-url': {
          const waited = await this.driver.waitFor(pageId, 'url', step.includes, options.timeoutMs ?? 10000) as { matched: boolean };
          results.push({ kind: step.kind, ok: waited.matched, detail: waited });
          if (!waited.matched) {
            throw new Error(`Profile wait-url step failed for "${step.includes}"`);
          }
          break;
        }
      }
    }
    return results;
  }

  private resolveValue(
    name: 'email' | 'username' | 'password' | 'confirmPassword' | 'fullName',
    options: BrowserPageProfileRunOptions
  ): string {
    const value = options[name];
    if (!value) {
      throw new Error(`Browser page profile flow requires --${toKebab(name)}`);
    }
    return value;
  }

  private async retryFill(pageId: string, query: string, value: string, options: BrowserPageProfileRunOptions) {
    const timeoutMs = options.timeoutMs ?? 10000;
    const intervalMs = options.intervalMs ?? 250;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const filled = await this.queryService.fillQuery(pageId, query, value, {
        exact: options.exact,
        formSelector: options.formSelector,
        rootSelector: options.rootSelector
      });
      if (filled.matched) {
        return filled;
      }
      await delay(intervalMs);
    }
    return this.queryService.fillQuery(pageId, query, value, {
      exact: options.exact,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector
    });
  }

  private async retryClick(pageId: string, query: string, options: {
    queryKind?: 'field' | 'button' | 'link' | 'any';
    exact?: boolean;
    formSelector?: string;
    rootSelector?: string;
    timeoutMs?: number;
    intervalMs?: number;
  }) {
    const timeoutMs = options.timeoutMs ?? 10000;
    const intervalMs = options.intervalMs ?? 250;
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const clicked = await this.queryService.clickQuery(pageId, query, {
        kind: options.queryKind ?? 'button',
        exact: options.exact,
        formSelector: options.formSelector,
        rootSelector: options.rootSelector
      });
      if (clicked.matched) {
        return clicked;
      }
      await delay(intervalMs);
    }
    return this.queryService.clickQuery(pageId, query, {
      kind: options.queryKind ?? 'button',
      exact: options.exact,
      formSelector: options.formSelector,
      rootSelector: options.rootSelector
    });
  }
}

function toKebab(value: string): string {
  return value.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
