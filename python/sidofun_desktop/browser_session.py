"""
Browser Session Classes

Provides fluent browser/profile helpers on top of DesktopWinClient.
"""

from __future__ import annotations

import time
from typing import TYPE_CHECKING, Optional

from .browser_runtime import BrowserRuntime
from .types import (
    BrowserInfo,
    BrowserLaunchAndFocusResult,
    BrowserLaunchResult,
    BrowserProfileInfo,
    BrowserRuntimeInfo,
    BrowserWindowInfo,
)

if TYPE_CHECKING:
    from . import DesktopWinClient


class BrowserSession:
    """
    A browser/profile-bound helper for browser operations.

    It does not keep a persistent browser process handle. Instead it binds
    browser and optional profile identity so launch/focus/list operations read
    naturally from Python.
    """

    def __init__(
        self,
        client: "DesktopWinClient",
        browser: str,
        profile: Optional[str] = None,
        profile_path: Optional[str] = None,
    ):
        self._client = client
        self.browser = browser
        self.profile = profile
        self.profile_path = profile_path

    def info(self) -> BrowserInfo:
        """Get discovery information for this browser."""
        return self._client.browser_info(self.browser)

    def capabilities(self) -> BrowserInfo:
        """Get agent-facing capability metadata for this browser."""
        return self._client.browser_capabilities(self.browser)

    def profiles(self) -> list[BrowserProfileInfo]:
        """List profiles for this browser."""
        return self._client.browser_profiles(self.browser)

    def _require_profile_workflow(self) -> BrowserInfo:
        """Ensure this browser supports agent-facing profile workflows."""
        info = self.capabilities()
        if not info.get("supportsProfileDiscovery", False):
            raise LookupError(
                f"Browser {self.browser!r} does not support profile workflows in Sidofun. "
                "Use direct browser launch instead."
            )
        return info

    def find_profile(
        self,
        query: Optional[str] = None,
        email: Optional[str] = None,
        default: bool = False,
    ) -> Optional[BrowserProfileInfo]:
        """
        Find a browser profile by bound identity, name, display label, or email.

        Matching is case-insensitive.
        """
        self._require_profile_workflow()
        profiles = self.profiles()

        if self.profile_path:
            for candidate in profiles:
                if candidate.get("path") == self.profile_path:
                    return candidate

        if self.profile and query is None and email is None and not default:
            query = self.profile

        if default:
            for candidate in profiles:
                if candidate.get("isDefault"):
                    return candidate

        query_norm = query.casefold() if query else None
        email_norm = email.casefold() if email else None

        for candidate in profiles:
            names = [
                candidate.get("id"),
                candidate.get("name"),
                candidate.get("displayName"),
            ]
            emails = candidate.get("emails", [])

            if query_norm and any(
                isinstance(value, str) and value.casefold() == query_norm
                for value in names
            ):
                return candidate

            if email_norm and any(
                isinstance(value, str) and value.casefold() == email_norm
                for value in emails
            ):
                return candidate

        return None

    def require_profile(
        self,
        query: Optional[str] = None,
        email: Optional[str] = None,
        default: bool = False,
    ) -> BrowserProfileInfo:
        """Find a profile or raise LookupError when no match exists."""
        profile = self.find_profile(query=query, email=email, default=default)
        if profile is not None:
            return profile

        target = query or email or self.profile or self.profile_path or "default profile"
        raise LookupError(f"No profile matched {target!r} for browser {self.browser!r}")

    def launch_plan(
        self,
        url: Optional[str] = None,
        private_mode: bool = False,
        headless: bool = False,
        args: Optional[list[str]] = None,
        detached: bool = False,
    ) -> BrowserLaunchResult:
        """Resolve the launch command for this browser/profile."""
        return self._client.plan_browser_launch(
            self.browser,
            profile=self.profile,
            profile_path=self.profile_path,
            url=url,
            private_mode=private_mode,
            headless=headless,
            args=args,
            detached=detached,
        )

    def launch(
        self,
        url: Optional[str] = None,
        private_mode: bool = False,
        headless: bool = False,
        args: Optional[list[str]] = None,
        detached: bool = False,
    ) -> BrowserLaunchResult:
        """Launch this browser/profile."""
        return self._client.launch_browser(
            self.browser,
            profile=self.profile,
            profile_path=self.profile_path,
            url=url,
            private_mode=private_mode,
            headless=headless,
            args=args,
            detached=detached,
        )

    def windows(self) -> list[BrowserWindowInfo]:
        """List visible windows for this browser."""
        return self._client.browser_windows(self.browser)

    def focus(
        self,
        handle: Optional[int] = None,
        title_includes: Optional[str] = None,
    ) -> BrowserWindowInfo:
        """Focus a browser window by handle or title match."""
        return self._client.focus_browser_window(
            self.browser,
            handle=handle,
            title_includes=title_includes,
        )

    def launch_and_focus(
        self,
        url: Optional[str] = None,
        private_mode: bool = False,
        headless: bool = False,
        args: Optional[list[str]] = None,
        detached: bool = False,
        title_includes: Optional[str] = None,
        wait_seconds: float = 1.0,
    ) -> BrowserLaunchAndFocusResult:
        """
        Launch the browser/profile and then focus a matching window.

        `wait_seconds` gives the browser time to materialize the window before
        the focus call.
        """
        launch = self.launch(
            url=url,
            private_mode=private_mode,
            headless=headless,
            args=args,
            detached=detached,
        )
        if wait_seconds > 0:
            time.sleep(wait_seconds)
        window = self.focus(title_includes=title_includes)
        return {"launch": launch, "window": window}

    def automation_runtime(
        self,
        url: Optional[str] = None,
        private_mode: bool = False,
        headless: bool = False,
        args: Optional[list[str]] = None,
        detached: bool = True,
        automation_mode: str = "debuggable",
        debug_port: Optional[int] = None,
    ) -> BrowserRuntime:
        """Create a debuggable browser runtime for this browser/profile."""
        info: BrowserRuntimeInfo = self._client.create_browser_runtime(
            self.browser,
            profile=self.profile,
            profile_path=self.profile_path,
            url=url,
            private_mode=private_mode,
            headless=headless,
            args=args,
            detached=detached,
            automation_mode=automation_mode,
            debug_port=debug_port,
        )
        return BrowserRuntime(self._client, info["id"], info=info)

    def default_profile(self) -> "BrowserSession":
        """Return a copy bound to the browser default profile."""
        self._require_profile_workflow()
        return BrowserSession(self._client, self.browser, profile="Default")

    def with_default_profile(self) -> "BrowserSession":
        """Return a copy bound to the discovered default profile."""
        self._require_profile_workflow()
        profile = self.require_profile(default=True)
        return BrowserSession(
            self._client,
            self.browser,
            profile=profile.get("name") or profile.get("id"),
            profile_path=profile.get("path"),
        )

    def with_profile_name(self, name: str) -> "BrowserSession":
        """Return a copy bound to a profile matched by id/name/display name."""
        self._require_profile_workflow()
        profile = self.require_profile(query=name)
        return BrowserSession(
            self._client,
            self.browser,
            profile=profile.get("name") or profile.get("id"),
            profile_path=profile.get("path"),
        )

    def with_profile_email(self, email: str) -> "BrowserSession":
        """Return a copy bound to a profile matched by email."""
        self._require_profile_workflow()
        profile = self.require_profile(email=email)
        return BrowserSession(
            self._client,
            self.browser,
            profile=profile.get("name") or profile.get("id"),
            profile_path=profile.get("path"),
        )

    def with_profile(
        self,
        profile: Optional[str] = None,
        profile_path: Optional[str] = None,
    ) -> "BrowserSession":
        """Return a copy bound to a different profile."""
        return BrowserSession(
            self._client,
            self.browser,
            profile=profile,
            profile_path=profile_path,
        )

    def __str__(self) -> str:
        if self.profile:
            return f"{self.browser}:{self.profile}"
        if self.profile_path:
            return f"{self.browser}:{self.profile_path}"
        return self.browser

    def __repr__(self) -> str:
        return (
            f"BrowserSession(browser='{self.browser}', "
            f"profile={self.profile!r}, profile_path={self.profile_path!r})"
        )


class BrowserAccessor:
    """Convenience entrypoint for browser helpers on a DesktopWinClient."""

    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def list(self) -> list[BrowserInfo]:
        """List installed/known browsers."""
        return self._client.list_browsers()

    def get(
        self,
        browser: str,
        profile: Optional[str] = None,
        profile_path: Optional[str] = None,
    ) -> BrowserSession:
        """Get a browser helper optionally bound to a profile."""
        return BrowserSession(
            self._client,
            browser=browser,
            profile=profile,
            profile_path=profile_path,
        )

    def chrome(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("chrome", profile=profile)

    def firefox(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("firefox", profile=profile)

    def edge(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("edge", profile=profile)

    def brave(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("brave", profile=profile)

    def opera(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("opera", profile=profile)

    def vivaldi(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("vivaldi", profile=profile)

    def chromium(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("chromium", profile=profile)

    def maxthon(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("maxthon", profile=profile)

    def midori(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("midori", profile=profile)

    def min(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("min", profile=profile)

    def netsurf(self, profile: Optional[str] = None) -> BrowserSession:
        return self.get("netsurf", profile=profile)


__all__ = ["BrowserSession", "BrowserAccessor"]
