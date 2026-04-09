"""
Tests for singleton browser helpers.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinSingleton
from test_browser_session import StubDesktopWinClient
from test_browser_runtime import StubDesktopWinClient as RuntimeStubDesktopWinClient


class TestBrowserSingletonHelpers:
    def test_singleton_browser_helper_uses_existing_client(self):
        original = DesktopWinSingleton._instance
        try:
            stub = StubDesktopWinClient()
            DesktopWinSingleton._instance = stub

            session = DesktopWinSingleton.browser("chrome").with_default_profile()
            result = session.launch_and_focus(
                url="https://example.com",
                title_includes="Example",
                wait_seconds=0,
            )

            assert session.profile == "Default"
            assert result["launch"]["browserId"] == "chrome"
            assert result["window"]["title"] == "Example"
        finally:
            DesktopWinSingleton._instance = original

    def test_singleton_browsers_accessor(self):
        original = DesktopWinSingleton._instance
        try:
            stub = StubDesktopWinClient()
            DesktopWinSingleton._instance = stub

            session = DesktopWinSingleton.browsers().firefox("Default")

            assert session.browser == "firefox"
            assert session.profile == "Default"
        finally:
            DesktopWinSingleton._instance = original

    def test_singleton_browser_runtime_helper(self):
        original = DesktopWinSingleton._instance
        try:
            stub = RuntimeStubDesktopWinClient()
            DesktopWinSingleton._instance = stub

            runtime = DesktopWinSingleton.browser("chrome").automation_runtime(
                automation_mode="debuggable",
            )

            assert runtime.runtime_id == "browser_rt_1"
            assert runtime.debug_port == 9222
        finally:
            DesktopWinSingleton._instance = original
