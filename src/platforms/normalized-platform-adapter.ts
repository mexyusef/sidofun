import type { NormalizedScreenConfig } from '../config/constants.js';
import type { PlatformAdapter, DesktopActionRequest } from './platform-adapter.js';
import type { Point, ScreenSize, ScreenshotResult } from '../services/windows-nutjs.js';
import { normalizeScreenshotResult } from '../services/screenshots/normalized-screenshot.js';

interface WindowRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class NormalizedPlatformAdapter implements PlatformAdapter {
  constructor(
    private readonly base: PlatformAdapter,
    private readonly target: NormalizedScreenConfig
  ) {}

  async executeDesktopAction(action: DesktopActionRequest): Promise<unknown> {
    const actual = await this.base.getScreenSize();
    const scaledAction = this.scaleActionToActual(action, actual);
    const result = await this.base.executeDesktopAction(scaledAction);
    return this.scaleResultToTarget(action.type, result, actual);
  }

  async getScreenSize(): Promise<ScreenSize> {
    return { ...this.target };
  }

  async getMousePosition(): Promise<Point> {
    const actual = await this.base.getMousePosition();
    const screen = await this.base.getScreenSize();
    return this.scalePointFromActual(actual, screen);
  }

  async takeScreenshot(
    format = 'png',
    filename?: string,
    returnBase64 = false
  ): Promise<ScreenshotResult> {
    const screenshot = await this.base.takeScreenshot(format, filename, false);
    return this.resizeScreenshotResult(screenshot, format, filename, returnBase64);
  }

  async screenshotWin32(
    windowHandle?: number,
    filename?: string,
    returnBase64 = false,
    format = 'png'
  ): Promise<ScreenshotResult> {
    const screenshot = await this.base.screenshotWin32(windowHandle, filename, false, format);
    return this.resizeScreenshotResult(screenshot, format, filename, returnBase64);
  }

  private scaleActionToActual(action: DesktopActionRequest, actual: ScreenSize): DesktopActionRequest {
    const scaleX = actual.width / this.target.width;
    const scaleY = actual.height / this.target.height;
    const scaled: DesktopActionRequest = { ...action };

    if (action.coordinates && this.isPoint(action.coordinates)) {
      scaled.coordinates = this.scalePointToActual(action.coordinates, actual);
    }

    if (Array.isArray(action.path)) {
      scaled.path = action.path
        .filter((point): point is Point => this.isPoint(point))
        .map((point) => this.scalePointToActual(point, actual));
    }

    if (typeof action.x === 'number') {
      scaled.x = Math.round(action.x * scaleX);
    }
    if (typeof action.y === 'number') {
      scaled.y = Math.round(action.y * scaleY);
    }
    if (typeof action.width === 'number') {
      scaled.width = Math.max(1, Math.round(action.width * scaleX));
    }
    if (typeof action.height === 'number') {
      scaled.height = Math.max(1, Math.round(action.height * scaleY));
    }

    return scaled;
  }

  private scaleResultToTarget(type: DesktopActionRequest['type'], result: unknown, actual: ScreenSize): unknown {
    if (!result || typeof result !== 'object') {
      return result;
    }

    if (type === 'get_active_window') {
      const record = result as { rect?: unknown };
      if (record.rect && this.isRect(record.rect)) {
        return {
          ...(result as Record<string, unknown>),
          rect: this.scaleRectFromActual(record.rect, actual)
        };
      }
      return result;
    }

    if (type === 'get_window_info') {
      const record = result as { rect?: unknown };
      if (record.rect && this.isRect(record.rect)) {
        return {
          ...(result as Record<string, unknown>),
          rect: this.scaleRectFromActual(record.rect, actual)
        };
      }
      return result;
    }

    if (type === 'list_windows' && Array.isArray(result)) {
      return result.map((entry) => {
        if (entry && typeof entry === 'object' && this.isRect((entry as { rect?: unknown }).rect)) {
          return {
            ...(entry as Record<string, unknown>),
            rect: this.scaleRectFromActual((entry as { rect: WindowRect }).rect, actual)
          };
        }
        return entry;
      });
    }

    if (type === 'get_window_rect' && this.isRect(result)) {
      return this.scaleRectFromActual(result, actual);
    }

    return result;
  }

  private scalePointToActual(point: Point, actual: ScreenSize): Point {
    return {
      x: Math.round((point.x / this.target.width) * actual.width),
      y: Math.round((point.y / this.target.height) * actual.height)
    };
  }

  private scalePointFromActual(point: Point, actual: ScreenSize): Point {
    return {
      x: Math.round((point.x / actual.width) * this.target.width),
      y: Math.round((point.y / actual.height) * this.target.height)
    };
  }

  private scaleRectFromActual(rect: WindowRect, actual: ScreenSize): WindowRect {
    return {
      x: Math.round((rect.x / actual.width) * this.target.width),
      y: Math.round((rect.y / actual.height) * this.target.height),
      width: Math.max(1, Math.round((rect.width / actual.width) * this.target.width)),
      height: Math.max(1, Math.round((rect.height / actual.height) * this.target.height))
    };
  }

  private async resizeScreenshotResult(
    screenshot: ScreenshotResult,
    format: string,
    filename?: string,
    returnBase64 = false
  ): Promise<ScreenshotResult> {
    return normalizeScreenshotResult(screenshot, this.target, {
      format,
      filename,
      returnBase64
    });
  }

  private isPoint(value: unknown): value is Point {
    return Boolean(
      value &&
      typeof value === 'object' &&
      typeof (value as Point).x === 'number' &&
      typeof (value as Point).y === 'number'
    );
  }

  private isRect(value: unknown): value is WindowRect {
    return Boolean(
      value &&
      typeof value === 'object' &&
      typeof (value as WindowRect).x === 'number' &&
      typeof (value as WindowRect).y === 'number' &&
      typeof (value as WindowRect).width === 'number' &&
      typeof (value as WindowRect).height === 'number'
    );
  }
}
