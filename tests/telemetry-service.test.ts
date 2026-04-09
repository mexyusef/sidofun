import { describe, expect, test } from 'bun:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { TelemetryService } from '../src/services/telemetry/telemetry-service.js';

describe('TelemetryService', () => {
  test('exports trace and trajectory bundles with records', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sidofun-telemetry-test-'));
    const service = new TelemetryService(tempDir);

    const trace = await service.startTrace({ name: 'trace-demo' });
    await service.appendTrace(trace.id, {
      source: 'platform',
      operation: 'click',
      status: 'success',
      durationMs: 10
    });
    const exportedTracePath = path.join(tempDir, 'trace-bundle.json');
    const exportedTrace = await service.exportTrace(trace.id, exportedTracePath);

    expect(exportedTrace.format).toBe('sidofun.telemetry.bundle.v1');
    expect(exportedTrace.count).toBe(1);
    expect(exportedTrace.outputPath).toBe(exportedTracePath);
    expect((await fs.readFile(exportedTracePath, 'utf8')).includes('"operation": "click"')).toBe(true);

    const trajectory = await service.startTrajectory({ name: 'trajectory-demo' });
    await service.appendTurn(trajectory.id, {
      turnId: 'turn_1',
      prompt: 'hello'
    });
    const exportedTrajectory = await service.exportTrajectory(trajectory.id);

    expect(exportedTrajectory.format).toBe('sidofun.telemetry.bundle.v1');
    expect(exportedTrajectory.count).toBe(1);
    expect(exportedTrajectory.records[0]?.turnId).toBe('turn_1');
    expect(exportedTrajectory.outputPath).toBeUndefined();
  });
});
