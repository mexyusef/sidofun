import fs from 'node:fs';
import type {
  HfPaperAuthor,
  HfPaperInfoResult,
  HfPaperSummary,
  HfPapersBackend,
  HfPapersDoctorResult,
  HfPapersInfoOptions,
  HfPapersListDailyOptions,
  HfPapersListDailyResult,
  HfPapersReadOptions,
  HfPapersReadResult,
  HfPapersSearchOptions,
  HfPapersSearchResult,
  HfPapersStatus
} from './types.js';
import { HF_PAPERS_PYTHON_SCRIPT } from './hf-papers-python-script.constants.js';

const DEFAULT_TIMEOUT_MS = 30000;

type CommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
};

type NormalizedPaperRecord = Record<string, unknown>;

export class HfPapersService {
  async getStatus(): Promise<HfPapersStatus> {
    const cliPath = this.resolveCliPath();
    const cliNotes: string[] = [];
    let cliVersion: string | undefined;
    if (cliPath) {
      cliVersion = await this.tryGetCliVersion(cliPath);
    } else {
      cliNotes.push('hf CLI was not found on PATH');
    }

    const pythonNotes: string[] = [];
    let pythonAvailable = false;
    let packageVersion: string | undefined;
    let methods: string[] = [];

    try {
      const result = await this.runPythonAction({ action: 'status' }, DEFAULT_TIMEOUT_MS);
      pythonAvailable = true;
      packageVersion = typeof result.packageVersion === 'string' ? result.packageVersion : undefined;
      methods = Array.isArray(result.methods) ? result.methods.filter((entry): entry is string => typeof entry === 'string') : [];
    } catch (error: any) {
      pythonNotes.push(error?.message || 'Python API is not available');
    }

    const notes: string[] = [];
    let defaultBackend: HfPapersBackend | null = null;
    if (pythonAvailable) {
      defaultBackend = 'api';
    } else if (cliPath) {
      defaultBackend = 'cli';
    } else {
      notes.push('Neither Hugging Face Python API nor hf CLI is available');
    }

    return {
      available: defaultBackend !== null,
      defaultBackend,
      cli: {
        available: Boolean(cliPath),
        path: cliPath ?? undefined,
        version: cliVersion,
        notes: cliNotes
      },
      pythonApi: {
        available: pythonAvailable,
        pythonPath: pythonAvailable ? 'python' : undefined,
        packageVersion,
        methods,
        notes: pythonNotes
      },
      notes
    };
  }

  async doctor(options?: { backend?: HfPapersBackend | 'auto'; timeoutMs?: number }): Promise<HfPapersDoctorResult> {
    const status = await this.getStatus();
    const checks: HfPapersDoctorResult['checks'] = [
      {
        name: 'hf_cli_available',
        ok: status.cli.available,
        details: status.cli.path
      },
      {
        name: 'python_api_available',
        ok: status.pythonApi.available,
        details: status.pythonApi.packageVersion
      }
    ];

    let backend: HfPapersBackend | null = null;
    try {
      backend = await this.resolveBackend(options?.backend);
      const smoke = await this.search({
        query: 'llm',
        limit: 1,
        backend,
        timeoutMs: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS
      });
      checks.push({
        name: `${backend}_search_smoke`,
        ok: smoke.count >= 0,
        details: `count=${smoke.count}`
      });
    } catch (error: any) {
      checks.push({
        name: `${options?.backend ?? status.defaultBackend ?? 'none'}_search_smoke`,
        ok: false,
        details: error?.message || 'Search smoke failed'
      });
    }

    return {
      ok: checks.every((check) => check.ok || check.name === 'hf_cli_available'),
      backend,
      status,
      checks
    };
  }

