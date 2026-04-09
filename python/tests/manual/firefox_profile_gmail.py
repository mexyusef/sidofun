"""
Manual smoke for launching Firefox with a named profile to Gmail.

Usage from repo root:

    python python/tests/manual/firefox_profile_gmail.py

Optional overrides:

    $env:SIDOFUN_FIREFOX_PROFILE_QUERY = "uneh.saraswati"
    $env:SIDOFUN_FIREFOX_SMOKE_URL = "https://gmail.com"
"""

import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sidofun_desktop import DesktopWinClient


def main() -> None:
    profile_query = os.environ.get("SIDOFUN_FIREFOX_PROFILE_QUERY", "uneh.saraswati")
    url = os.environ.get("SIDOFUN_FIREFOX_SMOKE_URL", "https://gmail.com")

    with DesktopWinClient() as client:
        session = client.browser("firefox").with_profile_name(profile_query)
        result = session.launch_and_focus(
            url=url,
            title_includes="Gmail",
            wait_seconds=2.5,
        )
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
