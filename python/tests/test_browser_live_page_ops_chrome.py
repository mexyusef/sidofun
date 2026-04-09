"""
Opt-in live Chromium page-operations smoke.
"""

import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinClient


LIVE_AUTOMATION = os.environ.get("SIDOFUN_RUN_LIVE_AUTOMATION_TESTS") == "1"
CHROME_PAGE_OPS_DEBUG_PORT = int(os.environ.get("SIDOFUN_CHROME_PAGE_OPS_DEBUG_PORT", "9336"))
DATA_URL = (
    "data:text/html,"
    "<html><head><title>Sidofun Page Ops</title></head>"
    "<body><input id='name' value=''><button id='go'>Go</button></body></html>"
)
DOWNLOAD_URL = "data:text/plain,download-ok"

requires_live_chromium = pytest.mark.skipif(
    not LIVE_AUTOMATION,
    reason="Set SIDOFUN_RUN_LIVE_AUTOMATION_TESTS=1 to run live Chromium page operation tests.",
)


@requires_live_chromium
def test_chrome_page_ops():
    with tempfile.TemporaryDirectory(prefix="sidofun-page-ops-") as temp_dir:
        pdf_path = os.path.join(temp_dir, "page.pdf")
        download_path = os.path.join(temp_dir, "download.html")

        with DesktopWinClient() as client:
            runtime = client.browser("chrome").automation_runtime(
                automation_mode="debuggable",
                debug_port=CHROME_PAGE_OPS_DEBUG_PORT,
            )
            page = runtime.open_page(DATA_URL)
            assert page.wait_for("title", "Sidofun", timeout_ms=5000)["matched"] is True
            assert page.wait_for("selector", "#name", timeout_ms=5000)["matched"] is True
            page.evaluate("console.log('sidofun console smoke')")
            page.fill("#name", "hello")
            page.press("#name", "Enter")
            evaluated = page.evaluate("document.querySelector('#name').value")
            pdf = page.pdf(pdf_path)
            download = page.download_url(DOWNLOAD_URL, download_path)
            page.navigate("https://example.com")
            page.wait_for("load", timeout_ms=10000)
            waited_network = page.wait_for_network(url_includes="example.com", kind="request", timeout_ms=10000)
            events = page.network_events()
            console_events = page.console_events()
            queued_events = page.events()
            queued_events_after_cursor = page.events(since_id=queued_events["nextCursor"])
            page.close()
            runtime.close()

        assert evaluated["value"] == "hello"
        assert pdf["path"] == pdf_path
        assert os.path.exists(pdf_path)
        assert download["path"] == download_path
        assert os.path.exists(download_path)
        assert open(download_path, "r", encoding="utf-8").read() == "download-ok"
        assert waited_network["matched"] is True
        assert len(events) >= 1
        assert any("sidofun console smoke" in event["text"] for event in console_events)
        assert any(event["category"] == "console" for event in queued_events["events"])
        assert queued_events_after_cursor["events"] == []
