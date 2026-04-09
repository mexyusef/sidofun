import type { BrowserExtensionWorkflowEnvelope, BrowserExtensionWorkflowTarget } from './browserext-workflow-types.js';
import { BrowserExtensionWorkflowBuilder } from './browserext-workflow-builder.js';

export function createOwnedBrowserExtensionWorkflow(options: {
  name: string;
  description?: string;
  target?: BrowserExtensionWorkflowTarget;
  timeoutMs?: number;
  sessionPolicy?: BrowserExtensionWorkflowEnvelope['sessionPolicy'];
  tabPolicy?: BrowserExtensionWorkflowEnvelope['tabPolicy'];
  navigateOnStart?: boolean;
  settleAfterEach?: BrowserExtensionWorkflowEnvelope['settleAfterEach'];
  settleQuietMs?: number;
  stableReads?: number;
  variables?: Record<string, unknown>;
  steps?: Array<Record<string, unknown>>;
}) {
  const builder = new BrowserExtensionWorkflowBuilder(options.name);
  if (options.description) {
    builder.setDescription(options.description);
  }
  if (options.target) {
    builder.setTarget(options.target);
  }
  if (options.timeoutMs !== undefined) {
    builder.setTimeout(options.timeoutMs);
  }
  if (options.sessionPolicy) {
    builder.setSessionPolicy(options.sessionPolicy);
  }
  if (options.tabPolicy) {
    builder.setTabPolicy(options.tabPolicy);
  }
  if (options.navigateOnStart !== undefined) {
    builder.setNavigateOnStart(options.navigateOnStart);
  }
  if (options.settleAfterEach) {
    builder.setDefaultSettle(options.settleAfterEach, {
      quietMs: options.settleQuietMs,
      stableReads: options.stableReads,
    });
  }
  for (const [name, value] of Object.entries(options.variables ?? {})) {
    builder.addVariable(name, value);
  }
  for (const step of options.steps ?? []) {
    builder.addStep(step);
  }
  return builder.build();
}

export function createLinearBrowserExtensionWorkflow(
  name: string,
  target: BrowserExtensionWorkflowTarget | undefined,
  steps: Array<Record<string, unknown>>
) {
  return createOwnedBrowserExtensionWorkflow({
    name,
    target,
    steps,
  });
}
