/**
 * CMD Window Manager
 *
 * Manages discovery, focus, and geometry of CMD.exe windows.
 * Uses libnut-core native addon for window operations.
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { LIBNUT_PATH } from '../../config/index.js';

let libnut: any = null;

try {
  if (fs.existsSync(LIBNUT_PATH)) {
    libnut = require(LIBNUT_PATH);
  } else {
    throw new Error(`libnut-core not found at: ${LIBNUT_PATH}`);
  }
} catch (error) {
  console.error('❌ Failed to load libnut-core in CMDWindowManager:', error);
  throw error;
}

export interface CMDWindowInfo {
  handle: number;
  title: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface PowerShellWindowInfo {
  handle: number;
  title: string;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CMDGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  windowWidth: number;
  windowHeight: number;
}

export interface WindowHostInfo {
  pid?: number;
  processName?: string;
  mainWindowTitle?: string;
  executablePath?: string;
  terminalKind: 'windows_terminal' | 'console' | 'unknown';
}

export class CMDWindowManager {
  protected getLibnut() {
    return libnut;
  }

  /**
   * Find all CMD windows
   */
  async findCMDWindows(): Promise<CMDWindowInfo[]> {
    const windows = libnut.getWindows();
    const cmdWindows: CMDWindowInfo[] = [];

    console.log(`🔍 libnut.getWindows() returned ${windows.length} windows`);

    for (const handle of windows) {
      try {
        const title = libnut.getWindowTitle(handle);
        if (this.isCMDWindow(title)) {
          // Try to get window rect with timeout protection
          const rect = libnut.getWindowRect(handle);
          cmdWindows.push({
            handle,
            title,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          });
          console.log(`  ✅ Found CMD window: ${title} (handle: ${handle})`);
        }
      } catch (error) {
        // Skip windows that cause errors (stale handles, etc.)
        console.log(`  ⚠️ Skipping window handle ${handle}: ${error}`);
      }
    }

    return cmdWindows;
  }

  /**
   * Find a CMD window by title pattern
   */
  async findCMDByTitle(titlePattern: string): Promise<number | null> {
    const cmdWindows = await this.findCMDWindows();
    const matched = cmdWindows.find(w =>
      w.title.toLowerCase().includes(titlePattern.toLowerCase())
    );
    return matched?.handle || null;
  }

  /**
   * Get the currently active CMD window (if focused)
   */
  async getActiveCMD(): Promise<number | null> {
    const active = libnut.getActiveWindow();
    const title = libnut.getWindowTitle(active);

    if (this.isCMDWindow(title)) {
      return active;
    }

    return null;
  }

  /**
   * Check if a window title indicates a CMD window
   * Only matches our Sidofun_ automation windows to avoid conflicts
   */
  private isCMDWindow(title: string): boolean {
    if (!title) return false;
    const lower = title.toLowerCase();
    // Only match windows created by our automation (Sidofun_ prefix)
    // This prevents conflicts with other CMD windows
    return lower.includes('sidofun_');
  }

  /**
   * Focus a specific CMD window by handle
   * If handle is invalid, tries to find the window by title pattern from the session title
   */
  async focusCMD(handle: number, title?: string): Promise<void> {
    try {
      libnut.focusWindow(handle);
      await this.delay(100);

      // Verify focus
      const active = libnut.getActiveWindow();
      if (active !== handle) {
        // Handle might be stale, try to find by title if provided
        if (title) {
          console.log(`⚠️ Handle ${handle} invalid, searching by title: ${title}`);
          const newHandle = await this.findCMDByTitle(title);
          if (newHandle) {
            console.log(`✅ Found window with new handle: ${newHandle}`);
            libnut.focusWindow(newHandle);
            await this.delay(100);
            return;
          }
        }
        throw new Error(`Failed to focus CMD window: ${handle}`);
      }
    } catch (error: any) {
      // If focus fails and we have a title, try re-finding the window
      if (title) {
        console.log(`⚠️ Focus failed for handle ${handle}, searching by title: ${title}`);
        const newHandle = await this.findCMDByTitle(title);
        if (newHandle) {
          console.log(`✅ Found window with new handle: ${newHandle}`);
          libnut.focusWindow(newHandle);
          await this.delay(100);
          return;
        }
      }
      throw error;
    }
  }

  /**
   * Get CMD window geometry (position and size)
   */
  async getCMDGeometry(handle: number): Promise<CMDGeometry> {
    const rect = libnut.getWindowRect(handle);

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      windowWidth: rect.width,
      windowHeight: rect.height
    };
  }

  /**
   * Resize and/or move a CMD window
   */
  async resizeCMD(handle: number, geometry: Partial<CMDGeometry>): Promise<void> {
    // Move window if x/y provided
    if (geometry.x !== undefined && geometry.y !== undefined) {
      libnut.moveWindow(handle, { x: geometry.x, y: geometry.y });
      await this.delay(50);
    }

    // Resize window if width/height provided
    if (geometry.width && geometry.height) {
      libnut.resizeWindow(handle, {
        width: geometry.width,
        height: geometry.height
      });
      await this.delay(50);
    }
  }

  /**
   * Get the title of a CMD window
   */
  getWindowTitle(handle: number): string {
    return libnut.getWindowTitle(handle);
  }

  getWindowRect(handle: number): CMDGeometry {
    const rect = libnut.getWindowRect(handle);
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      windowWidth: rect.width,
      windowHeight: rect.height
    };
  }

  getWindowHostInfo(handle: number, title?: string): WindowHostInfo {
    try {
      const normalizedTitle = title ? title.replace(/^"+|"+$/g, '') : '';
      const escapedTitle = normalizedTitle.replace(/'/g, "''");
      const script = [
        `$targetHandle = ${handle};`,
        `$targetTitle = '${escapedTitle}';`,
        '$proc = Get-Process | Where-Object { $_.MainWindowHandle -eq $targetHandle } | Select-Object -First 1 Id, ProcessName, MainWindowTitle, Path;',
        'if ($null -eq $proc -and $targetTitle) {',
        '  $proc = Get-Process | Where-Object { $_.MainWindowTitle -eq $targetTitle } | Select-Object -First 1 Id, ProcessName, MainWindowTitle, Path;',
        '}',
        'if ($null -eq $proc -and $targetTitle) {',
        '  $proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*$targetTitle*" } | Select-Object -First 1 Id, ProcessName, MainWindowTitle, Path;',
        '}',
        'if ($null -eq $proc) { return }',
        '$proc | ConvertTo-Json -Depth 3'
      ].join(' ');

      const raw = execFileSync('powershell', ['-NoProfile', '-Command', script], {
        encoding: 'utf8',
        timeout: 5000
      }).trim();

      if (!raw) {
        return { terminalKind: 'unknown' };
      }

      const parsed = JSON.parse(raw) as {
        Id?: number;
        ProcessName?: string;
        MainWindowTitle?: string;
        Path?: string;
      };

      const processName = parsed.ProcessName || undefined;
      const lower = processName?.toLowerCase();
      const terminalKind =
        lower === 'windowsterminal'
          ? 'windows_terminal'
          : lower
            ? 'console'
            : 'unknown';

      return {
        pid: parsed.Id,
        processName,
        mainWindowTitle: parsed.MainWindowTitle || undefined,
        executablePath: parsed.Path || undefined,
        terminalKind
      };
    } catch {
      return { terminalKind: 'unknown' };
    }
  }

  /**
   * Maximize a CMD window
   */
  async maximizeCMD(handle: number): Promise<void> {
    const fs = await import('fs');
    const { execSync } = await import('child_process');
    const scriptPath = path.resolve(process.cwd(), 'temp-maximize.ps1');
    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
}
"@
$hwnd = [IntPtr]::new(${handle})
[Win32]::ShowWindow($hwnd, 3)
`;
    try {
      await fs.promises.writeFile(scriptPath, psScript.trim(), 'utf8');
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 5000 });
      fs.unlinkSync(scriptPath);
      await this.delay(200);
    } catch (error) {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      throw new Error(`Failed to maximize CMD window: ${error}`);
    }
  }

  /**
   * Minimize a CMD window
   */
  async minimizeCMD(handle: number): Promise<void> {
    const fs = await import('fs');
    const { execSync } = await import('child_process');
    const scriptPath = path.resolve(process.cwd(), 'temp-minimize.ps1');
    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
}
"@
$hwnd = [IntPtr]::new(${handle})
[Win32]::ShowWindow($hwnd, 6)
`;
    try {
      await fs.promises.writeFile(scriptPath, psScript.trim(), 'utf8');
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 5000 });
      fs.unlinkSync(scriptPath);
      await this.delay(200);
    } catch (error) {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      throw new Error(`Failed to minimize CMD window: ${error}`);
    }
  }

  /**
   * Restore a CMD window (normalize from maximized/minimized)
   */
  async restoreCMD(handle: number): Promise<void> {
    const fs = await import('fs');
    const { execSync } = await import('child_process');
    const scriptPath = path.resolve(process.cwd(), 'temp-restore.ps1');
    const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hwnd, int nCmdShow);
}
"@
$hwnd = [IntPtr]::new(${handle})
[Win32]::ShowWindow($hwnd, 9)
`;
    try {
      await fs.promises.writeFile(scriptPath, psScript.trim(), 'utf8');
      execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, { timeout: 5000 });
      fs.unlinkSync(scriptPath);
      await this.delay(200);
    } catch (error) {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      throw new Error(`Failed to restore CMD window: ${error}`);
    }
  }

  /**
   * Delay helper
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== PowerShell Window Methods ====================

  /**
   * Find all PowerShell windows
   */
  async findPowerShellWindows(): Promise<PowerShellWindowInfo[]> {
    const windows = libnut.getWindows();
    const psWindows: PowerShellWindowInfo[] = [];

    console.log(`🔍 libnut.getWindows() returned ${windows.length} windows`);

    for (const handle of windows) {
      try {
        const title = libnut.getWindowTitle(handle);
        if (this.isPowerShellWindow(title)) {
          const rect = libnut.getWindowRect(handle);
          psWindows.push({
            handle,
            title,
            rect: {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height
            }
          });
          console.log(`  ✅ Found PowerShell window: ${title} (handle: ${handle})`);
        }
      } catch (error) {
        console.log(`  ⚠️ Skipping window handle ${handle}: ${error}`);
      }
    }

    return psWindows;
  }

  /**
   * Find a PowerShell window by title pattern
   */
  async findPowerShellByTitle(titlePattern: string): Promise<number | null> {
    const psWindows = await this.findPowerShellWindows();
    const matched = psWindows.find(w =>
      w.title.toLowerCase().includes(titlePattern.toLowerCase())
    );
    return matched?.handle || null;
  }

  /**
   * Check if a window title is a PowerShell window
   * Only matches our Sidofun_PS_ automation windows to avoid conflicts
   */
  private isPowerShellWindow(title: string): boolean {
    if (!title) return false;
    const lower = title.toLowerCase();
    // Only match windows created by our automation (Sidofun_PS_ prefix)
    return lower.includes('sidofun_ps_');
  }

  /**
   * Focus a PowerShell window by handle
   */
  async focusPowerShell(handle: number, title?: string): Promise<void> {
    try {
      libnut.focusWindow(handle);
      await this.delay(100);

      // Verify focus
      const active = libnut.getActiveWindow();
      if (active !== handle) {
        if (title) {
          console.log(`⚠️ Handle ${handle} invalid, searching by title: ${title}`);
          const newHandle = await this.findPowerShellByTitle(title);
          if (newHandle) {
            console.log(`✅ Found window with new handle: ${newHandle}`);
            libnut.focusWindow(newHandle);
            await this.delay(100);
            return;
          }
        }
        throw new Error(`Failed to focus PowerShell window: ${handle}`);
      }
    } catch (error: any) {
      if (title) {
        console.log(`⚠️ Focus failed for handle ${handle}, searching by title: ${title}`);
        const newHandle = await this.findPowerShellByTitle(title);
        if (newHandle) {
          console.log(`✅ Found window with new handle: ${newHandle}`);
          libnut.focusWindow(newHandle);
          await this.delay(100);
          return;
        }
      }
      throw error;
    }
  }

  /**
   * Maximize PowerShell window
   */
  async maximizePowerShell(handle: number): Promise<void> {
    await this.maximizeCMD(handle); // Same implementation
  }

  /**
   * Minimize PowerShell window
   */
  async minimizePowerShell(handle: number): Promise<void> {
    await this.minimizeCMD(handle); // Same implementation
  }

  /**
   * Restore PowerShell window
   */
  async restorePowerShell(handle: number): Promise<void> {
    await this.restoreCMD(handle); // Same implementation
  }
}
