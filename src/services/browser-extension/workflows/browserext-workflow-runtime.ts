import type { BrowserExtensionWorkflowSettleConfig, BrowserExtensionWorkflowSettleMode } from './browserext-workflow-types.js';

export type BrowserExtensionWorkflowStepLike = {
  kind: string;
  settleAfter?: BrowserExtensionWorkflowSettleMode;
  settleQuietMs?: number;
  settleIntervalMs?: number;
  stableReads?: number;
  skipSettle?: boolean;
};

export type BrowserExtensionWorkflowDefaultsLike = {
  settleAfterEach?: BrowserExtensionWorkflowSettleMode;
  settleQuietMs?: number;
  intervalMs?: number;
  stableReads?: number;
};

const ACTION_SETTLE_SKIP_KINDS = new Set([
  'wait-text',
  'wait-selector',
  'wait-no-selector',
  'wait-url',
  'settle',
  'branch',
  'repeat-until'
]);

export function shouldAutoSettleBrowserExtensionWorkflowStep(kind: string) {
  return !ACTION_SETTLE_SKIP_KINDS.has(kind);
}

export function resolveBrowserExtensionWorkflowSettleConfig(
  step: BrowserExtensionWorkflowStepLike,
  defaults: BrowserExtensionWorkflowDefaultsLike
): BrowserExtensionWorkflowSettleConfig | undefined {
  if (step.skipSettle === true) {
    return { skip: true };
  }
  const mode = step.settleAfter ?? defaults.settleAfterEach;
  if (!mode) {
    return undefined;
  }
  return {
    mode,
    quietMs: step.settleQuietMs ?? defaults.settleQuietMs,
    intervalMs: step.settleIntervalMs ?? defaults.intervalMs,
    stableReads: step.stableReads ?? defaults.stableReads,
    skip: false,
  };
}

