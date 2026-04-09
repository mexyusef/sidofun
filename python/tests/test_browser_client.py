"""
Tests for browser-related Python client APIs.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinClient


class StubDesktopWinClient(DesktopWinClient):
    def __init__(self):
        super().__init__(cli_path="stub", cwd="stub")
        self.calls = []

    def _send_request(self, action: str, params=None):
        self.calls.append((action, params or {}))
        if action == "browser_list":
            return [{"id": "chrome", "installed": True}]
        if action == "browser_info":
            browser = params["browser"]
            if browser == "chrome":
                return {
                    "id": browser,
                    "installed": True,
                    "supportsProfileDiscovery": True,
                    "supportsProfiles": True,
                    "supportsProfileLaunch": True,
                    "launchMode": "profile",
                    "supportsPrivateMode": True,
                    "supportsHeadless": True,
                }
            return {
                "id": browser,
                "installed": True,
                "supportsProfileDiscovery": False,
                "supportsProfiles": False,
                "supportsProfileLaunch": False,
                "launchMode": "direct",
                "supportsPrivateMode": True,
                "supportsHeadless": True,
            }
        if action == "browser_profiles":
            return [{"id": "Default", "browserId": params["browser"]}]
        if action == "browser_windows":
            return [{"handle": 123, "title": "Example", "browserId": params["browser"]}]
        if action == "browser_focus_window":
            return {"handle": params.get("handle", 123), "title": "Example", "browserId": params["browser"]}
        return {
            "browserId": params["browser"],
            "command": ["browser.exe"],
            "pid": None,
            "usedProfile": None,
        }


class TestBrowserClientMethods:
    def test_list_browsers(self):
        client = StubDesktopWinClient()
        result = client.list_browsers()
        assert result == [{"id": "chrome", "installed": True}]
        assert client.calls[-1] == ("browser_list", {})

    def test_browser_info(self):
        client = StubDesktopWinClient()
        result = client.browser_info("chrome")
        assert result["id"] == "chrome"
        assert result["launchMode"] == "profile"
        assert client.calls[-1] == ("browser_info", {"browser": "chrome"})

    def test_browser_capabilities(self):
        client = StubDesktopWinClient()
        result = client.browser_capabilities("edge")
        assert result["id"] == "edge"
        assert result["launchMode"] == "direct"
        assert result["supportsProfileLaunch"] is False
        assert client.calls[-1] == ("browser_info", {"browser": "edge"})

    def test_browser_profiles(self):
        client = StubDesktopWinClient()
        result = client.browser_profiles("firefox")
        assert result == [{"id": "Default", "browserId": "firefox"}]
        assert client.calls[-1] == ("browser_profiles", {"browser": "firefox"})

    def test_plan_browser_launch(self):
        client = StubDesktopWinClient()
        result = client.plan_browser_launch(
            "chrome",
            profile="Profile 1",
            url="example.com",
            private_mode=True,
            headless=True,
            args=["--new-window"],
        )
        assert result["browserId"] == "chrome"
        assert client.calls[-1] == (
            "browser_launch_plan",
            {
                "browser": "chrome",
                "profile": "Profile 1",
                "profilePath": None,
                "url": "example.com",
                "privateMode": True,
                "headless": True,
                "args": ["--new-window"],
                "detached": False,
            },
        )

    def test_launch_browser(self):
        client = StubDesktopWinClient()
        result = client.launch_browser("edge", private_mode=True)
        assert result["browserId"] == "edge"
        assert client.calls[-1] == (
            "browser_launch",
            {
                "browser": "edge",
                "profile": None,
                "profilePath": None,
                "url": None,
                "privateMode": True,
                "headless": False,
                "args": [],
                "detached": False,
            },
        )

    def test_browser_windows(self):
        client = StubDesktopWinClient()
        result = client.browser_windows("chrome")
        assert result == [{"handle": 123, "title": "Example", "browserId": "chrome"}]
        assert client.calls[-1] == ("browser_windows", {"browser": "chrome"})

    def test_focus_browser_window(self):
        client = StubDesktopWinClient()
        result = client.focus_browser_window("firefox", title_includes="Mozilla")
        assert result["browserId"] == "firefox"
        assert client.calls[-1] == (
            "browser_focus_window",
            {"browser": "firefox", "handle": None, "titleIncludes": "Mozilla"},
        )
