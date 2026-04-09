import type { PlatformAdapter, DesktopActionRequest } from './platform-adapter.js';
import type { Point, ScreenSize, ScreenshotResult } from '../services/windows-nutjs.js';
import { TraceRecorder, summarizeForTrajectory } from '../telemetry/trajectory-recorder.js';

export class TracingPlatformAdapter implements PlatformAdapter {
  constructor(
    private readonly base: PlatformAdapter,
    private readonly recorder: TraceRecorder
  ) {}

  async executeDesktopAction(action: DesktopActionRequest): Promise<unknown> {
    return this.trace('execute_desktop_action', action, () => this.base.executeDesktopAction(action));
  }

  async getScreenSize(): Promise<ScreenSize> {
    return this.trace('get_screen_size', undefined, () => this.base.getScreenSize());
  }

  async getMousePosition(): Promise<Point> {
    return this.trace('get_mouse_position', undefined, () => this.base.getMousePosition());
  }

  async takeScreenshot(format?: string, filename?: string, returnBase64?: boolean): Promise<ScreenshotResult> {
    return this.trace(
      'take_screenshot',
      { format, filename, returnBase64 },
      () => this.base.takeScreenshot(format, filename, returnBase64)
    );
  }

  async screenshotWin32(
    windowHandle?: number,
    filename?: string,
    returnBase64?: boolean,
    format?: string
  ): Promise<ScreenshotResult> {
    return this.trace(
      'screenshot_win32',
      { windowHandle, filename, returnBase64, format },
      () => this.base.screenshotWin32(windowHandle, filename, returnBase64, format)
    );
  }

  private async trace<T>(operation: string, input: unknown, fn: () => Promise<T>): Promise<T> {
    const startedAt = Date.now();

    try {
      const output = await fn();
      await this.recorder.record({
        timestamp: new Date().toISOString(),
        source: 'platform',
        operation,
        status: 'success',
        durationMs: Date.now() - startedAt,
        input: summarizeForTrajectory(input),
        output: summarizeForTrajectory(output)
      });
      return output;
    } catch (error: any) {
      await this.recorder.record({
        timestamp: new Date().toISOString(),
        source: 'platform',
        operation,
        status: 'error',
        durationMs: Date.now() - startedAt,
        input: summarizeForTrajectory(input),
        error: {
          message: error?.message || 'Unknown error'
        }
      });
      throw error;
    }
  }
}
