"""
Test terminal shortcuts in Python IPC client.

This demonstrates Windows Terminal shortcuts for tabs, splits, and pane navigation.
Works best with Windows Terminal (not legacy cmd.exe).
"""

import sys
import os
import time

PACKAGE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PACKAGE_ROOT)

from sidofun_desktop import DesktopWinClient

print("=== Testing Windows Terminal Shortcuts ===\n")
print("Note: These shortcuts work best with Windows Terminal!")
print("      If using legacy cmd.exe, only Ctrl+C will work.\n")

with DesktopWinClient() as client:
    # Spawn a CMD window
    print("1. Spawning CMD window...")
    session_id = client.cmd_spawn("TerminalTest")
    print(f"   Session: {session_id}\n")

    # Example 1: Create new tab (Ctrl+Shift+T)
    print("2. Creating new tabs...")
    for i in range(3):
        client.cmd_new_tab(session_id)
        print(f"   Created tab {i+1}")
        time.sleep(0.5)
    print()

    # Example 2: Navigate tabs
    print("3. Navigating tabs...")
    client.cmd_prev_tab(session_id)
    print("   Moved to previous tab")
    time.sleep(0.5)
    client.cmd_next_tab(session_id)
    print("   Moved to next tab")
    time.sleep(0.5)
    print()

    # Example 3: Split vertically
    print("4. Splitting window vertically...")
    client.cmd_split_vertical(session_id)
    print("   Split vertically (Shift+Alt+-)")
    time.sleep(1)
    print()

    # Example 4: Navigate panes
    print("5. Navigating panes...")
    client.cmd_pane_right(session_id)
    print("   Moved to right pane (Alt+Right)")
    time.sleep(0.5)
    client.cmd_pane_down(session_id)
    print("   Moved to lower pane (Alt+Down)")
    time.sleep(0.5)
    client.cmd_pane_left(session_id)
    print("   Moved to left pane (Alt+Left)")
    time.sleep(0.5)
    client.cmd_pane_up(session_id)
    print("   Moved to upper pane (Alt+Up)")
    time.sleep(0.5)
    print()

    # Example 5: Split horizontally
    print("6. Splitting window horizontally...")
    client.cmd_split_horizontal(session_id)
    print("   Split horizontally (Shift+Alt++)")
    time.sleep(1)
    print()

    print("=== All terminal shortcuts sent ===")
    print("\nAvailable Terminal Shortcuts:")
    print("  Tabs:")
    print("    cmd_new_tab(session_id)         - Ctrl+Shift+T (new tab)")
    print("    cmd_next_tab(session_id)         - Ctrl+Tab (next tab)")
    print("    cmd_prev_tab(session_id)         - Ctrl+Shift+Tab (previous tab)")
    print()
    print("  Splits:")
    print("    cmd_split_vertical(session_id)   - Shift+Alt+- (vertical split)")
    print("    cmd_split_horizontal(session_id) - Shift+Alt++ (horizontal split)")
    print()
    print("  Pane Navigation:")
    print("    cmd_pane_up(session_id)          - Alt+Up")
    print("    cmd_pane_down(session_id)        - Alt+Down")
    print("    cmd_pane_left(session_id)        - Alt+Left")
    print("    cmd_pane_right(session_id)       - Alt+Right")
    print()
    print("Usage with index:")
    print("    client.cmd_new_tab(1)             # Use session 1")
    print("    client.cmd_split_vertical(1)     # Use session 1")
