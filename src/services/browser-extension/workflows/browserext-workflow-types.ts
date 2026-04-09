export type BrowserExtensionWorkflowSessionPolicy = 'reuse' | 'create' | 'reconnect' | 'fail';

export type BrowserExtensionWorkflowTabPolicy = 'reuse-matching' | 'focus-active' | 'create-new';

export type BrowserExtensionWorkflowSettleMode = 'dom' | 'network' | 'page';

export type BrowserExtensionWorkflowSettleConfig = {
  mode?: BrowserExtensionWorkflowSettleMode;
  quietMs?: number;
  intervalMs?: number;
  stableReads?: number;
  skip?: boolean;
};

export type BrowserExtensionWorkflowArtifacts = {
  snapshotOnFailure?: boolean;
  screenshotOnFailure?: boolean;
  keepStepResults?: boolean;
};

export type BrowserExtensionWorkflowTarget = {
  site?: string;
  url?: string;
  workspace?: string;
  name?: string;
  privateMode?: boolean;
};

export type BrowserExtensionWorkflowVariables = Record<string, unknown>;

export type BrowserExtensionWorkflowEnvelope = {
  version?: number;
  name?: string;
  description?: string;
  target?: BrowserExtensionWorkflowTarget;
  sessionPolicy?: BrowserExtensionWorkflowSessionPolicy;
  tabPolicy?: BrowserExtensionWorkflowTabPolicy;
  timeoutMs?: number;
  continueOnError?: boolean;
  navigateOnStart?: boolean;
  settleAfterEach?: BrowserExtensionWorkflowSettleMode;
  settleQuietMs?: number;
  stableReads?: number;
  artifacts?: BrowserExtensionWorkflowArtifacts;
  variables?: BrowserExtensionWorkflowVariables;
  steps: unknown[];
  [key: string]: unknown;
};

export type BrowserExtensionNormalizedWorkflowMetadata = {
  format: 'legacy-scenario' | 'owned-workflow';
  name?: string;
  description?: string;
  target?: BrowserExtensionWorkflowTarget;
  sessionPolicy?: BrowserExtensionWorkflowSessionPolicy;
  tabPolicy?: BrowserExtensionWorkflowTabPolicy;
  continueOnError?: boolean;
  navigateOnStart?: boolean;
  settleAfterEach?: BrowserExtensionWorkflowSettleMode;
  settleQuietMs?: number;
  stableReads?: number;
  artifacts?: BrowserExtensionWorkflowArtifacts;
  variables?: BrowserExtensionWorkflowVariables;
};

export type BrowserExtensionNormalizedWorkflowFile = {
  filePath: string;
  metadata: BrowserExtensionNormalizedWorkflowMetadata;
  document: Record<string, unknown> & { steps: unknown[] };
};

export type BrowserExtensionWorkflowValidationResult = {
  filePath: string;
  valid: boolean;
  format?: 'legacy-scenario' | 'owned-workflow';
  errors: string[];
  warnings: string[];
  metadata?: BrowserExtensionNormalizedWorkflowMetadata;
  document?: Record<string, unknown> & { steps: unknown[] };
};
