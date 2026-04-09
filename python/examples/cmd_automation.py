"""
CMD automation example for Sidofun Desktop Python client.
"""

from sidofun_desktop import DesktopWinClient
import time


def main():
    print("=== Sidofun Desktop Python Client - CMD Automation ===\n")

    with DesktopWinClient() as client:
        # Example 1: Spawn CMD window
        print("1. Spawning CMD window...")
        session_id = client.cmd_spawn("PythonAutomation")
        print(f"   Session ID: {session_id}\n")

        # Example 2: List sessions
        print("2. Listing all CMD sessions...")
        sessions = client.cmd_list()
        print(f"   Active sessions: {sessions['count']}")
        for i, session in enumerate(sessions['sessions'], 1):
            print(f"   [{i}] {session['id']}: {session['title']}")
        print()

        # Example 3: Type simple command
        print("3. Typing 'echo Hello from Python'...")
        client.cmd_type(session_id, r"echo Hello from Python\n")
        time.sleep(1)
        print("   Done!\n")

        # Example 4: Type with escape sequences
        print("4. Typing with escape sequences...")
        print("   (Maximize, type, delay, restore)")
        client.cmd_type(session_id, r"\Mecho With window control\n\d1000")
        client.cmd_type(session_id, r"echo Restored now\n\r\d500")
        print("   Done!\n")

        # Example 5: Execute command with screenshot
        print("5. Executing 'dir' command with screenshot...")
        result = client.cmd_exec(
            session_id,
            "dir",
            wait=True,
            timeout=3000,
            screenshot=True
        )
        print(f"   Command: {result['command']}")
        print(f"   Duration: {result['duration']}ms")
        if result.get('screenshot'):
            print(f"   Screenshot: {result['screenshot']['filepath']}")
        print()

        # Example 6: Use index-based alias
        print("6. Using index-based alias (session 1)...")
        client.cmd_type(1, r"echo Using index 1\n")
        time.sleep(1)
        print("   Done!\n")

        # Example 7: Get session info
        print("7. Getting session info...")
        info = client.cmd_info(session_id)
        print(f"   Title: {info['title']}")
        print(f"   Handle: {info['handle']}")
        print(f"   Commands run: {info['commandCount']}")
        print(f"   Age: {info['age']}ms")
        print()

        # Example 8: Take screenshot of CMD window
        print("8. Taking screenshot of CMD window...")
        cmd_screenshot = client.cmd_screenshot(session_id, return_base64=False)
        print(f"   Screenshot saved to: {cmd_screenshot['filepath']}")
        print(f"   Size: {cmd_screenshot['width']}x{cmd_screenshot['height']}\n")

        # Example 9: Complex automation sequence
        print("9. Running complex automation sequence...")
        print("   (Focus -> Type -> Maximize -> Delay -> Minimize -> Delay -> Restore)")
        client.cmd_type(session_id, r"\fecho Complex sequence\n")
        client.cmd_type(session_id, r"\d500\M")
        client.cmd_type(session_id, r"\d1000echo Maximized\n")
        client.cmd_type(session_id, r"\d500\m")
        client.cmd_type(session_id, r"\d1000echo Minimized\n")
        client.cmd_type(session_id, r"\d500\r")
        client.cmd_type(session_id, r"\d1000echo Restored\n")
        time.sleep(2)
        print("   Done!\n")

        # Example 10: Close session
        print("10. Closing CMD session...")
        client.cmd_close(session_id)
        print("    Done!\n")

    print("=== All examples completed ===")


if __name__ == "__main__":
    main()
