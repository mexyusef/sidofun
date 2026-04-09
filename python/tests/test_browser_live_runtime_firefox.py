"""
Opt-in live Firefox runtime smoke.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinClient


LIVE_AUTOMATION = os.environ.get("SIDOFUN_RUN_LIVE_AUTOMATION_TESTS") == "1"
FIREFOX_PROFILE_QUERY = os.environ.get("SIDOFUN_FIREFOX_PROFILE_QUERY", "uneh.saraswati")
FIREFOX_RUNTIME_URL = os.environ.get("SIDOFUN_FIREFOX_RUNTIME_URL", "https://example.com")
FIREFOX_RUNTIME_DEBUG_PORT = int(os.environ.get("SIDOFUN_FIREFOX_RUNTIME_DEBUG_PORT", "9334"))

requires_live_firefox_runtime = pytest.mark.skipif(
    not LIVE_AUTOMATION,
    reason="Set SIDOFUN_RUN_LIVE_AUTOMATION_TESTS=1 to run live Firefox runtime smoke tests.",
)


@requires_live_firefox_runtime
def test_firefox_profile_runtime_lifecycle():
    with DesktopWinClient() as client:
        runtime = client.browser("firefox").with_profile_name(FIREFOX_PROFILE_QUERY).automation_runtime(
            url=FIREFOX_RUNTIME_URL,
            automation_mode="persistent-debuggable",
            debug_port=FIREFOX_RUNTIME_DEBUG_PORT,
        )
        info = runtime.info()
        closed = runtime.close()

    assert info["browserId"] == "firefox"
    assert info["usedProfile"] is not None
    assert info["usedProfile"]["name"] == FIREFOX_PROFILE_QUERY
    assert info["debugPort"] == FIREFOX_RUNTIME_DEBUG_PORT
    assert info["remoteDebuggingUrl"].endswith(str(FIREFOX_RUNTIME_DEBUG_PORT))
    assert "--remote-debugging-port" in info["command"]
    assert closed["closed"] is True
    assert closed["status"] == "closed"
