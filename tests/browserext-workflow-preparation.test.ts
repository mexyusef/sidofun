import { describe, expect, test } from 'bun:test';
import { prepareBrowserExtensionWorkflowRuntime } from '../src/services/browser-extension/workflows/browserext-workflow-preparation.js';

describe('browserext workflow preparation', () => {
  test('builds runtime defaults, outputs, ownership, and optional locked context', async () => {
    const result = await prepareBrowserExtensionWorkflowRuntime({
      metadata: {
        format: 'owned-workflow',
        variables: {
          shared: 'metadata'
        }
      },
      document: {
        name: 'Demo',
        timeoutMs: 1200,
        frameSelectors: ['iframe.demo'],
        lockContext: true,
        variables: {
          local: 'document'
        }
      },
      sessionId: 'session_1',
      acquisition: 'created-new',
      variables: {
        override: 'cli'
      },
      captureOwnership: async () => ({
        sessionId: 'session_1',
        pinnedTabId: 42,
        matchedBy: 'exact-url'
      }),
      resolveLockedContext: async () => ({
        selectedContext: {
          formSelector: 'form.demo'
        }
      })
    });

    expect(result.defaults.timeoutMs).toBe(1200);
    expect(result.runtimeState.outputs).toEqual({
      shared: 'metadata',
      local: 'document',
      override: 'cli'
    });
    expect(result.runtimeState.sessionOwnership?.acquisition).toBe('created-new');
    expect((result.runtimeState as { lockedContext?: { selectedContext?: { formSelector?: string } } }).lockedContext?.selectedContext?.formSelector).toBe('form.demo');
  });
});
