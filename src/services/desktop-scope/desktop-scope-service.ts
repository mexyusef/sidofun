import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import type { PlatformAdapter } from '../../platforms/platform-adapter.js';
import type { ScreenshotResult } from '../windows-nutjs.js';
import type { ProcessWindowService } from '../process-window/process-window-service.js';
import type { WindowInfo } from '../process-window/types.js';
import type {
  DesktopScopeCreateOptions,
  DesktopScopeInfo,
  DesktopScopeListResult,
  DesktopScopeRecord,
  DesktopScopeScreenshotResult,
  DesktopScopeTarget
} from './types.js';

function rectRight(rect: { x: number; width: number }) {
  return rect.x + rect.width;
}

function rectBottom(rect: { y: number; height: number }) {
  return rect.y + rect.height;
}

function unionRects(rects: Array<{ x: number; y: number; width: number; height: number }>) {
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rectRight(rect)));
  const bottom = Math.max(...rects.map((rect) => rectBottom(rect)));
  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

function sanitizeName(name: string) {
  return name.replace(/[^a-z0-9_-]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'scope';
}

export class DesktopScopeService {
  private readonly scopes = new Map<string, DesktopScopeRecord>();

  constructor(
    private readonly platform: PlatformAdapter,
    private readonly processWindowService: ProcessWindowService
  ) {}

  async create(options: DesktopScopeCreateOptions): Promise<DesktopScopeInfo> {
    const windows = await this.resolveWindows(options);
    if (windows.length === 0) {
      throw new Error('desktop_scope_create did not match any visible windows');
    }

    const scopeId = `desktop_scope_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const createdAt = new Date().toISOString();
    const record: DesktopScopeRecord = {
      id: scopeId,
      name: options.name?.trim() || this.defaultName(options, windows),
      createdAt,
      updatedAt: createdAt,
      selectors: {
        windowHandles: [...new Set(windows.map((window) => window.handle))],
        processIds: [...new Set(windows.map((window) => window.pid).filter((value): value is number => typeof value === 'number'))],
        titleQuery: options.titleQuery
      }
    };

    this.scopes.set(scopeId, record);
    return await this.getInfo(scopeId);
  }

  registerScope(record: DesktopScopeRecord): DesktopScopeRecord {
    this.scopes.set(record.id, {
      ...record,
      selectors: {
        windowHandles: [...record.selectors.windowHandles],
        processIds: [...record.selectors.processIds],
        titleQuery: record.selectors.titleQuery
      }
    });
    return this.requireScope(record.id);
  }

  listScopeRecords(): DesktopScopeRecord[] {
    return [...this.scopes.values()].map((scope) => ({
      ...scope,
      selectors: {
        windowHandles: [...scope.selectors.windowHandles],
        processIds: [...scope.selectors.processIds],
        titleQuery: scope.selectors.titleQuery
      }
    }));
  }

  hasScope(scopeId: string): boolean {
    return this.scopes.has(scopeId);
  }

  async list(): Promise<DesktopScopeListResult> {
    const scopes = await Promise.all(
      [...this.scopes.keys()].map(async (scopeId) => this.getInfo(scopeId).catch(() => undefined))
    );
    const aliveScopes = scopes.filter((scope): scope is DesktopScopeInfo => Boolean(scope));
    return {
      scopes: aliveScopes,
      count: aliveScopes.length
    };
  }

  async getInfo(scopeId: string): Promise<DesktopScopeInfo> {
    const record = this.requireScope(scopeId);
    const windows = await this.resolveWindows(record.selectors);
    if (windows.length === 0) {
      return {
        ...record,
        alive: false,
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        windows: [],
        activeWindowHandle: undefined
      };
    }

    const bounds = unionRects(windows.map((window) => window.rect));
    const activeWindow = await this.platform.executeDesktopAction({ type: 'get_active_window' }) as { handle?: number } | undefined;
    const updated = {
      ...record,
      updatedAt: new Date().toISOString()
    };
    this.scopes.set(scopeId, updated);

    return {
      ...updated,
      alive: true,
      bounds,
      windows: windows.map((window) => ({
        ...window,
        relativeRect: {
          x: window.rect.x - bounds.x,
          y: window.rect.y - bounds.y,
          width: window.rect.width,
          height: window.rect.height
        }
      })),
      activeWindowHandle: activeWindow?.handle
    };
  }

  async focus(scopeId: string): Promise<{ scope: DesktopScopeInfo; message: string }> {
    const scope = await this.getInfo(scopeId);
    const target = scope.windows.find((window) => window.visible) ?? scope.windows[0];
    if (!target) {
      throw new Error(`Desktop scope ${scopeId} has no live windows to focus`);
    }

    await this.processWindowService.show(target.handle);
    await this.processWindowService.focus({ windowTitle: target.title, processName: target.processName });
    return {
      scope: await this.getInfo(scopeId),
      message: `Focused desktop scope: ${scopeId}`
    };
  }

  async screenshot(
    scopeId: string,
    options?: { filename?: string; returnBase64?: boolean; format?: 'png' | 'jpg' }
  ): Promise<DesktopScopeScreenshotResult> {
    const scope = await this.getInfo(scopeId);
    if (!scope.alive || scope.windows.length === 0) {
      throw new Error(`Desktop scope ${scopeId} has no live windows to capture`);
    }

    const format = options?.format ?? 'png';
    const tempFullPath = path.join(os.tmpdir(), `sidofun-scope-full-${Date.now()}.${format}`);
    const outputPath = path.resolve(process.cwd(), options?.filename || `desktop-scope-${sanitizeName(scope.name)}-${Date.now()}.${format}`);

    await this.platform.screenshotWin32(undefined, tempFullPath, false, format);

    try {
      const full = sharp(tempFullPath);
      const metadata = await full.metadata();
      const cropLeft = Math.max(0, scope.bounds.x);
      const cropTop = Math.max(0, scope.bounds.y);
      const availableWidth = Math.max(1, (metadata.width ?? scope.bounds.width) - cropLeft);
      const availableHeight = Math.max(1, (metadata.height ?? scope.bounds.height) - cropTop);
      const cropWidth = Math.max(1, Math.min(scope.bounds.width, availableWidth));
      const cropHeight = Math.max(1, Math.min(scope.bounds.height, availableHeight));

      const croppedBuffer = await full.extract({
        left: cropLeft,
        top: cropTop,
        width: cropWidth,
        height: cropHeight
      }).toBuffer();

      await fs.writeFile(outputPath, croppedBuffer);

      let data: string | undefined;
      if (options?.returnBase64) {
        data = `data:image/${format};base64,${croppedBuffer.toString('base64')}`;
      }

      return {
        scopeId,
        bounds: scope.bounds,
        filepath: outputPath,
        data,
        width: cropWidth,
        height: cropHeight,
        format
      };
    } finally {
      await fs.rm(tempFullPath, { force: true }).catch(() => undefined);
    }
  }

  async click(scopeId: string, target: DesktopScopeTarget, button: 'left' | 'right' | 'middle' = 'left') {
    const scope = await this.getInfo(scopeId);
    if (!scope.alive) {
      throw new Error(`Desktop scope ${scopeId} is not alive`);
    }

    const absolute = {
      x: scope.bounds.x + target.x,
      y: scope.bounds.y + target.y
    };
    await this.focus(scopeId);
    const message = await this.platform.executeDesktopAction({
      type: 'click',
      coordinates: absolute,
      button
    });
    return {
      scope: await this.getInfo(scopeId),
      coordinates: absolute,
      message: String(message)
    };
  }

  async type(scopeId: string, text: string) {
    await this.focus(scopeId);
    const message = await this.platform.executeDesktopAction({
      type: 'type',
      text
    });
    return {
      scope: await this.getInfo(scopeId),
      message: String(message)
    };
  }

  async close(scopeId: string) {
    const scope = this.requireScope(scopeId);
    this.scopes.delete(scopeId);
    return {
      id: scope.id,
      closed: true,
      message: `Desktop scope closed: ${scopeId}`
    };
  }

  private requireScope(scopeId: string): DesktopScopeRecord {
    const scope = this.scopes.get(scopeId);
    if (!scope) {
      throw new Error(`Desktop scope not found: ${scopeId}`);
    }
    return scope;
  }

  private async resolveWindows(options: DesktopScopeCreateOptions): Promise<WindowInfo[]> {
    const windows = await this.processWindowService.listWindows();
    const wantedHandles = new Set(options.windowHandles ?? []);
    const wantedPids = new Set(options.processIds ?? []);
    const titleQuery = options.titleQuery?.trim().toLowerCase();

    const matches = windows.filter((window) => {
      if (wantedHandles.size > 0 && wantedHandles.has(window.handle)) {
        return true;
      }
      if (wantedPids.size > 0 && typeof window.pid === 'number' && wantedPids.has(window.pid)) {
        return true;
      }
      if (titleQuery && window.title.toLowerCase().includes(titleQuery)) {
        return true;
      }
      return false;
    });

    if (wantedHandles.size === 0 && wantedPids.size === 0 && !titleQuery) {
      throw new Error('desktop scope requires windowHandles, processIds, or titleQuery');
    }

    return matches;
  }

  private defaultName(options: DesktopScopeCreateOptions, windows: WindowInfo[]) {
    if (options.titleQuery?.trim()) {
      return options.titleQuery.trim();
    }
    if (windows.length === 1) {
      return windows[0].title;
    }
    return `scope-${windows.length}-windows`;
  }
}
