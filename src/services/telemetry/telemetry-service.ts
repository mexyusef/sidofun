import fs from 'node:fs/promises';
import path from 'node:path';
import { SIDOFUN_APP_DIR } from '../../config/constants.js';
import {
  TraceRecorder,
  TrajectoryRecorder,
  summarizeForTrajectory,
  type TraceRecord,
  type TrajectoryTurnRecord
} from '../../telemetry/trajectory-recorder.js';

export interface ActiveTraceSession {
  id: string;
  kind: 'trace';
  name: string;
  createdAt: string;
  outputPath: string;
  metadata: Record<string, unknown>;
  stopped?: boolean;
}

export interface ActiveTrajectorySession {
  id: string;
  kind: 'trajectory';
  name: string;
  createdAt: string;
  outputPath: string;
  metadata: Record<string, unknown>;
  turns: number;
  stopped?: boolean;
}

export interface TelemetryBundle<TSession, TRecord> {
  format: 'sidofun.telemetry.bundle.v1';
  exportedAt: string;
  session: TSession;
  records: TRecord[];
  count: number;
}

export class TelemetryService {
  private readonly traceSessions = new Map<string, { info: ActiveTraceSession; recorder: TraceRecorder }>();
  private readonly trajectorySessions = new Map<string, { info: ActiveTrajectorySession; recorder: TrajectoryRecorder }>();
  private readonly outputDir: string;

  constructor(outputDir = path.join(SIDOFUN_APP_DIR, 'telemetry')) {
    this.outputDir = outputDir;
  }

  private metadataPath(id: string) {
    return path.join(this.outputDir, `${id}.json`);
  }

  private traceOutputPath(id: string) {
    return path.join(this.outputDir, `${id}.ndjson`);
  }

  private async saveSessionMetadata(session: ActiveTraceSession | ActiveTrajectorySession) {
    await fs.mkdir(this.outputDir, { recursive: true });
    await fs.writeFile(this.metadataPath(session.id), JSON.stringify(session, null, 2), 'utf8');
  }

  private async readSessionMetadata<T extends ActiveTraceSession | ActiveTrajectorySession>(id: string): Promise<T> {
    const raw = await fs.readFile(this.metadataPath(id), 'utf8');
    return JSON.parse(raw) as T;
  }

