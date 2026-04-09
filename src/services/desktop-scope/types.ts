import type { ScreenshotResult } from '../../services/windows-nutjs.js';
import type { WindowInfo } from '../process-window/types.js';

export interface ScopeRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopScopeCreateOptions {
  windowHandles?: number[];
  processIds?: number[];
  titleQuery?: string;
  name?: string;
}

export interface DesktopScopeTarget {
  x: number;
  y: number;
}

export interface DesktopScopeRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  selectors: {
    windowHandles: number[];
    processIds: number[];
    titleQuery?: string;
  };
}

export interface DesktopScopeWindowSnapshot extends WindowInfo {
  relativeRect: ScopeRect;
}

export interface DesktopScopeInfo extends DesktopScopeRecord {
  alive: boolean;
  bounds: ScopeRect;
  windows: DesktopScopeWindowSnapshot[];
  activeWindowHandle?: number;
}

export interface DesktopScopeListResult {
  scopes: DesktopScopeInfo[];
  count: number;
}

export interface DesktopScopeScreenshotResult extends ScreenshotResult {
  scopeId: string;
  bounds: ScopeRect;
}
