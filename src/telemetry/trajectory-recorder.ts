import fs from 'node:fs/promises';
import path from 'node:path';

export type TraceSource = 'platform' | 'terminal' | 'browser';
export type TraceStatus = 'success' | 'error';

export interface TraceRecord {
  timestamp: string;
  source: TraceSource;
  operation: string;
  status: TraceStatus;
  durationMs: number;
  input?: unknown;
  output?: unknown;
  error?: {
    message: string;
  };
  metadata?: Record<string, unknown>;
}

export interface TrajectoryTurnRecord {
  timestamp: string;
  turnId: string;
  role?: string;
  prompt?: unknown;
  response?: unknown;
  actions?: unknown[];
  screenshots?: unknown[];
  metadata?: Record<string, unknown>;
}

class JsonlRecorder<T> {
  constructor(private readonly filePath: string) {}

  get outputPath(): string {
    return this.filePath;
  }

  async record(record: T): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.appendFile(this.filePath, `${JSON.stringify(record)}\n`, 'utf8');
  }
}

export class TraceRecorder extends JsonlRecorder<TraceRecord> {
  constructor(traceDir: string, filename = `sidofun-trace-${process.pid}.ndjson`) {
    super(path.join(traceDir, filename));
  }
}

export class TrajectoryRecorder extends JsonlRecorder<TrajectoryTurnRecord> {
  constructor(traceDir: string, filename = `sidofun-trajectory-${process.pid}.ndjson`) {
    super(path.join(traceDir, filename));
  }
}

export function summarizeForTrajectory(value: unknown): unknown {
  if (value == null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((entry) => summarizeForTrajectory(entry));
  }

  if (typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const summary: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (key === 'data' && typeof entry === 'string' && entry.startsWith('data:image/')) {
      summary.data = '[base64 omitted]';
      continue;
    }

    if (typeof entry === 'string' && entry.length > 500) {
      summary[key] = `${entry.slice(0, 500)}...[truncated]`;
      continue;
    }

    summary[key] = summarizeForTrajectory(entry);
  }

  return summary;
}