  private async listSessionMetadata<T extends ActiveTraceSession | ActiveTrajectorySession>(prefix: 'trace_' | 'trajectory_'): Promise<T[]> {
    await fs.mkdir(this.outputDir, { recursive: true });
    const entries = await fs.readdir(this.outputDir);
    const files = entries.filter((entry) => entry.startsWith(prefix) && entry.endsWith('.json'));
    const sessions = await Promise.all(
      files.map(async (entry) => JSON.parse(await fs.readFile(path.join(this.outputDir, entry), 'utf8')) as T)
    );
    return sessions.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  private async readNdjsonRecords<T>(outputPath: string): Promise<T[]> {
    try {
      const raw = await fs.readFile(outputPath, 'utf8');
      return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as T);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  private async writeBundle(targetPath: string | undefined, bundle: unknown) {
    if (!targetPath) {
      return undefined;
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(bundle, null, 2), 'utf8');
    return targetPath;
  }

  async startTrace(options?: { name?: string; metadata?: Record<string, unknown> }) {
    await fs.mkdir(this.outputDir, { recursive: true });
    const id = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const recorder = new TraceRecorder(this.outputDir, `${id}.ndjson`);
    const info: ActiveTraceSession = {
      id,
      kind: 'trace',
      name: options?.name || id,
      createdAt: new Date().toISOString(),
      outputPath: recorder.outputPath,
      metadata: { ...(options?.metadata ?? {}) }
    };
    this.traceSessions.set(id, { info, recorder });
    await this.saveSessionMetadata(info);
    return info;
  }

  async listTraces() {
    return {
      traces: await this.listSessionMetadata<ActiveTraceSession>('trace_'),
      count: (await this.listSessionMetadata<ActiveTraceSession>('trace_')).length
    };
  }

  async getTrace(traceId: string) {
    return await this.readSessionMetadata<ActiveTraceSession>(traceId);
  }

  async addTraceMetadata(traceId: string, metadata: Record<string, unknown>) {
    const info = await this.readSessionMetadata<ActiveTraceSession>(traceId);
    info.metadata = {
      ...info.metadata,
      ...metadata
    };
    const recorder = this.traceSessions.get(traceId)?.recorder ?? new TraceRecorder(this.outputDir, `${traceId}.ndjson`);
    await recorder.record({
      timestamp: new Date().toISOString(),
      source: 'platform',
      operation: 'trace_metadata',
      status: 'success',
      durationMs: 0,
      metadata: summarizeForTrajectory(metadata) as Record<string, unknown>
    });
    await this.saveSessionMetadata(info);
    return info;
  }

  async appendTrace(traceId: string, record: Omit<TraceRecord, 'timestamp'> & { timestamp?: string }) {
    await this.readSessionMetadata<ActiveTraceSession>(traceId);
    const recorder = this.traceSessions.get(traceId)?.recorder ?? new TraceRecorder(this.outputDir, `${traceId}.ndjson`);
    const normalized: TraceRecord = {
      ...record,
      timestamp: record.timestamp || new Date().toISOString(),
      input: summarizeForTrajectory(record.input),
      output: summarizeForTrajectory(record.output)
    };
    await recorder.record(normalized);
    return {
      traceId,
      appended: true
    };
  }

  async stopTrace(traceId: string) {
    const info = await this.readSessionMetadata<ActiveTraceSession>(traceId);
    info.stopped = true;
    this.traceSessions.delete(traceId);
    await this.saveSessionMetadata(info);
    return {
      ...info,
      stopped: true
    };
  }

  async exportTrace(traceId: string, targetPath?: string) {
    const session = await this.readSessionMetadata<ActiveTraceSession>(traceId);
    const records = await this.readNdjsonRecords<TraceRecord>(session.outputPath);
    const bundle: TelemetryBundle<ActiveTraceSession, TraceRecord> = {
      format: 'sidofun.telemetry.bundle.v1',
      exportedAt: new Date().toISOString(),
      session,
      records,
      count: records.length
    };
    const outputPath = await this.writeBundle(targetPath, bundle);
    return {
      ...bundle,
      outputPath
    };
  }

  async startTrajectory(options?: { name?: string; metadata?: Record<string, unknown> }) {
    await fs.mkdir(this.outputDir, { recursive: true });
    const id = `trajectory_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const recorder = new TrajectoryRecorder(this.outputDir, `${id}.ndjson`);
    const info: ActiveTrajectorySession = {
      id,
      kind: 'trajectory',
      name: options?.name || id,
      createdAt: new Date().toISOString(),
      outputPath: recorder.outputPath,
      metadata: { ...(options?.metadata ?? {}) },
      turns: 0
    };
    this.trajectorySessions.set(id, { info, recorder });
    await this.saveSessionMetadata(info);
    return info;
  }

  async listTrajectories() {
    return {
      trajectories: await this.listSessionMetadata<ActiveTrajectorySession>('trajectory_'),
      count: (await this.listSessionMetadata<ActiveTrajectorySession>('trajectory_')).length
    };
  }

  async getTrajectory(trajectoryId: string) {
    return await this.readSessionMetadata<ActiveTrajectorySession>(trajectoryId);
  }

  async appendTurn(trajectoryId: string, turn: Omit<TrajectoryTurnRecord, 'timestamp'> & { timestamp?: string }) {
    const info = await this.readSessionMetadata<ActiveTrajectorySession>(trajectoryId);
    const recorder = this.trajectorySessions.get(trajectoryId)?.recorder ?? new TrajectoryRecorder(this.outputDir, `${trajectoryId}.ndjson`);
    const normalized: TrajectoryTurnRecord = {
      ...turn,
      timestamp: turn.timestamp || new Date().toISOString(),
      prompt: summarizeForTrajectory(turn.prompt),
      response: summarizeForTrajectory(turn.response),
      actions: summarizeForTrajectory(turn.actions) as unknown[],
      screenshots: summarizeForTrajectory(turn.screenshots) as unknown[],
      metadata: summarizeForTrajectory(turn.metadata) as Record<string, unknown> | undefined
    };
    await recorder.record(normalized);
    info.turns += 1;
    await this.saveSessionMetadata(info);
    return {
      trajectoryId,
      turns: info.turns,
      appended: true
    };
  }

  async stopTrajectory(trajectoryId: string) {
    const info = await this.readSessionMetadata<ActiveTrajectorySession>(trajectoryId);
    info.stopped = true;
    this.trajectorySessions.delete(trajectoryId);
    await this.saveSessionMetadata(info);
    return {
      ...info,
      stopped: true
    };
  }

  async exportTrajectory(trajectoryId: string, targetPath?: string) {
    const session = await this.readSessionMetadata<ActiveTrajectorySession>(trajectoryId);
    const records = await this.readNdjsonRecords<TrajectoryTurnRecord>(session.outputPath);
    const bundle: TelemetryBundle<ActiveTrajectorySession, TrajectoryTurnRecord> = {
      format: 'sidofun.telemetry.bundle.v1',
      exportedAt: new Date().toISOString(),
      session,
      records,
      count: records.length
    };
    const outputPath = await this.writeBundle(targetPath, bundle);
    return {
      ...bundle,
      outputPath
    };
  }
}
