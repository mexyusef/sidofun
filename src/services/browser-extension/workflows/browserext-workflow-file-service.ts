import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import type {
  BrowserExtensionNormalizedWorkflowFile,
  BrowserExtensionNormalizedWorkflowMetadata,
  BrowserExtensionWorkflowEnvelope,
  BrowserExtensionWorkflowSessionPolicy,
  BrowserExtensionWorkflowSettleMode,
  BrowserExtensionWorkflowTabPolicy,
  BrowserExtensionWorkflowValidationResult
} from './browserext-workflow-types.js';

const SESSION_POLICIES: BrowserExtensionWorkflowSessionPolicy[] = ['reuse', 'create', 'reconnect', 'fail'];
const TAB_POLICIES: BrowserExtensionWorkflowTabPolicy[] = ['reuse-matching', 'focus-active', 'create-new'];
const SETTLE_MODES: BrowserExtensionWorkflowSettleMode[] = ['dom', 'network', 'page'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneRecord(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function isOwnedWorkflowDocument(value: Record<string, unknown>) {
  return [
    'version',
    'name',
    'description',
    'target',
    'sessionPolicy',
    'tabPolicy',
    'settleAfterEach',
    'settleQuietMs',
    'stableReads',
    'artifacts',
    'variables',
    'navigateOnStart'
  ].some((key) => key in value);
}

function deriveLegacyName(filePath: string) {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts[parts.length - 1];
}

export function validateBrowserExtensionWorkflowFile(filePath: string): BrowserExtensionWorkflowValidationResult {
  const resolvedPath = resolvePath(filePath);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(resolvedPath, 'utf8')) as unknown;
  } catch (error) {
    return {
      filePath: resolvedPath,
      valid: false,
      errors: [`Failed to read workflow file: ${String(error)}`],
      warnings: []
    };
  }
  if (!isRecord(parsed)) {
    return {
      filePath: resolvedPath,
      valid: false,
      errors: ['Workflow file must contain a JSON object.'],
      warnings: []
    };
  }
  if (!Array.isArray(parsed.steps)) {
    return {
      filePath: resolvedPath,
      valid: false,
      errors: ['Workflow file must include a top-level "steps" array.'],
      warnings: []
    };
  }

  const errors: string[] = [];
  const warnings: string[] = [];
  const format: BrowserExtensionNormalizedWorkflowMetadata['format'] = isOwnedWorkflowDocument(parsed)
    ? 'owned-workflow'
    : 'legacy-scenario';
  const metadata: BrowserExtensionNormalizedWorkflowMetadata = {
    format,
    name: typeof parsed.name === 'string' ? parsed.name : (format === 'legacy-scenario' ? deriveLegacyName(resolvedPath) : undefined),
    description: typeof parsed.description === 'string' ? parsed.description : undefined,
    continueOnError: parsed.continueOnError === true,
    navigateOnStart: typeof parsed.navigateOnStart === 'boolean' ? parsed.navigateOnStart : undefined
  };

  if ('sessionPolicy' in parsed) {
    if (typeof parsed.sessionPolicy !== 'string' || !SESSION_POLICIES.includes(parsed.sessionPolicy as BrowserExtensionWorkflowSessionPolicy)) {
      errors.push(`Invalid sessionPolicy: ${String(parsed.sessionPolicy)}`);
    } else {
      metadata.sessionPolicy = parsed.sessionPolicy as BrowserExtensionWorkflowSessionPolicy;
    }
  }
  if ('tabPolicy' in parsed) {
    if (typeof parsed.tabPolicy !== 'string' || !TAB_POLICIES.includes(parsed.tabPolicy as BrowserExtensionWorkflowTabPolicy)) {
      errors.push(`Invalid tabPolicy: ${String(parsed.tabPolicy)}`);
    } else {
      metadata.tabPolicy = parsed.tabPolicy as BrowserExtensionWorkflowTabPolicy;
    }
  }
  if ('settleAfterEach' in parsed) {
    if (typeof parsed.settleAfterEach !== 'string' || !SETTLE_MODES.includes(parsed.settleAfterEach as BrowserExtensionWorkflowSettleMode)) {
      errors.push(`Invalid settleAfterEach: ${String(parsed.settleAfterEach)}`);
    } else {
      metadata.settleAfterEach = parsed.settleAfterEach as BrowserExtensionWorkflowSettleMode;
    }
  }
  if ('settleQuietMs' in parsed) {
    if (typeof parsed.settleQuietMs !== 'number' || !Number.isFinite(parsed.settleQuietMs) || parsed.settleQuietMs < 0) {
      errors.push(`Invalid settleQuietMs: ${String(parsed.settleQuietMs)}`);
    } else {
      metadata.settleQuietMs = parsed.settleQuietMs;
    }
  }
  if ('stableReads' in parsed) {
    if (typeof parsed.stableReads !== 'number' || !Number.isFinite(parsed.stableReads) || parsed.stableReads < 1) {
      errors.push(`Invalid stableReads: ${String(parsed.stableReads)}`);
    } else {
      metadata.stableReads = parsed.stableReads;
    }
  }
  if ('target' in parsed) {
    if (!isRecord(parsed.target)) {
      errors.push('target must be an object when provided.');
    } else {
      metadata.target = {
        site: typeof parsed.target.site === 'string' ? parsed.target.site : undefined,
        url: typeof parsed.target.url === 'string' ? parsed.target.url : undefined,
        workspace: typeof parsed.target.workspace === 'string' ? parsed.target.workspace : undefined,
        name: typeof parsed.target.name === 'string' ? parsed.target.name : undefined,
        privateMode: parsed.target.privateMode === true
      };
      if (!metadata.target.site && !metadata.target.url && !metadata.target.workspace && !metadata.target.name && !metadata.target.privateMode) {
        warnings.push('target is present but empty.');
      }
    }
  }
  if ('variables' in parsed) {
    if (!isRecord(parsed.variables)) {
      errors.push('variables must be an object when provided.');
    } else {
      metadata.variables = cloneRecord(parsed.variables);
    }
  }
  if ('artifacts' in parsed) {
    if (!isRecord(parsed.artifacts)) {
      errors.push('artifacts must be an object when provided.');
    } else {
      metadata.artifacts = {
        snapshotOnFailure: parsed.artifacts.snapshotOnFailure === true,
        screenshotOnFailure: parsed.artifacts.screenshotOnFailure === true,
        keepStepResults: parsed.artifacts.keepStepResults === true
      };
    }
  }
  if (format === 'owned-workflow' && !metadata.target?.site && !metadata.target?.url) {
    warnings.push('Owned workflow has no target.site or target.url; a session id will be required at runtime.');
  }
  const invalidStepIndex = parsed.steps.findIndex((step) => !isRecord(step) || typeof step.kind !== 'string');
  if (invalidStepIndex >= 0) {
    errors.push(`Step ${invalidStepIndex} must be an object with a string "kind".`);
  }

  return {
    filePath: resolvedPath,
    valid: errors.length === 0,
    format,
    errors,
    warnings,
    metadata,
    document: parsed as Record<string, unknown> & { steps: unknown[] }
  };
}

