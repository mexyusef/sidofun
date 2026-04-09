"""
Opt-in live Firefox profile smoke.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinClient


LIVE_AUTOMATION = os.environ.get("SIDOFUN_RUN_LIVE_AUTOMATION_TESTS") == "1"
FIREFOX_PROFILE_QUERY = os.environ.get("SIDOFUN_FIREFOX_PROFILE_QUERY", "uneh.saraswati")
FIREFOX_SMOKE_URL = os.environ.get("SIDOFUN_FIREFOX_SMOKE_URL", "https://gmail.com")

requires_live_firefox = pytest.mark.skipif(
    not LIVE_AUTOMATION,
    reason="Set SIDOFUN_RUN_LIVE_AUTOMATION_TESTS=1 to run live Firefox profile smoke tests.",
)


@requires_live_firefox
def test_firefox_profile_launches_gmail():
    with DesktopWinClient() as client:
        session = client.browser("firefox").with_profile_name(FIREFOX_PROFILE_QUERY)
        result = session.launch_and_focus(
            url=FIREFOX_SMOKE_URL,
            title_includes="Gmail",
            wait_seconds=2.5,
        )

    assert result["launch"]["browserId"] == "firefox"
    assert result["launch"]["usedProfile"] is not None
    assert result["launch"]["usedProfile"]["name"] == FIREFOX_PROFILE_QUERY
    assert "gmail.com" in " ".join(result["launch"]["command"]).lower()
    assert result["window"]["browserId"] == "firefox"
    assert "gmail" in result["window"]["title"].lower()
