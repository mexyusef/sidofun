"""
Sidofun Desktop Python Client

Direct Python-to-Bun IPC client for Windows desktop automation.
No HTTP/WebSocket overhead - calls server functions directly via stdin/stdout.

Usage:
    from sidofun_desktop import DesktopWinClient

    with DesktopWinClient() as client:
        # Desktop actions
        screenshot = client.screenshot()
        client.click(100, 200)
        client.type("Hello World")

        # CMD automation
        session_id = client.cmd_spawn("MyAutomation")
        client.cmd_type(session_id, r"\\Mecho hello\\n\\d1000")
        result = client.cmd_screenshot(session_id)
"""

import subprocess
import json
import threading
import os
import time
from pathlib import Path
from typing import Any, Optional, Union
from contextlib import contextmanager

from .exceptions import (
    ProcessError,
    ParseError,
    raise_error_from_response,
)
from .types import (
    Point,
    Rect,
    ScreenSize,
    ScreenshotResult,
    ActiveWindowResult,
    ProcessInfo,
    WindowInfo,
    LocalCoderAppStatus,
    ClipboardStatus,
    ClientSession,
    ClientSessionList,
    DesktopScopeInfo,
    DesktopScopeList,
    ShellRunResult,
    GenericTerminalList,
    BrowserInfo,
    BrowserProfileInfo,
    BrowserLaunchResult,
    BrowserLaunchAndFocusResult,
    BrowserRuntimeInfo,
    BrowserRuntimeCloseResult,
    BrowserPageInfo,
    BrowserPageActionResult,
    BrowserPageContentResult,
    BrowserPageScreenshotResult,
    BrowserPageEvaluateResult,
    BrowserPageWaitResult,
    BrowserPagePdfResult,
    BrowserPageDownloadResult,
    BrowserConsoleEvent,
    BrowserNetworkEvent,
    BrowserNetworkWaitResult,
    BrowserPageEvent,
    BrowserPageEventCursorResult,
    BrowserWindowInfo,
    CMDSessionInfo,
    CMDSessionList,
    CMDSpawnResult,
    CMDExecResult,
    TerminalStatusResult,
)
from .session import CMDSession, SessionManager
from .browser_session import BrowserAccessor, BrowserSession
from .browser_runtime import BrowserRuntime
from .browser_page import BrowserPage
from .computer import ComputerInterface


