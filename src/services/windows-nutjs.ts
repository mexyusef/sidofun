import path from 'path';
import fs from 'fs';
import { spawn, exec } from 'child_process';
import sharp from 'sharp';
import { resolveApplicationPath, isCmdApplication, LIBNUT_PATH } from '../config/index.js';

export interface Point {
  x: number;
  y: number;
}

export interface ScreenSize {
  width: number;
  height: number;
}

export interface ScreenshotResult {
  data?: string; // base64 encoded image (only if returnBase64 is true)
  filepath?: string; // path to saved screenshot file
  width: number;
  height: number;
  format: string;
}

// Load Windows libnut-core from configured path
let libnut: any = null;

try {
  if (fs.existsSync(LIBNUT_PATH)) {
    console.log('🪟 Loading Windows libnut-core from:', LIBNUT_PATH);
    libnut = require(LIBNUT_PATH);
    console.log('✅ Windows libnut-core loaded successfully');
  } else {
    throw new Error(`Windows libnut-core not found at: ${LIBNUT_PATH}`);
  }
} catch (error) {
  console.error('❌ Failed to load Windows libnut-core:', error);
  throw error;
}

export class WindowsNutJsService {
  private isInitialized = false;
  private initPromise: Promise<void>;

  constructor() {
    this.initPromise = this.init();
  }

  private async init() {
    try {
      console.log('🔧 Initializing Windows nut.js service...');

      // Test basic functionality
      const screenSize = libnut.getScreenSize();
      console.log(`📱 Screen detected: ${screenSize.width}x${screenSize.height}`);

      this.isInitialized = true;
      console.log('✅ Windows nut.js service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Windows nut.js service:', error);
      throw error;
    }
  }

  async executeAction(action: any): Promise<any> {
    await this.ensureInitialized();

    console.log(`🪟 [WINDOWS] Executing ${action.type}...`);

    switch (action.type) {
      // Existing (11)
      case 'click':
        return await this.handleClick(action);
      case 'drag_mouse':
        return await this.handleDrag(action);
      case 'move_mouse':
        return await this.handleMouseMove(action);
      case 'scroll':
        return await this.handleScroll(action);
      case 'type':
        return await this.handleType(action);
      case 'key_press':
        return await this.handleKeyPress(action);
      case 'screenshot':
        return await this.handleScreenshot(action);
      case 'screenshot_raw':
        return await this.handleScreenshotRaw(action);
      case 'screenshot_all':
        return await this.handleScreenshotAll(action);
      case 'screenshot_secondary':
        return await this.handleScreenshotSecondary(action);
      case 'screenshot_win32':
        return await this.handleScreenshotWin32(action);
      case 'get_screen_size':
        return await this.handleScreenSize(action);
      case 'get_mouse_position':
        return await this.handleMousePosition(action);
      case 'launch_application':
        return await this.handleLaunchApplication(action);
      case 'focus_window':
        return await this.handleFocusWindow(action);
      // Mouse (1 new)
      case 'set_mouse_delay':
        return await this.handleSetMouseDelay(action);
      // Keyboard (3 new)
      case 'key_toggle':
        return await this.handleKeyToggle(action);
      case 'type_delayed':
        return await this.handleTypeDelayed(action);
      case 'set_keyboard_delay':
        return await this.handleSetKeyboardDelay(action);
      // Screen (1 new)
      case 'highlight':
        return await this.handleHighlight(action);
      // Window (4 new)
      case 'get_active_window':
        return await this.handleGetActiveWindow(action);
      case 'get_window_rect':
        return await this.handleGetWindowRect(action);
      case 'get_window_info':
        return await this.handleGetWindowInfo(action);
      case 'list_processes':
        return await this.handleListProcesses();
      case 'list_windows':
        return await this.handleListWindows();
      case 'move_window':
        return await this.handleMoveWindow(action);
      case 'resize_window':
        return await this.handleResizeWindow(action);
      case 'drag_window_move':
        return await this.handleDragWindowMove(action);
      case 'drag_window_resize':
        return await this.handleDragWindowResize(action);
      case 'show_window':
        return await this.handleShowWindow(action, 5, 'show');
      case 'hide_window':
        return await this.handleShowWindow(action, 0, 'hide');
      case 'close_window':
        return await this.handleCloseWindow(action);
      case 'maximize_window':
        return await this.handleShowWindow(action, 3, 'maximize');
      case 'minimize_window':
        return await this.handleShowWindow(action, 6, 'minimize');
      case 'restore_window':
        return await this.handleShowWindow(action, 9, 'restore');
      case 'get_clipboard':
        return await this.handleGetClipboard();
      case 'set_clipboard':
        return await this.handleSetClipboard(action);
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
  }

  private async handleClick(action: any): Promise<string> {
    const { coordinates, button = 'left' } = action;

    console.log(`🖱️ Clicking ${button} at (${coordinates.x}, ${coordinates.y})`);

    const startTime = Date.now();

    // Move to position
    libnut.moveMouse(coordinates.x, coordinates.y);

    // Small delay to ensure position is set
    await this.delay(10);

    // Perform click
    libnut.mouseClick(button);

    const clickTime = Date.now() - startTime;
    console.log(`✅ Click completed in ${clickTime}ms`);

    return `Clicked ${button} at (${coordinates.x}, ${coordinates.y}) in ${clickTime}ms`;
  }

  private async handleDrag(action: any): Promise<string> {
    const { path, button = 'left' } = action;

    if (!path || path.length < 2) {
      throw new Error('Drag action requires a path with at least 2 points');
    }

    console.log(`🖱️ Dragging ${button} along path of ${path.length} points`);

    const startTime = Date.now();

    // Move to start position
    libnut.moveMouse(path[0].x, path[0].y);
    await this.delay(10);

    // Start drag
    libnut.mouseToggle('down', button);
    await this.delay(10);

    // Move through path
    for (let i = 1; i < path.length; i++) {
      libnut.moveMouse(path[i].x, path[i].y);
      await this.delay(50); // Small delay between moves
    }

    // End drag
    libnut.mouseToggle('up', button);

    const dragTime = Date.now() - startTime;
    console.log(`✅ Drag completed in ${dragTime}ms`);

    return `Dragged ${button} along path in ${dragTime}ms`;
  }

  private async handleMouseMove(action: any): Promise<string> {
    const x = action?.x ?? action?.coordinates?.x;
    const y = action?.y ?? action?.coordinates?.y;

    if (x === undefined || y === undefined) {
      throw new Error('move_mouse requires x and y coordinates');
    }

    console.log(`🖱️ Moving mouse to (${x}, ${y})`);

    const startTime = Date.now();
    libnut.moveMouse(x, y);
    const moveTime = Date.now() - startTime;

    console.log(`✅ Mouse move completed in ${moveTime}ms`);

    return `Moved mouse to (${x}, ${y}) in ${moveTime}ms`;
  }

  private async handleScroll(action: any): Promise<string> {
    const { direction = 'down', count = 1 } = action;

    console.log(`🎯 Scrolling ${direction} ${count} times`);

    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
      if (direction === 'up') {
        libnut.scrollMouse(0, -3);
      } else if (direction === 'down') {
        libnut.scrollMouse(0, 3);
      } else if (direction === 'left') {
        libnut.scrollMouse(-3, 0);
      } else if (direction === 'right') {
        libnut.scrollMouse(3, 0);
      }
      await this.delay(50);
    }

    const scrollTime = Date.now() - startTime;
    console.log(`✅ Scroll completed in ${scrollTime}ms`);

    return `Scrolled ${direction} ${count} times in ${scrollTime}ms`;
  }

