import type { PlatformAdapter } from '../../platforms/platform-adapter.js';

export interface ClipboardStatus {
  text: string;
  length: number;
  hasText: boolean;
}

export class ClipboardService {
  constructor(private readonly platform: PlatformAdapter) {}

  async read(): Promise<string> {
    return String(await this.platform.executeDesktopAction({ type: 'get_clipboard' }) ?? '');
  }

  async write(text: string): Promise<{ message: string; length: number }> {
    await this.platform.executeDesktopAction({
      type: 'set_clipboard',
      text
    });

    return {
      message: 'Clipboard updated',
      length: text.length
    };
  }

  async clear(): Promise<{ message: string }> {
    await this.platform.executeDesktopAction({
      type: 'set_clipboard',
      text: ''
    });

    return { message: 'Clipboard cleared' };
  }

  async status(): Promise<ClipboardStatus> {
    const text = await this.read();
    return {
      text,
      length: text.length,
      hasText: text.length > 0
    };
  }
}
