"""
Demonstration of DesktopWin Singleton Usage.

Shows how the singleton pattern maintains a single Bun process
across your entire Python application.
"""

from sidofun_desktop import DesktopWin
import time

print("=== DesktopWin Singleton Demo ===\n")

# Example 1: Simple usage - auto-start on first call
print("1. First call auto-starts the Bun process...")
result = DesktopWin.screenshot()
print(f"   Screenshot taken: {result['width']}x{result['height']}")
print()

# Example 2: Subsequent calls reuse the running process
print("2. Subsequent calls reuse the running process (no startup delay)...")
DesktopWin.click(100, 100)
print("   Click executed")
print()

# Example 3: CMD automation with persistent sessions
print("3. CMD sessions persist across calls...")
session_id = DesktopWin.cmd_spawn("SingletonTest")
print(f"   Created session: {session_id}")

DesktopWin.cmd_type(session_id, "echo Hello from singleton!\\n")
time.sleep(0.5)

result = DesktopWin.cmd_screenshot(session_id)
print(f"   Session screenshot: {result['width']}x{result['height']}")
print()

# Example 4: Using terminal shortcuts
print("4. Terminal shortcuts work with singleton...")
DesktopWin.cmd_new_tab(session_id)
print("   Created new tab")

DesktopWin.cmd_split_vertical(session_id)
print("   Split window vertically")
print()

# Example 5: Check if running
print("5. Check if singleton is running...")
print(f"   Is running: {DesktopWin.is_running()}")
print()

# Example 6: Explicit cleanup (optional - auto-cleanup on exit)
print("6. Explicit cleanup (optional)...")
DesktopWin.stop()
print(f"   After stop - Is running: {DesktopWin.is_running()}")
print()

# Example 7: Restart if needed
print("7. Restart the singleton...")
DesktopWin.restart()
print(f"   After restart - Is running: {DesktopWin.is_running()}")
print()

# Example 8: Context manager for guaranteed cleanup
print("8. Using as context manager for guaranteed cleanup...")
with DesktopWin:
    DesktopWin.click(200, 200)
    print("   Click executed inside context manager")
    # Singleton stops automatically when exiting the 'with' block

print(f"   After context manager - Is running: {DesktopWin.is_running()}")
print()

print("=== Demo Complete ===")
print()
print("Benefits of using DesktopWin singleton:")
print("  - Single Bun process for your entire application")
print("  - No startup delay after first call")
print("  - CMD sessions persist across your program")
print("  - Thread-safe for multi-threaded environments")
print("  - Automatic cleanup on program exit")
print("  - Optional explicit control with stop()/restart()")
