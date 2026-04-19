import fs from 'node:fs';
import path from 'node:path';
import { SIDOFUN_APP_DIR } from '../../config/constants.js';
import type { BrowserPageProfile } from './browser-page-profile-service.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isProfileStep(value: unknown): boolean {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false;
  }
  if (value.kind === 'fill') {
    return typeof value.query === 'string' && typeof value.valueFrom === 'string';
  }
  if (value.kind === 'click') {
    return typeof value.query === 'string';
  }
  if (value.kind === 'submit') {
    return value.query === undefined || typeof value.query === 'string';
  }
  if (value.kind === 'wait-text') {
    return typeof value.text === 'string';
  }
  if (value.kind === 'wait-url') {
    return typeof value.includes === 'string';
  }
  return false;
}

function isProfile(value: unknown): value is BrowserPageProfile {
  if (!isRecord(value)) {
    return false;
  }
  const loginSteps = value.login && isRecord(value.login) ? value.login.steps : undefined;
  const signupSteps = value.signup && isRecord(value.signup) ? value.signup.steps : undefined;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.description === 'string' &&
    typeof value.defaultUrl === 'string' &&
    (loginSteps === undefined || (Array.isArray(loginSteps) && loginSteps.every(isProfileStep))) &&
    (signupSteps === undefined || (Array.isArray(signupSteps) && signupSteps.every(isProfileStep)))
  );
}

export function resolveBrowserPageProfileFile(explicitPath?: string): string | undefined {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }
  const candidates = [
    path.resolve(process.cwd(), 'browser-page-profiles.json'),
    path.resolve(SIDOFUN_APP_DIR, 'browser-page-profiles.json')
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

export function loadBrowserPageProfilesFromFile(filePath: string): BrowserPageProfile[] {
  const resolvedPath = path.resolve(filePath);
  const parsed = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as unknown;
  const profiles = Array.isArray(parsed)
    ? parsed
    : (isRecord(parsed) && Array.isArray(parsed.profiles) ? parsed.profiles : null);

  if (!profiles) {
    throw new Error(`Browser page profile file must be a JSON array or an object with a "profiles" array: ${resolvedPath}`);
  }

  const invalidIndex = profiles.findIndex((profile) => !isProfile(profile));
  if (invalidIndex >= 0) {
    throw new Error(`Invalid browser page profile at index ${invalidIndex} in ${resolvedPath}`);
  }

  return profiles;
}