  private async handleType(action: any): Promise<string> {
    const { text } = action;

    if (!text) {
      throw new Error('Type action requires text parameter');
    }

    console.log(`⌨️ Typing: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);

    const startTime = Date.now();
    libnut.typeString(text);
    const typeTime = Date.now() - startTime;

    console.log(`✅ Typing completed in ${typeTime}ms`);

    return `Typed text in ${typeTime}ms`;
  }

  private async handleKeyPress(action: any): Promise<string> {
    const { key } = action;

    if (!key) {
      throw new Error('Key press action requires key parameter');
    }

    console.log(`⌨️ Pressing key: ${key}`);

    const startTime = Date.now();
    libnut.keyTap(key);
    const pressTime = Date.now() - startTime;

    console.log(`✅ Key press completed in ${pressTime}ms`);

    return `Pressed key ${key} in ${pressTime}ms`;
  }

  private async handleScreenshot(action: any): Promise<ScreenshotResult> {
    const { format = 'png', filename, returnBase64 = false } = action;

    // Generate filename if not provided
    const outputPath = filename || `screenshot-${Date.now()}.${format}`;
    const absolutePath = path.resolve(process.cwd(), outputPath);

    console.log(`📸 Taking full screenshot (${format})`);

    const startTime = Date.now();

    // Escape the path for PowerShell
    const psPath = absolutePath.replace(/'/g, "''");
    const formatType = format === 'jpg' || format === 'jpeg' ? 'Jpeg' : 'Png';

    // Use a simple approach that works with display scaling
    // Capture from point 0,0 with the actual screen size
    const psScriptLines = [
      'Add-Type -AssemblyName System.Windows.Forms;',
      'Add-Type -AssemblyName System.Drawing;',
      // Get all screens to find the true primary monitor size
      '$screens = [System.Windows.Forms.Screen]::AllScreens;',
      '$primary = $screens | Where-Object { $_.Primary } | Select-Object -First 1;',
      '$w = $primary.Bounds.Width;',
      '$h = $primary.Bounds.Height;',
      // Create bitmap and capture
      '$bmp = New-Object System.Drawing.Bitmap($w, $h);',
      '$g = [System.Drawing.Graphics]::FromImage($bmp);',
      '$g.CopyFromScreen(0, 0, 0, 0, $primary.Bounds.Size);',
      `$bmp.Save('${psPath}', [System.Drawing.Imaging.ImageFormat]::${formatType});`,
      '$g.Dispose();',
      '$bmp.Dispose();',
      "Write-Output \"$w`x$h\""
    ];
    const psScript = psScriptLines.join(' ');

    console.log(`📸 Executing screenshot capture...`);

    try {
      const { execSync } = await import('child_process');
      const output = execSync(`powershell -NoProfile -Command "${psScript}"`, {
        encoding: 'utf8',
        timeout: 15000
      }).trim();

      console.log(`📸 PowerShell reports bounds: ${output}`);

      // Check if file exists
      const fs = await import('fs');
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Screenshot file was not created: ${absolutePath}`);
      }

      // Get dimensions from the actual file
      const metadata = await sharp(absolutePath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Failed to get image dimensions');
      }

      const width = metadata.width;
      const height = metadata.height;

      const screenshotTime = Date.now() - startTime;
      console.log(`✅ Screenshot captured: ${width}x${height}`);
      console.log(`💾 Saved to: ${absolutePath}`);

      const screenshotResult: ScreenshotResult = {
        filepath: absolutePath,
        width,
        height,
        format
      };

      // Optionally include base64 data
      if (returnBase64) {
        const buffer = await fs.promises.readFile(absolutePath);
        const base64Data = buffer.toString('base64');
        screenshotResult.data = `data:image/${format};base64,${base64Data}`;
        const preview = base64Data.substring(0, 50) + `... (${base64Data.length} chars)`;
        console.log(`📊 Base64 size: ${base64Data.length} chars (preview: ${preview})`);
      }

      return screenshotResult;
    } catch (error: any) {
      console.error(`❌ PowerShell screenshot failed: ${error.message}`);
      throw new Error(`Failed to capture screenshot: ${error.message}`);
    }
  }

  private async handleScreenshotAll(action: any): Promise<ScreenshotResult> {
    const { format = 'png', filename, returnBase64 = false } = action;

    // Generate filename if not provided
    const outputPath = filename || `screenshot-all-${Date.now()}.${format}`;
    const absolutePath = path.resolve(process.cwd(), outputPath);

    console.log(`📸 Taking screenshot of ALL monitors (${format})`);

    const startTime = Date.now();

    // Escape path for PowerShell
    const psPath = absolutePath.replace(/'/g, "''");
    const formatType = format === 'jpg' || format === 'jpeg' ? 'Jpeg' : 'Png';

    // Use PowerShell to capture all monitors (full virtual desktop) - single line to avoid curly brace issues
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $screens = [System.Windows.Forms.Screen]::AllScreens; $minX = ($screens | ForEach-Object { $_.Bounds.X } | Measure-Object -Minimum).Minimum; $minY = ($screens | ForEach-Object { $_.Bounds.Y } | Measure-Object -Minimum).Minimum; $maxX = ($screens | ForEach-Object { $_.Bounds.X + $_.Bounds.Width } | Measure-Object -Maximum).Maximum; $maxY = ($screens | ForEach-Object { $_.Bounds.Y + $_.Bounds.Height } | Measure-Object -Maximum).Maximum; $width = $maxX - $minX; $height = $maxY - $minY; $bitmap = New-Object System.Drawing.Bitmap($width, $height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); foreach ($screen in $screens) { $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, $screen.Bounds.X - $minX, $screen.Bounds.Y - $minY, $screen.Bounds.Size) }; $bitmap.Save('${psPath}', [System.Drawing.Imaging.ImageFormat]::${formatType}); $graphics.Dispose(); $bitmap.Dispose();`;

    try {
      const { execSync } = await import('child_process');
      execSync(`powershell -NoProfile -Command "${psScript}"`, {
        encoding: 'utf8',
        timeout: 15000
      });

      // Get dimensions from the actual file
      const metadata = await sharp(absolutePath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Failed to get image dimensions');
      }

      const width = metadata.width;
      const height = metadata.height;

      const screenshotTime = Date.now() - startTime;
      console.log(`✅ All monitors captured in ${screenshotTime}ms (${width}x${height})`);
      console.log(`💾 Saved to: ${absolutePath}`);

      const screenshotResult: ScreenshotResult = {
        filepath: absolutePath,
        width,
        height,
        format
      };

      // Optionally include base64 data
      if (returnBase64) {
        const buffer = await fs.promises.readFile(absolutePath);
        const base64Data = buffer.toString('base64');
        screenshotResult.data = `data:image/${format};base64,${base64Data}`;
        const preview = base64Data.substring(0, 50) + `... (${base64Data.length} chars)`;
        console.log(`📊 Base64 size: ${base64Data.length} chars (preview: ${preview})`);
      }

      return screenshotResult;
    } catch (error: any) {
      console.error(`❌ PowerShell screenshot failed: ${error.message}`);
      throw new Error(`Failed to capture all monitors: ${error.message}`);
    }
  }

  private async handleScreenshotSecondary(action: any): Promise<ScreenshotResult> {
    const { format = 'png', filename, returnBase64 = false } = action;

    // Generate filename if not provided
    const outputPath = filename || `screenshot-secondary-${Date.now()}.${format}`;
    const absolutePath = path.resolve(process.cwd(), outputPath);

    console.log(`📸 Taking screenshot of secondary monitor (${format})`);

    const startTime = Date.now();

    // Escape path for PowerShell
    const psPath = absolutePath.replace(/'/g, "''");
    const formatType = format === 'jpg' || format === 'jpeg' ? 'Jpeg' : 'Png';

    // Use PowerShell to capture secondary monitor(s) - single line to avoid curly brace issues
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $screens = [System.Windows.Forms.Screen]::AllScreens; $secondaryScreens = $screens | Where-Object { -not $_.Primary }; if ($secondaryScreens.Count -eq 0) { throw 'No secondary monitor found' }; $screen = $secondaryScreens[0]; $bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($screen.Bounds.X, $screen.Bounds.Y, 0, 0, $screen.Bounds.Size); $bitmap.Save('${psPath}', [System.Drawing.Imaging.ImageFormat]::${formatType}); $graphics.Dispose(); $bitmap.Dispose();`;

    try {
      const { execSync } = await import('child_process');
      execSync(`powershell -NoProfile -Command "${psScript}"`, {
        encoding: 'utf8',
        timeout: 10000
      });

      // Get dimensions from the actual file
      const metadata = await sharp(absolutePath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Failed to get image dimensions');
      }

      const width = metadata.width;
      const height = metadata.height;

      const screenshotTime = Date.now() - startTime;
      console.log(`✅ Secondary monitor captured in ${screenshotTime}ms (${width}x${height})`);
      console.log(`💾 Saved to: ${absolutePath}`);

      const screenshotResult: ScreenshotResult = {
        filepath: absolutePath,
        width,
        height,
        format
      };

      // Optionally include base64 data
      if (returnBase64) {
        const buffer = await fs.promises.readFile(absolutePath);
        const base64Data = buffer.toString('base64');
        screenshotResult.data = `data:image/${format};base64,${base64Data}`;
        const preview = base64Data.substring(0, 50) + `... (${base64Data.length} chars)`;
        console.log(`📊 Base64 size: ${base64Data.length} chars (preview: ${preview})`);
      }

      return screenshotResult;
    } catch (error: any) {
      console.error(`❌ PowerShell screenshot failed: ${error.message}`);
      throw new Error(`Failed to capture secondary monitor: ${error.message}`);
    }
  }

  private async handleScreenshotRaw(action: any): Promise<ScreenshotResult> {
    const { format = 'png', filename, returnBase64 = false } = action;

    // Generate filename if not provided
    const outputPath = filename || `screenshot-raw-${Date.now()}.${format}`;

    console.log(`📸 Taking RAW screenshot via libnut (${format})`);

    const startTime = Date.now();

    // Capture using libnut (may capture active window or primary display)
    const result = libnut.captureScreen();

    const screenshotTime = Date.now() - startTime;
    console.log(`✅ Raw screenshot captured in ${screenshotTime}ms (${result.width}x${result.height})`);

    // Use sharp to properly encode the raw BGRA data
    const sharp = await import('sharp');
    const absolutePath = path.resolve(process.cwd(), outputPath);

    // Create Sharp instance from raw buffer (BGRA format, 4 channels)
    const image = sharp.default(result.image, {
      raw: {
        width: result.width,
        height: result.height,
        channels: 4
      }
    });

    // Convert to desired format and save
    if (format === 'jpg' || format === 'jpeg') {
      await image.jpeg().toFile(absolutePath);
    } else {
      await image.png().toFile(absolutePath);
    }

    console.log(`💾 Saved to: ${absolutePath}`);

    // Prepare result
    const screenshotResult: ScreenshotResult = {
      filepath: absolutePath,
      width: result.width,
      height: result.height,
      format
    };

    // Optionally include base64 data (truncated in logs, full in response)
    if (returnBase64) {
      const processedBuffer = format === 'jpg' || format === 'jpeg'
        ? await image.jpeg().toBuffer()
        : await image.png().toBuffer();

      const base64Data = processedBuffer.toString('base64');
      screenshotResult.data = `data:image/${format};base64,${base64Data}`;
      const preview = base64Data.substring(0, 50) + `... (${base64Data.length} chars)`;
      console.log(`📊 Base64 size: ${base64Data.length} chars (preview: ${preview})`);
    }

    return screenshotResult;
  }

  /**
   * Screenshot using DPI-aware approach
   * Creates a bitmap at common resolutions and captures - GDI+ auto-handles scaling
   */
  private async handleScreenshotWin32(action: any): Promise<ScreenshotResult> {
    const { format = 'png', filename, returnBase64 = false, windowHandle } = action;

    // Generate filename if not provided
    const outputPath = filename || `screenshot-win32-${Date.now()}.${format}`;
    const absolutePath = path.resolve(process.cwd(), outputPath);

    console.log(`📸 [Win32] Taking ${windowHandle ? `window-handle ${windowHandle}` : 'DPI-aware'} screenshot (${format})`);

    const startTime = Date.now();

    // Escape the path for PowerShell
    const psPath = absolutePath.replace(/'/g, "''");
    const formatType = format === 'jpg' || format === 'jpeg' ? 'Jpeg' : 'Png';

    // Create PowerShell script file to avoid escaping issues
    const scriptPath = path.resolve(process.cwd(), 'temp-screenshot.ps1');
    const psScript = windowHandle
      ? `
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class Win32WindowCapture {
  [StructLayout(LayoutKind.Sequential)]
  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  [DllImport("user32.dll")] public static extern IntPtr GetWindowDC(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleDC(IntPtr hdc);
  [DllImport("gdi32.dll")] public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);
  [DllImport("gdi32.dll")] public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);
  [DllImport("gdi32.dll")] public static extern bool DeleteDC(IntPtr hdc);
  [DllImport("gdi32.dll")] public static extern bool DeleteObject(IntPtr hObject);
  [DllImport("gdi32.dll")] public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);
}
"@

$hwnd = [IntPtr]${windowHandle}
$rect = New-Object Win32WindowCapture+RECT
if (-not [Win32WindowCapture]::GetWindowRect($hwnd, [ref]$rect)) { throw "GetWindowRect failed for ${windowHandle}" }
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) { throw "Invalid window bounds ${windowHandle}: ${"$"}width x ${"$"}height" }
$srcDc = [Win32WindowCapture]::GetWindowDC($hwnd)
if ($srcDc -eq [IntPtr]::Zero) { throw "GetWindowDC failed for ${windowHandle}" }
$memDc = [Win32WindowCapture]::CreateCompatibleDC($srcDc)
if ($memDc -eq [IntPtr]::Zero) {
  [Win32WindowCapture]::ReleaseDC($hwnd, $srcDc) | Out-Null
  throw "CreateCompatibleDC failed for ${windowHandle}"
}
$bitmapHandle = [Win32WindowCapture]::CreateCompatibleBitmap($srcDc, $width, $height)
if ($bitmapHandle -eq [IntPtr]::Zero) {
  [Win32WindowCapture]::DeleteDC($memDc) | Out-Null
  [Win32WindowCapture]::ReleaseDC($hwnd, $srcDc) | Out-Null
  throw "CreateCompatibleBitmap failed for ${windowHandle}"
}
$oldObject = [Win32WindowCapture]::SelectObject($memDc, $bitmapHandle)
$SRCCOPY = 0x00CC0020
$ok = [Win32WindowCapture]::BitBlt($memDc, 0, 0, $width, $height, $srcDc, 0, 0, $SRCCOPY)
$bmp = [System.Drawing.Image]::FromHbitmap($bitmapHandle)
[Win32WindowCapture]::SelectObject($memDc, $oldObject) | Out-Null
[Win32WindowCapture]::DeleteObject($bitmapHandle) | Out-Null
[Win32WindowCapture]::DeleteDC($memDc) | Out-Null
[Win32WindowCapture]::ReleaseDC($hwnd, $srcDc) | Out-Null
if (-not $ok) {
  $bmp.Dispose()
  throw "BitBlt capture failed for ${windowHandle}"
}
$bmp.Save('${psPath}', [System.Drawing.Imaging.ImageFormat]::${formatType})
$bmp.Dispose()
Write-Output "SUCCESS:$($width)x$($height)"
`
      : `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screens = [System.Windows.Forms.Screen]::AllScreens
$primary = $screens | Where-Object { $_.Primary } | Select-Object -First 1
$logicalW = $primary.Bounds.Width
$logicalH = $primary.Bounds.Height

# Try common physical resolutions
$resolutions = @(
  @{W=1920; H=1080},
  @{W=2560; H=1440},
  @{W=3840; H=2160},
  @{W=$logicalW; H=$logicalH}
)