export function loadBrowserExtensionWorkflowFile(filePath: string): BrowserExtensionNormalizedWorkflowFile {
  const validation = validateBrowserExtensionWorkflowFile(filePath);
  if (!validation.valid || !validation.document || !validation.metadata) {
    throw new Error(`Invalid browserext workflow file: ${validation.filePath}\n${validation.errors.join('\n')}`);
  }
  return {
    filePath: validation.filePath,
    metadata: validation.metadata,
    document: validation.document
  };
}

export function createOwnedBrowserExtensionWorkflowEnvelope(
  workflow: BrowserExtensionWorkflowEnvelope
): BrowserExtensionNormalizedWorkflowFile {
  return {
    filePath: '__inline_workflow__.json',
    metadata: {
      format: 'owned-workflow',
      name: workflow.name,
      description: workflow.description,
      target: workflow.target,
      sessionPolicy: workflow.sessionPolicy,
      tabPolicy: workflow.tabPolicy,
      continueOnError: workflow.continueOnError,
      navigateOnStart: workflow.navigateOnStart,
      settleAfterEach: workflow.settleAfterEach,
      settleQuietMs: workflow.settleQuietMs,
      stableReads: workflow.stableReads,
      artifacts: workflow.artifacts,
      variables: workflow.variables
    },
    document: workflow as Record<string, unknown> & { steps: unknown[] }
  };
}
