export type LocalCoderAppId = 'codex' | 'opencode' | 'qwen';

export interface LocalCoderAppDefinition {
  id: LocalCoderAppId;
  displayName: string;
  workingDirectory: string;
  executablePath: string;
  processName: string;
  runMode: 'codex-exec' | 'opencode-run' | 'qwen-prompt';
  openSubmit: 'enter' | 'shift-enter' | 'double-enter';
}

export interface LocalCoderAppStatus {
  id: LocalCoderAppId;
  displayName: string;
  installed: boolean;
  executablePath: string;
  workingDirectory: string;
  processName: string;
  running: boolean;
  focused: boolean;
  pid?: number;
  window?: {
    handle: number;
    title: string;
    rect: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

export interface LocalCoderRunOptions {
  prompt: string;
  workingDirectory?: string;
  timeoutMs?: number;
}

export interface LocalCoderOpenOptions {
  workingDirectory?: string;
  initialPrompt?: string;
  inputDelayMs?: number;
  submit?: boolean;
}

export interface LocalCoderRunResult {
  id: LocalCoderAppId;
  displayName: string;
  executablePath: string;
  workingDirectory: string;
  prompt: string;
  exitCode: number;
  success: boolean;
  summary: string;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  command: string[];
}
