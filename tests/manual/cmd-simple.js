// Simple standalone test for cmd.exe launch and typing
// No server, no Hono, just pure libnut-core testing

import path from 'path';
import { spawn, exec } from 'child_process';

// Load Windows libnut-core
const LIBNUT_PATH = path.join(process.cwd(), 'libnut-core-build-release', 'libnut.node');

let libnut;
try {
  console.log('Loading Windows libnut-core from:', LIBNUT_PATH);

  // Use createRequire to load native module in ES module context
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  libnut = require(LIBNUT_PATH);

  console.log('libnut-core loaded successfully');
} catch (error) {
  console.error('Failed to load libnut-core:', error);
  process.exit(1);
}

async function testCmdLaunchAndTyping() {
  console.log('\nStarting cmd.exe launch and typing test...\n');

  try {
    // Step 1: Try launching LEGACY cmd.exe to avoid Windows Terminal issues
    console.log('Step 1: Launching legacy cmd.exe...');
    const windowTitle = `Legacy Test Window ${Date.now()}`;

    // Try to launch the legacy cmd.exe explicitly
    const execCommand = `start "${windowTitle}" "C:\\Windows\\System32\\cmd.exe" /K title "${windowTitle}"`;

    console.log(`Executing: ${execCommand}`);

    await new Promise((resolve, reject) => {
      exec(execCommand, {
        windowsHide: false
      }, (error, stdout, stderr) => {
        if (error) {
          console.error('Exec failed:', error);
          reject(error);
        } else {
          console.log('Exec command completed');
          resolve(true);
        }
      });
    });

    // Step 2: Wait for window to appear
    console.log('\nStep 2: Waiting 3 seconds for window to appear...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Try multiple approaches to focus and type
    console.log('\nStep 3: Attempting to focus and type...');

    // Get all windows and find our target
    const windows = libnut.getWindows();
    console.log(`Found ${windows.length} windows`);

    let targetWindow = null;
    let allWindowTitles = [];

    for (const window of windows) {
      const title = libnut.getWindowTitle(window);
      allWindowTitles.push(title);
      console.log(`  Window: "${title}"`);

      if (title && title.includes('Legacy Test Window')) {
        targetWindow = window;
        console.log(`Found target window: "${title}"`);
        break;
      }
    }

    console.log('\nAll window titles found:', allWindowTitles);

    if (targetWindow) {
      // Multiple attempts to focus and type
      console.log('Attempt 1: Focusing window...');
      libnut.focusWindow(targetWindow);
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Try clicking in the window to ensure focus
      const rect = libnut.getWindowRegion(targetWindow);
      if (rect) {
        const centerX = Math.floor(rect.x + rect.width / 2);
        const centerY = Math.floor(rect.y + rect.height / 2);
        console.log(`Clicking at center of window: (${centerX}, ${centerY})`);
        libnut.moveMouse(centerX, centerY);
        await new Promise(resolve => setTimeout(resolve, 200));
        libnut.mouseClick('left');
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Type something with clear visual indicator
      console.log('Attempt 1: Typing with visual marker...');
      libnut.typeString('=== AUTOMATION TEST START ===');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Press Enter
      console.log('Pressing Enter...');
      libnut.keyTap('enter');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Type another command
      console.log('Typing: "echo This is automated typing from libnut-core"');
      libnut.typeString('echo This is automated typing from libnut-core');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Press Enter again
      console.log('Pressing Enter...');
      libnut.keyTap('enter');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Type dir command
      console.log('Typing: "dir"');
      libnut.typeString('dir');
      await new Promise(resolve => setTimeout(resolve, 500));
      libnut.keyTap('enter');

      // End marker
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('Typing end marker...');
      libnut.typeString('=== AUTOMATION TEST END ===');
      libnut.keyTap('enter');

      console.log('\nSUCCESS: Typed in cmd.exe window!');
      console.log('Check the cmd.exe window to see the typed commands');

    } else {
      console.log('Target window not found');
      console.log('Trying to activate any cmd window...');

      // Try to find any cmd window
      for (const window of windows) {
        const title = libnut.getWindowTitle(window);
        if (title && title.toLowerCase().includes('cmd')) {
          console.log(`Found cmd window: "${title}"`);
          libnut.focusWindow(window);
          await new Promise(resolve => setTimeout(resolve, 1000));
          libnut.typeString('Fallback typing test');
          libnut.keyTap('enter');
          break;
        }
      }
    }

  } catch (error) {
    console.error('Test failed:', error);
  }

  console.log('\nTest completed');
  process.exit(0);
}

// Run the test
testCmdLaunchAndTyping();