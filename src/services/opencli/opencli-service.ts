import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OPENCLI_RS_CARGO_MANIFEST, OPENCLI_RS_EXTENSION_DIR, OPENCLI_RS_REPO_DIR, SIDOFUN_CONFIG_FILE } from '../../config/constants.js';
import type {
  OpenCliDoctorOptions,
  OpenCliRunOptions,
  OpenCliRunResult,
  OpenCliSessionWorkspaceBinding,
  OpenCliSiteInfo,
  OpenCliStatus,
  OpenCliWorkspaceEntry,
  TwitterBookmarksOptions,
  TwitterPostOptions,
  TwitterSearchOptions,
  TwitterTimelineOptions
} from './types.js';

const OPENCLI_ENV_VAR = 'OPENCLI_RS_PATH';
const OPENCLI_KEEP_BROWSER_OPEN_ENV = 'OPENCLI_KEEP_BROWSER_OPEN';
const DEFAULT_TIMEOUT_MS = 120000;
const SERVICE_DIR = path.dirname(fileURLToPath(import.meta.url));
const MODULE_FALLBACK_OPENCLI_REPO_DIR = path.resolve(SERVICE_DIR, '..', '..', '..', 'opencli-rs');

export class OpenCliService {
  getStatus(): OpenCliStatus {
    const repoPath = this.resolveRepoPath();
    const cargoManifestPath = path.join(repoPath, 'Cargo.toml');
    const extensionDir = path.join(repoPath, 'extension');
    const executablePath = this.resolveExecutablePath();
    const extensionPath = fs.existsSync(path.join(extensionDir, 'manifest.json'))
      ? extensionDir
      : undefined;
    const sites = this.listSites();
    const commandCount = sites.reduce((total, site) => total + site.commands.length, 0);
    const notes: string[] = [];
    let mode: OpenCliStatus['mode'] = 'unavailable';

    if (executablePath) {
      mode = 'binary';
      notes.push(`Using built opencli-rs binary at ${executablePath}`);
    } else if (this.canUseCargo()) {
      mode = 'cargo';
      notes.push('Falling back to `cargo run --release` for opencli-rs execution');
    } else {
      notes.push(`Set ${OPENCLI_ENV_VAR} or build opencli-rs under target/release`);
      notes.push('Cargo fallback is not available on PATH');
    }

    if (!extensionPath) {
      notes.push('Chrome extension manifest was not found under opencli-rs/extension');
    }

    return {
      available: mode !== 'unavailable',
      mode,
      executablePath: executablePath ?? undefined,
      repoPath,
      cargoManifestPath,
      extensionPath,
      adapterSiteCount: sites.length,
      adapterCommandCount: commandCount,
      twitterAvailable: sites.some((site) => site.site === 'twitter'),
      notes
    };
  }

