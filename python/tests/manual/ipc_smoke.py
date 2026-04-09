"""
Quick test of Python IPC client.
"""

import sys
import os
import time

# Add package root to path when running from source checkout
PACKAGE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, PACKAGE_ROOT)

from sidofun_desktop import DesktopWinClient

print("=== Testing Python IPC Client ===\n")

with DesktopWinClient() as client:
    print("[OK] Client started successfully")

    # Test 1: Screen size
    print("\n1. Testing screen_size...")
    size = client.screen_size()
    print(f"   [OK] Screen: {size['width']}x{size['height']}")

    # Test 2: Mouse position
    print("\n2. Testing mouse_position...")
    pos = client.mouse_position()
    print(f"   [OK] Mouse at: ({pos['x']}, {pos['y']})")

    # Test 3: Active window
    print("\n3. Testing active_window...")
    window = client.active_window()
    print(f"   [OK] Active window: {window['title']}")

    # Test 4: CMD spawn
    print("\n4. Testing cmd_spawn...")
    session_id = client.cmd_spawn("PythonIPCTest")
    print(f"   [OK] CMD session created: {session_id}")

    # Test 5: CMD list
    print("\n5. Testing cmd_list...")
    sessions = client.cmd_list()
    print(f"   [OK] Active sessions: {sessions['count']}")

    # Test 6: CMD type with escape sequences
    print("\n6. Testing cmd_type with escape sequences...")
    client.cmd_type(session_id, r"\Mecho Hello from Python IPC!\n")
    print("   [OK] Typed: maximize + echo command + enter")

    time.sleep(1)

    # Test 7: CMD type with delay
    print("\n7. Testing cmd_type with delay...")
    client.cmd_type(session_id, r"\d1000echo With 1 second delay\n")
    print("   [OK] Typed: delay + echo command")

    time.sleep(2)

    # Test 8: CMD screenshot
    print("\n8. Testing cmd_screenshot...")
    screenshot = client.cmd_screenshot(session_id, return_base64=False)
    print(f"   [OK] Screenshot: {screenshot['filepath']} ({screenshot['width']}x{screenshot['height']})")

    # Test 9: CMD info
    print("\n9. Testing cmd_info...")
    info = client.cmd_info(session_id)
    print(f"   [OK] Session info: {info['title']}, commands: {info['commandCount']}")

    # Test 10: Index-based alias
    print("\n10. Testing index-based alias (session 1)...")
    client.cmd_type(1, r"\fecho Using index 1\n")
    print("    [OK] Typed using index-based alias")

    time.sleep(1)

    # Test 11: Close session
    print("\n11. Testing cmd_close...")
    client.cmd_close(session_id)
    print("    [OK] Session closed")

print("\n=== All tests passed! ===")
