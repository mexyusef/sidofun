import type { BrowserExtensionWorkflowRuntimeState } from './browserext-workflow-execution-state.js';

export function ensureBrowserExtensionWorkflowOutputs(runtimeState?: BrowserExtensionWorkflowRuntimeState) {
  if (!runtimeState) {
    return undefined;
  }
  runtimeState.outputs ??= {};
  return runtimeState.outputs;
}

export function getBrowserExtensionWorkflowOutput(
  runtimeState: BrowserExtensionWorkflowRuntimeState | undefined,
  key: string
) {
  return runtimeState?.outputs?.[key];
}

export function resolveBrowserExtensionOutputPath(value: unknown, path: string): unknown {
  const segments = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
  let current = value;
  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (Number.isNaN(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[segment];
      continue;
    }
    return undefined;
  }
  return current;
}

export function getBrowserExtensionWorkflowReference(
  runtimeState: BrowserExtensionWorkflowRuntimeState | undefined,
  reference: string
) {
  const direct = getBrowserExtensionWorkflowOutput(runtimeState, reference);
  if (direct !== undefined) {
    return direct;
  }
  const trimmed = reference.trim();
  const bracketIndex = trimmed.indexOf('[');
  const dotIndex = trimmed.indexOf('.');
  let splitIndex = -1;
  if (bracketIndex >= 0 && dotIndex >= 0) {
    splitIndex = Math.min(bracketIndex, dotIndex);
  } else {
    splitIndex = Math.max(bracketIndex, dotIndex);
  }
  if (splitIndex <= 0) {
    return direct;
  }
  const outputName = trimmed.slice(0, splitIndex);
  const path = trimmed.slice(splitIndex + (trimmed[splitIndex] === '.' ? 1 : 0));
  const source = getBrowserExtensionWorkflowOutput(runtimeState, outputName);
  if (source === undefined) {
    return undefined;
  }
  return trimmed[splitIndex] === '['
    ? resolveBrowserExtensionOutputPath(source, trimmed.slice(splitIndex))
    : resolveBrowserExtensionOutputPath(source, path);
}

export function setBrowserExtensionWorkflowOutput(
  runtimeState: BrowserExtensionWorkflowRuntimeState | undefined,
  key: string | undefined,
  value: unknown
) {
  if (!key || !runtimeState) {
    return;
  }
  const outputs = ensureBrowserExtensionWorkflowOutputs(runtimeState);
  if (outputs) {
    outputs[key] = value;
  }
}

export function extractBrowserExtensionOutputComparable(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return JSON.stringify(value);
}

export function transformBrowserExtensionWorkflowValue(value: unknown, transform: string): unknown {
  const comparable = extractBrowserExtensionOutputComparable(value);
  switch (transform) {
    case 'trim':
      return comparable.trim();
    case 'lower':
      return comparable.toLowerCase();
    case 'upper':
      return comparable.toUpperCase();
    case 'email_local':
      return comparable.split('@')[0] ?? '';
    case 'username_from_email': {
      const local = comparable.split('@')[0] ?? '';
      return local.replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
    }
    case 'full_name_from_email': {
      const local = comparable.split('@')[0] ?? '';
      const cleaned = local
        .replace(/[._+\-]+/g, ' ')
        .replace(/[^a-zA-Z0-9 ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleaned) {
        return '';
      }
      return cleaned
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
    }
    default:
      return value;
  }
}

export function interpolateBrowserExtensionWorkflowValue(
  value: unknown,
  runtimeState?: BrowserExtensionWorkflowRuntimeState
): unknown {
  if (typeof value === 'string') {
    return value.replace(/\{\{([^}]+)\}\}/g, (_match, rawName: string) => {
      const expression = rawName.trim();
      const [reference, ...transforms] = expression.split('|').map((entry) => entry.trim()).filter(Boolean);
      const resolved = getBrowserExtensionWorkflowReference(runtimeState, reference);
      const transformed = transforms.reduce<unknown>((current, transform) => transformBrowserExtensionWorkflowValue(current, transform), resolved);
      return extractBrowserExtensionOutputComparable(transformed);
    });
  }
  if (Array.isArray(value)) {
    return value.map((entry) => interpolateBrowserExtensionWorkflowValue(entry, runtimeState));
  }
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (['kind', 'saveAs', 'output', 'path'].includes(key)) {
        output[key] = entry;
        continue;
      }
      output[key] = interpolateBrowserExtensionWorkflowValue(entry, runtimeState);
    }
    return output;
  }
  return value;
}
