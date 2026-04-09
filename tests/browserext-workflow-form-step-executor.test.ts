import { describe, expect, test } from 'bun:test';
import { executeBrowserExtensionWorkflowFormStep } from '../src/services/browser-extension/workflows/browserext-workflow-form-step-executor.js';

describe('browserext workflow form step executor', () => {
  test('handles fill-selector with inspection fallback', async () => {
    const result = await executeBrowserExtensionWorkflowFormStep({
      inspect: async () => ({ value: 'filled@example.com' }),
      authLogin: async () => ({ ok: true }),
      formSubmitAndWait: async () => ({ submitted: true }),
      settle: async () => ({ settled: true }),
      waitFieldValidation: async () => ({ matched: true }),
      matchesValidation: () => true,
      browserExtensionService: {
        fillFormFieldByQuery: async () => ({ filled: true }),
        formFillHuman: async () => ({ filled: false, field: {} }),
        formClear: async () => ({ cleared: true }),
        formValidation: async () => ({ validation: { valid: true } }),
        clickByQuery: async () => ({ clicked: true }),
        click: async () => ({ clicked: true }),
        clickHuman: async () => ({ clicked: true }),
        focusElement: async () => ({ focused: true }),
        blurElement: async () => ({ blurred: true }),
        formCommit: async () => ({ committed: true }),
        selectRadioOption: async () => ({ selected: true }),
        selectSegmentedOption: async () => ({ selected: true }),
        selectTablistOption: async () => ({ selected: true }),
        moveStepper: async () => ({ moved: true }),
        setTypedFieldByQuery: async () => ({ filled: true }),
        setRangeByQuery: async () => ({ filled: true }),
        toggleControl: async () => ({ changed: true }),
        locateInPage: async () => ({ matches: [] })
      }
    }, {
      sessionId: 'session_1',
      step: {
        kind: 'fill-selector',
        selector: 'input[name="email"]',
        value: 'filled@example.com'
      },
      defaults: {
        timeoutMs: 2000
      }
    });

    expect(result?.filled).toBe(true);
    expect((result?.field as Record<string, unknown>)?.humanLike).toBe(true);
  });

  test('handles submit-query with located selector and settle classification', async () => {
    const result = await executeBrowserExtensionWorkflowFormStep({
      inspect: async () => undefined,
      authLogin: async () => ({ ok: true }),
      formSubmitAndWait: async () => ({ submitted: true }),
      settle: async () => ({ changed: true, stable: true }),
      waitFieldValidation: async () => ({ matched: true }),
      matchesValidation: () => true,
      browserExtensionService: {
        fillFormFieldByQuery: async () => ({ filled: true }),
        formFillHuman: async () => ({ filled: true }),
        formClear: async () => ({ cleared: true }),
        formValidation: async () => ({ validation: { valid: true } }),
        clickByQuery: async () => ({ clicked: true }),
        click: async () => ({ clicked: true }),
        clickHuman: async () => ({ clicked: true }),
        focusElement: async () => ({ focused: true }),
        blurElement: async () => ({ blurred: true }),
        formCommit: async () => ({ committed: true }),
        selectRadioOption: async () => ({ selected: true }),
        selectSegmentedOption: async () => ({ selected: true }),
        selectTablistOption: async () => ({ selected: true }),
        moveStepper: async () => ({ moved: true }),
        setTypedFieldByQuery: async () => ({ filled: true }),
        setRangeByQuery: async () => ({ filled: true }),
        toggleControl: async () => ({ changed: true }),
        locateInPage: async () => ({ matches: [{ selector: 'button.next' }] })
      }
    }, {
      sessionId: 'session_1',
      step: {
        kind: 'submit-query',
        query: 'Next'
      },
      defaults: {
        timeoutMs: 2000,
        intervalMs: 200,
        settleQuietMs: 300,
        stableReads: 2
      }
    });

    expect(result?.outcome).toBeDefined();
    expect((result?.settle as Record<string, unknown>)?.stable).toBe(true);
  });
});
