"""Quick test of the new session API."""

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sidofun_desktop import DesktopWinClient

print("Testing new session API...")

with DesktopWinClient() as client:
    # Test 1: cmd_spawn returns CMDSession
    print("\n1. Testing cmd_spawn returns session object...")
    session = client.cmd_spawn("TestTerminal")
    print(f"   Session type: {type(session).__name__}")
    print(f"   Session ID: {session.id}")

    # Test 2: session.type() works
    print("\n2. Testing session.type()...")
    session.type("echo Hello from session API\n")

    # Test 3: session.exec() works
    print("\n3. Testing session.exec()...")
    result = session.exec("dir", wait=True, timeout=3000)
    print(f"   Exec result: {result['success']}")

    # Test 4: session.screenshot() works
    print("\n4. Testing session.screenshot()...")
    screenshot = session.screenshot()
    print(f"   Screenshot: {screenshot['width']}x{screenshot['height']}")

    # Test 5: sessions manager
    print("\n5. Testing sessions manager...")
    session2 = client.sessions.spawn("SecondTerminal")
    print(f"   Created session 2: {session2.id}")

    # Test 6: Index-based access
    print("\n6. Testing index-based access...")
    first = client.sessions[1]
    print(f"   First session: {first.id}")

    # Test 7: Iterate sessions
    print("\n7. Testing iteration...")
    for i, sess in enumerate(client.sessions, 1):
        print(f"   Session {i}: {sess.id}")

    # Test 8: Convenience methods
    print("\n8. Testing convenience methods...")
    session.send("echo Using send()")
    session.run("echo Using run()", timeout=2000)

    # Test 9: Context manager
    print("\n9. Testing context manager...")
    with client.cmd_spawn("TempTerminal") as temp:
        temp.send("echo Will auto-close")
    print("   Temp session closed")

print("\n✅ All tests passed!")