  listSites(): OpenCliSiteInfo[] {
    const adaptersDir = path.join(this.resolveRepoPath(), 'adapters');
    if (!fs.existsSync(adaptersDir)) {
      return [];
    }

    return fs.readdirSync(adaptersDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const siteDir = path.join(adaptersDir, entry.name);
        const commands = fs.readdirSync(siteDir, { withFileTypes: true })
          .filter((file) => file.isFile() && file.name.endsWith('.yaml'))
          .map((file) => file.name.replace(/\.yaml$/i, ''))
          .sort((left, right) => left.localeCompare(right));
        return {
          site: entry.name,
          commands
        };
      })
      .sort((left, right) => left.site.localeCompare(right.site));
  }

  listCommands(site: string): string[] {
    return this.listSites().find((entry) => entry.site === site)?.commands ?? [];
  }

  async run(options: OpenCliRunOptions): Promise<OpenCliRunResult> {
    const status = this.getStatus();
    if (!status.available) {
      throw new Error(`opencli-rs is not available. ${status.notes.join(' ')}`);
    }

    const format = options.format ?? 'json';
    const baseCommand = this.buildBaseCommand(status);
    const args = options.args ?? [];
    const commandLine = [...baseCommand, options.site, options.command, ...args, '--format', format];
    const workspace = this.resolveWorkspace(options.workspace, options.ownerSessionId);
    const cwd = options.cwd ?? workspace?.path ?? this.resolveRepoPath();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const subprocess = Bun.spawn(commandLine, {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        OPENCLI_DAEMON_PORT: process.env.OPENCLI_DAEMON_PORT ?? '19825',
        [OPENCLI_KEEP_BROWSER_OPEN_ENV]: options.keepBrowserOpen ? '1' : (process.env[OPENCLI_KEEP_BROWSER_OPEN_ENV] ?? '0')
      }
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

    if (!timedOut && exitCode === 0 && (options.waitAfterMs ?? 0) > 0) {
      await Bun.sleep(options.waitAfterMs!);
    }

    const parsed = format === 'json' ? this.tryParseJson(stdout) : undefined;
    const success = exitCode === 0 && !timedOut;

    return {
      site: options.site,
      command: options.command,
      args,
      cwd,
      exitCode,
      success,
      timedOut,
      mode: status.mode === 'unavailable' ? 'cargo' : status.mode,
      executablePath: status.executablePath,
      commandLine,
      stdout,
      stderr,
      parsed,
      summary: this.summarize(options.site, options.command, stdout, stderr, parsed, exitCode, timedOut),
      workspace: workspace ?? undefined,
      ownerSessionId: options.ownerSessionId,
      keepBrowserOpen: options.keepBrowserOpen,
      waitAfterMs: options.waitAfterMs,
      maximizeBrowser: options.maximizeBrowser
    };
  }

  async doctor(options: OpenCliDoctorOptions = {}) {
    const status = this.getStatus();
    if (!status.available) {
      throw new Error(`opencli-rs is not available. ${status.notes.join(' ')}`);
    }
    const baseCommand = this.buildBaseCommand(status);
    const workspace = this.resolveWorkspace(options.workspace, options.ownerSessionId);
    const cwd = options.cwd ?? workspace?.path ?? this.resolveRepoPath();
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const commandLine = [...baseCommand, 'doctor'];

    const subprocess = Bun.spawn(commandLine, {
      cwd,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        OPENCLI_DAEMON_PORT: process.env.OPENCLI_DAEMON_PORT ?? '19825'
      }
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
      site: 'doctor',
      command: 'doctor',
      args: [],
      cwd,
      exitCode,
      success: exitCode === 0 && !timedOut,
      timedOut,
      mode: status.mode === 'unavailable' ? 'cargo' : status.mode,
      executablePath: status.executablePath,
      commandLine,
      stdout,
      stderr,
      parsed: undefined,
      summary: timedOut
        ? 'opencli-rs doctor timed out'
        : exitCode === 0
          ? 'opencli-rs doctor completed'
          : `opencli-rs doctor failed: ${(stderr || stdout).trim().split(/\r?\n/)[0] || 'unknown error'}`,
      workspace: workspace ?? undefined,
      ownerSessionId: options.ownerSessionId
    } satisfies OpenCliRunResult;
  }

  listWorkspaces(): OpenCliWorkspaceEntry[] {
    const workspaces = this.readWorkspaceMap();
    return Object.entries(workspaces)
      .map(([name, workspacePath]) => ({ name, path: workspacePath }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  getWorkspace(name: string): OpenCliWorkspaceEntry | undefined {
    const workspacePath = this.readWorkspaceMap()[name];
    if (!workspacePath) {
      return undefined;
    }
    return { name, path: workspacePath };
  }

  setWorkspace(name: string, workspacePath: string): OpenCliWorkspaceEntry {
    const config = this.readSidofunConfig();
    const providers = this.ensureRecord(config, 'providers');
    const opencli = this.ensureRecord(providers, 'opencli');
    const workspaces = this.ensureRecord(opencli, 'workspaces');
    workspaces[name] = workspacePath;
    this.writeSidofunConfig(config);
    return { name, path: workspacePath };
  }

  clearWorkspace(name: string) {
    const config = this.readSidofunConfig();
    const providers = this.ensureRecord(config, 'providers');
    const opencli = this.ensureRecord(providers, 'opencli');
    const workspaces = this.ensureRecord(opencli, 'workspaces');
    const existing = typeof workspaces[name] === 'string' ? String(workspaces[name]) : undefined;
    delete workspaces[name];
    this.writeSidofunConfig(config);
    return {
      name,
      removed: Boolean(existing),
      path: existing
    };
  }

  bindSessionWorkspace(sessionId: string, workspace: string): OpenCliSessionWorkspaceBinding {
    const resolved = this.resolveWorkspace(workspace);
    if (!resolved) {
      throw new Error(`OpenCLI workspace not found: ${workspace}`);
    }
    const config = this.readSidofunConfig();
    const providers = this.ensureRecord(config, 'providers');
    const opencli = this.ensureRecord(providers, 'opencli');
    const sessionWorkspaces = this.ensureRecord(opencli, 'sessionWorkspaces');
    sessionWorkspaces[sessionId] = resolved.name;
    this.writeSidofunConfig(config);
    return {
      sessionId,
      workspace: resolved.name,
      path: resolved.path
    };
  }

  unbindSessionWorkspace(sessionId: string) {
    const config = this.readSidofunConfig();
    const providers = this.ensureRecord(config, 'providers');
    const opencli = this.ensureRecord(providers, 'opencli');
    const sessionWorkspaces = this.ensureRecord(opencli, 'sessionWorkspaces');
    const workspaceName = typeof sessionWorkspaces[sessionId] === 'string' ? String(sessionWorkspaces[sessionId]) : undefined;
    delete sessionWorkspaces[sessionId];
    this.writeSidofunConfig(config);
    const resolved = workspaceName ? this.getWorkspace(workspaceName) : undefined;
    return {
      sessionId,
      removed: Boolean(workspaceName),
      workspace: workspaceName,
      path: resolved?.path
    };
  }

  getSessionWorkspace(sessionId: string): OpenCliSessionWorkspaceBinding | undefined {
    const sessionBindings = this.readSessionWorkspaceMap();
    const workspace = sessionBindings[sessionId];
    if (!workspace) {
      return undefined;
    }
    const resolved = this.resolveWorkspace(workspace);
    if (!resolved) {
      return undefined;
    }
    return {
      sessionId,
      workspace: resolved.name,
      path: resolved.path
    };
  }

  async twitterSearch(options: TwitterSearchOptions) {
    return await this.run({
      site: 'twitter',
      command: 'search',
      args: [
        options.query,
        ...(options.limit ? ['--limit', String(options.limit)] : []),
        ...(options.mode ? ['--mode', options.mode] : [])
      ],
      cwd: options.cwd,
      workspace: options.workspace,
      ownerSessionId: options.ownerSessionId,
      timeoutMs: options.timeoutMs,
      keepBrowserOpen: options.keepBrowserOpen,
      waitAfterMs: options.waitAfterMs,
      maximizeBrowser: options.maximizeBrowser,
      format: 'json'
    });
  }

  async twitterTimeline(options: TwitterTimelineOptions = {}) {
    const args: string[] = [];
    if (options.type) {
      args.push('--type', options.type);
    }
    if (options.limit) {
      args.push('--limit', String(options.limit));
    }
    return await this.run({
      site: 'twitter',
      command: 'timeline',
      args,
      cwd: options.cwd,
      workspace: options.workspace,
      ownerSessionId: options.ownerSessionId,
      timeoutMs: options.timeoutMs,
      keepBrowserOpen: options.keepBrowserOpen,
      waitAfterMs: options.waitAfterMs,
      maximizeBrowser: options.maximizeBrowser,
      format: 'json'
    });
  }

  async twitterBookmarks(options: TwitterBookmarksOptions = {}) {
    return await this.run({
      site: 'twitter',
      command: 'bookmarks',
      args: options.limit ? ['--limit', String(options.limit)] : [],
      cwd: options.cwd,
      workspace: options.workspace,
      ownerSessionId: options.ownerSessionId,
      timeoutMs: options.timeoutMs,
      keepBrowserOpen: options.keepBrowserOpen,
      waitAfterMs: options.waitAfterMs,
      maximizeBrowser: options.maximizeBrowser,
      format: 'json'
    });
  }

  async twitterPost(options: TwitterPostOptions) {
    return await this.run({
      site: 'twitter',
      command: 'post',
      args: [options.text],
      cwd: options.cwd,
      workspace: options.workspace,
      ownerSessionId: options.ownerSessionId,
      timeoutMs: options.timeoutMs,
      keepBrowserOpen: options.keepBrowserOpen,
      waitAfterMs: options.waitAfterMs,
      maximizeBrowser: options.maximizeBrowser,
      format: 'json'
    });
  }

  private resolveExecutablePath(): string | undefined {
    const configuredPath = this.readConfiguredOpenCliPath();
    const candidates = [
      process.env[OPENCLI_ENV_VAR],
      configuredPath,
      path.join(this.resolveRepoPath(), 'target', 'release', 'opencli-rs.exe'),
      path.join(this.resolveRepoPath(), 'target', 'release', 'opencli-rs')
    ].filter((value): value is string => Boolean(value))
      .flatMap((candidate) => this.expandPathCandidate(candidate));

    return candidates.find((candidate) => fs.existsSync(candidate));
  }

  private canUseCargo(): boolean {
    const cargoManifestPath = path.join(this.resolveRepoPath(), 'Cargo.toml');
    if (!fs.existsSync(cargoManifestPath)) {
      return false;
    }
    return Boolean(Bun.which('cargo'));
  }

  private buildBaseCommand(status: OpenCliStatus): string[] {
    if (status.mode === 'binary' && status.executablePath) {
      return [status.executablePath];
    }
    if (status.mode === 'cargo') {
      return ['cargo', 'run', '--quiet', '--release', '--manifest-path', path.join(this.resolveRepoPath(), 'Cargo.toml'), '--'];
    }
    throw new Error('opencli-rs is not available');
  }

  private resolveRepoPath(): string {
    const configuredPath = process.env[OPENCLI_ENV_VAR] || this.readConfiguredOpenCliPath();
    if (configuredPath) {
      const trimmed = configuredPath.trim();
      if (fs.existsSync(trimmed)) {
        if (fs.statSync(trimmed).isDirectory()) {
          return trimmed;
        }
        return path.resolve(trimmed, '..', '..', '..');
      }
      if (/opencli-rs(?:\.exe)?$/i.test(trimmed)) {
        const repoCandidate = path.resolve(trimmed, '..', '..', '..');
        if (fs.existsSync(repoCandidate)) {
          return repoCandidate;
        }
      }
    }
    if (fs.existsSync(OPENCLI_RS_REPO_DIR)) {
      return OPENCLI_RS_REPO_DIR;
    }
    return MODULE_FALLBACK_OPENCLI_REPO_DIR;
  }

  private readConfiguredOpenCliPath(): string | undefined {
    const parsed = this.readSidofunConfig();
    try {
      const direct = parsed[OPENCLI_ENV_VAR];
      if (typeof direct === 'string' && direct.trim()) {
        return direct.trim();
      }
      const providers = parsed.providers;
      if (providers && typeof providers === 'object') {
        const opencli = (providers as Record<string, unknown>).opencli;
        if (opencli && typeof opencli === 'object') {
          const providerPath = (opencli as Record<string, unknown>).path;
          if (typeof providerPath === 'string' && providerPath.trim()) {
            return providerPath.trim();
          }
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private expandPathCandidate(candidate: string): string[] {
    if (!candidate) {
      return [];
    }
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return [
        path.join(candidate, 'target', 'release', 'opencli-rs.exe'),
        path.join(candidate, 'target', 'release', 'opencli-rs')
      ];
    }
    return [candidate];
  }

  private tryParseJson(stdout: string): unknown {
    const trimmed = stdout.trim();
    if (!trimmed) {
      return undefined;
    }
    const parseCandidate = (candidate: string): unknown => {
      const normalized = candidate.trim();
      if (!normalized) {
        return undefined;
      }
      try {
        return JSON.parse(normalized);
      } catch {
        const lines = normalized.split(/\r?\n/);
        while (lines.length > 1) {
          lines.pop();
          const trimmedCandidate = lines.join('\n').trim();
          if (!trimmedCandidate) {
            break;
          }
          try {
            return JSON.parse(trimmedCandidate);
          } catch {
            // keep trimming trailing non-JSON lines
          }
        }
        return undefined;
      }
    };

    const direct = parseCandidate(trimmed);
    if (direct !== undefined) {
      return direct;
    }

    const lines = trimmed.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const firstChar = lines[index].trimStart()[0];
      if (firstChar !== '[' && firstChar !== '{') {
        continue;
      }
      const parsed = parseCandidate(lines.slice(index).join('\n'));
      if (parsed !== undefined) {
        return parsed;
      }
    }

    return undefined;
  }

  private summarize(
    site: string,
    command: string,
    stdout: string,
    stderr: string,
    parsed: unknown,
    exitCode: number,
    timedOut: boolean
  ): string {
    if (timedOut) {
      return `${site} ${command} timed out`;
    }
    if (exitCode !== 0) {
      return `${site} ${command} failed: ${(stderr || stdout).trim().split(/\r?\n/)[0] || 'unknown error'}`;
    }
    if (Array.isArray(parsed)) {
      return `${site} ${command} returned ${parsed.length} row(s)`;
    }
    if (parsed && typeof parsed === 'object') {
      return `${site} ${command} returned structured data`;
    }
    return `${site} ${command} completed`;
  }

  private readWorkspaceMap(): Record<string, string> {
    const parsed = this.readSidofunConfig();
    const providers = parsed.providers;
    if (!providers || typeof providers !== 'object') {
      return {};
    }
    const opencli = (providers as Record<string, unknown>).opencli;
    if (!opencli || typeof opencli !== 'object') {
      return {};
    }
    const workspaces = (opencli as Record<string, unknown>).workspaces;
    if (!workspaces || typeof workspaces !== 'object') {
      return {};
    }
    return Object.fromEntries(
      Object.entries(workspaces as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(([name, workspacePath]) => [name, String(workspacePath).trim()])
    );
  }

  private readSessionWorkspaceMap(): Record<string, string> {
    const parsed = this.readSidofunConfig();
    const providers = parsed.providers;
    if (!providers || typeof providers !== 'object') {
      return {};
    }
    const opencli = (providers as Record<string, unknown>).opencli;
    if (!opencli || typeof opencli !== 'object') {
      return {};
    }
    const sessionWorkspaces = (opencli as Record<string, unknown>).sessionWorkspaces;
    if (!sessionWorkspaces || typeof sessionWorkspaces !== 'object') {
      return {};
    }
    return Object.fromEntries(
      Object.entries(sessionWorkspaces as Record<string, unknown>)
        .filter(([, value]) => typeof value === 'string' && value.trim())
        .map(([sessionId, workspace]) => [sessionId, String(workspace).trim()])
    );
  }

  private resolveWorkspace(workspace?: string, ownerSessionId?: string): OpenCliWorkspaceEntry | undefined {
    const workspaceMap = this.readWorkspaceMap();

    if (workspace) {
      const trimmed = workspace.trim();
      const mappedPath = workspaceMap[trimmed];
      if (mappedPath) {
        return { name: trimmed, path: mappedPath };
      }
      if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
        return { name: trimmed, path: trimmed };
      }
      throw new Error(`OpenCLI workspace not found: ${workspace}`);
    }

    if (ownerSessionId) {
      const sessionWorkspaceName = this.readSessionWorkspaceMap()[ownerSessionId];
      if (sessionWorkspaceName) {
        const mappedPath = workspaceMap[sessionWorkspaceName];
        if (mappedPath) {
          return { name: sessionWorkspaceName, path: mappedPath };
        }
      }
    }

    return undefined;
  }

  private readSidofunConfig(): Record<string, unknown> {
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

  private writeSidofunConfig(config: Record<string, unknown>): void {
    fs.mkdirSync(path.dirname(SIDOFUN_CONFIG_FILE), { recursive: true });
    fs.writeFileSync(SIDOFUN_CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  }

  private ensureRecord(parent: Record<string, unknown>, key: string): Record<string, unknown> {
    const current = parent[key];
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      return current as Record<string, unknown>;
    }
    const created: Record<string, unknown> = {};
    parent[key] = created;
    return created;
  }
}