  async search(options: HfPapersSearchOptions): Promise<HfPapersSearchResult> {
    const backend = await this.resolveBackend(options.backend);
    if (backend === 'api') {
      const result = await this.runPythonAction({
        action: 'search',
        query: options.query,
        limit: options.limit,
        token: options.token
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      const papers = this.normalizePaperList(result.papers, options.includeRaw);
      return {
        query: options.query,
        backend,
        count: papers.length,
        papers
      };
    }

    const args = ['papers', 'search', options.query, '--limit', String(options.limit ?? 20), '--format', 'json'];
    if (options.token) {
      args.push('--token', options.token);
    }
    const result = await this.runCli(args, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    const parsed = this.parseJsonOutput(result.stdout);
    const papers = this.normalizePaperList(parsed, options.includeRaw);
    return {
      query: options.query,
      backend,
      count: papers.length,
      papers
    };
  }

  async info(options: HfPapersInfoOptions): Promise<HfPaperInfoResult> {
    const backend = await this.resolveBackend(options.backend);
    let record: NormalizedPaperRecord;
    if (backend === 'api') {
      const result = await this.runPythonAction({
        action: 'info',
        paperId: options.paperId,
        token: options.token
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      record = this.expectRecord(result.paper, 'HF paper info');
    } else {
      const args = ['papers', 'info', options.paperId];
      if (options.token) {
        args.push('--token', options.token);
      }
      const result = await this.runCli(args, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      record = this.expectRecord(this.parseJsonOutput(result.stdout), 'HF paper info');
    }

    return this.normalizePaper(record, options.includeRaw) as HfPaperInfoResult;
  }

  async read(options: HfPapersReadOptions): Promise<HfPapersReadResult> {
    const backend = await this.resolveBackend(options.backend);
    let markdown = '';
    if (backend === 'api') {
      const result = await this.runPythonAction({
        action: 'read',
        paperId: options.paperId,
        token: options.token
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      markdown = typeof result.markdown === 'string' ? result.markdown : '';
    } else {
      const args = ['papers', 'read', options.paperId];
      if (options.token) {
        args.push('--token', options.token);
      }
      const result = await this.runCli(args, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      markdown = result.stdout.trim();
    }

    if (!markdown) {
      throw new Error(`No markdown content returned for paper ${options.paperId}`);
    }

    let savedTo: string | undefined;
    if (options.savePath) {
      fs.writeFileSync(options.savePath, markdown, 'utf8');
      savedTo = options.savePath;
    }

    return {
      id: options.paperId,
      backend,
      markdown,
      charCount: markdown.length,
      wordCount: markdown.trim() ? markdown.trim().split(/\s+/).length : 0,
      paperUrl: this.paperUrl(options.paperId),
      arxivUrl: this.arxivUrl(options.paperId),
      savedTo
    };
  }

  async listDaily(options: HfPapersListDailyOptions = {}): Promise<HfPapersListDailyResult> {
    const backend = await this.resolveBackend(options.backend);
    let papers: HfPaperSummary[];
    if (backend === 'api') {
      const result = await this.runPythonAction({
        action: 'list_daily',
        date: options.date,
        week: options.week,
        month: options.month,
        submitter: options.submitter,
        sort: options.sort,
        limit: options.limit,
        token: options.token
      }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      papers = this.normalizePaperList(result.papers, options.includeRaw);
    } else {
      const args = ['papers', 'ls', '--format', 'json', '--limit', String(options.limit ?? 50)];
      if (options.date) args.push('--date', options.date);
      if (options.week) args.push('--week', options.week);
      if (options.month) args.push('--month', options.month);
      if (options.submitter) args.push('--submitter', options.submitter);
      if (options.sort) args.push('--sort', options.sort);
      if (options.token) args.push('--token', options.token);
      const result = await this.runCli(args, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
      papers = this.normalizePaperList(this.parseJsonOutput(result.stdout), options.includeRaw);
    }

    return {
      backend,
      count: papers.length,
      filters: {
        date: options.date,
        week: options.week,
        month: options.month,
        submitter: options.submitter,
        sort: options.sort,
        limit: options.limit
      },
      papers
    };
  }

  private async resolveBackend(requested?: HfPapersBackend | 'auto'): Promise<HfPapersBackend> {
    if (requested === 'api' || requested === 'cli') {
      return requested;
    }
    const status = await this.getStatus();
    if (status.defaultBackend) {
      return status.defaultBackend;
    }
    throw new Error('HF papers service is not available: neither Python API nor hf CLI is usable');
  }

  private resolveCliPath(): string | null {
    const where = Bun.spawnSync(['where.exe', 'hf'], {
      stdout: 'pipe',
      stderr: 'pipe'
    });
    if (where.exitCode !== 0) {
      return null;
    }
    const output = where.stdout.toString().trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return output[0] ?? null;
  }

  private async tryGetCliVersion(cliPath: string): Promise<string | undefined> {
    try {
      const result = await this.runCommand([cliPath, 'version'], 10000);
      if (result.exitCode !== 0) {
        return undefined;
      }
      const version = result.stdout.trim().split(/\r?\n/)[0]?.trim();
      return version || undefined;
    } catch {
      return undefined;
    }
  }

  private async runCli(args: string[], timeoutMs: number): Promise<CommandResult> {
    const cliPath = this.resolveCliPath();
    if (!cliPath) {
      throw new Error('hf CLI was not found on PATH');
    }
    return this.runCommand([cliPath, ...args], timeoutMs);
  }

  private async runPythonAction(payload: Record<string, unknown>, timeoutMs: number): Promise<Record<string, unknown>> {
    const result = await this.runCommand(['python', '-c', HF_PAPERS_PYTHON_SCRIPT, JSON.stringify(payload)], timeoutMs);
    if (result.timedOut) {
      throw new Error('HF papers Python action timed out');
    }
    if (result.exitCode !== 0) {
      const parsed = this.tryParseJson(result.stdout);
      if (parsed && typeof parsed.error === 'string') {
        throw new Error(parsed.error);
      }
      throw new Error((result.stderr || result.stdout).trim() || 'HF papers Python action failed');
    }
    const parsed = this.expectRecord(this.parseJsonOutput(result.stdout), 'HF papers Python result');
    if (parsed.ok === false && typeof parsed.error === 'string') {
      throw new Error(parsed.error);
    }
    return parsed;
  }

  private async runCommand(commandLine: string[], timeoutMs: number): Promise<CommandResult> {
    const subprocess = Bun.spawn(commandLine, {
      stdout: 'pipe',
      stderr: 'pipe',
      env: process.env
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
      stdout,
      stderr,
      exitCode,
      timedOut
    };
  }

  private parseJsonOutput(stdout: string): unknown {
    const parsed = this.tryParseJson(stdout);
    if (parsed !== undefined) {
      return parsed;
    }
    throw new Error('Failed to parse Hugging Face JSON output');
  }

  private tryParseJson(stdout: string): any {
    const trimmed = stdout.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      return JSON.parse(trimmed);
    } catch {
      const start = trimmed.indexOf('{');
      const arrayStart = trimmed.indexOf('[');
      const first = [start, arrayStart].filter((value) => value >= 0).sort((left, right) => left - right)[0];
      if (first === undefined) {
        return undefined;
      }
      try {
        return JSON.parse(trimmed.slice(first));
      } catch {
        return undefined;
      }
    }
  }

  private normalizePaperList(value: unknown, includeRaw?: boolean): HfPaperSummary[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((entry) => this.expectRecord(entry, 'HF paper'))
      .map((entry) => this.normalizePaper(entry, includeRaw));
  }

  private normalizePaper(record: NormalizedPaperRecord, includeRaw?: boolean): HfPaperSummary {
    const id = this.stringOrEmpty(record.id);
    const authorDetails = Array.isArray(record.authors)
      ? record.authors.map((author) => this.normalizeAuthor(this.expectRecord(author, 'HF paper author')))
      : [];
    const organizationDetails = this.normalizeOrganization(record.organization);
    const submittedByDetails = this.normalizeUser(record.submitted_by);

    const normalized: HfPaperInfoResult = {
      id,
      title: this.stringOrEmpty(record.title),
      summary: this.optionalString(record.summary),
      authors: authorDetails.map((author) => author.name).filter(Boolean),
      authorDetails,
      publishedAt: this.optionalString(record.published_at),
      submittedAt: this.optionalString(record.submitted_at),
      submittedBy: submittedByDetails?.username || submittedByDetails?.fullname,
      submittedByDetails,
      upvotes: this.optionalNumber(record.upvotes),
      comments: this.optionalNumber(record.comments),
      aiSummary: this.optionalString(record.ai_summary),
      aiKeywords: Array.isArray(record.ai_keywords) ? record.ai_keywords.filter((entry): entry is string => typeof entry === 'string') : undefined,
      organization: organizationDetails?.fullname || organizationDetails?.name,
      organizationDetails,
      githubRepo: this.optionalString(record.github_repo),
      githubStars: this.optionalNumber(record.github_stars),
      projectPage: this.optionalString(record.project_page),
      discussionId: this.optionalString(record.discussion_id),
      source: this.optionalString(record.source),
      paperUrl: this.paperUrl(id),
      arxivUrl: this.arxivUrl(id)
    };

    if (includeRaw) {
      normalized.raw = record;
    }

    return normalized;
  }

  private normalizeAuthor(record: NormalizedPaperRecord): HfPaperAuthor {
    return {
      name: this.stringOrEmpty(record.name),
      hidden: this.optionalBoolean(record.hidden),
      status: this.optionalString(record.status),
      statusLastChangedAt: this.optionalString(record.status_last_changed_at),
      user: this.normalizeUser(record.user)
    };
  }

  private normalizeUser(value: unknown) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    return {
      username: this.optionalString(record.username),
      fullname: this.optionalString(record.fullname),
      avatarUrl: this.optionalString(record.avatar_url),
      isPro: this.optionalBoolean(record.is_pro),
      orgs: Array.isArray(record.orgs)
        ? record.orgs
          .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
          .map((entry) => ({
            name: this.optionalString(entry.name),
            fullname: this.optionalString(entry.fullname)
          }))
        : undefined
    };
  }

  private normalizeOrganization(value: unknown) {
    if (!value || typeof value !== 'object') {
      return undefined;
    }
    const record = value as Record<string, unknown>;
    return {
      name: this.optionalString(record.name),
      fullname: this.optionalString(record.fullname),
      avatarUrl: this.optionalString(record.avatar_url)
    };
  }

  private expectRecord(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} is not an object`);
    }
    return value as Record<string, unknown>;
  }

  private stringOrEmpty(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private optionalString(value: unknown): string | undefined {
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private optionalNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  }

  private optionalBoolean(value: unknown): boolean | undefined {
    return typeof value === 'boolean' ? value : undefined;
  }

  private paperUrl(id: string): string {
    return `https://huggingface.co/papers/${id}`;
  }

  private arxivUrl(id: string): string {
    return `https://arxiv.org/abs/${id}`;
  }
}
