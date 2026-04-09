import { describe, expect, test } from 'bun:test';
import { executeBrowserExtensionWorkflowOutputStep } from '../src/services/browser-extension/workflows/browserext-workflow-output-step-executor.js';
import type { BrowserExtensionWorkflowRuntimeState } from '../src/services/browser-extension/workflows/browserext-workflow-execution-state.js';

describe('browserext workflow output step executor', () => {
  test('captures output and stores extracted values', async () => {
    const runtimeState: BrowserExtensionWorkflowRuntimeState = { outputs: { profile: { email: 'gaia@usef.tech' } } };
    const result = await executeBrowserExtensionWorkflowOutputStep({
      inspect: async () => ({ textContent: 'hello' }),
      snapshot: async () => ({ snapshot: { url: 'https://example.com' } }),
      findField: async () => ({ field: { selector: 'input[name=email]' } }),
      listFormValues: async () => ({ entries: [] }),
      suggestNextActions: async () => ({ suggestions: [{ query: 'Next' }] }),
      pageState: async () => ({ pageState: { snapshot: { url: 'https://example.com' } } }),
      diffPageStates: () => ({ changed: true }),
      matchesQuery: (value, query) => value === query
    }, {
      sessionId: 'session_1',
      step: {
        kind: 'extract-output',
        output: 'profile',
        path: 'email',
        saveAs: 'email_value'
      },
      defaults: {},
      runtimeState
    });

    expect(result?.value).toBe('gaia@usef.tech');
    expect(runtimeState.outputs?.email_value).toBe('gaia@usef.tech');
  });

  test('asserts output path contents', async () => {
    const runtimeState: BrowserExtensionWorkflowRuntimeState = { outputs: { profile: { email: 'gaia@usef.tech' } } };
    const result = await executeBrowserExtensionWorkflowOutputStep({
      inspect: async () => ({}),
      snapshot: async () => ({}),
      findField: async () => ({}),
      listFormValues: async () => ({ entries: [] }),
      suggestNextActions: async () => ({ suggestions: [] }),
      pageState: async () => ({ pageState: {} }),
      diffPageStates: () => ({}),
      matchesQuery: () => false
    }, {
      sessionId: 'session_1',
      step: {
        kind: 'assert-output-path',
        output: 'profile',
        path: 'email',
        includes: '@usef.tech'
      },
      defaults: {},
      runtimeState
    });

    expect(result?.comparable).toContain('@usef.tech');
  });
});
