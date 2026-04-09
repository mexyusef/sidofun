import type {
  BrowserExtensionWorkflowEnvelope,
  BrowserExtensionWorkflowSessionPolicy,
  BrowserExtensionWorkflowSettleMode,
  BrowserExtensionWorkflowTabPolicy,
  BrowserExtensionWorkflowTarget,
} from './browserext-workflow-types.js';

type BrowserExtensionWorkflowStep = Record<string, unknown>;

export class BrowserExtensionWorkflowBuilder {
  private readonly envelope: BrowserExtensionWorkflowEnvelope;

  constructor(name?: string) {
    this.envelope = {
      version: 1,
      name,
      steps: [],
    };
  }

  setName(name: string) {
    this.envelope.name = name;
    return this;
  }

  setDescription(description: string) {
    this.envelope.description = description;
    return this;
  }

  setTarget(target: BrowserExtensionWorkflowTarget) {
    this.envelope.target = {
      ...(this.envelope.target ?? {}),
      ...target,
    };
    return this;
  }

  setSessionPolicy(sessionPolicy: BrowserExtensionWorkflowSessionPolicy) {
    this.envelope.sessionPolicy = sessionPolicy;
    return this;
  }

  setTabPolicy(tabPolicy: BrowserExtensionWorkflowTabPolicy) {
    this.envelope.tabPolicy = tabPolicy;
    return this;
  }

  setTimeout(timeoutMs: number) {
    this.envelope.timeoutMs = timeoutMs;
    return this;
  }

  setContinueOnError(continueOnError: boolean) {
    this.envelope.continueOnError = continueOnError;
    return this;
  }

  setNavigateOnStart(navigateOnStart: boolean) {
    this.envelope.navigateOnStart = navigateOnStart;
    return this;
  }

  setDefaultSettle(mode: BrowserExtensionWorkflowSettleMode, options?: { quietMs?: number; stableReads?: number }) {
    this.envelope.settleAfterEach = mode;
    if (options?.quietMs !== undefined) {
      this.envelope.settleQuietMs = options.quietMs;
    }
    if (options?.stableReads !== undefined) {
      this.envelope.stableReads = options.stableReads;
    }
    return this;
  }

  setArtifacts(artifacts: NonNullable<BrowserExtensionWorkflowEnvelope['artifacts']>) {
    this.envelope.artifacts = {
      ...(this.envelope.artifacts ?? {}),
      ...artifacts,
    };
    return this;
  }

  addVariable(name: string, value: unknown) {
    this.envelope.variables = {
      ...(this.envelope.variables ?? {}),
      [name]: value,
    };
    return this;
  }

  addStep(step: BrowserExtensionWorkflowStep) {
    this.envelope.steps.push(step);
    return this;
  }

  addWaitSelector(selector: string, options?: { timeoutMs?: number; intervalMs?: number }) {
    return this.addStep({
      kind: 'wait-selector',
      selector,
      ...options,
    });
  }

  addFillSelector(
    selector: string,
    value: unknown,
    options?: { settleAfter?: BrowserExtensionWorkflowSettleMode; settleQuietMs?: number; skipSettle?: boolean }
  ) {
    return this.addStep({
      kind: 'fill-selector',
      selector,
      value,
      ...options,
    });
  }

  addClearSelector(
    selector: string,
    options?: { settleAfter?: BrowserExtensionWorkflowSettleMode; settleQuietMs?: number; skipSettle?: boolean }
  ) {
    return this.addStep({
      kind: 'clear-selector',
      selector,
      ...options,
    });
  }

  addClickSelector(
    selector: string,
    options?: { settleAfter?: BrowserExtensionWorkflowSettleMode; settleQuietMs?: number; skipSettle?: boolean }
  ) {
    return this.addStep({
      kind: 'click-selector',
      selector,
      ...options,
    });
  }

  addClickHumanSelector(
    selector: string,
    options?: { settleAfter?: BrowserExtensionWorkflowSettleMode; settleQuietMs?: number; skipSettle?: boolean }
  ) {
    return this.addStep({
      kind: 'click-human-selector',
      selector,
      ...options,
    });
  }

  addFocusSelector(selector: string) {
    return this.addStep({
      kind: 'focus-selector',
      selector,
    });
  }

  addBlurSelector(selector?: string) {
    return this.addStep({
      kind: 'blur-selector',
      ...(selector ? { selector } : {}),
    });
  }

  addCommitSelector(selector?: string) {
    return this.addStep({
      kind: 'commit-selector',
      ...(selector ? { selector } : {}),
    });
  }

  addSubmit(
    selector?: string,
    options?: { settleAfter?: BrowserExtensionWorkflowSettleMode; settleQuietMs?: number; skipSettle?: boolean }
  ) {
    return this.addStep({
      kind: 'submit',
      ...(selector ? { selector } : {}),
      ...options,
    });
  }

  build(): BrowserExtensionWorkflowEnvelope {
    return JSON.parse(JSON.stringify(this.envelope)) as BrowserExtensionWorkflowEnvelope;
  }

  static linear(name: string, steps: BrowserExtensionWorkflowStep[]) {
    const builder = new BrowserExtensionWorkflowBuilder(name);
    for (const step of steps) {
      builder.addStep(step);
    }
    return builder;
  }
}