class DesktopWinClient:
    """
    Direct Python-to-Bun IPC client for Windows desktop automation.

    Manages a Bun subprocess and communicates via stdin/stdout using JSON messages.
    """

    def __init__(
        self,
        bun_path: Optional[str] = None,
        cli_path: Optional[str] = None,
        cwd: Optional[str] = None,
        encoding: str = "utf-8",
        timeout: Optional[float] = 30.0,
    ):
        """
        Initialize the DesktopWinClient.

        Args:
            bun_path: Path to bun executable (default: "bun")
            cli_path: Path to cli.ts (default: "../src/cli.ts" relative to this file)
            cwd: Working directory for Bun subprocess (default: project root)
            encoding: Text encoding for stdin/stdout (default: "utf-8")
            timeout: Default timeout for requests in seconds (default: 30.0)
        """
        self.bun_path = bun_path or "bun"
        self.cli_path = cli_path or self._default_cli_path()
        self.cwd = cwd or self._default_cwd()
        self.encoding = encoding
        self.timeout = timeout

        self._proc: Optional[subprocess.Popen] = None
        self._request_id = 0
        self._lock = threading.Lock()
        self._browsers = BrowserAccessor(self)
        self._computer = ComputerInterface(self)

    @staticmethod
    def _default_cli_path() -> str:
        """Resolve the IPC entrypoint for bundled, installed, or repo layouts."""
        backend_root = DesktopWinClient._default_backend_root()
        dist_cli = backend_root / "dist" / "cli-ipc.js"
        if dist_cli.exists():
            return str(dist_cli)

        src_cli = backend_root / "src" / "cli-ipc.ts"
        if src_cli.exists():
            return str(src_cli)

        raise FileNotFoundError("Could not resolve Sidofun backend entrypoint")

    @staticmethod
    def _default_cwd() -> str:
        """Resolve the backend working directory for bundled or repo layouts."""
        return str(DesktopWinClient._default_backend_root())

    @staticmethod
    def _repo_root() -> Path:
        """Return the repository root for editable/development layouts."""
        return Path(__file__).resolve().parents[2]

    @staticmethod
    def _package_root() -> Path:
        """Return the installed Python package root."""
        return Path(__file__).resolve().parent

    @staticmethod
    def _bundled_backend_root() -> Path:
        """Return the packaged backend root used by wheel/sdist releases."""
        return DesktopWinClient._package_root() / "_vendor" / "backend"

    @staticmethod
    def _default_backend_root() -> Path:
        """Prefer bundled release assets and fall back to the repo layout."""
        bundled_root = DesktopWinClient._bundled_backend_root()
        if (bundled_root / "dist" / "cli-ipc.js").exists():
            return bundled_root

        return DesktopWinClient._repo_root()

    @staticmethod
    def _libnut_path_for_launch(cli_path: str, cwd: str) -> Optional[str]:
        """Return the libnut path that should be passed to the Bun subprocess."""
        cwd_candidate = Path(cwd) / "libnut-core-build-release" / "libnut.node"
        if cwd_candidate.exists():
            return str(cwd_candidate)

        bundled_candidate = (
            DesktopWinClient._bundled_backend_root() / "libnut-core-build-release" / "libnut.node"
        )
        if bundled_candidate.exists():
            return str(bundled_candidate)

        repo_candidate = DesktopWinClient._repo_root() / "libnut-core-build-release" / "libnut.node"
        if repo_candidate.exists():
            return str(repo_candidate)

        return None

    def _get_next_id(self) -> int:
        """Get next request ID."""
        with self._lock:
            self._request_id += 1
            return self._request_id

    def _send_request(self, action: str, params: Optional[dict] = None) -> Any:
        """
        Send a request to the Bun subprocess and wait for response.

        Args:
            action: Action name to execute
            params: Optional parameters for the action

        Returns:
            Response result data

        Raises:
            ProcessError: If subprocess is not running or dies
            ParseError: If request/response parsing fails
            Various action-specific exceptions
        """
        if self._proc is None or self._proc.poll() is not None:
            raise ProcessError("Bun subprocess is not running. Call start() or use as context manager.")

        request_id = self._get_next_id()
        request = {
            "id": request_id,
            "action": action,
            "params": params or {},
        }

        try:
            # Send request
            request_line = json.dumps(request) + "\n"
            self._proc.stdin.write(request_line.encode(self.encoding))
            self._proc.stdin.flush()

            # Read response with retry for empty lines
            max_retries = 3
            for attempt in range(max_retries):
                response_line = self._proc.stdout.readline()
                if not response_line:
                    raise ProcessError("Bun subprocess died unexpectedly")

                response_line = response_line.decode(self.encoding).strip()
                if response_line:  # Non-empty line
                    break
                # Empty line, retry after short delay
                time.sleep(0.1)
            else:
                raise ProcessError("No valid response received after retries")

            response = json.loads(response_line)

            # Check for success
            if response.get("success"):
                return response.get("result")
            else:
                # Raise appropriate exception
                raise_error_from_response(response.get("error", {}))

        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            raise ParseError(f"Failed to parse response: {e}")
        except OSError as e:
            raise ProcessError(f"IPC communication error: {e}")

    # ==================== Lifecycle ====================

    def start(self) -> None:
        """
        Start the Bun subprocess.

        Raises:
            ProcessError: If subprocess fails to start
        """
        if self._proc is not None and self._proc.poll() is None:
            return  # Already running

        try:
            env = os.environ.copy()
            libnut_path = self._libnut_path_for_launch(self.cli_path, self.cwd)
            if libnut_path is not None:
                env["LIBNUT_PATH"] = libnut_path

            self._proc = subprocess.Popen(
                [self.bun_path, "run", self.cli_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=self.cwd,
                env=env,
                text=False,  # Use bytes for binary safety
                bufsize=0,   # Unbuffered for binary mode
            )
            # Give Bun time to start and initialize
            time.sleep(0.5)
        except (OSError, subprocess.SubprocessError) as e:
            raise ProcessError(f"Failed to start Bun subprocess: {e}")

    @property
    def computer(self) -> ComputerInterface:
        """Grouped computer/server interface families for agent-facing use."""
        return self._computer

    def stop(self) -> None:
        """Stop the Bun subprocess."""
        if self._proc is not None:
            try:
                self._proc.terminate()
                self._proc.wait(timeout=5)
            except (OSError, subprocess.TimeoutExpired):
                self._proc.kill()
            finally:
                self._proc = None

    def is_running(self) -> bool:
        """Check if the Bun subprocess is running."""
        return self._proc is not None and self._proc.poll() is None

    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()
        return False

    # ==================== Desktop Actions ====================

    def screenshot(
        self,
        format: str = "png",
        filename: Optional[str] = None,
        return_base64: bool = True,
    ) -> ScreenshotResult:
        """
        Take a screenshot of the primary screen.

        Args:
            format: Image format ("png" or "jpg")
            filename: Optional filename to save screenshot
            return_base64: Whether to return base64 data

        Returns:
            ScreenshotResult with filepath, data, width, height, format
        """
        return self._send_request(
            "screenshot",
            {
                "format": format,
                "filename": filename,
                "returnBase64": return_base64,
            },
        )

    def screenshot_win32(
        self,
        filename: Optional[str] = None,
        return_base64: bool = False,
    ) -> ScreenshotResult:
        """
        Take a DPI-aware screenshot at full physical resolution.

        Args:
            filename: Optional filename to save screenshot
            return_base64: Whether to return base64 data

        Returns:
            ScreenshotResult with filepath, width, height
        """
        return self._send_request(
            "screenshot_win32",
            {
                "filename": filename,
                "returnBase64": return_base64,
            },
        )

    def click(self, x: int, y: int, button: str = "left") -> str:
        """
        Click at the specified coordinates.

        Args:
            x: X coordinate
            y: Y coordinate
            button: Mouse button ("left", "right", or "middle")

        Returns:
            Success message
        """
        return self._send_request(
            "click",
            {"x": x, "y": y, "button": button},
        )

    def move_mouse(self, x: int, y: int) -> str:
        """
        Move mouse to the specified coordinates.

        Args:
            x: X coordinate
            y: Y coordinate

        Returns:
            Success message
        """
        return self._send_request(
            "move_mouse",
            {"x": x, "y": y},
        )

    def drag_mouse(
        self,
        path: list[Point],
        button: str = "left",
    ) -> str:
        """
        Drag mouse along a path.

        Args:
            path: List of points to drag through
            button: Mouse button ("left", "right", or "middle")

        Returns:
            Success message
        """
        return self._send_request(
            "drag_mouse",
            {"path": path, "button": button},
        )

    def scroll(self, direction: str = "up", count: int = 1) -> str:
        """
        Scroll in the specified direction.

        Args:
            direction: Scroll direction ("up", "down", "left", or "right")
            count: Number of scroll units

        Returns:
            Success message
        """
        return self._send_request(
            "scroll",
            {"direction": direction, "count": count},
        )

    def type(self, text: str) -> str:
        """
        Type text using keyboard input.

        Args:
            text: Text to type

        Returns:
            Success message
        """
        return self._send_request(
            "type",
            {"text": text},
        )

    def key_press(self, key: str) -> str:
        """
        Press a keyboard key.

        Args:
            key: Key name (e.g., "enter", "escape", "a", "f1")

        Returns:
            Success message
        """
        return self._send_request(
            "key_press",
            {"key": key},
        )

    def get_window_rect(self, window_handle: int) -> Rect:
        """Get the rectangle for a specific window handle."""
        return self._send_request("get_window_rect", {"windowHandle": window_handle})

    def list_processes(self) -> list[ProcessInfo]:
        """List local processes with window visibility metadata."""
        return self._send_request("list_processes")

    def list_windows(self) -> list[WindowInfo]:
        """List visible top-level windows."""
        return self._send_request("list_windows")

    def get_window_info(self, window_handle: int) -> WindowInfo:
        """Get detailed information for a specific top-level window."""
        return self._send_request("get_window_info", {"windowHandle": window_handle})

    def move_window(self, window_handle: int, x: int, y: int) -> str:
        """Move a window to the specified coordinates."""
        return self._send_request("move_window", {"windowHandle": window_handle, "x": x, "y": y})

    def resize_window(self, window_handle: int, width: int, height: int) -> str:
        """Resize a window to the specified dimensions."""
        return self._send_request("resize_window", {"windowHandle": window_handle, "width": width, "height": height})

    def focus_window(
        self,
        window_title: Optional[str] = None,
        process_name: Optional[str] = None,
    ) -> str:
        """Focus a window by title or process name."""
        return self._send_request("focus_window", {"windowTitle": window_title, "processName": process_name})

    def show_window(self, window_handle: int) -> str:
        """Show a hidden window and bring it forward."""
        return self._send_request("show_window", {"windowHandle": window_handle})

    def hide_window(self, window_handle: int) -> str:
        """Hide a window from view."""
        return self._send_request("hide_window", {"windowHandle": window_handle})

    def maximize_window(self, window_handle: int) -> str:
        """Maximize a window by handle."""
        return self._send_request("maximize_window", {"windowHandle": window_handle})

    def minimize_window(self, window_handle: int) -> str:
        """Minimize a window by handle."""
        return self._send_request("minimize_window", {"windowHandle": window_handle})

    def restore_window(self, window_handle: int) -> str:
        """Restore a window by handle."""
        return self._send_request("restore_window", {"windowHandle": window_handle})

    def close_window(self, window_handle: int) -> str:
        """Request graceful close for a specific window."""
        return self._send_request("close_window", {"windowHandle": window_handle})

    def list_local_coders(self) -> list[LocalCoderAppStatus]:
        """List locally configured coder apps."""
        return self._send_request("local_coder_list")

    def local_coder_status(self, app_id: str) -> LocalCoderAppStatus:
        """Get status for one local coder app."""
        return self._send_request("local_coder_status", {"appId": app_id})

    def open_local_coder(self, app_id: str, prompt: str | None = None, working_directory: str | None = None, input_delay_ms: int | None = None) -> LocalCoderAppStatus:
        """Launch and focus a configured local coder app, optionally typing an initial prompt."""
        payload = {"appId": app_id}
        if prompt is not None:
            payload["prompt"] = prompt
        if working_directory is not None:
            payload["workingDirectory"] = working_directory
        if input_delay_ms is not None:
            payload["inputDelayMs"] = input_delay_ms
        return self._send_request("local_coder_open", payload)

    def focus_local_coder(self, app_id: str) -> LocalCoderAppStatus:
        """Focus a configured local coder app."""
        return self._send_request("local_coder_focus", {"appId": app_id})

    def close_local_coder(self, app_id: str) -> LocalCoderAppStatus:
        """Close the main window for a configured local coder app."""
        return self._send_request("local_coder_close", {"appId": app_id})

    def maximize_local_coder(self, app_id: str) -> LocalCoderAppStatus:
        """Maximize a configured local coder app window."""
        return self._send_request("local_coder_maximize", {"appId": app_id})

    def minimize_local_coder(self, app_id: str) -> LocalCoderAppStatus:
        """Minimize a configured local coder app window."""
        return self._send_request("local_coder_minimize", {"appId": app_id})

    def restore_local_coder(self, app_id: str) -> LocalCoderAppStatus:
        """Restore a configured local coder app window."""
        return self._send_request("local_coder_restore", {"appId": app_id})

    def move_local_coder(self, app_id: str, x: int, y: int) -> LocalCoderAppStatus:
        """Move a configured local coder app window."""
        return self._send_request("local_coder_move", {"appId": app_id, "x": x, "y": y})

    def resize_local_coder(self, app_id: str, width: int, height: int) -> LocalCoderAppStatus:
        """Resize a configured local coder app window."""
        return self._send_request("local_coder_resize", {"appId": app_id, "width": width, "height": height})

    def run_local_coder(self, app_id: str, prompt: str, working_directory: str | None = None, timeout_ms: int | None = None):
        """Run a configured local coder app using its non-interactive CLI mode."""
        payload = {"appId": app_id, "prompt": prompt}
        if working_directory is not None:
            payload["workingDirectory"] = working_directory
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("local_coder_run", payload)

    def opencli_status(self):
        """Get status for the nested OpenCLI-RS provider."""
        return self._send_request("opencli_status")

    def browser_extension_status(self):
        """Get status for the native Sidofun browser extension provider scaffold."""
        return self._send_request("browser_extension_status")

    def browser_extension_capabilities(self):
        """List native browser extension capabilities and site modules."""
        return self._send_request("browser_extension_capabilities")

    def browser_extension_sites(self):
        """List scaffolded/planned browser-extension site modules."""
        return self._send_request("browser_extension_sites")

    def browser_extension_wait_provider(
        self,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Wait until the native browser-extension provider reports an active connection."""
        payload: dict[str, Any] = {}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_wait_provider", payload if payload else None)

    def browser_extension_workspace_list(self):
        """List named browser-extension workspaces."""
        return self._send_request("browser_extension_workspace_list")

    def browser_extension_workspace_get(self, name: str):
        """Get one named browser-extension workspace."""
        return self._send_request("browser_extension_workspace_get", {"name": name})

    def browser_extension_workspace_set(self, name: str, path: str, sites: list[str] | None = None):
        """Create or update one named browser-extension workspace."""
        payload: dict[str, Any] = {"name": name, "path": path}
        if sites is not None:
            payload["sites"] = sites
        return self._send_request("browser_extension_workspace_set", payload)

    def browser_extension_workspace_clear(self, name: str):
        """Remove one named browser-extension workspace."""
        return self._send_request("browser_extension_workspace_clear", {"name": name})

    def browser_extension_session_create(self, workspace: str | None = None, site: str | None = None, target_url: str | None = None, name: str | None = None):
        """Create a native browser-extension session placeholder."""
        payload: dict[str, Any] = {}
        if workspace is not None:
            payload["workspace"] = workspace
        if site is not None:
            payload["site"] = site
        if target_url is not None:
            payload["targetUrl"] = target_url
        if name is not None:
            payload["name"] = name
        return self._send_request("browser_extension_session_create", payload if payload else None)

    def browser_extension_session_list(self):
        """List native browser-extension sessions."""
        return self._send_request("browser_extension_session_list")

    def browser_extension_session_info(self, session_id: str):
        """Get one native browser-extension session."""
        return self._send_request("browser_extension_session_info", {"sessionId": session_id})

    def browser_extension_session_refresh(self, session_id: str):
        """Refresh derived state for one native browser-extension session."""
        return self._send_request("browser_extension_session_refresh", {"sessionId": session_id})

    def browser_extension_session_reconnect(
        self,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Reconnect one native browser-extension session and wait until ready."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_session_reconnect", payload)

    def browser_extension_session_wait_ready(
        self,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Wait until one native browser-extension session is connected and has an active tab."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_session_wait_ready", payload)

    def browser_extension_session_close(self, session_id: str):
        """Close one native browser-extension session placeholder."""
        return self._send_request("browser_extension_session_close", {"sessionId": session_id})

    def browser_extension_tabs(self, session_id: str):
        """List tracked tabs for one native browser-extension session."""
        return self._send_request("browser_extension_tabs", {"sessionId": session_id})

    def browser_extension_navigate(self, session_id: str, target_url: str, timeout_ms: int | None = None):
        """Navigate the active tab in one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "targetUrl": target_url}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_navigate", payload)

    def browser_extension_focus_tab(self, session_id: str, tab_id: int, timeout_ms: int | None = None):
        """Focus one tracked tab in a native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "tabId": tab_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_focus_tab", payload)

    def browser_extension_snapshot(self, session_id: str, timeout_ms: int | None = None):
        """Capture a DOM/text snapshot from the active tab in one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_snapshot", payload)

    def browser_extension_actionables(
        self,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """List ranked actionable controls from the active tab in one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if selector is not None:
            payload["selector"] = selector
        if frame_selectors is not None:
            payload["frameSelectors"] = frame_selectors
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_actionables", payload)

    def browser_extension_page_state(
        self,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        max_depth: int | None = None,
        max_children: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read combined snapshot, forms, actionables, links, and DOM tree from one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if selector is not None:
            payload["selector"] = selector
        if frame_selectors is not None:
            payload["frameSelectors"] = frame_selectors
        if limit is not None:
            payload["limit"] = limit
        if max_depth is not None:
            payload["maxDepth"] = max_depth
        if max_children is not None:
            payload["maxChildren"] = max_children
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_page_state", payload)

    def browser_extension_next_actions(
        self,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        max_depth: int | None = None,
        max_children: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Suggest high-value next actions such as fill, click, toggle, and submit for one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if selector is not None:
            payload["selector"] = selector
        if frame_selectors is not None:
            payload["frameSelectors"] = frame_selectors
        if limit is not None:
            payload["limit"] = limit
        if max_depth is not None:
            payload["maxDepth"] = max_depth
        if max_children is not None:
            payload["maxChildren"] = max_children
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_next_actions", payload)

    def browser_extension_screenshot(
        self,
        session_id: str,
        filename: str | None = None,
        return_base64: bool | None = None,
        timeout_ms: int | None = None,
    ):
        """Capture a real image screenshot from the active browser-extension session window."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if filename is not None:
            payload["filename"] = filename
        if return_base64 is not None:
            payload["returnBase64"] = return_base64
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_screenshot", payload)

    def browser_extension_inspect(self, session_id: str, selector: str, timeout_ms: int | None = None):
        """Inspect one matching DOM element in the active tab of one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "selector": selector}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_inspect", payload)

    def browser_extension_inspect_all(self, session_id: str, selector: str, limit: int | None = None, timeout_ms: int | None = None):
        """Inspect multiple matching DOM elements in the active tab of one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "selector": selector}
        if limit is not None:
            payload["count"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_inspect_all", payload)

    def browser_extension_links(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """List visible links from the active tab of one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["count"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_links", payload)

    def browser_extension_evaluate(self, session_id: str, expression: str, timeout_ms: int | None = None):
        """Evaluate an expression through the active tab in one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "expression": expression}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_evaluate", payload)

    def browser_extension_click(self, session_id: str, selector: str, timeout_ms: int | None = None):
        """Click an element in the active tab of one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "selector": selector}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_click", payload)

    def browser_extension_type(self, session_id: str, selector: str, text: str, timeout_ms: int | None = None):
        """Type text into an element in the active tab of one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "selector": selector, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_type", payload)

    def browser_extension_press(self, session_id: str, key: str, selector: str | None = None, timeout_ms: int | None = None):
        """Press a key in the active tab of one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "key": key}
        if selector is not None:
            payload["selector"] = selector
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_press", payload)

    def browser_extension_cookies(self, session_id: str, target_url: str | None = None, timeout_ms: int | None = None):
        """Read cookies for the active tab URL or a supplied URL in one native browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if target_url is not None:
            payload["targetUrl"] = target_url
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_cookies", payload)

    def browser_extension_x_search(
        self,
        session_id: str,
        query: str,
        mode: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Run native x.com search through one browser-extension session and extract visible tweet cards."""
        payload: dict[str, Any] = {"sessionId": session_id, "query": query}
        if mode is not None:
            payload["mode"] = mode
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_search", payload)

    def browser_extension_x_timeline(
        self,
        session_id: str,
        timeline_type: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read one native x.com timeline through one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeline_type is not None:
            payload["timelineType"] = timeline_type
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_timeline", payload)

    def browser_extension_x_bookmarks(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read native x.com bookmarks through one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_bookmarks", payload)

    def browser_extension_x_notifications(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read native x.com notifications through one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_notifications", payload)

    def browser_extension_x_messages(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read native x.com direct-message inbox threads through one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_messages", payload)

    def browser_extension_x_open_message_thread(
        self,
        session_id: str,
        thread: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Open one native x.com direct-message thread in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "targetUrl": thread}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_open_message_thread", payload)

    def browser_extension_x_send_message(
        self,
        session_id: str,
        text: str,
        thread: str | None = None,
        timeout_ms: int | None = None,
    ):
        """Send one native x.com direct message in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if thread is not None:
            payload["targetUrl"] = thread
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_send_message", payload)

    def browser_extension_x_read_thread(
        self,
        session_id: str,
        post_url: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read one native x.com thread in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "targetUrl": post_url}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_read_thread", payload)

    def browser_extension_x_post(self, session_id: str, text: str, timeout_ms: int | None = None):
        """Create one native x.com post through one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_post", payload)

    def browser_extension_x_open_post(self, session_id: str, post_url: str, timeout_ms: int | None = None):
        """Open one native x.com post/thread in one browser-extension session and read the visible root tweet."""
        payload: dict[str, Any] = {"sessionId": session_id, "targetUrl": post_url}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_open_post", payload)

    def browser_extension_x_profile(
        self,
        session_id: str,
        handle_or_url: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read one native x.com profile in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "targetUrl": handle_or_url}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_profile", payload)

    def browser_extension_x_follow(self, session_id: str, handle_or_url: str, timeout_ms: int | None = None):
        """Follow one native x.com profile in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "targetUrl": handle_or_url}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_follow", payload)

    def browser_extension_x_reply(
        self,
        session_id: str,
        text: str,
        post_url: str | None = None,
        timeout_ms: int | None = None,
    ):
        """Reply to one x.com post in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if post_url is not None:
            payload["targetUrl"] = post_url
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_reply", payload)

    def browser_extension_x_like(self, session_id: str, post_url: str | None = None, timeout_ms: int | None = None):
        """Like one x.com post in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if post_url is not None:
            payload["targetUrl"] = post_url
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_like", payload)

    def browser_extension_x_repost(self, session_id: str, post_url: str | None = None, timeout_ms: int | None = None):
        """Repost one x.com post in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if post_url is not None:
            payload["targetUrl"] = post_url
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_x_repost", payload)

    def browser_extension_chatgpt_read_latest(self, session_id: str, timeout_ms: int | None = None):
        """Read the latest visible assistant response from chatgpt.com in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_read_latest", payload)

    def browser_extension_chatgpt_new_chat(self, session_id: str, timeout_ms: int | None = None):
        """Start a new chatgpt.com conversation in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_new_chat", payload)

    def browser_extension_chatgpt_info(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """Read consolidated chatgpt.com state including busy flag, page info, active conversation, and visible thread."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_info", payload)

    def browser_extension_chatgpt_sidebar_state(self, session_id: str, timeout_ms: int | None = None):
        """Read chatgpt.com sidebar open/visibility state in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_sidebar_state", payload)

    def browser_extension_chatgpt_toggle_sidebar(self, session_id: str, timeout_ms: int | None = None):
        """Toggle the chatgpt.com sidebar in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_toggle_sidebar", payload)

    def browser_extension_chatgpt_models(self, session_id: str, timeout_ms: int | None = None):
        """List visible/selectable chatgpt.com models in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_models", payload)

    def browser_extension_chatgpt_select_model(self, session_id: str, query: str, timeout_ms: int | None = None):
        """Select one chatgpt.com model by visible query in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "query": query}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_select_model", payload)

    def browser_extension_chatgpt_list_conversations(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """List visible saved chatgpt.com conversations from the sidebar in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_list_conversations", payload)

    def browser_extension_chatgpt_open_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Open one saved chatgpt.com conversation by title, url, or index in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_open_conversation", payload)

    def browser_extension_chatgpt_conversation_actions(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """List available actions for one visible chatgpt.com conversation entry."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_conversation_actions", payload)

    def browser_extension_chatgpt_conversation_action(
        self,
        session_id: str,
        action_query: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Invoke one visible action for one chatgpt.com conversation entry."""
        payload: dict[str, Any] = {"sessionId": session_id, "query": action_query}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_conversation_action", payload)

    def browser_extension_chatgpt_rename_conversation(
        self,
        session_id: str,
        title: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Rename one visible chatgpt.com conversation entry."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": title}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_rename_conversation", payload)

    def browser_extension_chatgpt_stop(self, session_id: str, timeout_ms: int | None = None):
        """Stop an in-progress chatgpt.com response in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_stop", payload)

    def browser_extension_chatgpt_continue(self, session_id: str, timeout_ms: int | None = None):
        """Continue a paused or truncated chatgpt.com response in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_continue", payload)

    def browser_extension_chatgpt_response_controls(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read visible response-version navigation controls in chatgpt.com for one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_response_controls", payload)

    def browser_extension_chatgpt_previous_response(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Move to the previous visible chatgpt.com response variant and return refreshed thread state."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_previous_response", payload)

    def browser_extension_chatgpt_next_response(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Move to the next visible chatgpt.com response variant and return refreshed thread state."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_next_response", payload)

    def browser_extension_chatgpt_list_response_versions(
        self,
        session_id: str,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        """List visible ChatGPT response variants by walking previous/next response controls and restoring the current variant."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if max_versions is not None:
            payload["maxVersions"] = max_versions
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_list_response_versions", payload)

    def browser_extension_chatgpt_select_response_version(
        self,
        session_id: str,
        index: int,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Select one visible ChatGPT response variant by index after discovering available response versions."""
        payload: dict[str, Any] = {"sessionId": session_id, "count": index}
        if limit is not None:
            payload["limit"] = limit
        if max_versions is not None:
            payload["maxVersions"] = max_versions
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_select_response_version", payload)

    def browser_extension_chatgpt_regenerate(self, session_id: str, timeout_ms: int | None = None):
        """Trigger regenerate/try-again in chatgpt.com for one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_regenerate", payload)

    def browser_extension_chatgpt_edit_message(
        self,
        session_id: str,
        text: str,
        index: int | None = None,
        role: str | None = None,
        offset: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Edit one targeted visible chatgpt.com message in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if index is not None:
            payload["count"] = index
        if role is not None:
            payload["role"] = role
        if offset is not None:
            payload["offset"] = offset
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_edit_message", payload)

    def browser_extension_chatgpt_read_thread(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """Read structured visible chatgpt.com conversation messages from one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_read_thread", payload)

    def browser_extension_chatgpt_read_message(
        self,
        session_id: str,
        index: int | None = None,
        role: str | None = None,
        offset: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read one targeted visible chatgpt.com message from one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if index is not None:
            payload["count"] = index
        if role is not None:
            payload["role"] = role
        if offset is not None:
            payload["offset"] = offset
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_read_message", payload)

    def browser_extension_chatgpt_current_conversation(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """Read the active chatgpt.com conversation metadata together with current busy/thread summary."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_current_conversation", payload)

    def browser_extension_chatgpt_export_thread(
        self,
        session_id: str,
        format: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Export the visible chatgpt.com thread as structured JSON content or rendered markdown."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if format is not None:
            payload["format"] = format
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_export_thread", payload)

    def browser_extension_chatgpt_send(self, session_id: str, text: str, timeout_ms: int | None = None):
        """Send one prompt through chatgpt.com in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_send", payload)

    def browser_extension_chatgpt_ask(self, session_id: str, text: str, timeout_ms: int | None = None):
        """Send one prompt through chatgpt.com and wait for the next visible assistant response."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_ask", payload)

    def browser_extension_chatgpt_ask_thread(
        self,
        session_id: str,
        text: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Send one prompt through chatgpt.com and return the refreshed visible thread."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_ask_thread", payload)

    def browser_extension_chatgpt_rewrite_thread(
        self,
        session_id: str,
        text: str,
        index: int | None = None,
        role: str | None = None,
        offset: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Edit one targeted chatgpt.com message and wait for the refreshed visible thread."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if index is not None:
            payload["count"] = index
        if role is not None:
            payload["role"] = role
        if offset is not None:
            payload["offset"] = offset
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_rewrite_thread", payload)

    def browser_extension_chatgpt_wait_idle(
        self,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Wait until chatgpt.com no longer appears to be generating in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_chatgpt_wait_idle", payload)

    def browser_extension_chatgpt_wait_response(
        self,
        session_id: str,
        baseline_text: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until chatgpt.com shows a changed assistant response and becomes idle."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if baseline_text is not None:
            payload["text"] = baseline_text
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_chatgpt_wait_response", payload)

    def browser_extension_chatgpt_wait_message(
        self,
        session_id: str,
        text: str | None = None,
        role: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until a matching visible chatgpt.com message appears in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if text is not None:
            payload["text"] = text
        if role is not None:
            payload["role"] = role
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_chatgpt_wait_message", payload)

    def browser_extension_chatgpt_wait_sidebar(
        self,
        session_id: str,
        open: bool | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until the chatgpt.com sidebar matches the requested open state."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if open is not None:
            payload["ok"] = open
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_chatgpt_wait_sidebar", payload)

    def browser_extension_chatgpt_wait_model(
        self,
        session_id: str,
        query: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until the active chatgpt.com model matches one visible query."""
        payload: dict[str, Any] = {"sessionId": session_id, "query": query}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_chatgpt_wait_model", payload)

    def browser_extension_chatgpt_wait_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until the active chatgpt.com conversation matches the requested target."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_chatgpt_wait_conversation", payload)

    def browser_extension_chatgpt_prepare(
        self,
        session_id: str,
        ensure_sidebar_open: bool | None = None,
        model: str | None = None,
        new_chat: bool | None = None,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Prepare chatgpt.com state by opening sidebar, selecting model, and opening or creating a chat."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if ensure_sidebar_open is not None:
            payload["open"] = ensure_sidebar_open
        if model is not None:
            payload["query"] = model
        if new_chat is not None:
            payload["ok"] = new_chat
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_chatgpt_prepare", payload)

    def browser_extension_chatgpt_delete_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Delete one chatgpt.com conversation through its sidebar actions."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_delete_conversation", payload)

    def browser_extension_chatgpt_archive_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Archive one chatgpt.com conversation through its sidebar actions."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_chatgpt_archive_conversation", payload)

    def browser_extension_deepseek_read_latest(self, session_id: str, timeout_ms: int | None = None):
        """Read the latest visible assistant response from deepseek.com in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_read_latest", payload)

    def browser_extension_deepseek_new_chat(self, session_id: str, timeout_ms: int | None = None):
        """Start a new deepseek.com conversation in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_new_chat", payload)

    def browser_extension_deepseek_info(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """Read consolidated deepseek.com state including busy flag, page info, active conversation, and visible thread."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_info", payload)

    def browser_extension_deepseek_sidebar_state(self, session_id: str, timeout_ms: int | None = None):
        """Read deepseek.com sidebar open/visibility state in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_sidebar_state", payload)

    def browser_extension_deepseek_toggle_sidebar(self, session_id: str, timeout_ms: int | None = None):
        """Toggle the deepseek.com sidebar in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_toggle_sidebar", payload)

    def browser_extension_deepseek_models(self, session_id: str, timeout_ms: int | None = None):
        """List visible/selectable deepseek.com models in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_models", payload)

    def browser_extension_deepseek_select_model(self, session_id: str, query: str, timeout_ms: int | None = None):
        """Select one deepseek.com model by visible query in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "query": query}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_select_model", payload)

    def browser_extension_deepseek_list_conversations(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """List visible saved deepseek.com conversations from the sidebar in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_list_conversations", payload)

    def browser_extension_deepseek_open_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Open one saved deepseek.com conversation by title, url, or index in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_open_conversation", payload)

    def browser_extension_deepseek_conversation_actions(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """List available actions for one visible deepseek.com conversation entry."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_conversation_actions", payload)

    def browser_extension_deepseek_conversation_action(
        self,
        session_id: str,
        action_query: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Invoke one visible action for one deepseek.com conversation entry."""
        payload: dict[str, Any] = {"sessionId": session_id, "query": action_query}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_conversation_action", payload)

    def browser_extension_deepseek_rename_conversation(
        self,
        session_id: str,
        title: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Rename one visible deepseek.com conversation entry."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": title}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_rename_conversation", payload)

    def browser_extension_deepseek_stop(self, session_id: str, timeout_ms: int | None = None):
        """Stop an in-progress deepseek.com response in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_stop", payload)

    def browser_extension_deepseek_continue(self, session_id: str, timeout_ms: int | None = None):
        """Continue a paused or truncated deepseek.com response in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_continue", payload)

    def browser_extension_deepseek_response_controls(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read visible response-version navigation controls in deepseek.com for one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_response_controls", payload)

    def browser_extension_deepseek_previous_response(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Move to the previous visible deepseek.com response variant and return refreshed thread state."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_previous_response", payload)

    def browser_extension_deepseek_next_response(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Move to the next visible deepseek.com response variant and return refreshed thread state."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_next_response", payload)

    def browser_extension_deepseek_list_response_versions(
        self,
        session_id: str,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        """List visible DeepSeek response variants by walking previous/next response controls and restoring the current variant."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if max_versions is not None:
            payload["maxVersions"] = max_versions
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_list_response_versions", payload)

    def browser_extension_deepseek_select_response_version(
        self,
        session_id: str,
        index: int,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Select one visible DeepSeek response variant by index after discovering available response versions."""
        payload: dict[str, Any] = {"sessionId": session_id, "count": index}
        if limit is not None:
            payload["limit"] = limit
        if max_versions is not None:
            payload["maxVersions"] = max_versions
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_select_response_version", payload)

    def browser_extension_deepseek_regenerate(self, session_id: str, timeout_ms: int | None = None):
        """Trigger regenerate/try-again in deepseek.com for one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_regenerate", payload)

    def browser_extension_deepseek_edit_message(
        self,
        session_id: str,
        text: str,
        index: int | None = None,
        role: str | None = None,
        offset: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Edit one targeted visible deepseek.com message in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if index is not None:
            payload["count"] = index
        if role is not None:
            payload["role"] = role
        if offset is not None:
            payload["offset"] = offset
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_edit_message", payload)

    def browser_extension_deepseek_read_thread(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """Read structured visible deepseek.com conversation messages from one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_read_thread", payload)

    def browser_extension_deepseek_read_message(
        self,
        session_id: str,
        index: int | None = None,
        role: str | None = None,
        offset: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Read one targeted visible deepseek.com message from one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if index is not None:
            payload["count"] = index
        if role is not None:
            payload["role"] = role
        if offset is not None:
            payload["offset"] = offset
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_read_message", payload)

    def browser_extension_deepseek_current_conversation(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        """Read the active deepseek.com conversation metadata together with current busy/thread summary."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_current_conversation", payload)

    def browser_extension_deepseek_export_thread(
        self,
        session_id: str,
        format: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Export the visible deepseek.com thread as structured JSON content or rendered markdown."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if format is not None:
            payload["format"] = format
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_export_thread", payload)

    def browser_extension_deepseek_send(self, session_id: str, text: str, timeout_ms: int | None = None):
        """Send one prompt through deepseek.com in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_send", payload)

    def browser_extension_deepseek_ask(self, session_id: str, text: str, timeout_ms: int | None = None):
        """Send one prompt through deepseek.com and wait for the next visible assistant response."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_ask", payload)

    def browser_extension_deepseek_ask_thread(
        self,
        session_id: str,
        text: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Send one prompt through deepseek.com and return the refreshed visible thread."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_ask_thread", payload)

    def browser_extension_deepseek_rewrite_thread(
        self,
        session_id: str,
        text: str,
        index: int | None = None,
        role: str | None = None,
        offset: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Edit one targeted deepseek.com message and wait for the refreshed visible thread."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if index is not None:
            payload["count"] = index
        if role is not None:
            payload["role"] = role
        if offset is not None:
            payload["offset"] = offset
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_rewrite_thread", payload)

    def browser_extension_deepseek_wait_idle(
        self,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Wait until deepseek.com no longer appears to be generating in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_deepseek_wait_idle", payload)

    def browser_extension_deepseek_wait_response(
        self,
        session_id: str,
        baseline_text: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until deepseek.com shows a changed assistant response and becomes idle."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if baseline_text is not None:
            payload["text"] = baseline_text
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_deepseek_wait_response", payload)

    def browser_extension_deepseek_wait_message(
        self,
        session_id: str,
        text: str | None = None,
        role: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until a matching visible deepseek.com message appears in one browser-extension session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if text is not None:
            payload["text"] = text
        if role is not None:
            payload["role"] = role
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_deepseek_wait_message", payload)

    def browser_extension_deepseek_wait_sidebar(
        self,
        session_id: str,
        open: bool | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until the deepseek.com sidebar matches the requested open state."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if open is not None:
            payload["ok"] = open
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_deepseek_wait_sidebar", payload)

    def browser_extension_deepseek_wait_model(
        self,
        session_id: str,
        query: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until the active deepseek.com model matches one visible query."""
        payload: dict[str, Any] = {"sessionId": session_id, "query": query}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_deepseek_wait_model", payload)

    def browser_extension_deepseek_wait_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        """Wait until the active deepseek.com conversation matches the requested target."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        if stable_reads is not None:
            payload["count"] = stable_reads
        return self._send_request("browser_extension_deepseek_wait_conversation", payload)

    def browser_extension_deepseek_prepare(
        self,
        session_id: str,
        ensure_sidebar_open: bool | None = None,
        model: str | None = None,
        new_chat: bool | None = None,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Prepare deepseek.com state by opening sidebar, selecting model, and opening or creating a chat."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if ensure_sidebar_open is not None:
            payload["open"] = ensure_sidebar_open
        if model is not None:
            payload["query"] = model
        if new_chat is not None:
            payload["ok"] = new_chat
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if limit is not None:
            payload["limit"] = limit
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_deepseek_prepare", payload)

    def browser_extension_deepseek_delete_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Delete one deepseek.com conversation through its sidebar actions."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_delete_conversation", payload)

    def browser_extension_deepseek_archive_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        """Archive one deepseek.com conversation through its sidebar actions."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if title_query is not None:
            payload["targetUrl"] = title_query
        if url is not None:
            payload["url"] = url
        if index is not None:
            payload["count"] = index
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_deepseek_archive_conversation", payload)

    def browser_extension_network_events(
        self,
        session_id: str,
        limit: int | None = None,
        url_includes: str | None = None,
        stage: str | None = None,
        method: str | None = None,
    ):
        """List bounded first-party browser-extension network events for one session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["count"] = limit
        if url_includes is not None:
            payload["targetUrl"] = url_includes
        if stage is not None:
            payload["status"] = stage
        if method is not None:
            payload["text"] = method
        return self._send_request("browser_extension_network_events", payload)

    def browser_extension_clear_network_events(self, session_id: str, timeout_ms: int | None = None):
        """Clear bounded first-party browser-extension network events for one session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_clear_network_events", payload)

    def browser_extension_dom_events(
        self,
        session_id: str,
        limit: int | None = None,
        mutation_type: str | None = None,
        text_includes: str | None = None,
        timeout_ms: int | None = None,
    ):
        """List bounded first-party browser-extension DOM mutation events for one session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["count"] = limit
        if mutation_type is not None:
            payload["mutationType"] = mutation_type
        if text_includes is not None:
            payload["textIncludes"] = text_includes
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_dom_events", payload)

    def browser_extension_clear_dom_events(self, session_id: str, timeout_ms: int | None = None):
        """Clear bounded first-party browser-extension DOM mutation events for one session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("browser_extension_clear_dom_events", payload)

    def browser_extension_session_events(
        self,
        session_id: str,
        limit: int | None = None,
        event_kind: str | None = None,
        ok: bool | None = None,
    ):
        """List bounded first-party browser-extension session events for one session."""
        payload: dict[str, Any] = {"sessionId": session_id}
        if limit is not None:
            payload["count"] = limit
        if event_kind is not None:
            payload["kind"] = event_kind
        if ok is not None:
            payload["ok"] = ok
        return self._send_request("browser_extension_session_events", payload)

    def browser_extension_clear_session_events(self, session_id: str):
        """Clear bounded first-party browser-extension session events for one session."""
        return self._send_request("browser_extension_clear_session_events", {"sessionId": session_id})

    def browser_extension_wait_text(
        self,
        session_id: str,
        text: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Poll snapshots until one browser-extension session contains the target text."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_wait_text", payload)

    def browser_extension_wait_url(
        self,
        session_id: str,
        text: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Poll snapshots until one browser-extension session URL contains the target text."""
        payload: dict[str, Any] = {"sessionId": session_id, "text": text}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_wait_url", payload)

    def browser_extension_wait_selector(
        self,
        session_id: str,
        selector: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Poll DOM inspection until one browser-extension session exposes the selector."""
        payload: dict[str, Any] = {"sessionId": session_id, "selector": selector}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_wait_selector", payload)

    def browser_extension_wait_no_selector(
        self,
        session_id: str,
        selector: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        """Poll DOM inspection until one browser-extension session no longer exposes the selector."""
        payload: dict[str, Any] = {"sessionId": session_id, "selector": selector}
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if interval_ms is not None:
            payload["intervalMs"] = interval_ms
        return self._send_request("browser_extension_wait_no_selector", payload)

    def hf_papers_status(self):
        """Get Hugging Face papers service status."""
        return self._send_request("hf_papers_status")

    def hf_papers_doctor(self, backend: str | None = None, timeout_ms: int | None = None):
        """Run Hugging Face papers service diagnostics."""
        payload: dict[str, Any] = {}
        if backend is not None:
            payload["backend"] = backend
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("hf_papers_doctor", payload if payload else None)

    def hf_papers_search(
        self,
        query: str,
        limit: int | None = None,
        backend: str | None = None,
        token: str | None = None,
        include_raw: bool | None = None,
        timeout_ms: int | None = None,
    ):
        """Search Hugging Face paper pages."""
        payload: dict[str, Any] = {"query": query}
        if limit is not None:
            payload["limit"] = limit
        if backend is not None:
            payload["backend"] = backend
        if token is not None:
            payload["token"] = token
        if include_raw is not None:
            payload["includeRaw"] = include_raw
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("hf_papers_search", payload)

    def hf_papers_info(
        self,
        paper_id: str,
        backend: str | None = None,
        token: str | None = None,
        include_raw: bool | None = None,
        timeout_ms: int | None = None,
    ):
        """Get structured metadata for one Hugging Face paper page."""
        payload: dict[str, Any] = {"paperId": paper_id}
        if backend is not None:
            payload["backend"] = backend
        if token is not None:
            payload["token"] = token
        if include_raw is not None:
            payload["includeRaw"] = include_raw
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("hf_papers_info", payload)

    def hf_papers_read(
        self,
        paper_id: str,
        backend: str | None = None,
        token: str | None = None,
        save_path: str | None = None,
        timeout_ms: int | None = None,
    ):
        """Read one Hugging Face paper page as markdown."""
        payload: dict[str, Any] = {"paperId": paper_id}
        if backend is not None:
            payload["backend"] = backend
        if token is not None:
            payload["token"] = token
        if save_path is not None:
            payload["savePath"] = save_path
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("hf_papers_read", payload)

    def hf_papers_list_daily(
        self,
        date: str | None = None,
        week: str | None = None,
        month: str | None = None,
        submitter: str | None = None,
        sort: str | None = None,
        limit: int | None = None,
        backend: str | None = None,
        token: str | None = None,
        include_raw: bool | None = None,
        timeout_ms: int | None = None,
    ):
        """List daily Hugging Face papers."""
        payload: dict[str, Any] = {}
        if date is not None:
            payload["date"] = date
        if week is not None:
            payload["week"] = week
        if month is not None:
            payload["month"] = month
        if submitter is not None:
            payload["submitter"] = submitter
        if sort is not None:
            payload["sort"] = sort
        if limit is not None:
            payload["limit"] = limit
        if backend is not None:
            payload["backend"] = backend
        if token is not None:
            payload["token"] = token
        if include_raw is not None:
            payload["includeRaw"] = include_raw
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("hf_papers_list_daily", payload if payload else None)

    def opencli_doctor(self, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None):
        """Run OpenCLI-RS doctor through Sidofun."""
        payload: dict[str, Any] = {}
        if cwd is not None:
            payload["cwd"] = cwd
        if workspace is not None:
            payload["workspace"] = workspace
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        return self._send_request("opencli_doctor", payload if payload else None)

    def opencli_sites(self):
        """List OpenCLI-RS adapter sites."""
        return self._send_request("opencli_sites")

    def opencli_commands(self, site: str):
        """List OpenCLI-RS commands for one site."""
        return self._send_request("opencli_commands", {"site": site})

    def opencli_run(
        self,
        site: str,
        command: str,
        args: list[str] | None = None,
        cwd: str | None = None,
        workspace: str | None = None,
        owner_session_id: str | None = None,
        timeout_ms: int | None = None,
        keep_browser_open: bool | None = None,
        wait_after_ms: int | None = None,
        maximize_browser: bool | None = None,
    ):
        """Run an OpenCLI-RS adapter command through Sidofun."""
        payload: dict[str, Any] = {"site": site, "command": command}
        if args is not None:
            payload["args"] = args
        if cwd is not None:
            payload["cwd"] = cwd
        if workspace is not None:
            payload["workspace"] = workspace
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if keep_browser_open is not None:
            payload["keepBrowserOpen"] = keep_browser_open
        if wait_after_ms is not None:
            payload["waitAfterMs"] = wait_after_ms
        if maximize_browser is not None:
            payload["maximizeBrowser"] = maximize_browser
        return self._send_request("opencli_run", payload)

    def opencli_workspace_list(self):
        """List named OpenCLI workspaces."""
        return self._send_request("opencli_workspace_list")

    def opencli_workspace_get(self, name: str):
        """Get one named OpenCLI workspace."""
        return self._send_request("opencli_workspace_get", {"name": name})

    def opencli_workspace_set(self, name: str, path: str):
        """Set one named OpenCLI workspace."""
        return self._send_request("opencli_workspace_set", {"name": name, "path": path})

    def opencli_workspace_clear(self, name: str):
        """Clear one named OpenCLI workspace."""
        return self._send_request("opencli_workspace_clear", {"name": name})

    def opencli_workspace_bind_session(self, session_id: str, workspace: str):
        """Bind one workspace alias to a Sidofun session."""
        return self._send_request("opencli_workspace_bind_session", {"sessionId": session_id, "workspace": workspace})

    def opencli_workspace_unbind_session(self, session_id: str):
        """Remove the OpenCLI workspace alias from a Sidofun session."""
        return self._send_request("opencli_workspace_unbind_session", {"sessionId": session_id})

    def opencli_workspace_session(self, session_id: str):
        """Get the OpenCLI workspace alias for a Sidofun session."""
        return self._send_request("opencli_workspace_session", {"sessionId": session_id})

    def twitter_search(self, query: str, limit: int | None = None, mode: str | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        """Search Twitter/X through OpenCLI-RS."""
        payload: dict[str, Any] = {"query": query}
        if limit is not None:
            payload["limit"] = limit
        if mode is not None:
            payload["mode"] = mode
        if cwd is not None:
            payload["cwd"] = cwd
        if workspace is not None:
            payload["workspace"] = workspace
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if keep_browser_open is not None:
            payload["keepBrowserOpen"] = keep_browser_open
        if wait_after_ms is not None:
            payload["waitAfterMs"] = wait_after_ms
        if maximize_browser is not None:
            payload["maximizeBrowser"] = maximize_browser
        return self._send_request("twitter_search", payload)

    def twitter_timeline(
        self,
        timeline_type: str | None = None,
        limit: int | None = None,
        cwd: str | None = None,
        workspace: str | None = None,
        owner_session_id: str | None = None,
        timeout_ms: int | None = None,
        keep_browser_open: bool | None = None,
        wait_after_ms: int | None = None,
        maximize_browser: bool | None = None,
    ):
        """Fetch a Twitter/X timeline through OpenCLI-RS."""
        payload: dict[str, Any] = {}
        if timeline_type is not None:
            payload["timelineType"] = timeline_type
        if limit is not None:
            payload["limit"] = limit
        if cwd is not None:
            payload["cwd"] = cwd
        if workspace is not None:
            payload["workspace"] = workspace
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if keep_browser_open is not None:
            payload["keepBrowserOpen"] = keep_browser_open
        if wait_after_ms is not None:
            payload["waitAfterMs"] = wait_after_ms
        if maximize_browser is not None:
            payload["maximizeBrowser"] = maximize_browser
        return self._send_request("twitter_timeline", payload)

    def twitter_bookmarks(self, limit: int | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        """Fetch Twitter/X bookmarks through OpenCLI-RS."""
        payload: dict[str, Any] = {}
        if limit is not None:
            payload["limit"] = limit
        if cwd is not None:
            payload["cwd"] = cwd
        if workspace is not None:
            payload["workspace"] = workspace
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if keep_browser_open is not None:
            payload["keepBrowserOpen"] = keep_browser_open
        if wait_after_ms is not None:
            payload["waitAfterMs"] = wait_after_ms
        if maximize_browser is not None:
            payload["maximizeBrowser"] = maximize_browser
        return self._send_request("twitter_bookmarks", payload)

    def twitter_post(self, text: str, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        """Create a Twitter/X post through OpenCLI-RS."""
        payload: dict[str, Any] = {"text": text}
        if cwd is not None:
            payload["cwd"] = cwd
        if workspace is not None:
            payload["workspace"] = workspace
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if keep_browser_open is not None:
            payload["keepBrowserOpen"] = keep_browser_open
        if wait_after_ms is not None:
            payload["waitAfterMs"] = wait_after_ms
        if maximize_browser is not None:
            payload["maximizeBrowser"] = maximize_browser
        return self._send_request("twitter_post", payload)

    def drag_window_move(self, window_handle: int, x: int, y: int) -> str:
        """Move a window by dragging its titlebar toward the target top-left."""
        return self._send_request("drag_window_move", {"windowHandle": window_handle, "x": x, "y": y})

    def drag_window_resize(self, window_handle: int, width: int, height: int) -> str:
        """Resize a window by dragging its bottom-right corner toward the target size."""
        return self._send_request("drag_window_resize", {"windowHandle": window_handle, "width": width, "height": height})

    def clipboard_read(self) -> str:
        """Read text from the system clipboard."""
        return self._send_request("clipboard_read")

    def clipboard_write(self, text: str):
        """Write text to the system clipboard."""
        return self._send_request("clipboard_write", {"text": text})

    def clipboard_clear(self):
        """Clear the system clipboard."""
        return self._send_request("clipboard_clear")

    def clipboard_status(self) -> ClipboardStatus:
        """Get clipboard text/length metadata."""
        return self._send_request("clipboard_status")

    def session_create(self, client_kind: str | None = None, name: str | None = None) -> ClientSession:
        """Create a lightweight Sidofun client session for resource ownership."""
        payload: dict[str, Any] = {}
        if client_kind is not None:
            payload["clientKind"] = client_kind
        if name is not None:
            payload["name"] = name
        return self._send_request("session_create", payload)

    def session_list(self) -> ClientSessionList:
        """List active in-memory Sidofun client sessions."""
        return self._send_request("session_list")

    def session_list_idle(self, max_idle_ms: int, client_kind: str | None = None):
        """List idle client sessions above the provided threshold."""
        payload: dict[str, Any] = {"maxIdleMs": max_idle_ms}
        if client_kind is not None:
            payload["clientKind"] = client_kind
        return self._send_request("session_list_idle", payload)

    def session_info(self, session_id: str) -> ClientSession:
        """Get one Sidofun client session."""
        return self._send_request("session_info", {"sessionId": session_id})

    def session_close(self, session_id: str, cleanup_owned_resources: bool = True):
        """Close a client session and optionally clean up owned resources."""
        return self._send_request("session_close", {"sessionId": session_id, "cleanupOwnedResources": cleanup_owned_resources})

    def session_reap_idle(self, max_idle_ms: int, client_kind: str | None = None, cleanup_owned_resources: bool = True):
        """Reap idle client sessions above the provided threshold."""
        payload: dict[str, Any] = {"maxIdleMs": max_idle_ms, "cleanupOwnedResources": cleanup_owned_resources}
        if client_kind is not None:
            payload["clientKind"] = client_kind
        return self._send_request("session_reap_idle", payload)

    def trace_start(self, name: str | None = None, owner_session_id: str | None = None):
        """Start an explicit trace session."""
        payload: dict[str, Any] = {}
        if name is not None:
            payload["name"] = name
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        return self._send_request("trace_start", payload)

    def trace_list(self):
        """List active trace sessions."""
        return self._send_request("trace_list")

    def trace_info(self, trace_id: str):
        """Get trace session metadata."""
        return self._send_request("trace_info", {"traceId": trace_id})

    def trace_export(self, trace_id: str, path: str | None = None):
        """Export a trace bundle."""
        payload: dict[str, Any] = {"traceId": trace_id}
        if path is not None:
            payload["path"] = path
        return self._send_request("trace_export", payload)

    def trace_stop(self, trace_id: str):
        """Stop a trace session."""
        return self._send_request("trace_stop", {"traceId": trace_id})

    def trajectory_start(self, name: str | None = None, owner_session_id: str | None = None):
        """Start a trajectory session."""
        payload: dict[str, Any] = {}
        if name is not None:
            payload["name"] = name
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        return self._send_request("trajectory_start", payload)

    def trajectory_list(self):
        """List active trajectory sessions."""
        return self._send_request("trajectory_list")

    def trajectory_info(self, trajectory_id: str):
        """Get trajectory session metadata."""
        return self._send_request("trajectory_info", {"trajectoryId": trajectory_id})

    def trajectory_export(self, trajectory_id: str, path: str | None = None):
        """Export a trajectory bundle."""
        payload: dict[str, Any] = {"trajectoryId": trajectory_id}
        if path is not None:
            payload["path"] = path
        return self._send_request("trajectory_export", payload)

    def trajectory_append_turn(
        self,
        trajectory_id: str,
        turn_id: str,
        role: str | None = None,
        prompt: Any = None,
        response: Any = None,
        actions: list[Any] | None = None,
        screenshots: list[Any] | None = None,
        metadata: dict[str, Any] | None = None,
    ):
        """Append one turn to a trajectory session."""
        payload: dict[str, Any] = {"trajectoryId": trajectory_id, "turnId": turn_id}
        if role is not None:
            payload["role"] = role
        if prompt is not None:
            payload["prompt"] = prompt
        if response is not None:
            payload["response"] = response
        if actions is not None:
            payload["actions"] = actions
        if screenshots is not None:
            payload["screenshots"] = screenshots
        if metadata is not None:
            payload["metadata"] = metadata
        return self._send_request("trajectory_append_turn", payload)

    def trajectory_stop(self, trajectory_id: str):
        """Stop a trajectory session."""
        return self._send_request("trajectory_stop", {"trajectoryId": trajectory_id})

    def desktop_scope_create(
        self,
        window_handles: list[int] | None = None,
        process_ids: list[int] | None = None,
        title_query: str | None = None,
        name: str | None = None,
        owner_session_id: str | None = None,
    ) -> DesktopScopeInfo:
        """Create a bounded desktop scope from window handles, process ids, or title query."""
        payload: dict[str, Any] = {}
        if window_handles is not None:
            payload["windowHandles"] = window_handles
        if process_ids is not None:
            payload["processIds"] = process_ids
        if title_query is not None:
            payload["titleQuery"] = title_query
        if name is not None:
            payload["name"] = name
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        return self._send_request("desktop_scope_create", payload)

    def desktop_scope_list(self) -> DesktopScopeList:
        """List active desktop scopes."""
        return self._send_request("desktop_scope_list")

    def desktop_scope_info(self, scope_id: str) -> DesktopScopeInfo:
        """Get desktop scope metadata and live window bounds."""
        return self._send_request("desktop_scope_info", {"scopeId": scope_id})

    def desktop_scope_focus(self, scope_id: str):
        """Focus the primary window for a desktop scope."""
        return self._send_request("desktop_scope_focus", {"scopeId": scope_id})

    def desktop_scope_screenshot(
        self,
        scope_id: str,
        filename: str | None = None,
        return_base64: bool = False,
    ):
        """Capture a cropped screenshot for the current desktop scope bounds."""
        payload: dict[str, Any] = {"scopeId": scope_id, "returnBase64": return_base64}
        if filename is not None:
            payload["filename"] = filename
        return self._send_request("desktop_scope_screenshot", payload)

    def desktop_scope_click(self, scope_id: str, x: int, y: int, button: str = "left"):
        """Click using scope-relative coordinates."""
        return self._send_request("desktop_scope_click", {"scopeId": scope_id, "x": x, "y": y, "button": button})

    def desktop_scope_type(self, scope_id: str, text: str):
        """Focus a desktop scope and type text into it."""
        return self._send_request("desktop_scope_type", {"scopeId": scope_id, "text": text})

    def desktop_scope_close(self, scope_id: str):
        """Close a desktop scope record."""
        return self._send_request("desktop_scope_close", {"scopeId": scope_id})

    def shell_run(self, command: str, shell: str = "pwsh", cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None) -> ShellRunResult:
        """Run a non-interactive shell command via CMD or PowerShell."""
        payload = {"command": command, "shell": shell}
        if cwd is not None:
            payload["cwd"] = cwd
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if env is not None:
            payload["env"] = env
        return self._send_request("shell_run", payload)

    def shell_run_cmd(self, command: str, cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None) -> ShellRunResult:
        """Run a non-interactive command through CMD."""
        payload = {"command": command}
        if cwd is not None:
            payload["cwd"] = cwd
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if env is not None:
            payload["env"] = env
        return self._send_request("shell_run_cmd", payload)

    def shell_run_pwsh(self, command: str, cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None) -> ShellRunResult:
        """Run a non-interactive command through PowerShell."""
        payload = {"command": command}
        if cwd is not None:
            payload["cwd"] = cwd
        if timeout_ms is not None:
            payload["timeoutMs"] = timeout_ms
        if env is not None:
            payload["env"] = env
        return self._send_request("shell_run_pwsh", payload)

    def terminal_spawn(self, kind: str, title: str | None = None, owner_session_id: str | None = None):
        """Spawn a generic tracked terminal session."""
        payload = {"kind": kind}
        if title is not None:
            payload["title"] = title
        if owner_session_id is not None:
            payload["ownerSessionId"] = owner_session_id
        return self._send_request("terminal_spawn", payload)

    def terminal_list(self, kind: str | None = None) -> GenericTerminalList:
        """List generic tracked terminal sessions."""
        payload = {"kind": kind} if kind is not None else None
        return self._send_request("terminal_list", payload)

    def terminal_status(self, kind: str, session_id: Union[str, int]):
        """Get generic tracked terminal status."""
        return self._send_request("terminal_status", {"kind": kind, "sessionId": str(session_id)})

    def terminal_focus(self, kind: str, session_id: Union[str, int]):
        """Focus a generic tracked terminal."""
        return self._send_request("terminal_focus", {"kind": kind, "sessionId": str(session_id)})

    def terminal_type(self, kind: str, session_id: Union[str, int], text: str):
        """Type text into a generic tracked terminal."""
        return self._send_request("terminal_type", {"kind": kind, "sessionId": str(session_id), "text": text})

    def terminal_exec(self, kind: str, session_id: Union[str, int], command: str, wait: bool = False, timeout: int | None = None):
        """Execute inside a generic tracked terminal."""
        payload = {"kind": kind, "sessionId": str(session_id), "command": command, "wait": wait}
        if timeout is not None:
            payload["timeout"] = timeout
        return self._send_request("terminal_exec", payload)

    def terminal_close(self, kind: str, session_id: Union[str, int]):
        """Close a generic tracked terminal."""
        return self._send_request("terminal_close", {"kind": kind, "sessionId": str(session_id)})

    def screen_size(self) -> ScreenSize:
        """
        Get the screen dimensions.

        Returns:
            ScreenSize with width and height
        """
        return self._send_request("screen_size")

    def get_screen_size(self) -> ScreenSize:
        """Backward-compatible alias for screen_size()."""
        return self.screen_size()

    def mouse_position(self) -> Point:
        """
        Get the current mouse position.

        Returns:
            Point with x and y coordinates
        """
        return self._send_request("mouse_position")

    def get_mouse_position(self) -> Point:
        """Backward-compatible alias for mouse_position()."""
        return self.mouse_position()

    def active_window(self) -> ActiveWindowResult:
        """
        Get the active window information.

        Returns:
            ActiveWindowResult with title, handle, and rect
        """
        return self._send_request("active_window")

    def get_active_window(self) -> ActiveWindowResult:
        """Backward-compatible alias for active_window()."""
        return self.active_window()

    # ==================== Browser Actions ====================

    @property
    def browsers(self) -> BrowserAccessor:
        """Get the browser accessor for fluent browser/profile operations."""
        return self._browsers

    def list_browsers(self) -> list[BrowserInfo]:
        """List browsers known to the Sidofun backend."""
        return self._send_request("browser_list")

    def browser_info(self, browser: str) -> BrowserInfo:
        """Get discovery information for a specific browser."""
        return self._send_request("browser_info", {"browser": browser})

    def browser_capabilities(self, browser: str) -> BrowserInfo:
        """Get agent-facing browser capability metadata for a specific browser."""
        return self.browser_info(browser)

    def browser_profiles(self, browser: str) -> list[BrowserProfileInfo]:
        """List available profiles for a specific browser."""
        return self._send_request("browser_profiles", {"browser": browser})

    def browser(
        self,
        browser: str,
        profile: Optional[str] = None,
        profile_path: Optional[str] = None,
    ) -> BrowserSession:
        """Create a browser/profile-bound helper."""
        return self.browsers.get(browser, profile=profile, profile_path=profile_path)

    def plan_browser_launch(
        self,
        browser: str,
        profile: Optional[str] = None,
        profile_path: Optional[str] = None,
        url: Optional[str] = None,
        private_mode: bool = False,
        headless: bool = False,
        args: Optional[list[str]] = None,
        detached: bool = False,
    ) -> BrowserLaunchResult:
        """Resolve the browser launch command without starting the browser."""
        return self._send_request(
            "browser_launch_plan",
            {
                "browser": browser,
                "profile": profile,
                "profilePath": profile_path,
                "url": url,
                "privateMode": private_mode,
                "headless": headless,
                "args": args or [],
                "detached": detached,
            },
        )

    def launch_browser(
        self,
        browser: str,
        profile: Optional[str] = None,
        profile_path: Optional[str] = None,
        url: Optional[str] = None,
        private_mode: bool = False,
        headless: bool = False,
        args: Optional[list[str]] = None,
        detached: bool = False,
        ) -> BrowserLaunchResult:
        """Launch a browser through the Sidofun backend."""
        return self._send_request(
            "browser_launch",
            {
                "browser": browser,
                "profile": profile,
                "profilePath": profile_path,
                "url": url,
                "privateMode": private_mode,
                "headless": headless,
                "args": args or [],
                "detached": detached,
            },
        )

    def browser_windows(self, browser: str) -> list[BrowserWindowInfo]:
        """List visible windows for a specific browser."""
        return self._send_request("browser_windows", {"browser": browser})

    def focus_browser_window(
        self,
        browser: str,
        handle: Optional[int] = None,
        title_includes: Optional[str] = None,
    ) -> BrowserWindowInfo:
        """Focus a browser window by handle or by first browser/title match."""
        return self._send_request(
            "browser_focus_window",
            {
                "browser": browser,
                "handle": handle,
                "titleIncludes": title_includes,
            },
        )

    def create_browser_runtime(
        self,
        browser: str,
        profile: Optional[str] = None,
        profile_path: Optional[str] = None,
        url: Optional[str] = None,
        private_mode: bool = False,
        headless: bool = False,
        args: Optional[list[str]] = None,
        detached: bool = True,
        automation_mode: str = "debuggable",
        debug_port: Optional[int] = None,
    ) -> BrowserRuntimeInfo:
        """Create a debuggable browser runtime tracked by the backend."""
        return self._send_request(
            "browser_runtime_create",
            {
                "browser": browser,
                "profile": profile,
                "profilePath": profile_path,
                "url": url,
                "privateMode": private_mode,
                "headless": headless,
                "args": args or [],
                "detached": detached,
                "automationMode": automation_mode,
                "debugPort": debug_port,
            },
        )

    def list_browser_runtimes(self) -> list[BrowserRuntimeInfo]:
        """List browser runtimes tracked by the backend."""
        return self._send_request("browser_runtime_list")

    def browser_runtime_info(self, runtime_id: str) -> BrowserRuntimeInfo:
        """Get browser runtime metadata."""
        return self._send_request("browser_runtime_info", {"runtimeId": runtime_id})

    def close_browser_runtime(self, runtime_id: str) -> BrowserRuntimeCloseResult:
        """Close a browser runtime tracked by the backend."""
        return self._send_request("browser_runtime_close", {"runtimeId": runtime_id})

    def browser_runtime(self, runtime_id: str) -> BrowserRuntime:
        """Create a local runtime helper for an existing backend runtime id."""
        return BrowserRuntime(self, runtime_id)

    def list_browser_pages(self, runtime_id: Optional[str] = None) -> list[BrowserPageInfo]:
        """List browser pages tracked by the backend."""
        params = {"runtimeId": runtime_id} if runtime_id is not None else {}
        return self._send_request("browser_page_list", params)

    def open_browser_page(self, runtime_id: str, url: Optional[str] = None) -> BrowserPageInfo:
        """Open a browser page in a runtime."""
        return self._send_request("browser_page_open", {"runtimeId": runtime_id, "url": url})

    def browser_page_info(self, page_id: str) -> BrowserPageInfo:
        """Get browser page metadata."""
        return self._send_request("browser_page_info", {"pageId": page_id})

    def browser_page_navigate(self, page_id: str, url: str) -> BrowserPageActionResult:
        """Navigate a browser page."""
        return self._send_request("browser_page_navigate", {"pageId": page_id, "url": url})

    def browser_page_click(self, page_id: str, selector: str) -> BrowserPageActionResult:
        """Click a selector in a browser page."""
        return self._send_request("browser_page_click", {"pageId": page_id, "selector": selector})

    def browser_page_fill(self, page_id: str, selector: str, value: str) -> BrowserPageActionResult:
        """Fill a selector in a browser page."""
        return self._send_request(
            "browser_page_fill",
            {"pageId": page_id, "selector": selector, "value": value},
        )

    def browser_page_press(self, page_id: str, selector: str, key: str) -> BrowserPageActionResult:
        """Press a key against a selector in a browser page."""
        return self._send_request(
            "browser_page_press",
            {"pageId": page_id, "selector": selector, "key": key},
        )

    def browser_page_wait_for(
        self,
        page_id: str,
        wait_for: str,
        query: Optional[str] = None,
        timeout_ms: int = 10000,
    ) -> BrowserPageWaitResult:
        """Wait for a selector, title, url fragment, or load event."""
        return self._send_request(
            "browser_page_wait_for",
            {
                "pageId": page_id,
                "waitFor": wait_for,
                "query": query,
                "timeoutMs": timeout_ms,
            },
        )

    def browser_page_evaluate(self, page_id: str, expression: str) -> BrowserPageEvaluateResult:
        """Evaluate JavaScript in a browser page."""
        return self._send_request(
            "browser_page_evaluate",
            {"pageId": page_id, "expression": expression},
        )

    def browser_page_content(self, page_id: str) -> BrowserPageContentResult:
        """Fetch browser page content."""
        return self._send_request("browser_page_content", {"pageId": page_id})

    def browser_page_screenshot(
        self,
        page_id: str,
        path: Optional[str] = None,
        full_page: bool = False,
    ) -> BrowserPageScreenshotResult:
        """Capture a browser page screenshot."""
        return self._send_request(
            "browser_page_screenshot",
            {"pageId": page_id, "path": path, "fullPage": full_page},
        )

    def browser_page_pdf(self, page_id: str, path: str) -> BrowserPagePdfResult:
        """Generate a PDF for a browser page."""
        return self._send_request("browser_page_pdf", {"pageId": page_id, "path": path})

    def browser_page_download_url(self, page_id: str, url: str, path: str) -> BrowserPageDownloadResult:
        """Download a URL from the browser context to a file path."""
        return self._send_request(
            "browser_page_download_url",
            {"pageId": page_id, "url": url, "path": path},
        )

    def browser_page_network_events(self, page_id: str) -> list[BrowserNetworkEvent]:
        """List captured network events for a browser page."""
        return self._send_request("browser_page_network_events", {"pageId": page_id})

    def browser_page_events(self, page_id: str, since_id: int = 0) -> BrowserPageEventCursorResult:
        """List captured page events using a cursor-based queue."""
        return self._send_request(
            "browser_page_events",
            {"pageId": page_id, "sinceId": since_id},
        )

    def browser_page_console_events(self, page_id: str) -> list[BrowserConsoleEvent]:
        """List captured console events for a browser page."""
        return self._send_request("browser_page_console_events", {"pageId": page_id})

    def browser_page_clear_events(self, page_id: str) -> BrowserPageActionResult:
        """Clear captured console and network events for a browser page."""
        return self._send_request("browser_page_clear_events", {"pageId": page_id})

    def browser_page_wait_for_network(
        self,
        page_id: str,
        url_includes: Optional[str] = None,
        kind: Optional[str] = None,
        status: Optional[int] = None,
        timeout_ms: int = 10000,
    ) -> BrowserNetworkWaitResult:
        """Wait until a matching network event is captured for a browser page."""
        return self._send_request(
            "browser_page_wait_for_network",
            {
                "pageId": page_id,
                "urlIncludes": url_includes,
                "kind": kind,
                "status": status,
                "timeoutMs": timeout_ms,
            },
        )

    def close_browser_page(self, page_id: str) -> BrowserPageInfo:
        """Close a browser page."""
        return self._send_request("browser_page_close", {"pageId": page_id})

    def browser_page(self, page_id: str) -> BrowserPage:
        """Create a local page helper for an existing backend page id."""
        return BrowserPage(self, page_id)

    # ==================== CMD Actions ====================

    @property
    def sessions(self) -> SessionManager:
        """
        Get the session manager for convenient session access.

        Returns:
            SessionManager for managing CMD sessions

        Example:
            # Spawn using session manager
            session = client.sessions.spawn("MyTerminal")

            # Access sessions by index (1-based)
            first_session = client.sessions[1]

            # List all sessions
            for session in client.sessions:
                session.type("echo hello\\n")
        """
        return SessionManager(self)

    def cmd_spawn(self, title: Optional[str] = None) -> CMDSession:
        """
        Spawn a new CMD window.

        DESIGN RATIONALE:
        ------------------
        Returns a CMDSession object instead of a plain string for the following reasons:

        1. **Fluent Interface**: Allows method chaining without repetitive session_id passing
        2. **Backward Compatible**: CMDSession.__str__() returns the session_id, so old code still works
        3. **Enhanced Features**: Provides convenience methods (run, send, shell, maximize, etc.)
        4. **Better IDE Support**: Autocomplete shows all available session methods
        5. **Context Manager**: Supports 'with' statement for auto-cleanup

        The return type changed from str to CMDSession, but existing code continues to work
        because str(session) returns the session_id. See CMDSession.__str__ docstring for details.

        Args:
            title: Optional window title

        Returns:
            CMDSession object with fluent interface

        Examples:
            # New fluent API (recommended)
            session = client.cmd_spawn("MyTerminal")
            session.type("echo hello\\n")
            session.exec("dir", wait=True)
            session.screenshot()

            # Old API still works due to __str__
            session = client.cmd_spawn()              # Returns CMDSession
            client.cmd_type(session, "echo\\n")       # str(session) = session.id
            client.cmd_exec(session, "dir", wait=True)

            # Access the raw session_id if needed
            session = client.cmd_spawn()
            session_id = session.id                    # Get string directly
        """
        result: CMDSpawnResult = self._send_request(
            "cmd_spawn",
            {"title": title},
        )
        return CMDSession(self, result["sessionId"])

    def cmd_list(self) -> CMDSessionList:
        """
        List all active CMD sessions.

        Returns:
            CMDSessionList with sessions and count
        """
        return self._send_request("cmd_list")

    def cmd_tabs(self) -> CMDSessionList:
        """List tracked terminal tabs/sessions for CMD automation."""
        return self._send_request("cmd_tabs")

    def cmd_find_by_title(self, title_query: str) -> CMDSessionList:
        """Find tracked CMD sessions by title or tab title substring."""
        return self._send_request("cmd_find", {"titleQuery": title_query})

    def cmd_focus(self, session_id: Union[str, int]) -> dict:
        """Focus a tracked CMD session and return its latest status."""
        return self._send_request("cmd_focus", {"sessionId": str(session_id)})

    def cmd_activate_by_title(self, title_query: str) -> dict:
        """Focus the first tracked CMD session whose title or tab title matches."""
        return self._send_request("cmd_activate_by_title", {"titleQuery": title_query})

    def cmd_info(self, session_id: Union[str, int]) -> CMDSessionInfo:
        """
        Get information about a CMD session.

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            CMDSessionInfo with session details
        """
        return self._send_request(
            "cmd_info",
            {"sessionId": str(session_id)},
        )

    def cmd_status(
        self,
        session_id: Union[str, int],
        screenshot: bool = False,
        filename: Optional[str] = None,
        return_base64: bool = False,
    ) -> TerminalStatusResult:
        """Get richer terminal status including geometry/host metadata and optional screenshot."""
        return self._send_request(
            "cmd_status",
            {
                "sessionId": str(session_id),
                "screenshot": screenshot,
                "filename": filename,
                "returnBase64": return_base64,
            },
        )

    def cmd_exec(
        self,
        session_id: Union[str, int],
        command: str,
        wait: bool = False,
        timeout: Optional[int] = None,
        screenshot: bool = False,
    ) -> CMDExecResult:
        """
        Execute a command in a CMD session.

        Args:
            session_id: Session ID or index (1-based)
            command: Command to execute
            wait: Whether to wait after command
            timeout: Wait timeout in milliseconds
            screenshot: Whether to take screenshot after command

        Returns:
            CMDExecResult with command, duration, and optional screenshot
        """
        return self._send_request(
            "cmd_exec",
            {
                "sessionId": str(session_id),
                "command": command,
                "wait": wait,
                "timeout": timeout,
                "screenshot": screenshot,
            },
        )

    def cmd_type(
        self,
        session_id: Union[str, int],
        text: str,
    ) -> str:
        """
        Type text into a CMD session with escape sequence support.

        Escape Sequences:
            \\n - Press Enter
            \\t - Press Tab
            \\\\ - Backslash
            \\" - Quote
            \\dN - Delay N milliseconds (e.g., \\d500 = 500ms delay)
            \\M - Maximize window
            \\m - Minimize window
            \\r - Restore window (normalize from maximized/minimized)
            \\f - Focus window (bring to front)

        Args:
            session_id: Session ID or index (1-based)
            text: Text to type (may contain escape sequences)

        Returns:
            Success message with segment count

        Example:
            # Maximize, type command, delay, minimize
            client.cmd_type(1, r"\\Mecho hello\\n\\d1000\\m")
        """
        return self._send_request(
            "cmd_type",
            {
                "sessionId": str(session_id),
                "text": text,
            },
        )

    def cmd_press(
        self,
        session_id: Union[str, int],
        key: str,
    ) -> str:
        """
        Press a key in a CMD session.

        Args:
            session_id: Session ID or index (1-based)
            key: Key name (e.g., "enter", "tab", "escape")

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_press",
            {
                "sessionId": str(session_id),
                "key": key,
            },
        )

    def cmd_screenshot(
        self,
        session_id: Union[str, int],
        filename: Optional[str] = None,
        return_base64: bool = True,
    ) -> ScreenshotResult:
        """
        Take a screenshot of a CMD session window.

        Args:
            session_id: Session ID or index (1-based)
            filename: Optional filename to save screenshot
            return_base64: Whether to return base64 data

        Returns:
            ScreenshotResult with filepath, data, width, height
        """
        return self._send_request(
            "cmd_screenshot",
            {
                "sessionId": str(session_id),
                "filename": filename,
                "returnBase64": return_base64,
            },
        )

    def cmd_break(self, session_id: Union[str, int]) -> str:
        """
        Send Ctrl+C (break signal) to a CMD session.

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_break",
            {"sessionId": str(session_id)},
        )

    def cmd_key_toggle(
        self,
        session_id: Union[str, int],
        key: str,
        direction: str = "down",
    ) -> str:
        """
        Hold or release a modifier key in a CMD session.

        Use this for key combinations like Ctrl+Shift+T:
            client.cmd_key_toggle(session_id, "control", "down")  # Hold Ctrl
            client.cmd_key_toggle(session_id, "shift", "down")   # Hold Shift
            client.cmd_press(session_id, "t")                     # Press T
            client.cmd_key_toggle(session_id, "shift", "up")     # Release Shift
            client.cmd_key_toggle(session_id, "control", "up")   # Release Ctrl

        Args:
            session_id: Session ID or index (1-based)
            key: Key name (e.g., "control", "shift", "alt", "win")
            direction: "down" to hold, "up" to release

        Returns:
            Success message

        Example:
            # Ctrl+Shift+T (new tab in Windows Terminal)
            client.cmd_key_toggle(1, "control", "down")
            client.cmd_key_toggle(1, "shift", "down")
            client.cmd_press(1, "t")
            client.cmd_key_toggle(1, "shift", "up")
            client.cmd_key_toggle(1, "control", "up")

            # Shift+Alt+- (horizontal split in Windows Terminal)
            client.cmd_key_toggle(1, "shift", "down")
            client.cmd_key_toggle(1, "alt", "down")
            client.cmd_press(1, "-")
            client.cmd_key_toggle(1, "alt", "up")
            client.cmd_key_toggle(1, "shift", "up")
        """
        return self._send_request(
            "cmd_key_toggle",
            {
                "sessionId": str(session_id),
                "key": key,
                "direction": direction,
            },
        )

    def cmd_key_combo(
        self,
        session_id: Union[str, int],
        modifiers: list[str],
        key: str,
    ) -> None:
        """
        Press a key combination with modifiers.

        Convenience method for common key combinations.
        Automatically holds modifiers, presses key, releases modifiers.

        Args:
            session_id: Session ID or index (1-based)
            modifiers: List of modifier keys to hold (e.g., ["control", "shift"])
            key: The key to press (e.g., "t", "-", "f5")

        Example:
            # Ctrl+Shift+T (new tab)
            client.cmd_key_combo(1, ["control", "shift"], "t")

            # Shift+Alt+- (horizontal split)
            client.cmd_key_combo(1, ["shift", "alt"], "-")

            # Ctrl+C (copy)
            client.cmd_key_combo(1, ["control"], "c")
        """
        # Hold all modifiers
        for mod in modifiers:
            self.cmd_key_toggle(session_id, mod, "down")

        # Press the key
        self.cmd_press(session_id, key)

        # Release all modifiers (in reverse order)
        for mod in reversed(modifiers):
            self.cmd_key_toggle(session_id, mod, "up")

    # ==================== Terminal Shortcuts ====================

    def cmd_new_tab(self, session_id: Union[str, int]) -> str:
        """
        Create a new tab in Windows Terminal (Ctrl+Shift+T).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_new_tab",
            {"sessionId": str(session_id)},
        )

    def cmd_next_tab(self, session_id: Union[str, int]) -> str:
        """
        Switch to next tab in Windows Terminal (Ctrl+Tab).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_next_tab",
            {"sessionId": str(session_id)},
        )

    def cmd_prev_tab(self, session_id: Union[str, int]) -> str:
        """
        Switch to previous tab in Windows Terminal (Ctrl+Shift+Tab).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_prev_tab",
            {"sessionId": str(session_id)},
        )

    def cmd_split_vertical(self, session_id: Union[str, int]) -> str:
        """
        Split window vertically in Windows Terminal (Shift+Alt+-).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_split_vertical",
            {"sessionId": str(session_id)},
        )

    def cmd_split_horizontal(self, session_id: Union[str, int]) -> str:
        """
        Split window horizontally in Windows Terminal (Shift+Alt++).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_split_horizontal",
            {"sessionId": str(session_id)},
        )

    def cmd_pane_up(self, session_id: Union[str, int]) -> str:
        """
        Navigate to upper pane (Alt+Up).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_pane_up",
            {"sessionId": str(session_id)},
        )

    def cmd_pane_down(self, session_id: Union[str, int]) -> str:
        """
        Navigate to lower pane (Alt+Down).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_pane_down",
            {"sessionId": str(session_id)},
        )

    def cmd_pane_left(self, session_id: Union[str, int]) -> str:
        """
        Navigate to left pane (Alt+Left).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_pane_left",
            {"sessionId": str(session_id)},
        )

    def cmd_pane_right(self, session_id: Union[str, int]) -> str:
        """
        Navigate to right pane (Alt+Right).

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_pane_right",
            {"sessionId": str(session_id)},
        )

    def cmd_close(self, session_id: Union[str, int]) -> str:
        """
        Close a CMD session.

        Args:
            session_id: Session ID or index (1-based)

        Returns:
            Success message
        """
        return self._send_request(
            "cmd_close",
            {"sessionId": str(session_id)},
        )




    # ==================== PowerShell Actions ====================

    def pwsh_spawn(self, title=None, execution_policy="Bypass", use_pwsh7=True):
        """Spawn a new PowerShell window."""
        from .pwsh_session import PowerShellSession
        result = self._send_request("pwsh_spawn", {"title": title, "executionPolicy": execution_policy, "usePwsh7": use_pwsh7})
        return PowerShellSession(self, result["sessionId"])

    def pwsh_list(self):
        """List all active PowerShell sessions."""
        return self._send_request("pwsh_list")

    def pwsh_tabs(self):
        """List tracked terminal tabs/sessions for PowerShell automation."""
        return self._send_request("pwsh_tabs")

    def pwsh_find_by_title(self, title_query: str):
        """Find tracked PowerShell sessions by title or tab title substring."""
        return self._send_request("pwsh_find", {"titleQuery": title_query})

    def pwsh_focus(self, session_id):
        """Focus a tracked PowerShell session and return its latest status."""
        return self._send_request("pwsh_focus", {"sessionId": str(session_id)})

    def pwsh_activate_by_title(self, title_query: str):
        """Focus the first tracked PowerShell session whose title or tab title matches."""
        return self._send_request("pwsh_activate_by_title", {"titleQuery": title_query})

    def pwsh_info(self, session_id):
        """Get information about a PowerShell session."""
        return self._send_request("pwsh_info", {"sessionId": str(session_id)})

    def pwsh_status(
        self,
        session_id,
        screenshot: bool = False,
        filename: Optional[str] = None,
        return_base64: bool = False,
    ):
        """Get richer PowerShell status including geometry/host metadata and optional screenshot."""
        return self._send_request(
            "pwsh_status",
            {
                "sessionId": str(session_id),
                "screenshot": screenshot,
                "filename": filename,
                "returnBase64": return_base64,
            },
        )

    def pwsh_exec(self, session_id, command, wait=False, timeout=None, screenshot=False, output_format="text"):
        """Execute a command in a PowerShell session."""
        return self._send_request("pwsh_exec", {"sessionId": str(session_id), "command": command, "wait": wait, "timeout": timeout, "screenshot": screenshot, "outputFormat": output_format})

    def pwsh_type(self, session_id, text):
        """Type text into a PowerShell session."""
        return self._send_request("pwsh_type", {"sessionId": str(session_id), "text": text})

    def pwsh_press(self, session_id, key):
        """Press a key in a PowerShell session."""
        return self._send_request("pwsh_press", {"sessionId": str(session_id), "key": key})

    def pwsh_screenshot(self, session_id, filename=None, return_base64=True):
        """Take a screenshot of a PowerShell session."""
        return self._send_request("pwsh_screenshot", {"sessionId": str(session_id), "filename": filename, "returnBase64": return_base64})

    def pwsh_break(self, session_id):
        """Send Ctrl+C to a PowerShell session."""
        return self._send_request("pwsh_break", {"sessionId": str(session_id)})

    def pwsh_key_toggle(self, session_id, key, direction="down"):
        """Hold or release a modifier key in a PowerShell session."""
        return self._send_request("pwsh_key_toggle", {"sessionId": str(session_id), "key": key, "direction": direction})

    def pwsh_key_combo(self, session_id, modifiers, key):
        """Press a key combination with modifiers."""
        for mod in modifiers:
            self.pwsh_key_toggle(session_id, mod, "down")
        self.pwsh_press(session_id, key)
        for mod in reversed(modifiers):
            self.pwsh_key_toggle(session_id, mod, "up")

    def pwsh_close(self, session_id):
        """Close a PowerShell session."""
        return self._send_request("pwsh_close", {"sessionId": str(session_id)})

# Convenience export
__all__ = [
    "DesktopWinClient",
    "DesktopWin",
    "DesktopWinSingleton",
    "CMDSession",
    "SessionManager",
    "BrowserSession",
    "BrowserAccessor",
    "PowerShellSession",
    # Exceptions
    "SidofunDesktopError",
    "ProcessError",
    "ParseError",
    "InvalidActionError",
    "InvalidParamsError",
    "ActionFailedError",
    "SessionNotFoundError",
    "SpawnFailedError",
    "ExecFailedError",
    "TypeFailedError",
    "PressFailedError",
    "ScreenshotFailedError",
    "BreakFailedError",
    "CloseFailedError",
    "TimeoutError",
    "InternalError",
    # Types
    "Point",
    "Rect",
    "ScreenSize",
    "ScreenshotResult",
    "ActiveWindowResult",
    "ProcessInfo",
    "WindowInfo",
    "LocalCoderAppStatus",
    "ClipboardStatus",
    "ClientSession",
    "ClientSessionList",
    "DesktopScopeInfo",
    "DesktopScopeList",
    "ShellRunResult",
    "GenericTerminalList",
    "BrowserInfo",
    "BrowserProfileInfo",
    "BrowserLaunchResult",
    "BrowserLaunchAndFocusResult",
    "BrowserRuntime",
    "BrowserRuntimeInfo",
    "BrowserRuntimeCloseResult",
    "BrowserPage",
    "ComputerInterface",
    "BrowserPageInfo",
    "BrowserPageActionResult",
    "BrowserPageContentResult",
    "BrowserPageScreenshotResult",
    "BrowserPageEvaluateResult",
    "BrowserPageWaitResult",
    "BrowserPagePdfResult",
    "BrowserPageDownloadResult",
    "BrowserConsoleEvent",
    "BrowserNetworkEvent",
    "BrowserNetworkWaitResult",
    "BrowserPageEvent",
    "BrowserPageEventCursorResult",
    "BrowserWindowInfo",
    "CMDSessionInfo",
    "CMDSessionList",
    "CMDSpawnResult",
    "CMDExecResult",
    "TerminalStatusResult",
]

# Re-export exceptions for convenience
from .exceptions import (
    SidofunDesktopError,
    ProcessError,
    ParseError,
    InvalidActionError,
    InvalidParamsError,
    ActionFailedError,
    SessionNotFoundError,
    SpawnFailedError,
    ExecFailedError,
    TypeFailedError,
    PressFailedError,
    ScreenshotFailedError,
    BreakFailedError,
    CloseFailedError,
    TimeoutError,
    InternalError,
)

# Re-export types for convenience
from .types import (
    Point,
    Rect,
    ScreenSize,
    ScreenshotResult,
    ActiveWindowResult,
    ProcessInfo,
    WindowInfo,
    LocalCoderAppStatus,
    ClipboardStatus,
    ClientSession,
    ClientSessionList,
    DesktopScopeInfo,
    DesktopScopeList,
    ShellRunResult,
    GenericTerminalList,
    BrowserInfo,
    BrowserProfileInfo,
    BrowserLaunchResult,
    BrowserLaunchAndFocusResult,
    BrowserRuntimeInfo,
    BrowserRuntimeCloseResult,
    BrowserPageInfo,
    BrowserPageActionResult,
    BrowserPageContentResult,
    BrowserPageScreenshotResult,
    BrowserPageEvaluateResult,
    BrowserPageWaitResult,
    BrowserPagePdfResult,
    BrowserPageDownloadResult,
    BrowserConsoleEvent,
    BrowserNetworkEvent,
    BrowserNetworkWaitResult,
    BrowserPageEvent,
    BrowserPageEventCursorResult,
    BrowserWindowInfo,
    CMDSessionInfo,
    CMDSessionList,
    CMDSpawnResult,
    CMDExecResult,
    TerminalStatusResult,
)

# Re-export singleton for convenience
from .singleton import DesktopWin, DesktopWinSingleton

# Re-export session classes
from .session import CMDSession, SessionManager
from .browser_session import BrowserSession, BrowserAccessor
from .browser_runtime import BrowserRuntime
from .browser_page import BrowserPage
from .pwsh_session import PowerShellSession
from .computer import ComputerInterface
