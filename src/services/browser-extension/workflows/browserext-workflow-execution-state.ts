import type { BrowserExtensionNormalizedWorkflowMetadata } from './browserext-workflow-types.js';

export type BrowserExtensionWorkflowDocumentLike = {
  name?: string;
  description?: string;
  frameSelectors?: string[];
  formSelector?: string;
  contextQuery?: string;
  frameQuery?: string;
  exact?: boolean;
  delayMs?: number;
  timeoutMs?: number;
  intervalMs?: number;
  settleAfterEach?: 'dom' | 'network' | 'page';
  settleQuietMs?: number;
  stableReads?: number;
  retryCount?: number;
  retryDelayMs?: number;
  lockContext?: boolean;
  variables?: Record<string, unknown>;
};

export type BrowserExtensionWorkflowExecutionDefaults = Omit<BrowserExtensionWorkflowDocumentLike, 'lockContext' | 'variables'>;

export type BrowserExtensionWorkflowSessionOwnership = {
  sessionId: string;
  pinnedTabId?: number;
  windowId?: number;
  targetUrl?: string;
  targetHost?: string;
  privateMode?: boolean;
  matchedBy?: 'pinned-tab' | 'exact-url' | 'host' | 'active-tab';
  acquisition?: 'provided' | 'matched-existing' | 'reconnected-existing' | 'created-new';
};

export type BrowserExtensionWorkflowRuntimeState = {
  outputs?: Record<string, unknown>;
  lastPageState?: Record<string, unknown>;
  sessionOwnership?: BrowserExtensionWorkflowSessionOwnership;
  sessionIsolation?: {
    acquisition?: BrowserExtensionWorkflowSessionOwnership['acquisition'];
    privateMode?: boolean;
    matchedBy?: BrowserExtensionWorkflowSessionOwnership['matchedBy'];
    pinnedTabId?: number;
    targetUrl?: string;
  };
};

export function buildBrowserExtensionWorkflowDefaults(
  document: BrowserExtensionWorkflowDocumentLike
): BrowserExtensionWorkflowExecutionDefaults {
  return {
    name: document.name,
    description: document.description,
    frameSelectors: document.frameSelectors,
    formSelector: document.formSelector,
    contextQuery: document.contextQuery,
    frameQuery: document.frameQuery,
    exact: document.exact,
    delayMs: document.delayMs,
    timeoutMs: document.timeoutMs,
    intervalMs: document.intervalMs,
    settleAfterEach: document.settleAfterEach,
    settleQuietMs: document.settleQuietMs,
    stableReads: document.stableReads,
    retryCount: document.retryCount,
    retryDelayMs: document.retryDelayMs
  };
}

export function createBrowserExtensionWorkflowRuntimeState(
  metadata: BrowserExtensionNormalizedWorkflowMetadata,
  document: BrowserExtensionWorkflowDocumentLike,
  overrides?: Record<string, string>
): BrowserExtensionWorkflowRuntimeState {
  return {
    outputs: {
      ...(metadata.variables ?? {}),
      ...(document.variables ?? {}),
      ...(overrides ?? {})
    }
  };
}

export function shouldLockBrowserExtensionWorkflowContext(
  document: BrowserExtensionWorkflowDocumentLike
) {
  return Boolean(
    document.lockContext
    && (document.formSelector || document.contextQuery || document.frameQuery || document.frameSelectors?.length)
  );
}
