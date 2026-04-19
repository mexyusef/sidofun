import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const helpMarkdownPath = path.resolve(moduleDir, 'operator-help.md');

function loadOperatorHelpText(): string {
  try {
    return fs.readFileSync(helpMarkdownPath, 'utf8').trimEnd();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Sidofun Operator CLI\n\nFailed to load help markdown from ${helpMarkdownPath}: ${message}`;
  }
}

export const OPERATOR_HELP_TEXT = loadOperatorHelpText();
