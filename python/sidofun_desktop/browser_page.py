"""
Browser page helpers for Playwright-backed runtimes.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .types import (
    BrowserConsoleEvent,
    BrowserNetworkEvent,
    BrowserNetworkWaitResult,
    BrowserPageEventCursorResult,
    BrowserPageActionResult,
    BrowserPageContentResult,
    BrowserPageDownloadResult,
    BrowserPageEvaluateResult,
    BrowserPageInfo,
    BrowserPagePdfResult,
    BrowserPageScreenshotResult,
    BrowserPageWaitResult,
)

if TYPE_CHECKING:
    from . import DesktopWinClient


class BrowserPage:
    """A page inside a debuggable browser runtime."""

    def __init__(self, client: "DesktopWinClient", page_id: str, info: BrowserPageInfo | None = None):
        self._client = client
        self.page_id = page_id
        self._info = info

    def info(self, refresh: bool = True) -> BrowserPageInfo:
        """Get page metadata from the backend."""
        if self._info is None or refresh:
            self._info = self._client.browser_page_info(self.page_id)
        return self._info

    def navigate(self, url: str) -> BrowserPageActionResult:
        result = self._client.browser_page_navigate(self.page_id, url)
        self._info = result["page"]
        return result

    def click(self, selector: str) -> BrowserPageActionResult:
        result = self._client.browser_page_click(self.page_id, selector)
        self._info = result["page"]
        return result

    def fill(self, selector: str, value: str) -> BrowserPageActionResult:
        result = self._client.browser_page_fill(self.page_id, selector, value)
        self._info = result["page"]
        return result

    def press(self, selector: str, key: str) -> BrowserPageActionResult:
        result = self._client.browser_page_press(self.page_id, selector, key)
        self._info = result["page"]
        return result

    def wait_for(
        self,
        wait_for: str,
        query: str | None = None,
        timeout_ms: int = 10000,
    ) -> BrowserPageWaitResult:
        result = self._client.browser_page_wait_for(
            self.page_id,
            wait_for=wait_for,
            query=query,
            timeout_ms=timeout_ms,
        )
        self._info = result["page"]
        return result

    def evaluate(self, expression: str) -> BrowserPageEvaluateResult:
        result = self._client.browser_page_evaluate(self.page_id, expression)
        self._info = result["page"]
        return result

    def content(self) -> BrowserPageContentResult:
        result = self._client.browser_page_content(self.page_id)
        self._info = result["page"]
        return result

    def screenshot(self, path: str | None = None, full_page: bool = False) -> BrowserPageScreenshotResult:
        result = self._client.browser_page_screenshot(self.page_id, path=path, full_page=full_page)
        self._info = result["page"]
        return result

    def pdf(self, path: str) -> BrowserPagePdfResult:
        result = self._client.browser_page_pdf(self.page_id, path)
        self._info = result["page"]
        return result

    def download_url(self, url: str, path: str) -> BrowserPageDownloadResult:
        result = self._client.browser_page_download_url(self.page_id, url, path)
        self._info = result["page"]
        return result

    def network_events(self) -> list[BrowserNetworkEvent]:
        return self._client.browser_page_network_events(self.page_id)

    def console_events(self) -> list[BrowserConsoleEvent]:
        return self._client.browser_page_console_events(self.page_id)

    def events(self, since_id: int = 0) -> BrowserPageEventCursorResult:
        return self._client.browser_page_events(self.page_id, since_id=since_id)

    def clear_events(self) -> BrowserPageActionResult:
        result = self._client.browser_page_clear_events(self.page_id)
        self._info = result["page"]
        return result

    def wait_for_network(
        self,
        url_includes: str | None = None,
        kind: str | None = None,
        status: int | None = None,
        timeout_ms: int = 10000,
    ) -> BrowserNetworkWaitResult:
        result = self._client.browser_page_wait_for_network(
            self.page_id,
            url_includes=url_includes,
            kind=kind,
            status=status,
            timeout_ms=timeout_ms,
        )
        self._info = result["page"]
        return result

    def close(self) -> BrowserPageInfo:
        self._info = self._client.close_browser_page(self.page_id)
        return self._info

    def __str__(self) -> str:
        return self.page_id

    def __repr__(self) -> str:
        return f"BrowserPage(page_id={self.page_id!r})"


__all__ = ["BrowserPage"]
