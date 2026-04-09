export type BrowserExtensionWorkflowSubmitOutcome =
  | 'validation_failed'
  | 'submitted_no_navigation'
  | 'submitted_navigated'
  | 'submitted_async';

export function classifyBrowserExtensionSubmitOutcome(result: Record<string, unknown> | undefined) {
  const timedOut = result?.timedOut === true;
  const matched = result?.matched === true;
  const urlChanged = result?.urlChanged === true;
  const selector = typeof result?.selector === 'string' ? result.selector : undefined;
  const text = typeof result?.text === 'string' ? result.text : undefined;

  let outcome: BrowserExtensionWorkflowSubmitOutcome = 'submitted_no_navigation';
  if (timedOut) {
    outcome = 'validation_failed';
  } else if (urlChanged) {
    outcome = 'submitted_navigated';
  } else if (matched || selector || text) {
    outcome = 'submitted_async';
  }

  return {
    outcome,
    timedOut,
    matched,
    urlChanged,
  };
}

