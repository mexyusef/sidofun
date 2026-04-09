import {
  extractBrowserExtensionOutputComparable,
  getBrowserExtensionWorkflowOutput,
  resolveBrowserExtensionOutputPath,
  setBrowserExtensionWorkflowOutput,
} from './browserext-workflow-output.js';
import type { BrowserExtensionWorkflowRuntimeState } from './browserext-workflow-execution-state.js';

type OutputStepDeps = {
  inspect: (selector: string, timeoutMs?: number) => Promise<Record<string, unknown>>;
  snapshot: (timeoutMs?: number) => Promise<Record<string, unknown>>;
  findField: (query: string) => Promise<Record<string, unknown>>;
  listFormValues: () => Promise<Record<string, unknown>>;
  suggestNextActions: () => Promise<Record<string, unknown>>;
  pageState: (timeoutMs?: number) => Promise<Record<string, unknown>>;
  diffPageStates: (baseline: Record<string, unknown> | undefined, current: Record<string, unknown>) => Record<string, unknown>;
  matchesQuery: (value: string | undefined, query: string, exact?: boolean) => boolean;
};

type OutputStepContext = {
  sessionId: string;
  step: Record<string, unknown> & { kind: string };
  defaults: Record<string, unknown>;
  exact?: boolean;
  runtimeState?: BrowserExtensionWorkflowRuntimeState;
};

