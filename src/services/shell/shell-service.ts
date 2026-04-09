import fs from 'node:fs';

export type ShellKind = 'cmd' | 'pwsh';

export interface ShellRunOptions {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
  shell?: ShellKind;
}

export interface ShellRunResult {
  shell: ShellKind;
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
  timedOut: boolean;
  durationMs: number;
  argv: string[];
}

function resolvePwshExecutable(): string {
  const candidates = [
    'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
    'C:\\Program Files\\PowerShell\\6\\pwsh.exe',
    'pwsh.exe',
    'powershell.exe'
  ];

  for (const candidate of candidates) {
    if (candidate.includes('\\')) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      continue;
    }

    return candidate;
  }

  return 'powershell.exe';
}

export class ShellService {
  async run(options: ShellRunOptions): Promise<ShellRunResult> {
    const startedAt = Date.now();
    const shell = options.shell ?? 'pwsh';
    const cwd = options.cwd ?? process.cwd();
    const timeoutMs = options.timeoutMs ?? 60000;
    const argv = this.buildCommand(shell, options.command);
    const env = {
      ...process.env,
      ...(options.env ?? {})
    };

    const subprocess = Bun.spawn(argv, {
      cwd,
      env,
      stdout: 'pipe',
      stderr: 'pipe'
    });

    let timedOut = false;
    const killTimer = setTimeout(() => {
      timedOut = true;
      try {
        subprocess.kill();
      } catch {
        // ignored
      }
    }, timeoutMs);

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(subprocess.stdout).text(),
      new Response(subprocess.stderr).text(),
      subprocess.exited
    ]);

    clearTimeout(killTimer);

    return {
      shell,
      command: options.command,
      cwd,
      stdout,
      stderr,
      exitCode,
      success: exitCode === 0 && !timedOut,
      timedOut,
      durationMs: Date.now() - startedAt,
      argv
    };
  }

  private buildCommand(shell: ShellKind, command: string): string[] {
    if (shell === 'cmd') {
      return ['cmd.exe', '/d', '/s', '/c', command];
    }

    return [
      resolvePwshExecutable(),
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      command
    ];
  }
}
