"""
Test key combinations in Python IPC client.

This demonstrates how to send key combinations like Ctrl+Shift+T or Shift+Alt+-
for controlling terminal features (new tabs, splits, etc.).
"""

import sys
import os
import time

PACKAGE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PACKAGE_ROOT)

from sidofun_desktop import DesktopWinClient

print("=== Testing Key Combinations ===\n")

with DesktopWinClient() as client:
    # Spawn a CMD window
    print("1. Spawning CMD window...")
    session_id = client.cmd_spawn("KeyComboTest")
    print(f"   Session: {session_id}\n")

    # Example 1: Ctrl+Shift+T (new tab in Windows Terminal)
    print("2. Testing Ctrl+Shift+T (new tab)...")
    print("   Using cmd_key_combo (convenience method):")
    client.cmd_key_combo(session_id, ["control", "shift"], "t")
    print("   Sent!\n")
    time.sleep(1)

    # Example 2: Using manual key_toggle
    print("3. Testing Ctrl+Shift+N (manual method)...")
    print("   Using cmd_key_toggle directly:")
    client.cmd_key_toggle(session_id, "control", "down")
    client.cmd_key_toggle(session_id, "shift", "down")
    client.cmd_press(session_id, "n")
    client.cmd_key_toggle(session_id, "shift", "up")
    client.cmd_key_toggle(session_id, "control", "up")
    print("   Sent!\n")
    time.sleep(1)

    # Example 3: Shift+Alt+- (horizontal split)
    print("4. Testing Shift+Alt+- (horizontal split)...")
    client.cmd_key_combo(session_id, ["shift", "alt"], "-")
    print("   Sent!\n")
    time.sleep(1)

    # Example 4: Ctrl+Alt+T (vertical split)
    print("5. Testing Ctrl+Alt+- (vertical split)...")
    client.cmd_key_combo(session_id, ["control", "alt"], "-")
    print("   Sent!\n")
    time.sleep(1)

    # Example 5: Ctrl+C (copy - but just test the combo)
    print("6. Testing Ctrl+C (copy combo, not break signal)...")
    client.cmd_key_combo(session_id, ["control"], "c")
    print("   Sent!\n")
    time.sleep(1)

    # Example 6: More complex combo - Ctrl+Shift+Alt+F5
    print("7. Testing Ctrl+Shift+Alt+F5...")
    client.cmd_key_combo(session_id, ["control", "shift", "alt"], "f5")
    print("   Sent!\n")

    print("\n=== All key combinations sent ===")
    print("\nNote: These shortcuts work in Windows Terminal or other modern")
    print("      terminals that support tab/split features.")
    print("\nCommon Windows Terminal shortcuts:")
    print("  Ctrl+Shift+T   - New tab")
    print("  Ctrl+Shift+N   - New window")
    print("  Shift+Alt+-    - Horizontal split")
    print("  Ctrl+Alt+-     - Vertical split")
    print("  Ctrl+Tab       - Next tab")
    print("  Ctrl+Shift+Tab - Previous tab")
