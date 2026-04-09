"""
Tests for fluent browser session helpers.
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
            return [
                {
                    "id": "Default",
                    "browserId": params["browser"],
                    "name": "Default",
                    "displayName": "Default",
                    "path": "C:/Profiles/Default",
                    "isDefault": True,
                    "emails": ["default@example.com"],
                    "lastUsedAt": None,
                },
                {
                    "id": "Profile 7",
                    "browserId": params["browser"],
                    "name": "Profile 7",
                    "displayName": "Work",
                    "path": "C:/Profiles/Profile 7",
                    "isDefault": False,
                    "emails": ["work@example.com"],
                    "lastUsedAt": None,
                },
            ]
        if action == "browser_windows":
            return [{"handle": 1, "title": "Window", "browserId": params["browser"]}]
        if action == "browser_focus_window":
            return {
                "handle": params.get("handle", 1),
                "title": params.get("titleIncludes") or "Window",
                "browserId": params["browser"],
            }
        return {
            "browserId": params["browser"],
            "command": ["browser.exe"],
            "pid": None,
            "usedProfile": None,
        }


class TestBrowserSessionHelpers:
    def test_browser_accessor_list(self):
        client = StubDesktopWinClient()

        assert client.browsers.list() == [{"id": "chrome", "installed": True}]
        assert client.calls[-1] == ("browser_list", {})

    def test_browser_accessor_get(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome", profile="Default")

        assert session.browser == "chrome"
        assert session.profile == "Default"
        assert str(session) == "chrome:Default"

    def test_browser_accessor_named_helper(self):
        client = StubDesktopWinClient()
        session = client.browsers.firefox("default-release")

        assert session.browser == "firefox"
        assert session.profile == "default-release"

    def test_browser_session_info_profiles_windows(self):
        client = StubDesktopWinClient()
        session = client.browser("edge")

        assert session.info()["id"] == "edge"
        assert session.capabilities()["launchMode"] == "direct"
        assert session.profiles()[0]["id"] == "Default"
        assert session.windows() == [{"handle": 1, "title": "Window", "browserId": "edge"}]

    def test_browser_session_launch_plan_and_launch(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome", profile="Profile 1")

        plan = session.launch_plan(url="example.com", args=["--new-window"])
        launched = session.launch(private_mode=True)

        assert plan["browserId"] == "chrome"
        assert launched["browserId"] == "chrome"
        assert client.calls[-2] == (
            "browser_launch_plan",
            {
                "browser": "chrome",
                "profile": "Profile 1",
                "profilePath": None,
                "url": "example.com",
                "privateMode": False,
                "headless": False,
                "args": ["--new-window"],
                "detached": False,
            },
        )
        assert client.calls[-1] == (
            "browser_launch",
            {
                "browser": "chrome",
                "profile": "Profile 1",
                "profilePath": None,
                "url": None,
                "privateMode": True,
                "headless": False,
                "args": [],
                "detached": False,
            },
        )

    def test_browser_session_focus(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome")
        result = session.focus(title_includes="YouTube")

        assert result["browserId"] == "chrome"
        assert client.calls[-1] == (
            "browser_focus_window",
            {
                "browser": "chrome",
                "handle": None,
                "titleIncludes": "YouTube",
            },
        )

    def test_with_profile(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome").with_profile("Profile 7")

        assert session.browser == "chrome"
        assert session.profile == "Profile 7"

    def test_default_profile(self):
        client = StubDesktopWinClient()
        try:
            client.browser("edge").default_profile()
        except LookupError as exc:
            assert "does not support profile workflows" in str(exc)
        else:
            raise AssertionError("LookupError was not raised")

    def test_find_profile_by_name_email_and_default(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome")

        assert session.find_profile(query="Work")["name"] == "Profile 7"
        assert session.find_profile(email="default@example.com")["name"] == "Default"
        assert session.find_profile(default=True)["name"] == "Default"

    def test_require_profile_raises_when_missing(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome")

        try:
            session.require_profile(query="missing")
        except LookupError as exc:
            assert "missing" in str(exc)
        else:
            raise AssertionError("LookupError was not raised")

    def test_with_profile_name_email_and_default_profile(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome")

        by_name = session.with_profile_name("Work")
        by_email = session.with_profile_email("default@example.com")
        by_default = session.with_default_profile()

        assert by_name.profile == "Profile 7"
        assert by_name.profile_path == "C:/Profiles/Profile 7"
        assert by_email.profile == "Default"
        assert by_default.profile == "Default"

    def test_direct_launch_browser_rejects_profile_workflow_methods(self):
        client = StubDesktopWinClient()
        session = client.browser("edge")

        for invoke in (
            lambda: session.find_profile(default=True),
            lambda: session.with_default_profile(),
            lambda: session.with_profile_name("Default"),
            lambda: session.with_profile_email("default@example.com"),
        ):
            try:
                invoke()
            except LookupError as exc:
                assert "does not support profile workflows" in str(exc)
            else:
                raise AssertionError("LookupError was not raised")

    def test_launch_and_focus(self):
        client = StubDesktopWinClient()
        session = client.browser("chrome", profile="Default")

        result = session.launch_and_focus(
            url="https://example.com",
            title_includes="Example",
            wait_seconds=0,
        )

        assert result["launch"]["browserId"] == "chrome"
        assert result["window"]["title"] == "Example"
        assert client.calls[-2] == (
            "browser_launch",
            {
                "browser": "chrome",
                "profile": "Default",
                "profilePath": None,
                "url": "https://example.com",
                "privateMode": False,
                "headless": False,
                "args": [],
                "detached": False,
            },
        )
        assert client.calls[-1] == (
            "browser_focus_window",
            {
                "browser": "chrome",
                "handle": None,
                "titleIncludes": "Example",
            },
        )
