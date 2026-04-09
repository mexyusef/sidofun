/**
 * CMD Templates and Command Builder
 *
 * Provides predefined command templates and a fluent API
 * for building complex CMD commands.
 */

// ==============================
// Command Templates
// ==============================

export const CMD_TEMPLATES = {
  // AI/LLM commands
  qwen: 'qwen -y',
  ollama: (model: string) => `ollama run ${model}`,
  python: (script: string) => `python ${script}`,

  // Git operations
  gitStatus: 'git status',
  gitLog: 'git log --oneline -10',
  gitDiff: 'git diff',
  gitPull: 'git pull',
  gitPush: 'git push',

  // File operations
  dir: 'dir /w',
  dirAll: 'dir /a',
  tree: 'tree /f',
  ls: 'ls -la',
  pwd: 'cd',

  // System
  tasklist: 'tasklist',
  systeminfo: 'systeminfo',
  env: 'set',
  ver: 'ver',

  // Network
  ping: (host: string) => `ping ${host}`,
  ipconfig: 'ipconfig',
  ipconfigAll: 'ipconfig /all',

  // Development
  npmInstall: 'npm install',
  npmStart: 'npm start',
  npmBuild: 'npm run build',
  bunDev: 'bun run dev',
  bunBuild: 'bun run build',

  // Utilities
  cls: 'cls',
  clear: 'cls',
  exit: 'exit'
} as const;

// ==============================
// Command Builder
// ==============================

export class CommandBuilder {
  private parts: string[] = [];

  static create(): CommandBuilder {
    return new CommandBuilder();
  }

  /**
   * Add a command or argument
   */
  add(command: string): this {
    this.parts.push(command);
    return this;
  }

  /**
   * Add a flag (e.g., -f, --force)
   */
  addFlag(flag: string): this {
    this.parts.push(flag);
    return this;
  }

  /**
   * Add a key-value argument (e.g., key=value)
   */
  addArg(key: string, value: string): this {
    this.parts.push(`${key}=${value}`);
    return this;
  }

  /**
   * Add multiple flags
   */
  addFlags(...flags: string[]): this {
    flags.forEach(flag => this.parts.push(flag));
    return this;
  }

  /**
   * Pipe to another command
   */
  pipe(command: string): this {
    this.parts.push('|', command);
    return this;
  }

  /**
   * Redirect output to file
   * @param path File path
   * @param mode '>' for overwrite, '>>' for append
   */
  redirect(path: string, mode: '>' | '>>' = '>'): this {
    this.parts.push(mode, path);
    return this;
  }

  /**
   * Redirect input from file
   */
  redirectInput(path: string): this {
    this.parts.push('<', path);
    return this;
  }

  /**
   * Combine commands (&&)
   */
  and(command: string): this {
    this.parts.push('&&', command);
    return this;
  }

  /**
   * Alternate command (||)
   */
  or(command: string): this {
    this.parts.push('||', command);
    return this;
  }

  /**
   * Run command in background (&)
   */
  background(): this {
    this.parts.push('&');
    return this;
  }

  /**
   * Build the final command string
   */
  build(): string {
    return this.parts.join(' ');
  }

  /**
   * Reset the builder
   */
  reset(): CommandBuilder {
    this.parts = [];
    return this;
  }
}

// ==============================
// Helper Functions
// ==============================

/**
 * Escape a path for CMD (handles spaces and special characters)
 */
export function escapePath(path: string): string {
  return path
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/ /g, '^ ');     // Escape spaces with caret
}

/**
 * Convert Unix path to Windows path
 */
export function unixToWindows(path: string): string {
  return path
    .replace(/^\//, '')       // Remove leading /
    .replace(/\//g, '\\');    // Replace / with \
}

/**
 * Quote a string if it contains spaces
 */
export function quoteIfNeeded(str: string): string {
  if (str.includes(' ')) {
    return `"${str}"`;
  }
  return str;
}

/**
 * Build a chain of commands that stop on first error
 */
export function commandChain(...commands: string[]): string {
  return commands.join(' && ');
}

/**
 * Build a chain of commands that continue on error
 */
export function commandOrChain(...commands: string[]): string {
  return commands.join(' || ');
}

// ==============================
// Common Command Sequences
// ==============================

export const CMD_SEQUENCES = {
  // Navigate and list
  navigateAndList: (dir: string) => CommandBuilder.create()
    .add('cd').add(dir)
    .and('dir')
    .build(),

  // Git pull and status
  updateRepo: CommandBuilder.create()
    .add('git').add('pull')
    .and('git').add('status')
    .and('git').add('log')
    .build(),

  // NPM install and run
  npmInstallAndStart: CommandBuilder.create()
    .add('npm').add('install')
    .and('npm').add('start')
    .build(),

  // Check if command exists and run it
  checkAndRun: (command: string) => CommandBuilder.create()
    .add('where').add(command)
    .pipe('findstr').add('/v').add('/c').add('"[0]"')
    .and(command)
    .build(),

  // Run with error logging
  runWithLog: (command: string, logFile: string) => CommandBuilder.create()
    .add(command)
    .redirect(logFile, '>>')
    .add('2>&1')
    .build()
} as const;
