import type { PlatformAdapter } from '../../platforms/platform-adapter.js';
import type { ProcessInfo, WindowInfo } from './types.js';

export class ProcessWindowService {
  constructor(private readonly platform: PlatformAdapter) {}

  async listProcesses(): Promise<ProcessInfo[]> {
    return await this.platform.executeDesktopAction({ type: 'list_processes' }) as ProcessInfo[];
  }

  async listWindows(): Promise<WindowInfo[]> {
    return await this.platform.executeDesktopAction({ type: 'list_windows' }) as WindowInfo[];
  }

  async getWindowInfo(windowHandle: number): Promise<WindowInfo> {
    return await this.platform.executeDesktopAction({
      type: 'get_window_info',
      windowHandle
    }) as WindowInfo;
  }

  async focus(options: { windowTitle?: string; processName?: string } = {}): Promise<string> {
    return await this.platform.executeDesktopAction({
      type: 'focus_window',
      windowTitle: options.windowTitle,
      processName: options.processName
    }) as string;
  }

  async show(windowHandle: number): Promise<string> {
    return await this.platform.executeDesktopAction({ type: 'show_window', windowHandle }) as string;
  }

  async hide(windowHandle: number): Promise<string> {
    return await this.platform.executeDesktopAction({ type: 'hide_window', windowHandle }) as string;
  }

  async maximize(windowHandle: number): Promise<string> {
    return await this.platform.executeDesktopAction({ type: 'maximize_window', windowHandle }) as string;
  }

  async minimize(windowHandle: number): Promise<string> {
    return await this.platform.executeDesktopAction({ type: 'minimize_window', windowHandle }) as string;
  }

  async restore(windowHandle: number): Promise<string> {
    return await this.platform.executeDesktopAction({ type: 'restore_window', windowHandle }) as string;
  }

  async close(windowHandle: number): Promise<string> {
    return await this.platform.executeDesktopAction({ type: 'close_window', windowHandle }) as string;
  }

  async move(windowHandle: number, x: number, y: number): Promise<string> {
    return await this.platform.executeDesktopAction({
      type: 'move_window',
      windowHandle,
      x,
      y
    }) as string;
  }

  async resize(windowHandle: number, width: number, height: number): Promise<string> {
    return await this.platform.executeDesktopAction({
      type: 'resize_window',
      windowHandle,
      width,
      height
    }) as string;
  }

  async dragMove(windowHandle: number, x: number, y: number): Promise<string> {
    return await this.platform.executeDesktopAction({
      type: 'drag_window_move',
      windowHandle,
      x,
      y
    }) as string;
  }

  async dragResize(windowHandle: number, width: number, height: number): Promise<string> {
    return await this.platform.executeDesktopAction({
      type: 'drag_window_resize',
      windowHandle,
      width,
      height
    }) as string;
  }
}
