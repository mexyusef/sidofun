"""
Tests for browser runtime helpers.
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
        if action == "browser_runtime_create":
            return {
                "id": "browser_rt_1",
                "browserId": params["browser"],
                "automationMode": params["automationMode"],
                "createdAt": "2026-03-06T10:00:00Z",
                "closedAt": None,
                "status": "running",
                "pid": 9876,
                "debugPort": params.get("debugPort") or 9222,
                "remoteDebuggingUrl": f"http://127.0.0.1:{params.get('debugPort') or 9222}",
                "executablePath": "C:/Browser/browser.exe",
                "command": ["browser.exe"],
                "usedProfile": None,
                "launchResult": {
                    "browserId": params["browser"],
                    "executablePath": "C:/Browser/browser.exe",
                    "command": ["browser.exe"],
                    "pid": 9876,
                    "usedProfile": None,
                    "automationMode": params["automationMode"],
                    "debugPort": params.get("debugPort") or 9222,
                    "remoteDebuggingUrl": f"http://127.0.0.1:{params.get('debugPort') or 9222}",
                },
            }
        if action == "browser_runtime_list":
            return [
                {
                    "id": "browser_rt_1",
                    "browserId": "chrome",
                    "automationMode": "debuggable",
                    "createdAt": "2026-03-06T10:00:00Z",
                    "closedAt": None,
                    "status": "running",
                    "pid": 9876,
                    "debugPort": 9222,
                    "remoteDebuggingUrl": "http://127.0.0.1:9222",
                    "executablePath": "C:/Browser/browser.exe",
                    "command": ["browser.exe"],
                    "usedProfile": None,
                    "launchResult": {
                        "browserId": "chrome",
                        "executablePath": "C:/Browser/browser.exe",
                        "command": ["browser.exe"],
                        "pid": 9876,
                        "usedProfile": None,
                        "automationMode": "debuggable",
                        "debugPort": 9222,
                        "remoteDebuggingUrl": "http://127.0.0.1:9222",
                    },
                }
            ]
        if action == "browser_runtime_info":
            return self._send_request("browser_runtime_list")[0]
        if action == "browser_runtime_close":
            return {
                "id": params["runtimeId"],
                "closed": True,
                "status": "closed",
                "closedAt": "2026-03-06T10:05:00Z",
                "pid": 9876,
            }
        if action == "browser_page_list":
            return [
                {
                    "id": "browser_pg_1",
                    "runtimeId": params["runtimeId"],
                    "url": "https://example.com",
                    "title": "Example Domain",
                    "createdAt": "2026-03-06T10:01:00Z",
                    "closedAt": None,
                    "status": "open",
                }
            ]
        if action == "browser_page_open":
            return {
                "id": "browser_pg_1",
                "runtimeId": params["runtimeId"],
                "url": params.get("url") or "about:blank",
                "title": "Example Domain",
                "createdAt": "2026-03-06T10:01:00Z",
                "closedAt": None,
                "status": "open",
            }
        if action == "browser_page_info":
            return {
                "id": params["pageId"],
                "runtimeId": "browser_rt_1",
                "url": "https://example.org",
                "title": "Example Domain",
                "createdAt": "2026-03-06T10:01:00Z",
                "closedAt": None,
                "status": "open",
            }
        if action == "browser_page_navigate":
            return {"page": self._send_request("browser_page_info", {"pageId": params["pageId"]})}
        if action == "browser_page_click":
            return {"page": self._send_request("browser_page_info", {"pageId": params["pageId"]})}
        if action == "browser_page_fill":
            return {"page": self._send_request("browser_page_info", {"pageId": params["pageId"]})}
        if action == "browser_page_press":
            return {"page": self._send_request("browser_page_info", {"pageId": params["pageId"]})}
        if action == "browser_page_wait_for":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "matched": True,
                "waitFor": params["waitFor"],
                "query": params.get("query"),
            }
        if action == "browser_page_evaluate":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "value": "Example Domain",
            }
        if action == "browser_page_content":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "content": "<html><body>example</body></html>",
            }
        if action == "browser_page_screenshot":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "path": params.get("path"),
            }
        if action == "browser_page_pdf":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "path": params["path"],
            }
        if action == "browser_page_download_url":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "path": params["path"],
                "url": params["url"],
            }
        if action == "browser_page_network_events":
            return [
                {
                    "pageId": params["pageId"],
                    "kind": "request",
                    "url": "https://example.com",
                    "method": "GET",
                    "status": None,
                    "timestamp": "2026-03-06T10:01:00Z",
                    "errorText": None,
                }
            ]
        if action == "browser_page_events":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "events": [
                    {
                        "id": 1,
                        "pageId": params["pageId"],
                        "category": "console",
                        "timestamp": "2026-03-06T10:01:01Z",
                        "payload": {
                            "pageId": params["pageId"],
                            "type": "log",
                            "text": "hello console",
                            "timestamp": "2026-03-06T10:01:01Z",
                        },
                    }
                ],
                "nextCursor": 1,
            }
        if action == "browser_page_console_events":
            return [
                {
                    "pageId": params["pageId"],
                    "type": "log",
                    "text": "hello console",
                    "timestamp": "2026-03-06T10:01:01Z",
                }
            ]
        if action == "browser_page_clear_events":
            return {"page": self._send_request("browser_page_info", {"pageId": params["pageId"]})}
        if action == "browser_page_wait_for_network":
            return {
                "page": self._send_request("browser_page_info", {"pageId": params["pageId"]}),
                "matched": True,
                "urlIncludes": params.get("urlIncludes"),
                "kind": params.get("kind"),
                "status": params.get("status"),
            }
        if action == "browser_page_close":
            return {
                "id": params["pageId"],
                "runtimeId": "browser_rt_1",
                "url": "https://example.org",
                "title": "Example Domain",
                "createdAt": "2026-03-06T10:01:00Z",
                "closedAt": "2026-03-06T10:06:00Z",
                "status": "closed",
            }
        if action == "browser_profiles":
            return [{"id": "Default", "browserId": params["browser"], "name": "Default", "displayName": "Default", "path": "C:/Profiles/Default", "isDefault": True, "emails": [], "lastUsedAt": None}]
        raise AssertionError(f"Unexpected action: {action}")


class TestBrowserRuntimeHelpers:
    def test_create_runtime_from_client(self):
        client = StubDesktopWinClient()

        runtime = client.browser("chrome").automation_runtime(
            url="https://example.com",
            automation_mode="persistent-debuggable",
            debug_port=9444,
        )

        assert runtime.runtime_id == "browser_rt_1"
        assert runtime.debug_port == 9444
        assert runtime.remote_debugging_url == "http://127.0.0.1:9444"
        assert client.calls[-1] == (
            "browser_runtime_create",
            {
                "browser": "chrome",
                "profile": None,
                "profilePath": None,
                "url": "https://example.com",
                "privateMode": False,
                "headless": False,
                "args": [],
                "detached": True,
                "automationMode": "persistent-debuggable",
                "debugPort": 9444,
            },
        )

    def test_runtime_info_list_and_close(self):
        client = StubDesktopWinClient()

        runtimes = client.list_browser_runtimes()
        runtime = client.browser_runtime("browser_rt_1")
        info = runtime.info()
        closed = runtime.close()

        assert runtimes[0]["id"] == "browser_rt_1"
        assert info["browserId"] == "chrome"
        assert closed["status"] == "closed"

    def test_runtime_open_page_and_page_actions(self):
        client = StubDesktopWinClient()

        runtime = client.browser("chrome").automation_runtime()
        pages = runtime.pages()
        page = runtime.open_page("https://example.com")
        info = page.info()
        navigated = page.navigate("https://example.org")
        clicked = page.click("text=Example")
        filled = page.fill("#email", "user@example.com")
        pressed = page.press("#email", "Enter")
        waited = page.wait_for("selector", "#email", timeout_ms=500)
        evaluated = page.evaluate("document.title")
        content = page.content()
        shot = page.screenshot(path="example.png", full_page=True)
        pdf = page.pdf("example.pdf")
        downloaded = page.download_url("https://example.com/file.txt", "file.txt")
        events = page.network_events()
        queued_events = page.events()
        console_events = page.console_events()
        waited_network = page.wait_for_network(url_includes="example.com", kind="request", timeout_ms=500)
        cleared = page.clear_events()
        closed = page.close()

        assert pages[0]["id"] == "browser_pg_1"
        assert info["id"] == "browser_pg_1"
        assert navigated["page"]["id"] == "browser_pg_1"
        assert clicked["page"]["id"] == "browser_pg_1"
        assert filled["page"]["id"] == "browser_pg_1"
        assert pressed["page"]["id"] == "browser_pg_1"
        assert waited["matched"] is True
        assert evaluated["value"] == "Example Domain"
        assert "example" in content["content"]
        assert shot["path"] == "example.png"
        assert pdf["path"] == "example.pdf"
        assert downloaded["url"] == "https://example.com/file.txt"
        assert events[0]["kind"] == "request"
        assert queued_events["events"][0]["category"] == "console"
        assert queued_events["nextCursor"] == 1
        assert console_events[0]["text"] == "hello console"
        assert waited_network["matched"] is True
        assert cleared["page"]["id"] == "browser_pg_1"
        assert closed["status"] == "closed"
