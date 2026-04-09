import type { PlatformAdapter, DesktopActionRequest } from '../platform-adapter.js';
import type { Point, ScreenSize, ScreenshotResult, WindowsNutJsService } from '../../services/windows-nutjs.js';

export class WindowsPlatformAdapter implements PlatformAdapter {
  constructor(private readonly nutJs: WindowsNutJsService) {}

  async executeDesktopAction(action: DesktopActionRequest): Promise<unknown> {
    return this.nutJs.executeAction(action);
  }

  async getScreenSize(): Promise<ScreenSize> {
    return this.nutJs.getScreenSize();
  }

  async getMousePosition(): Promise<Point> {
    return this.nutJs.getMousePosition();
  }

  async takeScreenshot(
    format = 'png',
    filename?: string,
    returnBase64 = false
  ): Promise<ScreenshotResult> {
    return this.nutJs.takeScreenshot(format, filename, returnBase64);
  }

  async screenshotWin32(
    windowHandle?: number,
    filename?: string,
    returnBase64 = false,
    format = 'png'
  ): Promise<ScreenshotResult> {
    return this.nutJs.screenshotWin32(windowHandle, filename, returnBase64, format);
  }
}
