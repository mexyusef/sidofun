import { describe, expect, test } from 'bun:test';
import {
  buildBrowserExtensionWorkflowDefaults,
  createBrowserExtensionWorkflowRuntimeState,
  shouldLockBrowserExtensionWorkflowContext,
} from '../src/services/browser-extension/workflows/browserext-workflow-execution-state.js';

describe('browserext workflow execution state', () => {
  test('builds defaults from a workflow document', () => {
    const defaults = buildBrowserExtensionWorkflowDefaults({
      timeoutMs: 1000,
      intervalMs: 250,
      settleAfterEach: 'page',
      settleQuietMs: 700,
      stableReads: 2,
    });

    expect(defaults.timeoutMs).toBe(1000);
    expect(defaults.settleAfterEach).toBe('page');
    expect(defaults.settleQuietMs).toBe(700);
  });

  test('creates merged runtime outputs from metadata, document, and overrides', () => {
    const runtimeState = createBrowserExtensionWorkflowRuntimeState({
      format: 'owned-workflow',
      variables: { email: 'a@example.com', fromMeta: true },
    }, {
      variables: { fromDoc: true, email: 'b@example.com' },
    }, {
      email: 'c@example.com',
    });

    expect(runtimeState.outputs?.fromMeta).toBe(true);
    expect(runtimeState.outputs?.fromDoc).toBe(true);
    expect(runtimeState.outputs?.email).toBe('c@example.com');
  });

  test('detects when workflow context locking is applicable', () => {
    expect(shouldLockBrowserExtensionWorkflowContext({
      lockContext: true,
      formSelector: 'form',
    })).toBe(true);
    expect(shouldLockBrowserExtensionWorkflowContext({
      lockContext: true,
    })).toBe(false);
  });
});

