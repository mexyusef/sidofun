from sidofun_desktop import DesktopWinClient


def main() -> None:
    with DesktopWinClient() as client:
        browsers = client.list_browsers()
        installed = [browser for browser in browsers if browser.get("installed")]

        print("Installed browsers:")
        for browser in installed:
            print(f"  - {browser['id']}: {browser.get('executablePath')}")

        chrome_profiles = client.browser_profiles("chrome")
        print(f"\nChrome profiles: {len(chrome_profiles)}")
        for profile in chrome_profiles[:5]:
            emails = ", ".join(profile.get("emails", [])) or "-"
            print(f"  - {profile['name']} | {profile['displayName']} | {emails}")

        if chrome_profiles:
            chrome = client.browsers.chrome(chrome_profiles[0]["name"])
            plan = chrome.launch_plan(
                url="https://example.com",
                args=["--new-window"],
            )
            print("\nLaunch plan:")
            print(plan["command"])

            focused = chrome.launch_and_focus(
                url="https://example.com",
                title_includes="Example",
                wait_seconds=0.5,
            )
            print("\nFocused window:")
            print(focused["window"])

        chrome_windows = client.browsers.chrome().windows()
        print(f"\nVisible Chrome windows: {len(chrome_windows)}")
        for window in chrome_windows[:5]:
            print(f"  - {window['handle']}: {window['title']}")


if __name__ == "__main__":
    main()
