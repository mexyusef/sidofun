import {
  buildBrowserExtensionWorkflowDefaults,
  createBrowserExtensionWorkflowRuntimeState,
  shouldLockBrowserExtensionWorkflowContext,
  type BrowserExtensionWorkflowDocumentLike,
  type BrowserExtensionWorkflowSessionOwnership,
  type BrowserExtensionWorkflowRuntimeState
} from './browserext-workflow-execution-state.js';
import type { BrowserExtensionNormalizedWorkflowMetadata } from './browserext-workflow-types.js';

export async function prepareBrowserExtensionWorkflowRuntime(params: {
  metadata: BrowserExtensionNormalizedWorkflowMetadata;
  document: BrowserExtensionWorkflowDocumentLike;
  sessionId: string;
  acquisition: 'provided' | 'matched-existing' | 'reconnected-existing' | 'created-new';
  variables?: Record<string, string>;
  captureOwnership: (sessionId: string, timeoutMs: number) => Promise<BrowserExtensionWorkflowSessionOwnership>;
  resolveLockedContext: (sessionId: string, document: BrowserExtensionWorkflowDocumentLike) => Promise<unknown>;
}) {
  const defaults = buildBrowserExtensionWorkflowDefaults(params.document);
  const runtimeState: BrowserExtensionWorkflowRuntimeState & { lockedContext?: unknown } =
    createBrowserExtensionWorkflowRuntimeState(params.metadata, params.document, params.variables);
  runtimeState.sessionOwnership = {
    ...(await params.captureOwnership(
      params.sessionId,
      params.document.timeoutMs ?? 45_000
    )),
    acquisition: params.acquisition
  };
  runtimeState.sessionIsolation = {
    acquisition: runtimeState.sessionOwnership.acquisition,
    privateMode: runtimeState.sessionOwnership.privateMode,
    matchedBy: runtimeState.sessionOwnership.matchedBy,
    pinnedTabId: runtimeState.sessionOwnership.pinnedTabId,
    targetUrl: runtimeState.sessionOwnership.targetUrl
  };
  if (shouldLockBrowserExtensionWorkflowContext(params.document)) {
    runtimeState.lockedContext = await params.resolveLockedContext(params.sessionId, params.document).catch(() => undefined);
  }
  return {
    defaults,
    runtimeState
  };
}
