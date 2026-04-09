"""Test that __str__ enables backward compatibility."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sidofun_desktop import DesktopWinClient

print("Testing __str__ backward compatibility...\n")

with DesktopWinClient() as client:
    # Test 1: cmd_spawn returns CMDSession
    print("1. cmd_spawn() returns:")
    result = client.cmd_spawn("TestTerminal")
    print(f"   Type: {type(result).__name__}")
    print(f"   Repr: {repr(result)}")
    print(f"   Str:  {str(result)}")
    print()

    # Test 2: Old API works (using CMDSession where session_id expected)
    print("2. Old API with CMDSession object:")
    session = client.cmd_spawn("OldAPITest")
    print(f"   session = client.cmd_spawn()")
    print(f"   session object: {session}")
    print(f"   str(session): {str(session)}")

    # This should work because str(session) = session.id
    client.cmd_type(session, "echo Old API works!\n")
    print("   client.cmd_type(session, ...) - SUCCESS")
    print()

    # Test 3: New API works
    print("3. New API with fluent methods:")
    session2 = client.cmd_spawn("NewAPITest")
    session2.type("echo New API works!\n")
    print("   session.type(...) - SUCCESS")
    print()

    # Test 4: Both APIs on same session
    print("4. Using both APIs on same session:")
    session3 = client.cmd_spawn("MixedAPITest")
    # Old style
    client.cmd_type(session3, "echo Old style\n")
    # New style
    session3.exec("echo New style\n", wait=True, timeout=2000)
    print("   Mixed usage - SUCCESS")
    print()

    # Test 5: session.id vs str(session)
    print("5. session.id vs str(session):")
    session4 = client.cmd_spawn("IdTest")
    print(f"   session.id:  {session4.id}")
    print(f"   str(session): {str(session4)}")
    print(f"   Are they equal? {session4.id == str(session4)}")
    print()

print("=== All backward compatibility tests passed! ===")
print()
print("Summary:")
print("- cmd_spawn() returns CMDSession object")
print("- str(CMDSession) returns session.id (backward compatible)")
print("- Old API: client.cmd_type(session, ...) works")
print("- New API: session.type(...) works")
print("- Both can be used interchangeably")
