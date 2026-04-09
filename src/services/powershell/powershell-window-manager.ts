/**
 * PowerShell Window Manager Extension
 * 
 * Adds PowerShell window detection to CMDWindowManager
 */

import { CMDWindowManager } from '../cmd/cmd-window-manager.js';

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

export class PowerShellWindowManager extends CMDWindowManager {
  /**
   * Find all PowerShell windows
   */
  async findPowerShellWindows(): Promise<PowerShellWindowInfo[]> {
    const libnut = this.getLibnut();
    const windows = libnut.getWindows();
    const psWindows: PowerShellWindowInfo[] = [];

    console.log(`🔍 libnut.getWindows() returned ${windows.length} windows`);

    for (const handle of windows) {
      try {
        const title = libnut.getWindowTitle(handle);
        if (this.matchesPowerShellWindow(title)) {
          // Try to get window rect with timeout protection
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
        // Skip windows that cause errors (stale handles, etc.)
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
  private matchesPowerShellWindow(title: string): boolean {
    if (!title) return false;
    const lower = title.toLowerCase();
    // Only match windows created by our automation (Sidofun_PS_ prefix)
    // This prevents conflicts with other PowerShell windows
    return lower.includes('sidofun_ps_');
  }

  /**
   * Focus a PowerShell window by handle
   */
  async focusPowerShell(handle: number, title?: string): Promise<void> {
    const libnut = this.getLibnut();

    try {
      libnut.focusWindow(handle);
      await this.delay(100);

      // Verify focus
      const active = libnut.getActiveWindow();
      if (active !== handle) {
        // Handle might be stale, try to find by title if provided
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
      // If focus fails and we have a title, try re-finding the window
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

}
