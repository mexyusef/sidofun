"""
Opt-in live Chromium Playwright smoke over CDP.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinClient


LIVE_AUTOMATION = os.environ.get("SIDOFUN_RUN_LIVE_AUTOMATION_TESTS") == "1"
CHROME_PLAYWRIGHT_URL = os.environ.get("SIDOFUN_CHROME_PLAYWRIGHT_URL", "https://example.com")
CHROME_PLAYWRIGHT_DEBUG_PORT = int(os.environ.get("SIDOFUN_CHROME_PLAYWRIGHT_DEBUG_PORT", "9335"))

requires_live_chromium = pytest.mark.skipif(
    not LIVE_AUTOMATION,
    reason="Set SIDOFUN_RUN_LIVE_AUTOMATION_TESTS=1 to run live Chromium Playwright smoke tests.",
)


@requires_live_chromium
def test_chrome_runtime_can_open_and_read_page():
    with DesktopWinClient() as client:
        runtime = client.browser("chrome").automation_runtime(
            automation_mode="debuggable",
            debug_port=CHROME_PLAYWRIGHT_DEBUG_PORT,
        )
        page = runtime.open_page(CHROME_PLAYWRIGHT_URL)
        content = page.content()
        info = page.info()
        page.close()
        closed = runtime.close()

    assert runtime.debug_port == CHROME_PLAYWRIGHT_DEBUG_PORT
    assert "example" in content["content"].lower()
    assert "example" in info["title"].lower() or "example" in info["url"].lower()
    assert closed["closed"] is True
