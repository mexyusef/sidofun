import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Global Configuration Constants
 *
 * Centralized configuration for the desktop automation server.
 */

// ==================== Paths ====================

/**
 * Path to the libnut-core native module.
 * Override with LIBNUT_PATH environment variable.
 */
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const LIBNUT_PATH_CANDIDATES = [
  path.resolve(CURRENT_DIR, 'libnut-core-build-release', 'libnut.node'),
  path.resolve(CURRENT_DIR, '..', 'libnut-core-build-release', 'libnut.node'),
  path.resolve(CURRENT_DIR, '..', '..', 'libnut-core-build-release', 'libnut.node'),
  path.resolve(CURRENT_DIR, '..', '..', '..', 'libnut-core-build-release', 'libnut.node'),
];

function resolveLibnutPath(): string {
  if (process.env.LIBNUT_PATH) {
    return process.env.LIBNUT_PATH;
  }

  const existing = LIBNUT_PATH_CANDIDATES.find(candidate => fs.existsSync(candidate));
  return existing || LIBNUT_PATH_CANDIDATES[LIBNUT_PATH_CANDIDATES.length - 1];
}

export const LIBNUT_PATH = resolveLibnutPath();

// ==================== Server ====================

/**
 * Default port for the HTTP/WebSocket server
 */
export const DEFAULT_PORT = 9995;
export const OPERATOR_DAEMON_PORT = 9916;
export const SIDOFUN_DAEMON_PIPE = '\\\\.\\pipe\\sidofun-operator';

/**
 * CORS origins allowed for the HTTP server
 */
export const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://localhost:5177',
  'http://localhost:5178',
  'http://localhost:5179',
];

/**
 * Heartbeat interval for WebSocket connections (milliseconds)
 */
export const HEARTBEAT_INTERVAL = 30000;

// ==================== Coordinate Normalization ====================

