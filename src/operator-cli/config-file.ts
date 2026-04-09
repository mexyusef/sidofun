import fs from 'node:fs';
import path from 'node:path';
import { SIDOFUN_APP_DIR, SIDOFUN_CONFIG_FILE } from '../config/constants.js';

function writeJsonAtomic(targetPath: string, value: Record<string, unknown>): void {
  const tempPath = `${targetPath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  try {
    fs.renameSync(tempPath, targetPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EPERM') {
      fs.rmSync(tempPath, { force: true });
      throw error;
    }
    fs.copyFileSync(tempPath, targetPath);
    fs.rmSync(tempPath, { force: true });
  }
}

export function readOperatorConfig(): Record<string, unknown> {
  if (!fs.existsSync(SIDOFUN_CONFIG_FILE)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(SIDOFUN_CONFIG_FILE, 'utf8')) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function writeOperatorConfig(config: Record<string, unknown>): void {
  fs.mkdirSync(SIDOFUN_APP_DIR, { recursive: true });
  writeJsonAtomic(SIDOFUN_CONFIG_FILE, config);
}

export function setOperatorConfigValue(key: string, value: string): Record<string, unknown> {
  const config = readOperatorConfig();
  config[key] = value;
  writeOperatorConfig(config);
  return config;
}

export function getOperatorConfigValue(key?: string): unknown {
  const config = readOperatorConfig();
  if (!key) {
    return config;
  }
  return config[key];
}

export function getOperatorConfigPath(): string {
  return path.resolve(SIDOFUN_CONFIG_FILE);
}
