import { describe, expect, test } from 'bun:test';
import {
  extractBrowserExtensionOutputComparable,
  getBrowserExtensionWorkflowReference,
  interpolateBrowserExtensionWorkflowValue,
  setBrowserExtensionWorkflowOutput
} from '../src/services/browser-extension/workflows/browserext-workflow-output.js';
import type { BrowserExtensionWorkflowRuntimeState } from '../src/services/browser-extension/workflows/browserext-workflow-execution-state.js';

describe('browserext workflow output', () => {
  test('resolves dotted and indexed references', () => {
    const runtimeState: BrowserExtensionWorkflowRuntimeState = {
      outputs: {
        profile: {
          user: {
            email: 'gaia.dragging219@silomails.com'
          }
        },
        rows: [{ id: 1 }, { id: 2 }]
      }
    };
    expect(getBrowserExtensionWorkflowReference(runtimeState, 'profile.user.email')).toBe('gaia.dragging219@silomails.com');
    expect(getBrowserExtensionWorkflowReference(runtimeState, 'rows[1].id')).toBe(2);
  });

  test('interpolates workflow transforms for signup-style fields', () => {
    const runtimeState: BrowserExtensionWorkflowRuntimeState = { outputs: {} };
    setBrowserExtensionWorkflowOutput(runtimeState, 'email', 'gaia.dragging219@silomails.com');
    expect(interpolateBrowserExtensionWorkflowValue('{{email|username_from_email}}', runtimeState)).toBe('gaiadragging219');
    expect(interpolateBrowserExtensionWorkflowValue('{{email|full_name_from_email}}', runtimeState)).toBe('Gaia Dragging219');
    expect(extractBrowserExtensionOutputComparable({ ok: true })).toContain('"ok":true');
  });
});
