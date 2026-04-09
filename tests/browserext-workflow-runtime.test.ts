import { describe, expect, test } from 'bun:test';
import {
  resolveBrowserExtensionWorkflowSettleConfig,
  shouldAutoSettleBrowserExtensionWorkflowStep,
} from '../src/services/browser-extension/workflows/browserext-workflow-runtime.js';
import {
  classifyBrowserExtensionSubmitOutcome,
} from '../src/services/browser-extension/workflows/browserext-workflow-submit.js';

describe('browserext workflow runtime', () => {
  test('resolves per-step settle overrides over document defaults', () => {
    const settle = resolveBrowserExtensionWorkflowSettleConfig({
      kind: 'click-human-selector',
      settleAfter: 'page',
      settleQuietMs: 1200,
      stableReads: 3,
    }, {
      settleAfterEach: 'dom',
      settleQuietMs: 500,
      intervalMs: 250,
      stableReads: 2,
    });

    expect(settle?.mode).toBe('page');
    expect(settle?.quietMs).toBe(1200);
    expect(settle?.intervalMs).toBe(250);
    expect(settle?.stableReads).toBe(3);
  });

  test('supports explicit settle skipping for action steps', () => {
    const settle = resolveBrowserExtensionWorkflowSettleConfig({
      kind: 'fill-selector',
      skipSettle: true,
    }, {
      settleAfterEach: 'dom',
      settleQuietMs: 500,
      intervalMs: 250,
      stableReads: 2,
    });

    expect(settle?.skip).toBe(true);
  });

  test('keeps non-action wait steps out of auto-settle', () => {
    expect(shouldAutoSettleBrowserExtensionWorkflowStep('wait-selector')).toBe(false);
    expect(shouldAutoSettleBrowserExtensionWorkflowStep('settle')).toBe(false);
    expect(shouldAutoSettleBrowserExtensionWorkflowStep('click-human-selector')).toBe(true);
  });

  test('classifies submit outcomes from settle results', () => {
    expect(classifyBrowserExtensionSubmitOutcome({ timedOut: true }).outcome).toBe('validation_failed');
    expect(classifyBrowserExtensionSubmitOutcome({ urlChanged: true }).outcome).toBe('submitted_navigated');
    expect(classifyBrowserExtensionSubmitOutcome({ matched: true }).outcome).toBe('submitted_async');
    expect(classifyBrowserExtensionSubmitOutcome({}).outcome).toBe('submitted_no_navigation');
  });
});