function parsePositiveIntegerEnv(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

export interface NormalizedScreenConfig {
  width: number;
  height: number;
}

const NORMALIZED_SCREEN_WIDTH = parsePositiveIntegerEnv(process.env.SIDOFUN_TARGET_WIDTH);
const NORMALIZED_SCREEN_HEIGHT = parsePositiveIntegerEnv(process.env.SIDOFUN_TARGET_HEIGHT);

export const NORMALIZED_SCREEN_CONFIG = NORMALIZED_SCREEN_WIDTH && NORMALIZED_SCREEN_HEIGHT
  ? {
      width: NORMALIZED_SCREEN_WIDTH,
      height: NORMALIZED_SCREEN_HEIGHT
    }
  : undefined;

// ==================== Trajectory Logging ====================

/**
 * Optional directory for structured trajectory logs.
 * Enable with SIDOFUN_TRACE_DIR=/path/to/traces
 */
export const SIDOFUN_TRACE_DIR = process.env.SIDOFUN_TRACE_DIR
  ? path.resolve(process.env.SIDOFUN_TRACE_DIR)
  : undefined;

const LOCAL_APPDATA_DIR = process.env.LOCALAPPDATA || process.env.APPDATA || path.join(process.env.USERPROFILE || process.cwd(), 'AppData', 'Local');
export const SIDOFUN_APP_DIR = path.join(LOCAL_APPDATA_DIR, 'Sidofun');
export const SIDOFUN_STATE_FILE = path.join(SIDOFUN_APP_DIR, 'state.json');
export const SIDOFUN_CONFIG_FILE = path.join(SIDOFUN_APP_DIR, 'config.json');
export const OPENCLI_RS_REPO_DIR = path.join(process.cwd(), 'opencli-rs');
export const OPENCLI_RS_CARGO_MANIFEST = path.join(OPENCLI_RS_REPO_DIR, 'Cargo.toml');
export const OPENCLI_RS_EXTENSION_DIR = path.join(OPENCLI_RS_REPO_DIR, 'extension');

export const LOCAL_CODER_APPS = {
  codex: {
    id: 'codex',
    displayName: 'Codex',
    workingDirectory: 'C:\\github-sido\\kerjaan\\teleprompter\\coders\\codex',
    executablePath: 'C:\\github-sido\\kerjaan\\teleprompter\\coders\\codex\\codex-rs\\target\\release\\codex.exe',
    processName: 'codex',
    runMode: 'codex-exec',
    openSubmit: 'enter'
  },
  opencode: {
    id: 'opencode',
    displayName: 'OpenCode',
    workingDirectory: 'C:\\github-sido\\kerjaan\\teleprompter\\coders\\opencode',
    executablePath: 'C:\\github-sido\\kerjaan\\teleprompter\\coders\\opencode\\packages\\opencode\\dist\\opencode-windows-x64\\bin\\opencode.exe',
    processName: 'opencode',
    runMode: 'opencode-run',
    openSubmit: 'enter'
  },
  qwen: {
    id: 'qwen',
    displayName: 'Qwen Code',
    workingDirectory: 'C:\\github-sido\\kerjaan\\teleprompter\\coders\\qwen-code',
    executablePath: 'C:\\github-sido\\kerjaan\\teleprompter\\coders\\qwen-code\\dist-exe\\qwen-windows-x64\\qwen.exe',
    processName: 'qwen',
    runMode: 'qwen-prompt',
    openSubmit: 'enter'
  }
} as const;

// ==================== Timing ====================

/**
 * Default delay for CMD spawn (milliseconds)
 */
export const CMD_SPAWN_DELAY = 3000;

/**
 * Delay for CMD spawn retry (milliseconds)
 */
export const CMD_SPAWN_RETRY_DELAY = 2000;

/**
 * Maximum CMD spawn retry attempts
 */
export const CMD_SPAWN_MAX_RETRIES = 5;

/**
 * Delay after key press (milliseconds)
 */
export const KEY_PRESS_DELAY = 50;

/**
 * Delay after scroll step (milliseconds)
 */
export const SCROLL_STEP_DELAY = 50;

// ==================== Screenshot ====================

/**
 * Default screenshot format
 */
export const DEFAULT_SCREENSHOT_FORMAT = 'png';

/**
 * Default screenshot filename pattern
 */
export const DEFAULT_SCREENSHOT_FILENAME = 'screenshot-{timestamp}.{format}';

/**
 * DPI scaling options for screenshots
 */
export const DPI_SCALE_OPTIONS = ['auto', '1.0', '1.25', '1.5', '1.75', '2.0', '2.5', '3.0'] as const;

export type DpiScaleOption = typeof DPI_SCALE_OPTIONS[number];

// ==================== Window ====================

/**
 * Win32 ShowWindow commands
 */
export const SHOW_WINDOW = {
  SW_HIDE: 0,
  SW_NORMAL: 1,
  SW_SHOWMINIMIZED: 2,
  SW_MAXIMIZE: 3,
  SW_SHOWNOACTIVATE: 4,
  SW_SHOW: 5,
  SW_MINIMIZE: 6,
  SW_SHOWMINNOACTIVE: 7,
  SW_SHOWNA: 8,
  SW_RESTORE: 9,
  SW_SHOWDEFAULT: 10,
  SW_FORCEMINIMIZE: 11,
} as const;

/**
 * Default window title prefix for automation windows
 */
export const AUTOMATION_TITLE_PREFIX = 'Sidofun_';

// ==================== Mouse ====================

/**
 * Default mouse button
 */
export const DEFAULT_MOUSE_BUTTON = 'left';

/**
 * Mouse button options
 */
export const MOUSE_BUTTONS = ['left', 'right', 'middle'] as const;

export type MouseButton = typeof MOUSE_BUTTONS[number];

/**
 * Scroll direction options
 */
export const SCROLL_DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

export type ScrollDirection = typeof SCROLL_DIRECTIONS[number];

/**
 * Default scroll amount per tick
 */
export const DEFAULT_SCROLL_AMOUNT = 3;

// ==================== Keyboard ====================

/**
 * Key toggle direction options
 */
export const KEY_TOGGLE_DIRECTIONS = ['up', 'down'] as const;

export type KeyToggleDirection = typeof KEY_TOGGLE_DIRECTIONS[number];

/**
 * Modifier keys
 */
export const MODIFIER_KEYS = ['control', 'shift', 'alt', 'win', 'meta'] as const;

export type ModifierKey = typeof MODIFIER_KEYS[number];

/**
 * Common key names
 */
export const COMMON_KEYS = [
  // Letters
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  // Numbers
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  // Special
  'enter', 'return', 'tab', 'escape', 'esc', 'space',
  'backspace', 'delete', 'del', 'insert',
  'home', 'end', 'pageup', 'pagedown',
  // Arrow keys
  'up', 'down', 'left', 'right',
  // Function keys
  'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10', 'f11', 'f12',
  // Symbols
  '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/', '`',
] as const;

export type CommonKey = typeof COMMON_KEYS[number];
