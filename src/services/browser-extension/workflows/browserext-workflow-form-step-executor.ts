import { classifyBrowserExtensionSubmitOutcome } from './browserext-workflow-submit.js';

type BrowserExtensionWorkflowFormStepDeps = {
  inspect: (selector: string, timeoutMs?: number) => Promise<Record<string, unknown> | undefined>;
  authLogin: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  formSubmitAndWait: (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
  settle: (mode: 'dom' | 'network' | 'page', options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  waitFieldValidation: (
    selector: string,
    options?: {
      state?: 'valid' | 'invalid';
      messageIncludes?: string;
      messageEquals?: string;
      frameSelectors?: string[];
      timeoutMs?: number;
      intervalMs?: number;
    }
  ) => Promise<Record<string, unknown>>;
  matchesValidation: (
    validation: Record<string, unknown> | undefined,
    expected?: {
      state?: 'valid' | 'invalid';
      messageIncludes?: string;
      messageEquals?: string;
    }
  ) => boolean;
  browserExtensionService: {
    fillFormFieldByQuery: (sessionId: string, query: string, value: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    formFillHuman: (sessionId: string, selector: string, value: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    formClear: (sessionId: string, selector: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    formValidation: (sessionId: string, selector: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    clickByQuery: (sessionId: string, query: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    click: (sessionId: string, selector: string, timeoutMs?: number) => Promise<Record<string, unknown>>;
    clickHuman: (sessionId: string, selector: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    focusElement: (sessionId: string, selector: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    blurElement: (sessionId: string, selector: string | undefined, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    formCommit: (sessionId: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    selectRadioOption: (sessionId: string, query: string, value: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    selectSegmentedOption: (sessionId: string, query: string, value: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    selectTablistOption: (sessionId: string, query: string, value: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    moveStepper: (sessionId: string, direction: 'next' | 'previous', options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    setTypedFieldByQuery: (sessionId: string, kind: 'form_date_set' | 'form_time_set' | 'form_datetime_set', query: string, value: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    setRangeByQuery: (sessionId: string, query: string, value: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    toggleControl: (sessionId: string, query: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    locateInPage: (sessionId: string, query: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
};

type BrowserExtensionWorkflowFormStepContext = {
  sessionId: string;
  step: Record<string, unknown> & { kind: string };
  defaults: Record<string, unknown>;
  exact?: boolean;
  preferredFormSelector?: string;
  effectiveFrameSelectors?: string[];
  resolvedSubmitSelector?: string;
};

export async function executeBrowserExtensionWorkflowFormStep(
  deps: BrowserExtensionWorkflowFormStepDeps,
  context: BrowserExtensionWorkflowFormStepContext
): Promise<Record<string, unknown> | undefined> {
  const { sessionId, step, defaults, exact, preferredFormSelector, effectiveFrameSelectors, resolvedSubmitSelector } = context;
  const timeoutMs = typeof defaults.timeoutMs === 'number' ? defaults.timeoutMs : undefined;
  const intervalMs = typeof defaults.intervalMs === 'number' ? defaults.intervalMs : undefined;
  const settleQuietMs = typeof defaults.settleQuietMs === 'number' ? defaults.settleQuietMs : undefined;
  const stableReads = typeof defaults.stableReads === 'number' ? defaults.stableReads : undefined;
  switch (step.kind) {
    case 'fill':
      return deps.browserExtensionService.fillFormFieldByQuery(sessionId, String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'fill-selector': {
      let result = await deps.browserExtensionService.formFillHuman(sessionId, String(step.selector || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs,
        delayMs: typeof defaults.delayMs === 'number' ? defaults.delayMs : 35,
        jitterMs: 20
      });
      if (result.filled !== true) {
        const inspected = await deps.inspect(String(step.selector || ''), timeoutMs).catch(() => undefined);
        const comparableValue = typeof inspected?.value === 'string'
          ? inspected.value
          : typeof inspected?.text === 'string'
            ? inspected.text
            : undefined;
        if (comparableValue === step.value) {
          result = {
            ...result,
            filled: true,
            field: {
              ...((result.field as Record<string, unknown> | undefined) ?? {}),
              ...(inspected ?? {}),
              filled: true,
              humanLike: true
            }
          };
        }
      }
      return result;
    }
    case 'signup-form': {
      const emailSelector = String(step.emailSelector || '');
      const passwordSelector = String(step.passwordSelector || '');
      const emailValue = String(step.emailValue ?? '');
      const passwordValue = String(step.passwordValue ?? '');
      const submitSelector = typeof step.submitSelector === 'string' ? step.submitSelector : resolvedSubmitSelector;

      const emailFill = await deps.browserExtensionService.formFillHuman(sessionId, emailSelector, emailValue, {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs,
        delayMs: typeof defaults.delayMs === 'number' ? defaults.delayMs : 35,
        jitterMs: 20
      });
      const emailCommit = await deps.browserExtensionService.formCommit(sessionId, {
        selector: emailSelector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
      const passwordFill = await deps.browserExtensionService.formFillHuman(sessionId, passwordSelector, passwordValue, {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs,
        delayMs: typeof defaults.delayMs === 'number' ? defaults.delayMs : 35,
        jitterMs: 20
      });
      const passwordCommit = await deps.browserExtensionService.formCommit(sessionId, {
        selector: passwordSelector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });

      let submit: Record<string, unknown> = { submitted: false };
      if (submitSelector) {
        const clickResult = await deps.browserExtensionService.clickHuman(sessionId, submitSelector, {
          frameSelectors: effectiveFrameSelectors,
          timeoutMs
        });
        const settleMode = (step.settleAfter as 'dom' | 'network' | 'page' | undefined) ?? 'page';
        const settleResult = await deps.settle(settleMode, {
          quietMs: typeof step.settleQuietMs === 'number' ? step.settleQuietMs : settleQuietMs,
          timeoutMs,
          intervalMs,
          stableReads: typeof step.stableReads === 'number' ? step.stableReads : stableReads
        });
        submit = {
          ...clickResult,
          ...classifyBrowserExtensionSubmitOutcome(settleResult),
          settle: settleResult
        };
      }

      return {
        emailFill,
        emailCommit,
        passwordFill,
        passwordCommit,
        submit
      };
    }
    case 'clear-selector':
      return deps.browserExtensionService.formClear(sessionId, String(step.selector || ''), {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    case 'field-validation':
      return deps.browserExtensionService.formValidation(sessionId, String(step.selector || ''), {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    case 'auth-login':
      return deps.authLogin({
        email: step.email,
        username: step.username,
        password: step.password,
        frameSelectors: effectiveFrameSelectors,
        selector: step.selector,
        humanLike: step.humanLike,
        delayMs: step.delayMs,
        jitterMs: step.jitterMs,
        skipSubmit: step.skipSubmit,
        waitUrlIncludes: step.waitUrlIncludes,
        waitText: step.waitText,
        waitSelector: step.waitSelector,
        waitNoSelector: step.waitNoSelector,
        timeoutMs: typeof step.timeoutMs === 'number' ? step.timeoutMs : timeoutMs,
        intervalMs: typeof step.intervalMs === 'number' ? step.intervalMs : intervalMs
      });
    case 'click':
      return deps.browserExtensionService.clickByQuery(sessionId, String(step.query || ''), {
        by: 'text',
        selector: preferredFormSelector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    case 'click-selector':
      return deps.browserExtensionService.click(sessionId, String(step.selector || ''), timeoutMs);
    case 'click-human-selector':
      return deps.browserExtensionService.clickHuman(sessionId, String(step.selector || ''), {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    case 'focus-selector':
      return deps.browserExtensionService.focusElement(sessionId, String(step.selector || ''), {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    case 'blur-selector':
      return deps.browserExtensionService.blurElement(sessionId, typeof step.selector === 'string' ? step.selector : undefined, {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    case 'commit-selector':
      return deps.browserExtensionService.formCommit(sessionId, {
        selector: step.selector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    case 'complete-profile': {
      const usernameSelector = String(step.usernameSelector || '');
      const fullNameSelector = String(step.fullNameSelector || '');
      const usernameValue = String(step.usernameValue ?? '');
      const fullNameValue = String(step.fullNameValue ?? '');
      const agreementSelector = typeof step.agreementSelector === 'string' ? step.agreementSelector : undefined;
      const submitSelector = typeof step.submitSelector === 'string' ? step.submitSelector : resolvedSubmitSelector;

      const usernameFill = await deps.browserExtensionService.formFillHuman(sessionId, usernameSelector, usernameValue, {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs,
        delayMs: typeof defaults.delayMs === 'number' ? defaults.delayMs : 35,
        jitterMs: 20
      });
      const usernameCommit = await deps.browserExtensionService.formCommit(sessionId, {
        selector: usernameSelector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
      const fullNameFill = await deps.browserExtensionService.formFillHuman(sessionId, fullNameSelector, fullNameValue, {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs,
        delayMs: typeof defaults.delayMs === 'number' ? defaults.delayMs : 35,
        jitterMs: 20
      });
      const fullNameCommit = await deps.browserExtensionService.formCommit(sessionId, {
        selector: fullNameSelector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });

      let agreement: Record<string, unknown> = { checked: false };
      if (agreementSelector) {
        agreement = await deps.browserExtensionService.clickHuman(sessionId, agreementSelector, {
          frameSelectors: effectiveFrameSelectors,
          timeoutMs
        });
      }

      let submit: Record<string, unknown> = { submitted: false };
      if (submitSelector) {
        const clickResult = await deps.browserExtensionService.clickHuman(sessionId, submitSelector, {
          frameSelectors: effectiveFrameSelectors,
          timeoutMs
        });
        const settleMode = (step.settleAfter as 'dom' | 'network' | 'page' | undefined) ?? 'page';
        const settleResult = await deps.settle(settleMode, {
          quietMs: typeof step.settleQuietMs === 'number' ? step.settleQuietMs : settleQuietMs,
          timeoutMs,
          intervalMs,
          stableReads: typeof step.stableReads === 'number' ? step.stableReads : stableReads
        });
        submit = {
          ...clickResult,
          ...classifyBrowserExtensionSubmitOutcome(settleResult),
          settle: settleResult
        };
      }

      return {
        usernameFill,
        usernameCommit,
        fullNameFill,
        fullNameCommit,
        agreement,
        submit
      };
    }
    case 'radio':
      return deps.browserExtensionService.selectRadioOption(sessionId, String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'segment':
      return deps.browserExtensionService.selectSegmentedOption(sessionId, String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'tab':
      return deps.browserExtensionService.selectTablistOption(sessionId, String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'step':
      return deps.browserExtensionService.moveStepper(sessionId, (step.direction as 'next' | 'previous') ?? 'next', {
        query: step.query,
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'date':
      return deps.browserExtensionService.setTypedFieldByQuery(sessionId, 'form_date_set', String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'time':
      return deps.browserExtensionService.setTypedFieldByQuery(sessionId, 'form_time_set', String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'datetime':
      return deps.browserExtensionService.setTypedFieldByQuery(sessionId, 'form_datetime_set', String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'range':
      return deps.browserExtensionService.setRangeByQuery(sessionId, String(step.query || ''), String(step.value ?? ''), {
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'toggle':
      return deps.browserExtensionService.toggleControl(sessionId, String(step.query || ''), {
        desiredState: step.desiredState,
        frameSelectors: effectiveFrameSelectors,
        exact,
        timeoutMs,
        preferredFormSelector
      });
    case 'submit': {
      const result = await deps.formSubmitAndWait({
        selector: typeof step.selector === 'string' ? step.selector : resolvedSubmitSelector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs,
        intervalMs
      });
      return {
        ...result,
        ...classifyBrowserExtensionSubmitOutcome(result)
      };
    }
    case 'submit-query': {
      const located = await deps.browserExtensionService.locateInPage(sessionId, String(step.query || ''), {
        by: 'text',
        selector: preferredFormSelector,
        frameSelectors: effectiveFrameSelectors,
        limit: 1,
        timeoutMs
      }).catch(() => undefined);
      const selector = Array.isArray((located as { matches?: Array<{ selector?: string }> } | undefined)?.matches)
        ? (located as { matches?: Array<{ selector?: string }> }).matches?.[0]?.selector
        : undefined;
      if (selector) {
        const clickResult = await deps.browserExtensionService.clickHuman(sessionId, selector, {
          frameSelectors: effectiveFrameSelectors,
          timeoutMs
        });
        const settleResult = await deps.settle('page', {
          quietMs: settleQuietMs,
          timeoutMs,
          intervalMs,
          stableReads
        });
        return {
          ...clickResult,
          ...classifyBrowserExtensionSubmitOutcome(settleResult),
          settle: settleResult
        };
      }
      return deps.browserExtensionService.clickByQuery(sessionId, String(step.query || ''), {
        by: 'text',
        selector: preferredFormSelector,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
    }
    case 'wait-field-validation':
      return deps.waitFieldValidation(String(step.selector || ''), {
        state: step.state as 'valid' | 'invalid' | undefined,
        messageIncludes: typeof step.messageIncludes === 'string' ? step.messageIncludes : undefined,
        messageEquals: typeof step.messageEquals === 'string' ? step.messageEquals : undefined,
        frameSelectors: effectiveFrameSelectors,
        timeoutMs: typeof step.timeoutMs === 'number' ? step.timeoutMs : timeoutMs,
        intervalMs: typeof step.intervalMs === 'number' ? step.intervalMs : intervalMs
      });
    case 'assert-field-validation': {
      const validationResult = await deps.browserExtensionService.formValidation(sessionId, String(step.selector || ''), {
        frameSelectors: effectiveFrameSelectors,
        timeoutMs
      });
      const validation = validationResult.validation as Record<string, unknown> | undefined;
      if (!deps.matchesValidation(validation, {
        state: step.state as 'valid' | 'invalid' | undefined,
        messageIncludes: typeof step.messageIncludes === 'string' ? step.messageIncludes : undefined,
        messageEquals: typeof step.messageEquals === 'string' ? step.messageEquals : undefined
      })) {
        throw new Error(`Field validation for "${String(step.selector || '')}" did not match the expected state`);
      }
      return validationResult;
    }
    default:
      return undefined;
  }
}