export async function executeBrowserExtensionWorkflowOutputStep(
  deps: OutputStepDeps,
  context: OutputStepContext
): Promise<Record<string, unknown> | undefined> {
  const { sessionId, step, defaults, exact, runtimeState } = context;
  switch (step.kind) {
    case 'capture-url': {
      const snapshot = await deps.snapshot(defaults.timeoutMs as number | undefined) as { snapshot?: { url?: string } };
      const value = snapshot.snapshot?.url ?? '';
      setBrowserExtensionWorkflowOutput(runtimeState, (step.saveAs as string | undefined) ?? (step.name as string | undefined), value);
      return { sessionId, value, saveAs: (step.saveAs as string | undefined) ?? (step.name as string | undefined), snapshot };
    }
    case 'capture-text': {
      const captureSelector = typeof step.selector === 'string' ? step.selector : undefined;
      const raw = captureSelector
        ? await deps.inspect(captureSelector, defaults.timeoutMs as number | undefined)
        : await deps.snapshot(defaults.timeoutMs as number | undefined);
      const value = captureSelector
        ? ((raw as Record<string, unknown>).textContent ?? (raw as Record<string, unknown>).innerText ?? '')
        : (((raw as { snapshot?: { text?: string } }).snapshot?.text) ?? '');
      const normalized = typeof value === 'string' && typeof step.maxChars === 'number'
        ? value.slice(0, step.maxChars)
        : value;
      setBrowserExtensionWorkflowOutput(runtimeState, (step.saveAs as string | undefined) ?? (step.name as string | undefined), normalized);
      return { sessionId, selector: captureSelector, value: normalized, saveAs: (step.saveAs as string | undefined) ?? (step.name as string | undefined), raw };
    }
    case 'capture-field': {
      const found = await deps.findField(String(step.query || ''));
      const value = (found as { field?: unknown }).field ?? null;
      setBrowserExtensionWorkflowOutput(runtimeState, (step.saveAs as string | undefined) ?? (step.name as string | undefined), value);
      return { sessionId, query: step.query, value, saveAs: (step.saveAs as string | undefined) ?? (step.name as string | undefined) };
    }
    case 'capture-form-values': {
      const values = await deps.listFormValues();
      setBrowserExtensionWorkflowOutput(runtimeState, (step.saveAs as string | undefined) ?? (step.name as string | undefined), values);
      return { sessionId, value: values, saveAs: (step.saveAs as string | undefined) ?? (step.name as string | undefined) };
    }
    case 'capture-next-action': {
      const suggestions = await deps.suggestNextActions();
      const matched = ((suggestions as { suggestions?: Array<{ query?: string }> }).suggestions ?? []).find((entry) =>
        deps.matchesQuery(entry.query, String(step.query || ''), exact === true)
      ) ?? null;
      setBrowserExtensionWorkflowOutput(runtimeState, (step.saveAs as string | undefined) ?? (step.name as string | undefined), matched);
      return { sessionId, query: step.query, value: matched, saveAs: (step.saveAs as string | undefined) ?? (step.name as string | undefined), suggestions: (suggestions as { suggestions?: unknown[] }).suggestions };
    }
    case 'extract-output': {
      const source = getBrowserExtensionWorkflowOutput(runtimeState, String(step.output || ''));
      const value = resolveBrowserExtensionOutputPath(source, String(step.path || ''));
      setBrowserExtensionWorkflowOutput(runtimeState, (step.saveAs as string | undefined) ?? (step.name as string | undefined), value);
      return { sessionId, output: step.output, path: step.path, value, comparable: extractBrowserExtensionOutputComparable(value), saveAs: (step.saveAs as string | undefined) ?? (step.name as string | undefined) };
    }
    case 'assert-output': {
      const current = getBrowserExtensionWorkflowOutput(runtimeState, String(step.output || ''));
      const comparable = extractBrowserExtensionOutputComparable(current);
      if (step.exists === true && current === undefined) {
        throw new Error(`Required workflow output "${String(step.output || '')}" does not exist`);
      }
      if (step.exists === false && current !== undefined) {
        throw new Error(`Forbidden workflow output "${String(step.output || '')}" exists`);
      }
      if (step.equals !== undefined && comparable !== step.equals) {
        throw new Error(`Workflow output "${String(step.output || '')}" did not equal "${String(step.equals)}"`);
      }
      if (step.includes !== undefined && !comparable.includes(String(step.includes))) {
        throw new Error(`Workflow output "${String(step.output || '')}" did not include "${String(step.includes)}"`);
      }
      return { sessionId, output: step.output, current, comparable, equals: step.equals, includes: step.includes, exists: step.exists };
    }
    case 'assert-output-path': {
      const source = getBrowserExtensionWorkflowOutput(runtimeState, String(step.output || ''));
      const current = resolveBrowserExtensionOutputPath(source, String(step.path || ''));
      const comparable = extractBrowserExtensionOutputComparable(current);
      if (step.exists === true && current === undefined) {
        throw new Error(`Required workflow output path "${String(step.output || '')}.${String(step.path || '')}" does not exist`);
      }
      if (step.exists === false && current !== undefined) {
        throw new Error(`Forbidden workflow output path "${String(step.output || '')}.${String(step.path || '')}" exists`);
      }
      if (step.equals !== undefined && comparable !== step.equals) {
        throw new Error(`Workflow output path "${String(step.output || '')}.${String(step.path || '')}" did not equal "${String(step.equals)}"`);
      }
      if (step.includes !== undefined && !comparable.includes(String(step.includes))) {
        throw new Error(`Workflow output path "${String(step.output || '')}.${String(step.path || '')}" did not include "${String(step.includes)}"`);
      }
      return { sessionId, output: step.output, path: step.path, current, comparable, equals: step.equals, includes: step.includes, exists: step.exists };
    }
    case 'assert-field-value': {
      const values = await deps.listFormValues();
      const entries = ((values as { entries?: Array<Record<string, unknown>> }).entries ?? []);
      const entry = entries.find((field) =>
        deps.matchesQuery(typeof field.name === 'string' ? field.name : undefined, String(step.query || ''), exact === true)
        || deps.matchesQuery(typeof field.selector === 'string' ? field.selector : undefined, String(step.query || ''), exact === true)
        || ((field.labels as unknown[] | undefined) ?? []).some((label) => deps.matchesQuery(typeof label === 'string' ? label : undefined, String(step.query || ''), exact === true))
      );
      const comparable = extractBrowserExtensionOutputComparable((entry?.type === 'checkbox' || entry?.type === 'radio') ? Boolean(entry?.checked) : entry?.value);
      if (step.exists === true && !entry) {
        throw new Error(`Required field value "${String(step.query || '')}" does not exist`);
      }
      if (step.exists === false && entry) {
        throw new Error(`Forbidden field value "${String(step.query || '')}" exists`);
      }
      if (step.equals !== undefined && comparable !== step.equals) {
        throw new Error(`Field "${String(step.query || '')}" did not equal "${String(step.equals)}"`);
      }
      if (step.includes !== undefined && !comparable.includes(String(step.includes))) {
        throw new Error(`Field "${String(step.query || '')}" did not include "${String(step.includes)}"`);
      }
      return { sessionId, query: step.query, entry, comparable, equals: step.equals, includes: step.includes, exists: step.exists, values };
    }
    case 'state-diff': {
      const current = await deps.pageState(defaults.timeoutMs as number | undefined);
      const baseline = step.against
        ? getBrowserExtensionWorkflowOutput(runtimeState, String(step.against)) as Record<string, unknown> | undefined
        : runtimeState?.lastPageState;
      const diff = deps.diffPageStates(baseline, current);
      setBrowserExtensionWorkflowOutput(runtimeState, (step.saveAs as string | undefined) ?? (step.name as string | undefined), diff);
      if (runtimeState) {
        runtimeState.lastPageState = current;
      }
      return { sessionId, against: step.against, saveAs: (step.saveAs as string | undefined) ?? (step.name as string | undefined), diff };
    }
    default:
      return undefined;
  }
}
