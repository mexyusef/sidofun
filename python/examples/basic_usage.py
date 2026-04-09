"""
Basic usage example for Sidofun Desktop Python client.
"""

from sidofun_desktop import DesktopWinClient


def main():
    print("=== Sidofun Desktop Python Client - Basic Usage ===\n")

    with DesktopWinClient() as client:
        # Example 1: Take a screenshot
        print("1. Taking screenshot...")
        screenshot = client.screenshot(return_base64=False)
        print(f"   Screenshot saved to: {screenshot['filepath']}")
        print(f"   Size: {screenshot['width']}x{screenshot['height']}\n")

        # Example 2: Get screen size
        print("2. Getting screen size...")
        size = client.screen_size()
        print(f"   Screen: {size['width']}x{size['height']}\n")

        # Example 3: Get mouse position
        print("3. Getting mouse position...")
        pos = client.mouse_position()
        print(f"   Mouse at: ({pos['x']}, {pos['y']})\n")

        # Example 4: Get active window
        print("4. Getting active window...")
        window = client.active_window()
        print(f"   Active window: {window['title']}")
        print(f"   Handle: {window['handle']}\n")

        # Example 5: Click at position
        print("5. Clicking at (100, 100)...")
        client.click(100, 100)
        print("   Done!\n")

        # Example 6: Type text
        print("6. Typing 'Hello World'...")
        client.type("Hello World")
        print("   Done!\n")

        # Example 7: Press Enter
        print("7. Pressing Enter...")
        client.key_press("enter")
        print("   Done!\n")

    print("=== All examples completed ===")


if __name__ == "__main__":
    main()