  foreach ($res in $resolutions) {
  try {
    $bmp = New-Object System.Drawing.Bitmap($res.W, $res.H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.CopyFromScreen($primary.Bounds.X, $primary.Bounds.Y, 0, 0, $primary.Bounds.Size)
    $bmp.Save('${psPath}', [System.Drawing.Imaging.ImageFormat]::${formatType})
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "SUCCESS:$($res.W)x$($res.H)"
    break
  } catch {
    continue
    }
  }
  `;

    const fs = await import('fs');
    await fs.promises.writeFile(scriptPath, psScript.trim(), 'utf8');

    try {
      const { execSync } = await import('child_process');
      const output = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, {
        encoding: 'utf8',
        timeout: 15000
      }).trim();

      console.log(`📸 [Win32] ${output}`);

      // Clean up temp script
      fs.unlinkSync(scriptPath);

      // Check if file exists
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Screenshot file was not created: ${absolutePath}`);
      }

      // Get dimensions from the actual file
      const metadata = await sharp(absolutePath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error('Failed to get image dimensions');
      }

      const width = metadata.width;
      const height = metadata.height;

      const screenshotTime = Date.now() - startTime;
      console.log(`✅ [Win32] Captured: ${width}x${height} in ${screenshotTime}ms`);
      console.log(`💾 Saved to: ${absolutePath}`);

      const screenshotResult: ScreenshotResult = {
        filepath: absolutePath,
        width,
        height,
        format
      };

      // Optionally include base64 data
      if (returnBase64) {
        const buffer = await fs.promises.readFile(absolutePath);
        const base64Data = buffer.toString('base64');
        screenshotResult.data = `data:image/${format};base64,${base64Data}`;
        console.log(`📊 Base64: ${base64Data.length} chars`);
      }

      return screenshotResult;
    } catch (error: any) {
      // Clean up temp script
      try { fs.unlinkSync(scriptPath); } catch {}
      console.error(`❌ [Win32] Failed: ${error.message}`);
      throw new Error(`Win32 screenshot failed: ${error.message}`);
    }
  }

  private async handleScreenSize(action: any): Promise<ScreenSize> {
    console.log(`📱 Getting screen size`);

    const size = libnut.getScreenSize();

    console.log(`✅ Screen size: ${size.width}x${size.height}`);

    return {
      width: size.width,
      height: size.height
    };
  }

  private async handleMousePosition(action: any): Promise<Point> {
    console.log(`🖱️ Getting mouse position`);

    const position = libnut.getMousePos();

    console.log(`✅ Mouse position: x=${position.x}, y=${position.y}`);

    return {
      x: position.x,
      y: position.y
    };
  }

  private async handleLaunchApplication(action: any): Promise<string> {
    const { application, args = [] } = action;

    if (!application) {
      throw new Error('Launch application action requires application parameter');
    }

    console.log(`🚀 Launching application: ${application}`);

    try {
      // Resolve application name to path using config
      const command = resolveApplicationPath(application);
      const finalArgs = [...args];

      // Check if this is a CMD application
      const isCmd = isCmdApplication(command);

      // For cmd.exe, use exec with start command for reliable window creation
      let visibleCmdsBefore = 0;
      let windowTitle = '';
      if (isCmd) {
        // Count visible cmd windows BEFORE launch
        visibleCmdsBefore = await this.countVisibleCmdWindows();
        console.log(`📊 Existing visible cmd windows: ${visibleCmdsBefore}`);

        // Create a uniquely identifiable window title
        windowTitle = `Sidofun Automation ${Date.now()}`;

        // Use exec with start command for reliable window creation
        const execCommand = `start "${windowTitle}" cmd.exe /K title "${windowTitle}"`;
        console.log(`📍 Executing: ${execCommand} (new window with title: ${windowTitle})`);

        await new Promise((resolve, reject) => {
          exec(execCommand, {
            windowsHide: false  // CRUCIAL: Ensure window is visible
          }, (error, stdout, stderr) => {
            if (error) {
              console.error(`❌ Exec error:`, error);
              reject(error);
            } else {
              console.log(`✅ Exec command completed`);
              resolve(true);
            }
          });
        });

        // Wait for window to become visible
        await this.delay(2000);

        // Count visible cmd windows AFTER launch
        const visibleCmdsAfter = await this.countVisibleCmdWindows();
        console.log(`📊 Visible cmd windows after launch: ${visibleCmdsAfter}`);

        if (visibleCmdsAfter > visibleCmdsBefore) {
          console.log(`✅ NEW visible cmd window created successfully!`);
          return `Successfully launched cmd.exe with NEW visible window titled: ${windowTitle}`;
        } else {
          throw new Error(`Exec command completed but NO new visible window created`);
        }
      }

      // For non-cmd applications, use regular spawn
      console.log(`📍 Executing command: ${command}`);
      const child = spawn(command, finalArgs, {
        detached: false,
        stdio: 'pipe'
      });

      // Wait for process to start
      await new Promise((resolve, reject) => {
        child.on('spawn', () => {
          console.log(`✅ Process spawned with PID: ${child.pid}`);
        });

        child.on('error', (error) => {
          console.error(`❌ Process error:`, error);
          reject(error);
        });

        // Give it time to fully initialize and create window
        setTimeout(() => {
          if (!child.killed) {
            child.unref(); // Allow parent to exit independently
            resolve(true);
          } else {
            reject(new Error('Process failed to start'));
          }
        }, 2000); // Increased timeout for window creation
      });

      if (child.pid === undefined) {
        throw new Error(`Process started without a PID for: ${command}`);
      }

      // Verify the process is actually running
      const processExists = await this.verifyProcessRunning(child.pid);

      if (!processExists) {
        throw new Error(`Process started but verification failed for: ${command}`);
      }

      // For cmd.exe, also verify that a NEW visible window was created
      if (command.includes('cmd.exe')) {
        await this.delay(1000); // Additional wait for window to become visible
        const visibleCmdsAfter = await this.countVisibleCmdWindows();
        console.log(`📊 Visible cmd windows after launch: ${visibleCmdsAfter}`);

        if (visibleCmdsAfter > visibleCmdsBefore) {
          console.log(`✅ NEW visible cmd window created successfully!`);
          console.log(`✅ Application verified with visible window: ${command} (PID: ${child.pid})`);
          return `Successfully launched application: ${command} (PID: ${child.pid}) with NEW visible window`;
        } else {
          throw new Error(`Process started but NO new visible window created for: ${command}`);
        }
      } else {
        console.log(`✅ Application verified running: ${command} (PID: ${child.pid})`);
        return `Successfully launched application: ${command} (PID: ${child.pid})`;
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to launch application ${application}:`, error);
      throw new Error(`Failed to launch application: ${message}`);
    }
  }

  private async countVisibleCmdWindows(): Promise<number> {
    return new Promise((resolve) => {
      // Use PowerShell to count visible cmd.exe windows
      // This counts windows that are actually visible on screen, not just processes
      const powerShellCommand = `
        Add-Type -AssemblyName System.Windows.Forms;
        $processes = Get-Process cmd -ErrorAction SilentlyContinue;
        $visibleCount = 0;
        foreach ($proc in $processes) {
          if ($proc.MainWindowTitle -and $proc.MainWindowTitle -notlike '*Administrator*') {
            $visibleCount++;
          }
        }
        $visibleCount
      `;

      exec(`powershell -Command "${powerShellCommand.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
        if (error) {
          console.log(`⚠️ Visible cmd window count error: ${error.message}`);
          // Fallback to simple process counting
          return this.countCmdProcesses().then(resolve);
        }

        const count = parseInt(stdout.trim()) || 0;
        console.log(`🔍 Visible cmd windows detected: ${count}`);
        resolve(count);
      });
    });
  }

  private async countCmdProcesses(): Promise<number> {
    return new Promise((resolve) => {
      exec('tasklist /FI "IMAGENAME eq cmd.exe" /FO CSV | find /c "cmd.exe"', (error, stdout, stderr) => {
        if (error) {
          console.log(`⚠️ Cmd process count error: ${error.message}`);
          resolve(0);
          return;
        }

        const count = parseInt(stdout.trim()) || 0;
        console.log(`🔍 Cmd processes detected: ${count}`);
        resolve(count);
      });
    });
  }

  private async verifyProcessRunning(pid: number): Promise<boolean> {
    return new Promise((resolve) => {
      // Windows tasklist command to check if process is running
      exec(`tasklist /FI "PID eq ${pid}" /FO CSV`, (error, stdout, stderr) => {
        if (error) {
          console.log(`⚠️ Process check error: ${error.message}`);
          resolve(false);
          return;
        }

        // Check if the output contains the PID (process is running)
        const processRunning = stdout.includes(`"${pid}"`);
        console.log(`🔍 Process verification: PID ${pid} ${processRunning ? 'running' : 'not found'}`);

        resolve(processRunning);
      });
    });
  }

  private async handleFocusWindow(action: any): Promise<string> {
    const { windowTitle, processName } = action;

    console.log(`🎯 Focusing window: ${windowTitle || processName}`);

    try {
      // Get all windows
      const windows = libnut.getWindows();
      // console.log(`🔍 Found ${windows.length} windows`);

      let targetWindow: number | null = null;
      let targetTitle = '';
      const normalizedWindowTitle = windowTitle?.toLowerCase().trim();

      for (const window of windows) {
        const title = libnut.getWindowTitle(window);
        // console.log(`   Window: "${title}"`);
        const normalizedTitle = title?.toLowerCase().trim();

        // Prioritize Sidofun Automation windows to avoid disrupting user work
        if (title && title.includes('Sidofun Automation')) {
          if (normalizedWindowTitle && normalizedTitle === normalizedWindowTitle) {
            targetWindow = window;
            targetTitle = title;
            break;
          }
        }

        // Prefer exact title match before any substring fallback.
        if (!targetWindow && normalizedWindowTitle && normalizedTitle === normalizedWindowTitle) {
          targetWindow = window;
          targetTitle = title;
        }
      }

      for (const window of windows) {
        if (targetWindow || !normalizedWindowTitle) {
          break;
        }

        const title = libnut.getWindowTitle(window);
        const normalizedTitle = title?.toLowerCase().trim();

        // Fallback to substring match only after exact matching is exhausted.
        if (normalizedTitle && normalizedTitle.includes(normalizedWindowTitle)) {
          targetWindow = window;
          targetTitle = title;
        }
      }

      if (!targetWindow && windowTitle) {
        const titleWindow = await this.findWindowByTitleSubstring(windowTitle);
        if (titleWindow) {
          targetWindow = titleWindow.handle;
          targetTitle = titleWindow.title;
        }
      }

      if (!targetWindow && processName) {
        const processWindow = await this.findWindowByProcessName(processName);
        if (processWindow) {
          targetWindow = processWindow.handle;
          targetTitle = processWindow.title;
        }
      }

      if (targetWindow) {
        await this.restoreAndForegroundWindow(targetWindow);

        // Focus the window
        libnut.focusWindow(targetWindow);

        // Add a small delay to ensure window is focused
        await this.delay(500);

        console.log(`✅ Focused window: "${targetTitle}"`);
        return `Successfully focused window: "${targetTitle}"`;
      } else {
        throw new Error(`Window not found: ${windowTitle || processName}`);
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // console.error(`❌ Failed to focus window:`, error);
      throw new Error(`Failed to focus window: ${message}`);
    }
  }

  private async handleGetClipboard(): Promise<string> {
    const script = 'Get-Clipboard -Raw';
    return await new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -Command "${script}"`, (error, stdout) => {
        if (error) {
          reject(new Error(`Failed to read clipboard: ${error.message}`));
          return;
        }

        resolve(stdout.replace(/\r?\n$/, ''));
      });
    });
  }

  private async handleSetClipboard(action: any): Promise<string> {
    const text = String(action?.text ?? '');
    const tempPath = path.resolve(process.cwd(), `sidofun-clipboard-${Date.now()}.txt`);
    await fs.promises.writeFile(tempPath, text, 'utf8');

    const escapedPath = tempPath.replace(/'/g, "''");
    const script = `$value = Get-Content -Raw -Path '${escapedPath}'; Set-Clipboard -Value $value`;
    return await new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -Command "${script}"`, async (error) => {
        try {
          await fs.promises.unlink(tempPath);
        } catch {
          // Leave cleanup failure silent; temp files are low risk and should not mask clipboard result.
        }

        if (error) {
          reject(new Error(`Failed to write clipboard: ${error.message}`));
          return;
        }

        resolve('Clipboard updated');
      });
    });
  }

  private async findWindowByProcessName(processName: string): Promise<{ handle: number; title: string } | null> {
    const normalized = processName.replace(/\.exe$/i, '');
    const script = [
      `$procs = Get-Process -Name '${normalized.replace(/'/g, "''")}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 };`,
      'if (-not $procs) { exit 0 }',
      '$proc = $procs | Select-Object -First 1;',
      '@{ handle = [int]$proc.MainWindowHandle; title = $proc.MainWindowTitle } | ConvertTo-Json -Compress'
    ].join(' ');

    return await new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim()) as { handle: number; title: string };
          resolve(parsed.handle ? parsed : null);
        } catch {
          resolve(null);
        }
      });
    });
  }

  private async findWindowByTitleSubstring(windowTitle: string): Promise<{ handle: number; title: string } | null> {
    const escaped = windowTitle.replace(/'/g, "''");
    const script = [
      `$procs = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -like '*${escaped}*' };`,
      'if (-not $procs) { exit 0 }',
      '$proc = $procs | Select-Object -First 1;',
      '@{ handle = [int]$proc.MainWindowHandle; title = $proc.MainWindowTitle } | ConvertTo-Json -Compress'
    ].join(' ');

    return await new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        try {
          const parsed = JSON.parse(stdout.trim()) as { handle: number; title: string };
          resolve(parsed.handle ? parsed : null);
        } catch {
          resolve(null);
        }
      });
    });
  }

  private async restoreAndForegroundWindow(windowHandle: number): Promise<void> {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32Focus {
  [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
}
"@
$hwnd = [IntPtr]${windowHandle}
[Win32Focus]::ShowWindowAsync($hwnd, 9) | Out-Null
[Win32Focus]::ShowWindowAsync($hwnd, 5) | Out-Null
[Win32Focus]::SetForegroundWindow($hwnd) | Out-Null
`.trim();

    await new Promise<void>((resolve) => {
      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, () => resolve());
    });
  }

  private async getWindowProcessDetails(windowHandle: number): Promise<{
    pid?: number;
    processName?: string;
    executablePath?: string;
  } | null> {
    const script = `
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32ProcessLookup {
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
}
"@
$pid = 0
[Win32ProcessLookup]::GetWindowThreadProcessId([IntPtr]${windowHandle}, [ref]$pid) | Out-Null
if ($pid -eq 0) { exit 0 }
$proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
if (-not $proc) { exit 0 }
$path = $null
try { $path = $proc.Path } catch {}
@{
  pid = [int]$pid
  processName = $proc.ProcessName
  executablePath = $path
} | ConvertTo-Json -Compress
`.trim();

    return await new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, (error, stdout) => {
        if (error || !stdout.trim()) {
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch {
          resolve(null);
        }
      });
    });
  }

  private async execPowerShellEncoded(script: string): Promise<string> {
    const encoded = Buffer.from(script, 'utf16le').toString('base64');
    return await new Promise((resolve, reject) => {
      exec(`powershell -NoProfile -EncodedCommand ${encoded}`, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }
        resolve(stdout.trim());
      });
    });
  }

  private async execPowerShellJson<T>(script: string): Promise<T> {
    const stdout = await this.execPowerShellEncoded(script);
    return JSON.parse(stdout) as T;
  }

  // ==============================
  // NEW ACTION HANDLERS
  // ==============================

  // HIGH PRIORITY HANDLERS

  private async handleKeyToggle(action: any): Promise<string> {
    const { key, direction = 'down' } = action;

    if (!key) {
      throw new Error('Key toggle action requires key parameter');
    }

    if (!['down', 'up'].includes(direction)) {
      throw new Error('Direction must be "down" or "up"');
    }

    console.log(`⌨️ Key toggle: ${key} ${direction}`);

    const startTime = Date.now();
    libnut.keyToggle(key, direction);
    const toggleTime = Date.now() - startTime;

    console.log(`✅ Key toggle completed in ${toggleTime}ms`);
    return `Toggled key ${key} ${direction} in ${toggleTime}ms`;
  }

  private async handleGetActiveWindow(action: any): Promise<any> {
    console.log(`🎯 Getting active window`);

    const windowHandle = libnut.getActiveWindow();
    const windowTitle = libnut.getWindowTitle(windowHandle);
    const windowRect = libnut.getWindowRect(windowHandle);
    const processInfo = await this.getWindowProcessDetails(windowHandle);

    console.log(`✅ Active window: "${windowTitle}" (handle: ${windowHandle})`);

    return {
      handle: windowHandle,
      title: windowTitle,
      pid: processInfo?.pid,
      processName: processInfo?.processName,
      executablePath: processInfo?.executablePath,
      rect: {
        x: windowRect.x,
        y: windowRect.y,
        width: windowRect.width,
        height: windowRect.height
      }
    };
  }

  private async handleGetWindowRect(action: any): Promise<any> {
    const { windowHandle } = action;

    if (!windowHandle) {
      throw new Error('get_window_rect requires windowHandle parameter');
    }

    console.log(`📐 Getting window rect for handle: ${windowHandle}`);

    const rect = libnut.getWindowRect(windowHandle);

    console.log(`✅ Window rect: x=${rect.x}, y=${rect.y}, width=${rect.width}, height=${rect.height}`);

    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    };
  }

  private async handleGetWindowInfo(action: any): Promise<any> {
    const { windowHandle } = action;
    if (!windowHandle) {
      throw new Error('get_window_info requires windowHandle parameter');
    }

    const windows = await this.handleListWindows();
    const match = windows.find((window: any) => window.handle === windowHandle);
    if (!match) {
      throw new Error(`Window not found: ${windowHandle}`);
    }

    return match;
  }

  private async handleListProcesses(): Promise<any[]> {
    const script = `
$ProgressPreference = 'SilentlyContinue'
$items = Get-Process -ErrorAction SilentlyContinue | Sort-Object ProcessName, Id | ForEach-Object {
  $path = $null
  try { $path = $_.Path } catch {}
  [pscustomobject]@{
    pid = [int]$_.Id
    processName = $_.ProcessName
    executablePath = $path
    hasWindow = ($_.MainWindowHandle -ne 0) -or (-not [string]::IsNullOrWhiteSpace($_.MainWindowTitle))
    isVisible = ($_.MainWindowHandle -ne 0)
    mainWindowHandle = if ($_.MainWindowHandle -ne 0) { [int]$_.MainWindowHandle } else { $null }
    mainWindowTitle = if (-not [string]::IsNullOrWhiteSpace($_.MainWindowTitle)) { $_.MainWindowTitle } else { $null }
  }
}
$items | ConvertTo-Json -Depth 4 -Compress
`.trim();

    return await this.execPowerShellJson<any[]>(script);
  }

  private async handleListWindows(): Promise<any[]> {
    const script = `
$ProgressPreference = 'SilentlyContinue'
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class Win32WindowEnum {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
$foreground = [Win32WindowEnum]::GetForegroundWindow()
$items = New-Object System.Collections.ArrayList
[Win32WindowEnum]::EnumWindows({
  param($hWnd, $lParam)
  if (-not [Win32WindowEnum]::IsWindowVisible($hWnd)) { return $true }
  $titleBuilder = New-Object System.Text.StringBuilder 1024
  [void][Win32WindowEnum]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
  $title = $titleBuilder.ToString()
  if ([string]::IsNullOrWhiteSpace($title)) { return $true }
  $pid = 0
  [Win32WindowEnum]::GetWindowThreadProcessId($hWnd, [ref]$pid) | Out-Null
  $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
  $path = $null
  $processName = $null
  if ($proc) {
    $processName = $proc.ProcessName
    try { $path = $proc.Path } catch {}
  }
  $rect = New-Object Win32WindowEnum+RECT
  [void][Win32WindowEnum]::GetWindowRect($hWnd, [ref]$rect)
  [void]$items.Add([pscustomobject]@{
    handle = [int64]$hWnd
    title = $title
    pid = if ($pid -ne 0) { [int]$pid } else { $null }
    processName = $processName
    executablePath = $path
    visible = $true
    isForeground = ([int64]$foreground -eq [int64]$hWnd)
    rect = @{
      x = [int]$rect.Left
      y = [int]$rect.Top
      width = [int]($rect.Right - $rect.Left)
      height = [int]($rect.Bottom - $rect.Top)
    }
  })
  return $true
}, [IntPtr]::Zero) | Out-Null
$items | ConvertTo-Json -Depth 5 -Compress
`.trim();

    const result = await this.execPowerShellJson<any>(script);
    return Array.isArray(result) ? result : result ? [result] : [];
  }

  private async handleMoveWindow(action: any): Promise<string> {
    const { windowHandle, x, y } = action;

    if (!windowHandle || x === undefined || y === undefined) {
      throw new Error('move_window requires windowHandle, x, and y parameters');
    }

    console.log(`🪟 Moving window ${windowHandle} to (${x}, ${y})`);

    const success = libnut.moveWindow(windowHandle, { x, y });

    if (!success) {
      throw new Error(`Failed to move window ${windowHandle}`);
    }

    console.log(`✅ Window moved successfully`);
    return `Moved window ${windowHandle} to (${x}, ${y})`;
  }

  private async handleResizeWindow(action: any): Promise<string> {
    const { windowHandle, width, height } = action;

    if (!windowHandle || !width || !height) {
      throw new Error('resize_window requires windowHandle, width, and height parameters');
    }

    console.log(`📏 Resizing window ${windowHandle} to ${width}x${height}`);

    const success = libnut.resizeWindow(windowHandle, { width, height });

    if (!success) {
      throw new Error(`Failed to resize window ${windowHandle}`);
    }

    console.log(`✅ Window resized successfully`);
    return `Resized window ${windowHandle} to ${width}x${height}`;
  }

  private async handleDragWindowMove(action: any): Promise<string> {
    const { windowHandle, x, y } = action;
    if (!windowHandle || x === undefined || y === undefined) {
      throw new Error('drag_window_move requires windowHandle, x, and y parameters');
    }

    const rect = libnut.getWindowRect(windowHandle);
    const from = {
      x: Math.round(rect.x + rect.width / 2),
      y: Math.round(rect.y + Math.min(20, Math.max(10, rect.height * 0.04)))
    };
    const to = {
      x: Math.round(x + rect.width / 2),
      y: Math.round(y + Math.min(20, Math.max(10, rect.height * 0.04)))
    };

    return await this.handleDrag({
      path: [from, to],
      button: 'left'
    });
  }

  private async handleDragWindowResize(action: any): Promise<string> {
    const { windowHandle, width, height } = action;
    if (!windowHandle || width === undefined || height === undefined) {
      throw new Error('drag_window_resize requires windowHandle, width, and height parameters');
    }

    const rect = libnut.getWindowRect(windowHandle);
    const from = {
      x: Math.round(rect.x + rect.width - 6),
      y: Math.round(rect.y + rect.height - 6)
    };
    const to = {
      x: Math.round(rect.x + width - 6),
      y: Math.round(rect.y + height - 6)
    };

    return await this.handleDrag({
      path: [from, to],
      button: 'left'
    });
  }

  private async handleShowWindow(action: any, showCode: number, verb: string): Promise<string> {
    const { windowHandle } = action;

    if (!windowHandle) {
      throw new Error(`${verb}_window requires windowHandle parameter`);
    }

    const script = [
      `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class Win32ShowWindow { [DllImport(\"user32.dll\")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow); [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd); }'`,
      `$hwnd = [IntPtr]${windowHandle}`,
      `[Win32ShowWindow]::ShowWindow($hwnd, ${showCode}) | Out-Null`,
      ...(showCode !== 6 ? ['[Win32ShowWindow]::SetForegroundWindow($hwnd) | Out-Null'] : [])
    ].join('; ');

    await new Promise<void>((resolve, reject) => {
      exec(`powershell -NoProfile -Command "${script.replace(/"/g, '\\"')}"`, (error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    return `${verb}d window ${windowHandle}`;
  }

  private async handleCloseWindow(action: any): Promise<string> {
    const { windowHandle } = action;
    if (!windowHandle) {
      throw new Error('close_window requires windowHandle parameter');
    }

    const script = `
Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class Win32CloseWindow { [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam); }'
$hwnd = [IntPtr]${windowHandle}
[Win32CloseWindow]::PostMessage($hwnd, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
`.trim();

    await this.execPowerShellEncoded(script);
    return `Closed window ${windowHandle}`;
  }

  // MEDIUM PRIORITY HANDLERS

  private async handleSetMouseDelay(action: any): Promise<string> {
    const { delay } = action;

    if (delay === undefined || delay < 0) {
      throw new Error('set_mouse_delay requires delay parameter (>= 0)');
    }

    console.log(`⏱️ Setting mouse delay to ${delay}ms`);

    libnut.setMouseDelay(delay);

    console.log(`✅ Mouse delay set to ${delay}ms`);
    return `Mouse delay set to ${delay}ms`;
  }

  private async handleSetKeyboardDelay(action: any): Promise<string> {
    const { delay } = action;

    if (delay === undefined || delay < 0) {
      throw new Error('set_keyboard_delay requires delay parameter (>= 0)');
    }

    console.log(`⏱️ Setting keyboard delay to ${delay}ms`);

    libnut.setKeyboardDelay(delay);

    console.log(`✅ Keyboard delay set to ${delay}ms`);
    return `Keyboard delay set to ${delay}ms`;
  }

  private async handleHighlight(action: any): Promise<string> {
    const { x, y, width, height, duration = 1000, opacity = 0.5 } = action;

    if (x === undefined || y === undefined || !width || !height) {
      throw new Error('highlight requires x, y, width, and height parameters');
    }

    // Clamp opacity between 0 and 1
    const clampedOpacity = Math.max(0, Math.min(1, opacity));

    console.log(`💡 Highlighting region: (${x}, ${y}, ${width}x${height}) for ${duration}ms (opacity: ${clampedOpacity})`);

    libnut.highlight(x, y, width, height, duration, clampedOpacity);

    // The highlight is non-blocking, so we wait for the duration
    await this.delay(duration);

    console.log(`✅ Highlight completed`);
    return `Highlighted region (${x}, ${y}, ${width}x${height}) for ${duration}ms`;
  }

  private async handleTypeDelayed(action: any): Promise<string> {
    const { text, cpm = 300 } = action; // Default: 300 chars/min = 5 chars/sec

    if (!text) {
      throw new Error('type_delayed requires text parameter');
    }

    console.log(`⌨️ Typing with delay: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}" at ${cpm} CPM`);

    const startTime = Date.now();
    libnut.typeStringDelayed(text, cpm);
    const typeTime = Date.now() - startTime;

    console.log(`✅ Typing completed in ${typeTime}ms`);
    return `Typed text with delay in ${typeTime}ms`;
  }

  // Public helpers used by CLI, REST, and session services.
  async getScreenSize(): Promise<ScreenSize> {
    await this.ensureInitialized();
    return this.handleScreenSize({});
  }

  async getMousePosition(): Promise<Point> {
    await this.ensureInitialized();
    return this.handleMousePosition({});
  }

  async takeScreenshot(
    format: string = 'png',
    filename?: string,
    returnBase64: boolean = false
  ): Promise<ScreenshotResult> {
    await this.ensureInitialized();
    return this.handleScreenshot({ format, filename, returnBase64 });
  }

  async screenshotWin32(
    windowHandle?: number,
    filename?: string,
    returnBase64: boolean = false,
    format: string = 'png'
  ): Promise<ScreenshotResult> {
    await this.ensureInitialized();
    return this.handleScreenshotWin32({ format, filename, returnBase64, windowHandle });
  }

  async keyToggle(key: string, direction: string): Promise<string> {
    await this.ensureInitialized();
    return this.handleKeyToggle({ key, direction });
  }

  async keyTap(key: string): Promise<string> {
    await this.ensureInitialized();
    return this.handleKeyPress({ key });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    await this.initPromise;
    if (!this.isInitialized) {
      throw new Error('Windows nut.js service not initialized');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
