import { describe, expect, test } from 'bun:test';
import {
  automationActionValues,
  browserAutomationActionValues,
  cmdActionValues,
  desktopActionValues
} from '../src/core/command-schemas.js';

describe('command schemas', () => {
  test('automation actions include desktop and browser actions without duplicates', () => {
    const all = [...automationActionValues];
    const unique = new Set(all);

    expect(all.length).toBe(unique.size);
    for (const action of desktopActionValues) {
      expect(unique.has(action)).toBe(true);
    }
    for (const action of browserAutomationActionValues) {
      expect(unique.has(action)).toBe(true);
    }
  });

  test('cmd actions expose expected shared terminal capabilities', () => {
    expect(cmdActionValues).toContain('spawn');
    expect(cmdActionValues).toContain('exec');
    expect(cmdActionValues).toContain('type');
    expect(cmdActionValues).toContain('screenshot');
    expect(cmdActionValues).toContain('new_tab');
    expect(cmdActionValues).toContain('pane_right');
  });
});
