import type { DesktopActionType } from '../core/command-schemas.js';
import type { Point, ScreenSize, ScreenshotResult } from '../services/windows-nutjs.js';

export interface DesktopActionRequest {
  type: DesktopActionType;
  [key: string]: unknown;
}

export interface PlatformAdapter {
  executeDesktopAction(action: DesktopActionRequest): Promise<unknown>;
  getScreenSize(): Promise<ScreenSize>;
  getMousePosition(): Promise<Point>;
  takeScreenshot(format?: string, filename?: string, returnBase64?: boolean): Promise<ScreenshotResult>;
  screenshotWin32(windowHandle?: number, filename?: string, returnBase64?: boolean, format?: string): Promise<ScreenshotResult>;
}
