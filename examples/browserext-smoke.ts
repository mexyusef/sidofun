import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';

type StepStatus = 'passed' | 'failed' | 'skipped';
type SuiteStatus = 'passed' | 'failed' | 'skipped';

type StepResult = {
  name: string;
  command: string;
  status: StepStatus;
  durationMs: number;
  output?: unknown;
  error?: string;
};

type SuiteResult = {
  name: string;
  status: SuiteStatus;
  durationMs: number;
  sessionId?: string;
  steps: StepResult[];
};

type RunnerContext = {
  cliPrefix: string[];
  timeoutMs: number;
  intervalMs: number;
  outputDir: string;
  suites: Set<string>;
  includeX: boolean;
  urls: {
    generic: string;
    forms: string;
    chatgpt: string;
    deepseek: string;
  };
};

type ProviderStatus = {
  providerConnected?: boolean;
  expectedBuildId?: string;
  activeProviderBuildId?: string;
};

function getEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseSuites(): Set<string> {
  const raw = process.env.SIDOFUN_BROWSEREXT_SUITES?.trim();
  if (!raw) {
    return new Set(['provider', 'generic', 'forms', 'chatgpt', 'deepseek']);
  }
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function commandString(parts: string[]): string {
  return parts.map((part) => (part.includes(' ') ? `"${part}"` : part)).join(' ');
}

function extractJsonPayload(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const candidateStarts: number[] = [];
  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if ((char === '{' || char === '[') && (index === 0 || trimmed[index - 1] === '\n')) {
      candidateStarts.push(index);
    }
  }
  for (let index = candidateStarts.length - 1; index >= 0; index -= 1) {
    const candidate = trimmed.slice(candidateStarts[index]).trim();
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}

function tryParseJson(text: string): unknown {
  const payload = extractJsonPayload(text);
  if (!payload) {
    const trimmed = text.trim();
    return trimmed || undefined;
  }
  try {
    return JSON.parse(payload);
  } catch {
    return payload;
  }
}

async function runCliJson(context: RunnerContext, args: string[]): Promise<{ output: unknown; durationMs: number; command: string }> {
  const fullArgs = [...context.cliPrefix, ...args, '--json'];
  const start = performance.now();
  const proc = Bun.spawn({
    cmd: fullArgs,
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore'
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ]);
  const durationMs = Math.round(performance.now() - start);
  const command = commandString(fullArgs);
  if (exitCode !== 0) {
    const stderrText = stderr.trim();
    const stdoutText = stdout.trim();
    throw new Error(
      [
        `command failed: ${command}`,
        stderrText ? `stderr: ${stderrText}` : undefined,
        stdoutText ? `stdout: ${stdoutText}` : undefined
      ]
        .filter(Boolean)
        .join('\n')
    );
  }
  return {
    output: tryParseJson(stdout),
    durationMs,
    command
  };
}

function extractSessionId(output: unknown): string | undefined {
  if (!output || typeof output !== 'object') return undefined;
  const record = output as Record<string, unknown>;
  const directId = typeof record.id === 'string' ? record.id : undefined;
  if (directId) return directId;
  const session = record.session;
  if (session && typeof session === 'object' && typeof (session as Record<string, unknown>).id === 'string') {
    return (session as Record<string, unknown>).id as string;
  }
  return undefined;
}

function withFailureHint(message: string): string {
  if (message.includes('Unsupported browser-extension command:')) {
    return `${message}\nhint: the unpacked extension is likely still running an older dist bundle; run "bun run build:browserext", reload the extension in chrome://extensions, then rerun the smoke suite.`;
  }
  return message;
}

async function runStep(
  context: RunnerContext,
  suite: SuiteResult,
  name: string,
  args: string[],
  options?: {
    allowFailure?: boolean;
    skip?: boolean;
    skipReason?: string;
  }
): Promise<unknown> {
  if (options?.skip) {
    suite.steps.push({
      name,
      command: commandString([...context.cliPrefix, ...args, '--json']),
      status: 'skipped',
      durationMs: 0,
      error: options.skipReason ?? 'skipped'
    });
    return undefined;
  }
  try {
    const { output, durationMs, command } = await runCliJson(context, args);
    suite.steps.push({
      name,
      command,
      status: 'passed',
      durationMs,
      output
    });
    return output;
  } catch (error) {
    const message = withFailureHint(error instanceof Error ? error.message : String(error));
    suite.steps.push({
      name,
      command: commandString([...context.cliPrefix, ...args, '--json']),
      status: options?.allowFailure ? 'skipped' : 'failed',
      durationMs: 0,
      error: message
    });
    if (!options?.allowFailure) {
      throw error;
    }
    return undefined;
  }
}

async function withSessionSuite(
  context: RunnerContext,
  name: string,
  createArgs: string[],
  body: (suite: SuiteResult, sessionId: string) => Promise<void>
): Promise<SuiteResult> {
  const startedAt = performance.now();
  const suite: SuiteResult = {
    name,
    status: 'passed',
    durationMs: 0,
    steps: []
  };
  let sessionId: string | undefined;
  try {
    const created = await runStep(context, suite, 'session.create', ['browserext', 'session', 'create', ...createArgs]);
    sessionId = extractSessionId(created);
    suite.sessionId = sessionId;
    if (!sessionId) {
      throw new Error(`No session id returned for suite ${name}`);
    }
    await runStep(context, suite, 'session.wait-ready', [
      'browserext',
      'session',
      'wait-ready',
      sessionId,
      '--timeout-ms',
      String(context.timeoutMs),
      '--interval-ms',
      String(context.intervalMs)
    ]);
    await body(suite, sessionId);
  } catch (error) {
    suite.status = 'failed';
    const message = error instanceof Error ? error.message : String(error);
    if (!suite.steps.some((step) => step.status === 'failed')) {
      suite.steps.push({
        name: `${name}.error`,
        command: '',
        status: 'failed',
        durationMs: 0,
        error: message
      });
    }
  } finally {
    if (sessionId) {
      await runStep(
        context,
        suite,
        'session.close',
        ['browserext', 'session', 'close', sessionId],
        { allowFailure: true }
      );
    }
    suite.durationMs = Math.round(performance.now() - startedAt);
  }
  return suite;
}

async function runProviderSuite(context: RunnerContext): Promise<SuiteResult> {
  const startedAt = performance.now();
  const suite: SuiteResult = { name: 'provider', status: 'passed', durationMs: 0, steps: [] };
  try {
    await runStep(context, suite, 'status', ['browserext', 'status']);
    await runStep(context, suite, 'wait-provider', [
      'browserext',
      'wait-provider',
      '--timeout-ms',
      String(context.timeoutMs),
      '--interval-ms',
      String(context.intervalMs)
    ]);
  } catch {
    suite.status = 'failed';
  } finally {
    suite.durationMs = Math.round(performance.now() - startedAt);
  }
  return suite;
}

function getProviderStatusOutput(suite: SuiteResult): ProviderStatus | undefined {
  const statusStep = suite.steps.find((step) => step.name === 'status' && step.status === 'passed');
  if (!statusStep || !statusStep.output || typeof statusStep.output !== 'object') {
    return undefined;
  }
  return statusStep.output as ProviderStatus;
}

function createSkippedSuite(name: string, reason: string): SuiteResult {
  return {
    name,
    status: 'skipped',
    durationMs: 0,
    steps: [
      {
        name: `${name}.skipped`,
        command: '',
        status: 'skipped',
        durationMs: 0,
        error: reason
      }
    ]
  };
}

async function runGenericSuite(context: RunnerContext): Promise<SuiteResult> {
  return withSessionSuite(
    context,
    'generic',
    ['--url', context.urls.generic, '--name', 'browserext-generic-smoke'],
    async (suite, sessionId) => {
      await runStep(context, suite, 'tabs', ['browserext', 'tabs', sessionId]);
      await runStep(context, suite, 'snapshot', ['browserext', 'snapshot', sessionId]);
      await runStep(context, suite, 'inspect-body', ['browserext', 'inspect', sessionId, 'body']);
      await runStep(context, suite, 'links', ['browserext', 'links', sessionId, '--limit', '20']);
      await runStep(context, suite, 'markdown', ['browserext', 'markdown', sessionId]);
      await runStep(context, suite, 'readability', ['browserext', 'readability', sessionId]);
      await runStep(context, suite, 'session-events', ['browserext', 'session-events', sessionId, '--limit', '10']);
    }
  );
}

async function runFormsSuite(context: RunnerContext): Promise<SuiteResult> {
  return withSessionSuite(
    context,
    'forms',
    ['--url', context.urls.forms, '--name', 'browserext-forms-smoke'],
    async (suite, sessionId) => {
      await runStep(context, suite, 'form-fields', ['browserext', 'form-fields', sessionId, '--limit', '20']);
      await runStep(context, suite, 'form-contexts', ['browserext', 'form-contexts', sessionId, '--limit', '20']);
      await runStep(context, suite, 'form-values', ['browserext', 'form-values', sessionId, '--limit', '20']);
      await runStep(context, suite, 'inspect-editors', ['browserext', 'inspect-all', sessionId, 'textarea, [contenteditable=true]', '--limit', '10']);
    }
  );
}

async function runChatGptSuite(context: RunnerContext): Promise<SuiteResult> {
  return withSessionSuite(
    context,
    'chatgpt',
    ['--site', 'chatgpt.com', '--url', context.urls.chatgpt, '--name', 'browserext-chatgpt-smoke'],
    async (suite, sessionId) => {
      await runStep(context, suite, 'session.reconnect', [
        'browserext',
        'session',
        'reconnect',
        sessionId,
        '--timeout-ms',
        String(context.timeoutMs),
        '--interval-ms',
        String(context.intervalMs)
      ]);
      await runStep(context, suite, 'info', ['browserext', 'chatgpt', 'info', sessionId, '--limit', '10']);
      await runStep(context, suite, 'sidebar-state', ['browserext', 'chatgpt', 'sidebar-state', sessionId]);
      await runStep(context, suite, 'models', ['browserext', 'chatgpt', 'models', sessionId]);
      await runStep(context, suite, 'current-conversation', ['browserext', 'chatgpt', 'current-conversation', sessionId, '--limit', '10']);
      await runStep(context, suite, 'response-controls', ['browserext', 'chatgpt', 'response-controls', sessionId, '--limit', '10']);
      await runStep(context, suite, 'prepare', [
        'browserext',
        'chatgpt',
        'prepare',
        sessionId,
        '--sidebar-open',
        '--new-chat',
        '--limit',
        '10',
        '--timeout-ms',
        String(Math.max(context.timeoutMs, 45_000)),
        '--interval-ms',
        String(context.intervalMs)
      ]);
    }
  );
}

async function runDeepSeekSuite(context: RunnerContext): Promise<SuiteResult> {
  return withSessionSuite(
    context,
    'deepseek',
    ['--site', 'deepseek.com', '--url', context.urls.deepseek, '--name', 'browserext-deepseek-smoke'],
    async (suite, sessionId) => {
      await runStep(context, suite, 'session.reconnect', [
        'browserext',
        'session',
        'reconnect',
        sessionId,
        '--timeout-ms',
        String(context.timeoutMs),
        '--interval-ms',
        String(context.intervalMs)
      ]);
      await runStep(context, suite, 'info', ['browserext', 'deepseek', 'info', sessionId, '--limit', '10']);
      await runStep(context, suite, 'sidebar-state', ['browserext', 'deepseek', 'sidebar-state', sessionId]);
      await runStep(context, suite, 'models', ['browserext', 'deepseek', 'models', sessionId]);
      await runStep(context, suite, 'current-conversation', ['browserext', 'deepseek', 'current-conversation', sessionId, '--limit', '10']);
      await runStep(context, suite, 'response-controls', ['browserext', 'deepseek', 'response-controls', sessionId, '--limit', '10']);
      await runStep(context, suite, 'prepare', [
        'browserext',
        'deepseek',
        'prepare',
        sessionId,
        '--sidebar-open',
        '--new-chat',
        '--limit',
        '10',
        '--timeout-ms',
        String(Math.max(context.timeoutMs, 45_000)),
        '--interval-ms',
        String(context.intervalMs)
      ]);
    }
  );
}

async function runXSuite(context: RunnerContext): Promise<SuiteResult> {
  const startedAt = performance.now();
  const suite: SuiteResult = { name: 'x', status: 'passed', durationMs: 0, steps: [] };
  try {
    await runStep(context, suite, 'profile', ['browserext', 'x', 'profile', '@openai', '--limit', '1'], {
      skip: !context.includeX,
      skipReason: 'set SIDOFUN_BROWSEREXT_ENABLE_X=1 to include the live X suite'
    });
    if (!context.includeX) {
      suite.status = 'skipped';
    }
  } catch {
    suite.status = 'failed';
  } finally {
    suite.durationMs = Math.round(performance.now() - startedAt);
  }
  return suite;
}

function renderMarkdownReport(context: RunnerContext, suites: SuiteResult[]): string {
  const lines: string[] = [];
  lines.push('# Browserext Smoke Report');
  lines.push('');
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push(`CLI: \`${commandString(context.cliPrefix)}\``);
  lines.push(`Suites: ${Array.from(context.suites).join(', ')}`);
  lines.push('');
  lines.push('| Suite | Status | Duration ms | Steps |');
  lines.push('| --- | --- | ---: | ---: |');
  for (const suite of suites) {
    lines.push(`| ${suite.name} | ${suite.status} | ${suite.durationMs} | ${suite.steps.length} |`);
  }
  lines.push('');
  for (const suite of suites) {
    lines.push(`## ${suite.name}`);
    lines.push('');
    if (suite.sessionId) {
      lines.push(`Session: \`${suite.sessionId}\``);
      lines.push('');
    }
    lines.push('| Step | Status | Duration ms |');
    lines.push('| --- | --- | ---: |');
    for (const step of suite.steps) {
      lines.push(`| ${step.name} | ${step.status} | ${step.durationMs} |`);
    }
    const failures = suite.steps.filter((step) => step.status !== 'passed');
    if (failures.length > 0) {
      lines.push('');
      for (const step of failures) {
        lines.push(`- ${step.name}: ${step.error ?? 'failed'}`);
      }
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

async function writeReports(context: RunnerContext, suites: SuiteResult[]): Promise<void> {
  await mkdir(context.outputDir, { recursive: true });
  const jsonPath = join(context.outputDir, 'latest.json');
  const mdPath = join(context.outputDir, 'latest.md');
  await writeFile(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        cli: context.cliPrefix,
        suites
      },
      null,
      2
    )
  );
  await writeFile(mdPath, renderMarkdownReport(context, suites));
  console.log(`browserext smoke report: ${jsonPath}`);
  console.log(`browserext smoke summary: ${mdPath}`);
}

async function main(): Promise<void> {
  const context: RunnerContext = {
    cliPrefix: ['bun', 'run', 'src/operator-cli.tsx'],
    timeoutMs: getEnvNumber('SIDOFUN_BROWSEREXT_TIMEOUT_MS', 30_000),
    intervalMs: getEnvNumber('SIDOFUN_BROWSEREXT_INTERVAL_MS', 1_000),
    outputDir: process.env.SIDOFUN_BROWSEREXT_OUTPUT_DIR || 'tmp/browserext-smoke',
    suites: parseSuites(),
    includeX: process.env.SIDOFUN_BROWSEREXT_ENABLE_X === '1',
    urls: {
      generic: process.env.SIDOFUN_BROWSEREXT_GENERIC_URL || 'https://example.com/',
      forms: process.env.SIDOFUN_BROWSEREXT_FORMS_URL || 'https://httpbin.org/forms/post',
      chatgpt: process.env.SIDOFUN_BROWSEREXT_CHATGPT_URL || 'https://chatgpt.com/',
      deepseek: process.env.SIDOFUN_BROWSEREXT_DEEPSEEK_URL || 'https://chat.deepseek.com/'
    }
  };

  const orderedSuites: Array<[string, (context: RunnerContext) => Promise<SuiteResult>]> = [
    ['provider', runProviderSuite],
    ['generic', runGenericSuite],
    ['forms', runFormsSuite],
    ['x', runXSuite],
    ['chatgpt', runChatGptSuite],
    ['deepseek', runDeepSeekSuite]
  ];

  const results: SuiteResult[] = [];
  let providerBuildMismatchReason: string | undefined;
  for (const [name, runner] of orderedSuites) {
    if (!context.suites.has(name)) continue;
    if (name !== 'provider' && providerBuildMismatchReason) {
      results.push(createSkippedSuite(name, providerBuildMismatchReason));
      continue;
    }
    console.log(`Running browserext suite: ${name}`);
    const suite = await runner(context);
    results.push(suite);
    if (name === 'provider') {
      const providerStatus = getProviderStatusOutput(suite);
      if (
        providerStatus?.providerConnected &&
        providerStatus.expectedBuildId &&
        !providerStatus.activeProviderBuildId
      ) {
        providerBuildMismatchReason =
          `connected provider did not report a build id; reload the unpacked extension after rebuilding dist so Sidofun can verify the live bundle`;
      } else if (
        providerStatus?.providerConnected &&
        providerStatus.expectedBuildId &&
        providerStatus.activeProviderBuildId &&
        providerStatus.expectedBuildId !== providerStatus.activeProviderBuildId
      ) {
        providerBuildMismatchReason =
          `connected provider build ${providerStatus.activeProviderBuildId} does not match expected build ${providerStatus.expectedBuildId}; reload the unpacked extension after rebuilding dist`;
      }
    }
  }

  await writeReports(context, results);

  const failed = results.filter((suite) => suite.status === 'failed');
  if (providerBuildMismatchReason) {
    throw new Error(`Browserext smoke blocked by stale extension bundle: ${providerBuildMismatchReason}`);
  }
  if (failed.length > 0) {
    throw new Error(`Browserext smoke failed for suite(s): ${failed.map((suite) => suite.name).join(', ')}`);
  }
}

await main();
