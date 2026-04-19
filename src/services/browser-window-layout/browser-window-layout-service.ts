import type { BrowserService } from '../browser/browser-service.js';
import type { BrowserWindowInfo } from '../browser/types.js';
import type { BrowserAutomationService } from '../browser-automation/browser-automation-service.js';
import type { BrowserRuntimeInfo } from '../browser-automation/types.js';
import type { ProcessWindowService } from '../process-window/process-window-service.js';

export interface BrowserRuntimeWindowBinding {
  runtimeId: string;
  browserId: string;
  pid?: number;
  matched: boolean;
  matchKind: 'pid' | 'metadata' | 'none';
  window?: BrowserWindowInfo;
  runtime: BrowserRuntimeInfo;
}

export interface BrowserWindowTileOptions {
  runtimeIds?: string[];
  preset?: '2-up' | '3-column' | '2x2' | 'main-left' | 'main-right' | 'newsroom-5' | 'newsroom-6';
  columns?: number;
  area?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  gap?: number;
}

export interface BrowserWindowTileResult {
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  columns: number;
  rows: number;
  gap: number;
  windows: Array<{
    runtimeId: string;
    windowHandle: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

interface BrowserWindowLayoutServiceOptions {
  browserService: Pick<BrowserService, 'listWindows'>;
  browserAutomationService: Pick<BrowserAutomationService, 'listRuntimes' | 'getRuntime' | 'registerRuntime'>;
  processWindowService: Pick<ProcessWindowService, 'move' | 'resize' | 'restore'>;
  screenSize: () => Promise<{ width: number; height: number }>;
  now?: () => Date;
}

export class BrowserWindowLayoutService {
  private readonly browserService: Pick<BrowserService, 'listWindows'>;
  private readonly browserAutomationService: Pick<BrowserAutomationService, 'listRuntimes' | 'getRuntime' | 'registerRuntime'>;
  private readonly processWindowService: Pick<ProcessWindowService, 'move' | 'resize' | 'restore'>;
  private readonly screenSize: () => Promise<{ width: number; height: number }>;
  private readonly now: () => Date;

  constructor(options: BrowserWindowLayoutServiceOptions) {
    this.browserService = options.browserService;
    this.browserAutomationService = options.browserAutomationService;
    this.processWindowService = options.processWindowService;
    this.screenSize = options.screenSize;
    this.now = options.now || (() => new Date());
  }

  listRuntimeWindows(runtimeIds?: string[]): BrowserRuntimeWindowBinding[] {
    const runtimes = this.browserAutomationService
      .listRuntimes()
      .filter((runtime) => !runtimeIds || runtimeIds.includes(runtime.id));

    return runtimes.map((runtime) => this.resolveRuntimeWindow(runtime));
  }

  bindRuntimeWindow(runtimeId: string, windowHandle?: number): BrowserRuntimeWindowBinding {
    const runtime = this.browserAutomationService.getRuntime(runtimeId);
    const binding = this.resolveRuntimeWindow(runtime, windowHandle);
    if (!binding.window) {
      return binding;
    }

    const updatedRuntime: BrowserRuntimeInfo = {
      ...runtime,
      command: [...runtime.command],
      usedProfile: runtime.usedProfile ? {
        ...runtime.usedProfile,
        emails: [...runtime.usedProfile.emails]
      } : undefined,
      launchResult: {
        ...runtime.launchResult,
        command: [...runtime.launchResult.command],
        usedProfile: runtime.launchResult.usedProfile ? {
          ...runtime.launchResult.usedProfile,
          emails: [...runtime.launchResult.usedProfile.emails]
        } : undefined
      },
      windowHandle: binding.window.handle,
      windowTitle: binding.window.title,
      windowBounds: binding.window.bounds ? { ...binding.window.bounds } : undefined,
      windowBindingUpdatedAt: this.now().toISOString()
    };

    this.browserAutomationService.registerRuntime(updatedRuntime);
    return {
      ...binding,
      runtime: updatedRuntime
    };
  }

  async tileRuntimeWindows(options: BrowserWindowTileOptions = {}): Promise<BrowserWindowTileResult> {
    const bindings = this.listRuntimeWindows(options.runtimeIds)
      .filter((binding) => binding.window?.handle);
    if (bindings.length === 0) {
      throw new Error('No browser runtime windows available for tiling');
    }

    const screen = await this.screenSize();
    const gap = Math.max(0, options.gap ?? 12);
    const area = options.area || { x: 0, y: 0, width: screen.width, height: screen.height };
    const preset = options.preset;
    const columns = Math.max(1, options.columns ?? this.columnsForPreset(preset, bindings.length) ?? Math.ceil(Math.sqrt(bindings.length)));
    const rows = Math.max(1, Math.ceil(bindings.length / columns));
    const tiled: BrowserWindowTileResult['windows'] = [];

    for (let index = 0; index < bindings.length; index += 1) {
      const binding = bindings[index];
      const windowHandle = binding.window!.handle;
      const tile = this.computeTileRect(index, bindings.length, {
        area,
        gap,
        columns,
        rows,
        preset
      });

      await this.processWindowService.restore(windowHandle).catch(() => undefined);
      await this.processWindowService.move(windowHandle, tile.x, tile.y);
      await this.processWindowService.resize(windowHandle, tile.width, tile.height);

      tiled.push({
        runtimeId: binding.runtimeId,
        windowHandle,
        x: tile.x,
        y: tile.y,
        width: tile.width,
        height: tile.height
      });
    }

    return {
      area,
      columns,
      rows,
      gap,
      windows: tiled
    };
  }

  private resolveRuntimeWindow(runtime: BrowserRuntimeInfo, explicitWindowHandle?: number): BrowserRuntimeWindowBinding {
    const browserWindows = this.browserService.listWindows(runtime.browserId);
    const explicitMatch = typeof explicitWindowHandle === 'number'
      ? browserWindows.find((window) => window.handle === explicitWindowHandle)
      : undefined;
    if (explicitMatch) {
      return {
        runtimeId: runtime.id,
        browserId: runtime.browserId,
        pid: runtime.pid,
        matched: true,
        matchKind: 'metadata',
        window: explicitMatch,
        runtime
      };
    }

    const pidMatch = typeof runtime.pid === 'number'
      ? browserWindows.find((window) => window.pid === runtime.pid)
      : undefined;
    if (pidMatch) {
      return {
        runtimeId: runtime.id,
        browserId: runtime.browserId,
        pid: runtime.pid,
        matched: true,
        matchKind: 'pid',
        window: pidMatch,
        runtime
      };
    }

    const metadataMatch = runtime.windowHandle
      ? browserWindows.find((window) => window.handle === runtime.windowHandle)
      : undefined;
    if (metadataMatch) {
      return {
        runtimeId: runtime.id,
        browserId: runtime.browserId,
        pid: runtime.pid,
        matched: true,
        matchKind: 'metadata',
        window: metadataMatch,
        runtime
      };
    }

    const runtimeWindowTitle = runtime.windowTitle;
    const titleMatch = runtimeWindowTitle
      ? browserWindows.find((window) =>
        window.title === runtimeWindowTitle ||
        window.title.includes(runtimeWindowTitle) ||
        runtimeWindowTitle.includes(window.title)
      )
      : undefined;
    if (titleMatch) {
      return {
        runtimeId: runtime.id,
        browserId: runtime.browserId,
        pid: runtime.pid,
        matched: true,
        matchKind: 'metadata',
        window: titleMatch,
        runtime
      };
    }

    return {
      runtimeId: runtime.id,
      browserId: runtime.browserId,
      pid: runtime.pid,
      matched: false,
      matchKind: 'none',
      runtime
    };
  }

  private columnsForPreset(
    preset: BrowserWindowTileOptions['preset'],
    count: number
  ): number | undefined {
    switch (preset) {
      case '2-up':
        return 2;
      case '3-column':
        return 3;
      case '2x2':
        return Math.min(2, Math.max(1, count));
      case 'main-left':
      case 'main-right':
        return 2;
      case 'newsroom-5':
      case 'newsroom-6':
        return 3;
      default:
        return undefined;
    }
  }

  private computeTileRect(
    index: number,
    count: number,
    options: {
      area: { x: number; y: number; width: number; height: number };
      gap: number;
      columns: number;
      rows: number;
      preset?: BrowserWindowTileOptions['preset'];
    }
  ): { x: number; y: number; width: number; height: number } {
    const { area, gap, columns, rows, preset } = options;
    if ((preset === 'main-left' || preset === 'main-right') && count > 1) {
      const mainWidth = Math.max(1, Math.floor((area.width - gap) * 0.6));
      const stackWidth = Math.max(1, area.width - gap - mainWidth);
      if (index === 0) {
        const mainX = preset === 'main-right' ? area.x + stackWidth + gap : area.x;
        return {
          x: mainX,
          y: area.y,
          width: mainWidth,
          height: area.height
        };
      }
      const stackCount = count - 1;
      const stackHeight = Math.max(1, Math.floor((area.height - gap * Math.max(0, stackCount - 1)) / stackCount));
      const stackX = preset === 'main-right' ? area.x : area.x + mainWidth + gap;
      const stackIndex = index - 1;
      return {
        x: stackX,
        y: area.y + stackIndex * (stackHeight + gap),
        width: stackWidth,
        height: stackHeight
      };
    }

    if (preset === 'newsroom-5' && count >= 5) {
      const mainWidth = Math.max(1, Math.floor((area.width - gap) * 0.58));
      const sideAreaWidth = Math.max(1, area.width - gap - mainWidth);
      if (index === 0) {
        return {
          x: area.x,
          y: area.y,
          width: mainWidth,
          height: area.height
        };
      }

      const sideColumns = 2;
      const sideRows = 2;
      const sideCellWidth = Math.max(1, Math.floor((sideAreaWidth - gap) / sideColumns));
      const sideCellHeight = Math.max(1, Math.floor((area.height - gap) / sideRows));
      const sideIndex = Math.min(index - 1, 3);
      const sideColumn = sideIndex % sideColumns;
      const sideRow = Math.floor(sideIndex / sideColumns);
      return {
        x: area.x + mainWidth + gap + sideColumn * (sideCellWidth + gap),
        y: area.y + sideRow * (sideCellHeight + gap),
        width: sideCellWidth,
        height: sideCellHeight
      };
    }

    const cellWidth = Math.max(1, Math.floor((area.width - gap * (columns - 1)) / columns));
    const cellHeight = Math.max(1, Math.floor((area.height - gap * (rows - 1)) / rows));
    const column = index % columns;
    const row = Math.floor(index / columns);
    return {
      x: area.x + column * (cellWidth + gap),
      y: area.y + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight
    };
  }
}
