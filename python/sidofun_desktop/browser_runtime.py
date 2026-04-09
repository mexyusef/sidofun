"""
Browser automation runtime helpers.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from .browser_page import BrowserPage
from .types import BrowserRuntimeCloseResult, BrowserRuntimeInfo

if TYPE_CHECKING:
    from . import DesktopWinClient


class BrowserRuntime:
    """A live debuggable browser runtime tracked by the Sidofun backend."""

    def __init__(self, client: "DesktopWinClient", runtime_id: str, info: BrowserRuntimeInfo | None = None):
        self._client = client
        self.runtime_id = runtime_id
        self._info = info

    def info(self, refresh: bool = True) -> BrowserRuntimeInfo:
        """Get runtime metadata from the backend."""
        if self._info is None or refresh:
            self._info = self._client.browser_runtime_info(self.runtime_id)
        return self._info

    def close(self) -> BrowserRuntimeCloseResult:
        """Close the runtime process tracked by the backend."""
        result = self._client.close_browser_runtime(self.runtime_id)
        if self._info is not None:
            self._info["status"] = result["status"]
            self._info["closedAt"] = result.get("closedAt")
        return result

    def pages(self) -> list[dict]:
        """List pages tracked for this runtime."""
        return self._client.list_browser_pages(self.runtime_id)

    def open_page(self, url: str | None = None) -> BrowserPage:
        """Open a new page in this runtime."""
        info = self._client.open_browser_page(self.runtime_id, url=url)
        return BrowserPage(self._client, info["id"], info=info)

    def page(self, page_id: str) -> BrowserPage:
        """Create a local page helper for an existing page id."""
        return BrowserPage(self._client, page_id)

    @property
    def browser(self) -> str:
        return self.info(refresh=False)["browserId"] if self._info else self.info()["browserId"]

    @property
    def debug_port(self) -> int:
        return self.info(refresh=False)["debugPort"] if self._info else self.info()["debugPort"]

    @property
    def remote_debugging_url(self) -> str:
        return self.info(refresh=False)["remoteDebuggingUrl"] if self._info else self.info()["remoteDebuggingUrl"]

    def __str__(self) -> str:
        return self.runtime_id

    def __repr__(self) -> str:
        return f"BrowserRuntime(runtime_id={self.runtime_id!r})"


__all__ = ["BrowserRuntime"]
