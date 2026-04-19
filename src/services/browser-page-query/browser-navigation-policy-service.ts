import type { BrowserNavigationPolicy } from '../browser-automation/types.js';

const DEFAULT_POLICY: BrowserNavigationPolicy = {
  enabled: false,
  allowList: [],
  denyList: []
};

function normalizeRule(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '');
}

function normalizeUrl(url: string): URL {
  return new URL(url);
}

function ruleMatches(url: URL, rawRule: string): boolean {
  const rule = normalizeRule(rawRule);
  if (!rule) {
    return false;
  }
  const hostAndPath = `${url.host}${url.pathname}`.toLowerCase();
  const full = `${url.protocol}//${hostAndPath}`.toLowerCase();
  return hostAndPath === rule || hostAndPath.startsWith(rule) || url.host.toLowerCase() === rule || full.includes(rule);
}

export class BrowserNavigationPolicyService {
  private policy: BrowserNavigationPolicy = { ...DEFAULT_POLICY };

  getPolicy(): BrowserNavigationPolicy {
    return {
      enabled: this.policy.enabled,
      allowList: [...this.policy.allowList],
      denyList: [...this.policy.denyList]
    };
  }

  setPolicy(next: Partial<BrowserNavigationPolicy>): BrowserNavigationPolicy {
    this.policy = {
      enabled: typeof next.enabled === 'boolean' ? next.enabled : this.policy.enabled,
      allowList: Array.isArray(next.allowList) ? next.allowList.map(normalizeRule).filter(Boolean) : this.policy.allowList,
      denyList: Array.isArray(next.denyList) ? next.denyList.map(normalizeRule).filter(Boolean) : this.policy.denyList
    };
    return this.getPolicy();
  }

  assertUrlAllowed(url?: string): void {
    if (!url || !this.policy.enabled) {
      return;
    }
    const parsed = normalizeUrl(url);
    const denied = this.policy.denyList.some((rule) => ruleMatches(parsed, rule));
    if (denied) {
      throw new Error(`Browser navigation blocked by deny rule: ${url}`);
    }
    if (this.policy.allowList.length > 0) {
      const allowed = this.policy.allowList.some((rule) => ruleMatches(parsed, rule));
      if (!allowed) {
        throw new Error(`Browser navigation blocked because URL is not on allow list: ${url}`);
      }
    }
  }
}

