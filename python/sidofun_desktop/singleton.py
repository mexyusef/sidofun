"""
Singleton DesktopWin Client

Provides a singleton pattern for DesktopWinClient that maintains
a single persistent Bun process across your entire Python application.

This avoids the overhead of starting/stopping the Bun process for
each operation and allows state to be shared across your program.

Usage:
    from sidofun_desktop import DesktopWin

    # First call starts the Bun process
    DesktopWin.screenshot()

    # Subsequent calls reuse the running process
    DesktopWin.click(100, 200)
    session_id = DesktopWin.cmd_spawn("MyTerminal")
    DesktopWin.cmd_type(session_id, "echo hello\\n")

    # Explicit cleanup when done (optional, auto-cleanup on exit)
    DesktopWin.stop()

    # Or use as context manager for guaranteed cleanup
    with DesktopWin:
        DesktopWin.screenshot()
"""

import atexit
import threading
from typing import Optional
from . import DesktopWinClient
from .browser_session import BrowserAccessor, BrowserSession
from .browser_runtime import BrowserRuntime
from .browser_page import BrowserPage
from .computer import ComputerInterface


class DesktopWinSingleton:
    """
    Singleton wrapper for DesktopWinClient.

    Maintains a single persistent Bun process across your application.
    Thread-safe for use in multi-threaded environments.
    """

    _instance: Optional[DesktopWinClient] = None
    _lock = threading.Lock()

    @classmethod
    def _get_client(cls) -> DesktopWinClient:
        """Get or create the singleton client instance."""
        if cls._instance is None:
            with cls._lock:
                # Double-check locking pattern
                if cls._instance is None:
                    client = DesktopWinClient()
                    client.__enter__()  # Start the process
                    cls._instance = client
        return cls._instance

    @classmethod
    def stop(cls) -> None:
        """Stop the singleton client and cleanup resources."""
        with cls._lock:
            if cls._instance is not None:
                try:
                    cls._instance.__exit__(None, None, None)
                except Exception:
                    pass  # Ignore cleanup errors
                cls._instance = None

    @classmethod
    def restart(cls) -> None:
        """Restart the singleton client (stop and start again)."""
        cls.stop()
        cls._get_client()

    @classmethod
    def is_running(cls) -> bool:
        """Check if the singleton client is currently running."""
        return cls._instance is not None

    # ==================== Desktop Actions ====================

    @classmethod
    def screenshot(
        cls,
        format: str = "png",
        filename: Optional[str] = None,
        return_base64: bool = False,
    ):
        """Take a screenshot."""
        return cls._get_client().screenshot(format, filename, return_base64)

    @classmethod
    def screenshot_win32(
        cls, filename: Optional[str] = None, return_base64: bool = False
    ):
        """Take a screenshot using Win32 API (DPI-aware, full resolution)."""
        return cls._get_client().screenshot_win32(filename, return_base64)

    @classmethod
    def click(cls, x: int, y: int, button: str = "left"):
        """Click at the specified coordinates."""
        return cls._get_client().click(x, y, button)

    @classmethod
    def move_mouse(cls, x: int, y: int):
        """Move mouse to the specified coordinates."""
        return cls._get_client().move_mouse(x, y)

    @classmethod
    def drag_mouse(
        cls, path: list[dict[str, int]], button: str = "left"
    ):
        """Drag mouse along a path."""
        return cls._get_client().drag_mouse(path, button)

    @classmethod
    def scroll(cls, direction: str = "up", count: int = 1):
        """Scroll the mouse wheel."""
        return cls._get_client().scroll(direction, count)

    @classmethod
    def type(cls, text: str):
        """Type text."""
        return cls._get_client().type(text)

    @classmethod
    def key_press(cls, key: str):
        """Press a key."""
        return cls._get_client().key_press(key)

    @classmethod
    def key_toggle(cls, key: str, direction: str = "down"):
        """Hold or release a modifier key."""
        return cls._get_client().key_toggle(key, direction)

    @classmethod
    def get_screen_size(cls):
        """Get the screen size."""
        return cls._get_client().get_screen_size()

    @classmethod
    def get_mouse_position(cls):
        """Get the current mouse position."""
        return cls._get_client().get_mouse_position()

    @classmethod
    def get_active_window(cls):
        """Get the active window information."""
        return cls._get_client().get_active_window()

    @classmethod
    def list_browsers(cls):
        """List browsers known to the Sidofun backend."""
        return cls._get_client().list_browsers()

    @classmethod
    def browser_info(cls, browser: str):
        """Get discovery information for a specific browser."""
        return cls._get_client().browser_info(browser)

    @classmethod
    def browser_capabilities(cls, browser: str):
        """Get agent-facing browser capability metadata for a specific browser."""
        return cls._get_client().browser_capabilities(browser)

    @classmethod
    def browser_profiles(cls, browser: str):
        """List available profiles for a specific browser."""
        return cls._get_client().browser_profiles(browser)

    @classmethod
    def plan_browser_launch(
        cls,
        browser: str,
        profile: str = None,
        profile_path: str = None,
        url: str = None,
        private_mode: bool = False,
        headless: bool = False,
        args: list[str] = None,
        detached: bool = False,
    ):
        """Resolve a browser launch command without starting the browser."""
        return cls._get_client().plan_browser_launch(
            browser,
            profile=profile,
            profile_path=profile_path,
            url=url,
            private_mode=private_mode,
            headless=headless,
            args=args,
            detached=detached,
        )

    @classmethod
    def launch_browser(
        cls,
        browser: str,
        profile: str = None,
        profile_path: str = None,
        url: str = None,
        private_mode: bool = False,
        headless: bool = False,
        args: list[str] = None,
        detached: bool = False,
    ):
        """Launch a browser through the Sidofun backend."""
        return cls._get_client().launch_browser(
            browser,
            profile=profile,
            profile_path=profile_path,
            url=url,
            private_mode=private_mode,
            headless=headless,
            args=args,
            detached=detached,
        )

    @classmethod
    def browser(
        cls,
        browser: str,
        profile: str = None,
        profile_path: str = None,
    ) -> BrowserSession:
        """Create a browser/profile-bound helper from the singleton client."""
        return cls._get_client().browser(
            browser,
            profile=profile,
            profile_path=profile_path,
        )

    @classmethod
    def browsers(cls) -> BrowserAccessor:
        """Get the browser accessor from the singleton client."""
        return cls._get_client().browsers

    @classmethod
    def computer(cls) -> ComputerInterface:
        """Get grouped computer/server interface families from the singleton client."""
        return cls._get_client().computer

    @classmethod
    def browser_windows(cls, browser: str):
        """List visible windows for a specific browser."""
        return cls._get_client().browser_windows(browser)

    @classmethod
    def focus_browser_window(
        cls,
        browser: str,
        handle: int = None,
        title_includes: str = None,
    ):
        """Focus a browser window by handle or browser/title match."""
        return cls._get_client().focus_browser_window(
            browser,
            handle=handle,
            title_includes=title_includes,
        )

    @classmethod
    def create_browser_runtime(
        cls,
        browser: str,
        profile: str = None,
        profile_path: str = None,
        url: str = None,
        private_mode: bool = False,
        headless: bool = False,
        args: list[str] = None,
        detached: bool = True,
        automation_mode: str = "debuggable",
        debug_port: int = None,
    ):
        """Create a debuggable browser runtime."""
        return cls._get_client().create_browser_runtime(
            browser,
            profile=profile,
            profile_path=profile_path,
            url=url,
            private_mode=private_mode,
            headless=headless,
            args=args,
            detached=detached,
            automation_mode=automation_mode,
            debug_port=debug_port,
        )

    @classmethod
    def list_browser_runtimes(cls):
        """List browser runtimes tracked by the backend."""
        return cls._get_client().list_browser_runtimes()

    @classmethod
    def browser_runtime_info(cls, runtime_id: str):
        """Get browser runtime metadata."""
        return cls._get_client().browser_runtime_info(runtime_id)

    @classmethod
    def close_browser_runtime(cls, runtime_id: str):
        """Close a browser runtime tracked by the backend."""
        return cls._get_client().close_browser_runtime(runtime_id)

    @classmethod
    def browser_runtime(cls, runtime_id: str) -> BrowserRuntime:
        """Create a local runtime helper for an existing backend runtime id."""
        return cls._get_client().browser_runtime(runtime_id)

    @classmethod
    def list_browser_pages(cls, runtime_id: str = None):
        """List browser pages tracked by the backend."""
        return cls._get_client().list_browser_pages(runtime_id)

    @classmethod
    def open_browser_page(cls, runtime_id: str, url: str = None):
        """Open a browser page in a runtime."""
        return cls._get_client().open_browser_page(runtime_id, url=url)

    @classmethod
    def browser_page_info(cls, page_id: str):
        """Get browser page metadata."""
        return cls._get_client().browser_page_info(page_id)

    @classmethod
    def browser_page_wait_for(
        cls,
        page_id: str,
        wait_for: str,
        query: str = None,
        timeout_ms: int = 10000,
    ):
        """Wait for a selector, title, url fragment, or load event."""
        return cls._get_client().browser_page_wait_for(page_id, wait_for, query, timeout_ms)

    @classmethod
    def browser_page_evaluate(cls, page_id: str, expression: str):
        """Evaluate JavaScript in a browser page."""
        return cls._get_client().browser_page_evaluate(page_id, expression)

    @classmethod
    def close_browser_page(cls, page_id: str):
        """Close a browser page."""
        return cls._get_client().close_browser_page(page_id)

    @classmethod
    def browser_page_network_events(cls, page_id: str):
        """List captured network events for a browser page."""
        return cls._get_client().browser_page_network_events(page_id)

    @classmethod
    def browser_page(cls, page_id: str) -> BrowserPage:
        """Create a local page helper for an existing backend page id."""
        return cls._get_client().browser_page(page_id)

    @classmethod
    def get_window_rect(cls, window_handle: int):
        """Get the window rectangle."""
        return cls._get_client().get_window_rect(window_handle)

    @classmethod
    def list_processes(cls):
        """List local processes with window visibility metadata."""
        return cls._get_client().list_processes()

    @classmethod
    def list_windows(cls):
        """List visible top-level windows."""
        return cls._get_client().list_windows()

    @classmethod
    def get_window_info(cls, window_handle: int):
        """Get detailed information for a specific window."""
        return cls._get_client().get_window_info(window_handle)

    @classmethod
    def move_window(cls, window_handle: int, x: int, y: int):
        """Move a window."""
        return cls._get_client().move_window(window_handle, x, y)

    @classmethod
    def resize_window(cls, window_handle: int, width: int, height: int):
        """Resize a window."""
        return cls._get_client().resize_window(window_handle, width, height)

    @classmethod
    def focus_window(cls, window_title: str = None, process_name: str = None):
        """Focus a window."""
        return cls._get_client().focus_window(window_title, process_name)

    @classmethod
    def show_window(cls, window_handle: int):
        """Show a window."""
        return cls._get_client().show_window(window_handle)

    @classmethod
    def hide_window(cls, window_handle: int):
        """Hide a window."""
        return cls._get_client().hide_window(window_handle)

    @classmethod
    def maximize_window(cls, window_handle: int):
        """Maximize a window."""
        return cls._get_client().maximize_window(window_handle)

    @classmethod
    def minimize_window(cls, window_handle: int):
        """Minimize a window."""
        return cls._get_client().minimize_window(window_handle)

    @classmethod
    def restore_window(cls, window_handle: int):
        """Restore a window."""
        return cls._get_client().restore_window(window_handle)

    @classmethod
    def close_window(cls, window_handle: int):
        """Close a window."""
        return cls._get_client().close_window(window_handle)

    @classmethod
    def drag_window_move(cls, window_handle: int, x: int, y: int):
        """Drag-move a window toward a target top-left."""
        return cls._get_client().drag_window_move(window_handle, x, y)

    @classmethod
    def drag_window_resize(cls, window_handle: int, width: int, height: int):
        """Drag-resize a window toward a target size."""
        return cls._get_client().drag_window_resize(window_handle, width, height)

    @classmethod
    def clipboard_read(cls):
        """Read text from the system clipboard."""
        return cls._get_client().clipboard_read()

    @classmethod
    def clipboard_write(cls, text: str):
        """Write text to the system clipboard."""
        return cls._get_client().clipboard_write(text)

    @classmethod
    def clipboard_clear(cls):
        """Clear the system clipboard."""
        return cls._get_client().clipboard_clear()

    @classmethod
    def clipboard_status(cls):
        """Get clipboard text/length metadata."""
        return cls._get_client().clipboard_status()

    @classmethod
    def session_create(cls, client_kind: str | None = None, name: str | None = None):
        """Create a lightweight Sidofun client session for resource ownership."""
        return cls._get_client().session_create(client_kind=client_kind, name=name)

    @classmethod
    def session_list(cls):
        """List active in-memory Sidofun client sessions."""
        return cls._get_client().session_list()

    @classmethod
    def session_list_idle(cls, max_idle_ms: int, client_kind: str | None = None):
        """List idle client sessions above the provided threshold."""
        return cls._get_client().session_list_idle(max_idle_ms, client_kind=client_kind)

    @classmethod
    def session_info(cls, session_id: str):
        """Get one Sidofun client session."""
        return cls._get_client().session_info(session_id)

    @classmethod
    def session_close(cls, session_id: str, cleanup_owned_resources: bool = True):
        """Close a client session and optionally clean up its owned resources."""
        return cls._get_client().session_close(session_id, cleanup_owned_resources=cleanup_owned_resources)

    @classmethod
    def session_reap_idle(cls, max_idle_ms: int, client_kind: str | None = None, cleanup_owned_resources: bool = True):
        """Reap idle client sessions above the provided threshold."""
        return cls._get_client().session_reap_idle(
            max_idle_ms,
            client_kind=client_kind,
            cleanup_owned_resources=cleanup_owned_resources,
        )

    @classmethod
    def trace_start(cls, name: str | None = None, owner_session_id: str | None = None):
        """Start an explicit trace session."""
        return cls._get_client().trace_start(name=name, owner_session_id=owner_session_id)

    @classmethod
    def trace_list(cls):
        """List active trace sessions."""
        return cls._get_client().trace_list()

    @classmethod
    def trace_info(cls, trace_id: str):
        """Get trace session metadata."""
        return cls._get_client().trace_info(trace_id)

    @classmethod
    def trace_export(cls, trace_id: str, path: str | None = None):
        """Export a trace bundle."""
        return cls._get_client().trace_export(trace_id, path=path)

    @classmethod
    def trace_stop(cls, trace_id: str):
        """Stop a trace session."""
        return cls._get_client().trace_stop(trace_id)

    @classmethod
    def trajectory_start(cls, name: str | None = None, owner_session_id: str | None = None):
        """Start a trajectory session."""
        return cls._get_client().trajectory_start(name=name, owner_session_id=owner_session_id)

    @classmethod
    def trajectory_list(cls):
        """List active trajectory sessions."""
        return cls._get_client().trajectory_list()

    @classmethod
    def trajectory_info(cls, trajectory_id: str):
        """Get trajectory session metadata."""
        return cls._get_client().trajectory_info(trajectory_id)

    @classmethod
    def trajectory_export(cls, trajectory_id: str, path: str | None = None):
        """Export a trajectory bundle."""
        return cls._get_client().trajectory_export(trajectory_id, path=path)

    @classmethod
    def trajectory_append_turn(
        cls,
        trajectory_id: str,
        turn_id: str,
        role: str | None = None,
        prompt=None,
        response=None,
        actions: list | None = None,
        screenshots: list | None = None,
        metadata: dict | None = None,
    ):
        """Append one turn to a trajectory session."""
        return cls._get_client().trajectory_append_turn(
            trajectory_id,
            turn_id,
            role=role,
            prompt=prompt,
            response=response,
            actions=actions,
            screenshots=screenshots,
            metadata=metadata,
        )

    @classmethod
    def trajectory_stop(cls, trajectory_id: str):
        """Stop a trajectory session."""
        return cls._get_client().trajectory_stop(trajectory_id)

    @classmethod
    def desktop_scope_create(
        cls,
        window_handles: list[int] | None = None,
        process_ids: list[int] | None = None,
        title_query: str | None = None,
        name: str | None = None,
        owner_session_id: str | None = None,
    ):
        """Create a bounded desktop scope from windows/processes/title query."""
        return cls._get_client().desktop_scope_create(
            window_handles=window_handles,
            process_ids=process_ids,
            title_query=title_query,
            name=name,
            owner_session_id=owner_session_id,
        )

    @classmethod
    def desktop_scope_list(cls):
        """List active desktop scopes."""
        return cls._get_client().desktop_scope_list()

    @classmethod
    def desktop_scope_info(cls, scope_id: str):
        """Get desktop scope metadata and live bounds."""
        return cls._get_client().desktop_scope_info(scope_id)

    @classmethod
    def desktop_scope_focus(cls, scope_id: str):
        """Focus the primary window for a desktop scope."""
        return cls._get_client().desktop_scope_focus(scope_id)

    @classmethod
    def desktop_scope_screenshot(cls, scope_id: str, filename: str | None = None, return_base64: bool = False):
        """Capture a cropped screenshot for a desktop scope."""
        return cls._get_client().desktop_scope_screenshot(scope_id, filename=filename, return_base64=return_base64)

    @classmethod
    def desktop_scope_click(cls, scope_id: str, x: int, y: int, button: str = "left"):
        """Click inside a desktop scope using scope-relative coordinates."""
        return cls._get_client().desktop_scope_click(scope_id, x, y, button)

    @classmethod
    def desktop_scope_type(cls, scope_id: str, text: str):
        """Focus a desktop scope and type text."""
        return cls._get_client().desktop_scope_type(scope_id, text)

    @classmethod
    def desktop_scope_close(cls, scope_id: str):
        """Close a desktop scope record."""
        return cls._get_client().desktop_scope_close(scope_id)

    @classmethod
    def shell_run(cls, command: str, shell: str = "pwsh", cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None):
        """Run a non-interactive shell command."""
        return cls._get_client().shell_run(command, shell=shell, cwd=cwd, timeout_ms=timeout_ms, env=env)

    @classmethod
    def shell_run_cmd(cls, command: str, cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None):
        """Run a non-interactive CMD command."""
        return cls._get_client().shell_run_cmd(command, cwd=cwd, timeout_ms=timeout_ms, env=env)

    @classmethod
    def shell_run_pwsh(cls, command: str, cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None):
        """Run a non-interactive PowerShell command."""
        return cls._get_client().shell_run_pwsh(command, cwd=cwd, timeout_ms=timeout_ms, env=env)

    @classmethod
    def terminal_spawn(cls, kind: str, title: str | None = None, owner_session_id: str | None = None):
        """Spawn a generic tracked terminal session."""
        return cls._get_client().terminal_spawn(kind, title, owner_session_id=owner_session_id)

    @classmethod
    def terminal_list(cls, kind: str | None = None):
        """List generic tracked terminal sessions."""
        return cls._get_client().terminal_list(kind)

    @classmethod
    def terminal_status(cls, kind: str, session_id):
        """Get generic tracked terminal status."""
        return cls._get_client().terminal_status(kind, session_id)

    @classmethod
    def terminal_focus(cls, kind: str, session_id):
        """Focus a generic tracked terminal."""
        return cls._get_client().terminal_focus(kind, session_id)

    @classmethod
    def terminal_type(cls, kind: str, session_id, text: str):
        """Type into a generic tracked terminal."""
        return cls._get_client().terminal_type(kind, session_id, text)

    @classmethod
    def terminal_exec(cls, kind: str, session_id, command: str, wait: bool = False, timeout: int | None = None):
        """Execute inside a generic tracked terminal."""
        return cls._get_client().terminal_exec(kind, session_id, command, wait=wait, timeout=timeout)

    @classmethod
    def terminal_close(cls, kind: str, session_id):
        """Close a generic tracked terminal."""
        return cls._get_client().terminal_close(kind, session_id)

    @classmethod
    def list_local_coders(cls):
        """List locally configured coder apps."""
        return cls._get_client().list_local_coders()

    @classmethod
    def local_coder_status(cls, app_id: str):
        """Get status for one local coder app."""
        return cls._get_client().local_coder_status(app_id)

    @classmethod
    def open_local_coder(cls, app_id: str, prompt: str | None = None, working_directory: str | None = None, input_delay_ms: int | None = None):
        """Launch and focus a configured local coder app, optionally typing an initial prompt."""
        return cls._get_client().open_local_coder(app_id, prompt, working_directory, input_delay_ms)

    @classmethod
    def focus_local_coder(cls, app_id: str):
        """Focus a configured local coder app."""
        return cls._get_client().focus_local_coder(app_id)

    @classmethod
    def close_local_coder(cls, app_id: str):
        """Close a configured local coder app window."""
        return cls._get_client().close_local_coder(app_id)

    @classmethod
    def maximize_local_coder(cls, app_id: str):
        """Maximize a configured local coder app window."""
        return cls._get_client().maximize_local_coder(app_id)

    @classmethod
    def minimize_local_coder(cls, app_id: str):
        """Minimize a configured local coder app window."""
        return cls._get_client().minimize_local_coder(app_id)

    @classmethod
    def restore_local_coder(cls, app_id: str):
        """Restore a configured local coder app window."""
        return cls._get_client().restore_local_coder(app_id)

    @classmethod
    def move_local_coder(cls, app_id: str, x: int, y: int):
        """Move a configured local coder app window."""
        return cls._get_client().move_local_coder(app_id, x, y)

    @classmethod
    def resize_local_coder(cls, app_id: str, width: int, height: int):
        """Resize a configured local coder app window."""
        return cls._get_client().resize_local_coder(app_id, width, height)

    @classmethod
    def run_local_coder(cls, app_id: str, prompt: str, working_directory: str | None = None, timeout_ms: int | None = None):
        """Run a configured local coder app using its non-interactive CLI mode."""
        return cls._get_client().run_local_coder(app_id, prompt, working_directory, timeout_ms)

    @classmethod
    def opencli_status(cls):
        """Get status for the nested OpenCLI-RS provider."""
        return cls._get_client().opencli_status()

    @classmethod
    def browser_extension_status(cls):
        """Get status for the native Sidofun browser extension provider scaffold."""
        return cls._get_client().browser_extension_status()

    @classmethod
    def browser_extension_capabilities(cls):
        """List native browser extension capabilities and site modules."""
        return cls._get_client().browser_extension_capabilities()

    @classmethod
    def browser_extension_sites(cls):
        """List scaffolded/planned browser-extension site modules."""
        return cls._get_client().browser_extension_sites()

    @classmethod
    def browser_extension_wait_provider(cls, timeout_ms: int | None = None, interval_ms: int | None = None):
        return cls._get_client().browser_extension_wait_provider(timeout_ms=timeout_ms, interval_ms=interval_ms)

    @classmethod
    def browser_extension_workspace_list(cls):
        return cls._get_client().browser_extension_workspace_list()

    @classmethod
    def browser_extension_workspace_get(cls, name: str):
        return cls._get_client().browser_extension_workspace_get(name)

    @classmethod
    def browser_extension_workspace_set(cls, name: str, path: str, sites: list[str] | None = None):
        return cls._get_client().browser_extension_workspace_set(name, path, sites=sites)

    @classmethod
    def browser_extension_workspace_clear(cls, name: str):
        return cls._get_client().browser_extension_workspace_clear(name)

    @classmethod
    def browser_extension_session_create(cls, workspace: str | None = None, site: str | None = None, target_url: str | None = None, name: str | None = None):
        return cls._get_client().browser_extension_session_create(workspace=workspace, site=site, target_url=target_url, name=name)

    @classmethod
    def browser_extension_session_list(cls):
        return cls._get_client().browser_extension_session_list()

    @classmethod
    def browser_extension_session_info(cls, session_id: str):
        return cls._get_client().browser_extension_session_info(session_id)

    @classmethod
    def browser_extension_session_refresh(cls, session_id: str):
        return cls._get_client().browser_extension_session_refresh(session_id)

    @classmethod
    def browser_extension_session_reconnect(cls, session_id: str, timeout_ms: int | None = None, interval_ms: int | None = None):
        return cls._get_client().browser_extension_session_reconnect(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    @classmethod
    def browser_extension_session_wait_ready(cls, session_id: str, timeout_ms: int | None = None, interval_ms: int | None = None):
        return cls._get_client().browser_extension_session_wait_ready(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    @classmethod
    def browser_extension_session_close(cls, session_id: str):
        return cls._get_client().browser_extension_session_close(session_id)

    @classmethod
    def browser_extension_tabs(cls, session_id: str):
        return cls._get_client().browser_extension_tabs(session_id)

    @classmethod
    def browser_extension_navigate(cls, session_id: str, target_url: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_navigate(session_id, target_url, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_focus_tab(cls, session_id: str, tab_id: int, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_focus_tab(session_id, tab_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_snapshot(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_snapshot(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_actionables(
        cls,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_actionables(
            session_id,
            selector=selector,
            frame_selectors=frame_selectors,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_page_state(
        cls,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        max_depth: int | None = None,
        max_children: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_page_state(
            session_id,
            selector=selector,
            frame_selectors=frame_selectors,
            limit=limit,
            max_depth=max_depth,
            max_children=max_children,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_next_actions(
        cls,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        max_depth: int | None = None,
        max_children: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_next_actions(
            session_id,
            selector=selector,
            frame_selectors=frame_selectors,
            limit=limit,
            max_depth=max_depth,
            max_children=max_children,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_screenshot(
        cls,
        session_id: str,
        filename: str | None = None,
        return_base64: bool | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_screenshot(
            session_id,
            filename=filename,
            return_base64=return_base64,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_inspect(cls, session_id: str, selector: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_inspect(session_id, selector, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_inspect_all(cls, session_id: str, selector: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_inspect_all(session_id, selector, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_links(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_links(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_evaluate(cls, session_id: str, expression: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_evaluate(session_id, expression, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_click(cls, session_id: str, selector: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_click(session_id, selector, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_type(cls, session_id: str, selector: str, text: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_type(session_id, selector, text, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_press(cls, session_id: str, key: str, selector: str | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_press(session_id, key, selector=selector, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_cookies(cls, session_id: str, target_url: str | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_cookies(session_id, target_url=target_url, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_x_search(
        cls,
        session_id: str,
        query: str,
        mode: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_search(
            session_id,
            query,
            mode=mode,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_timeline(
        cls,
        session_id: str,
        timeline_type: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_timeline(
            session_id,
            timeline_type=timeline_type,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_bookmarks(
        cls,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_bookmarks(
            session_id,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_notifications(
        cls,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_notifications(
            session_id,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_messages(
        cls,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_messages(
            session_id,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_open_message_thread(
        cls,
        session_id: str,
        thread: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_open_message_thread(
            session_id,
            thread,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_send_message(
        cls,
        session_id: str,
        text: str,
        thread: str | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_send_message(
            session_id,
            text,
            thread=thread,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_read_thread(
        cls,
        session_id: str,
        post_url: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_read_thread(
            session_id,
            post_url,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_post(
        cls,
        session_id: str,
        text: str,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_post(
            session_id,
            text,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_open_post(
        cls,
        session_id: str,
        post_url: str,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_open_post(
            session_id,
            post_url,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_profile(
        cls,
        session_id: str,
        handle_or_url: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_profile(
            session_id,
            handle_or_url,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_follow(
        cls,
        session_id: str,
        handle_or_url: str,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_follow(
            session_id,
            handle_or_url,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_reply(
        cls,
        session_id: str,
        text: str,
        post_url: str | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_reply(
            session_id,
            text,
            post_url=post_url,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_like(
        cls,
        session_id: str,
        post_url: str | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_like(
            session_id,
            post_url=post_url,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_x_repost(
        cls,
        session_id: str,
        post_url: str | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_x_repost(
            session_id,
            post_url=post_url,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_read_latest(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_read_latest(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_new_chat(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_new_chat(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_info(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_info(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_sidebar_state(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_sidebar_state(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_toggle_sidebar(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_toggle_sidebar(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_models(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_models(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_select_model(cls, session_id: str, query: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_select_model(session_id, query, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_list_conversations(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_list_conversations(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_open_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_open_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_conversation_actions(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_conversation_actions(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_conversation_action(
        cls,
        session_id: str,
        action_query: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_conversation_action(
            session_id,
            action_query,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_rename_conversation(
        cls,
        session_id: str,
        title: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_rename_conversation(
            session_id,
            title,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_stop(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_stop(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_continue(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_continue(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_response_controls(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_response_controls(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_previous_response(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_previous_response(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_next_response(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_next_response(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_list_response_versions(
        cls,
        session_id: str,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_list_response_versions(
            session_id,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_select_response_version(
        cls,
        session_id: str,
        index: int,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_select_response_version(
            session_id,
            index,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_regenerate(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_regenerate(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_edit_message(cls, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_edit_message(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_read_thread(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_read_thread(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_read_message(cls, session_id: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_read_message(session_id, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_current_conversation(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_current_conversation(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_export_thread(cls, session_id: str, format: str | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_export_thread(session_id, format=format, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_send(cls, session_id: str, text: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_send(session_id, text, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_ask(cls, session_id: str, text: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_ask(session_id, text, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_ask_thread(cls, session_id: str, text: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_ask_thread(session_id, text, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_rewrite_thread(cls, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_chatgpt_rewrite_thread(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_chatgpt_wait_idle(
        cls,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_wait_idle(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    @classmethod
    def browser_extension_chatgpt_wait_response(
        cls,
        session_id: str,
        baseline_text: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_wait_response(
            session_id,
            baseline_text=baseline_text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_chatgpt_wait_message(
        cls,
        session_id: str,
        text: str | None = None,
        role: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_wait_message(
            session_id,
            text=text,
            role=role,
            limit=limit,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_chatgpt_wait_sidebar(
        cls,
        session_id: str,
        open: bool | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_wait_sidebar(
            session_id,
            open=open,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_chatgpt_wait_model(
        cls,
        session_id: str,
        query: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_wait_model(
            session_id,
            query,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_chatgpt_wait_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_wait_conversation(
            session_id,
            title_query=title_query,
            url=url,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_chatgpt_prepare(
        cls,
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
        return cls._get_client().browser_extension_chatgpt_prepare(
            session_id,
            ensure_sidebar_open=ensure_sidebar_open,
            model=model,
            new_chat=new_chat,
            title_query=title_query,
            url=url,
            index=index,
            limit=limit,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    @classmethod
    def browser_extension_chatgpt_delete_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_delete_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_chatgpt_archive_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_chatgpt_archive_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_read_latest(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_read_latest(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_new_chat(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_new_chat(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_info(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_info(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_sidebar_state(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_sidebar_state(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_toggle_sidebar(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_toggle_sidebar(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_models(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_models(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_select_model(cls, session_id: str, query: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_select_model(session_id, query, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_list_conversations(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_list_conversations(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_open_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_open_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_conversation_actions(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_conversation_actions(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_conversation_action(
        cls,
        session_id: str,
        action_query: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_conversation_action(
            session_id,
            action_query,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_rename_conversation(
        cls,
        session_id: str,
        title: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_rename_conversation(
            session_id,
            title,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_stop(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_stop(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_continue(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_continue(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_response_controls(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_response_controls(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_previous_response(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_previous_response(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_next_response(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_next_response(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_list_response_versions(
        cls,
        session_id: str,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_list_response_versions(
            session_id,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_select_response_version(
        cls,
        session_id: str,
        index: int,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_select_response_version(
            session_id,
            index,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_regenerate(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_regenerate(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_edit_message(cls, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_edit_message(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_read_thread(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_read_thread(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_read_message(cls, session_id: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_read_message(session_id, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_current_conversation(cls, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_current_conversation(session_id, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_export_thread(cls, session_id: str, format: str | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_export_thread(session_id, format=format, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_send(cls, session_id: str, text: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_send(session_id, text, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_ask(cls, session_id: str, text: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_ask(session_id, text, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_ask_thread(cls, session_id: str, text: str, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_ask_thread(session_id, text, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_rewrite_thread(cls, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_deepseek_rewrite_thread(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_deepseek_wait_idle(
        cls,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_wait_idle(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    @classmethod
    def browser_extension_deepseek_wait_response(
        cls,
        session_id: str,
        baseline_text: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_wait_response(
            session_id,
            baseline_text=baseline_text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_deepseek_wait_message(
        cls,
        session_id: str,
        text: str | None = None,
        role: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_wait_message(
            session_id,
            text=text,
            role=role,
            limit=limit,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_deepseek_wait_sidebar(
        cls,
        session_id: str,
        open: bool | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_wait_sidebar(
            session_id,
            open=open,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_deepseek_wait_model(
        cls,
        session_id: str,
        query: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_wait_model(
            session_id,
            query,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_deepseek_wait_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_wait_conversation(
            session_id,
            title_query=title_query,
            url=url,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    @classmethod
    def browser_extension_deepseek_prepare(
        cls,
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
        return cls._get_client().browser_extension_deepseek_prepare(
            session_id,
            ensure_sidebar_open=ensure_sidebar_open,
            model=model,
            new_chat=new_chat,
            title_query=title_query,
            url=url,
            index=index,
            limit=limit,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    @classmethod
    def browser_extension_deepseek_delete_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_delete_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_deepseek_archive_conversation(
        cls,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_deepseek_archive_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_network_events(
        cls,
        session_id: str,
        limit: int | None = None,
        url_includes: str | None = None,
        stage: str | None = None,
        method: str | None = None,
    ):
        return cls._get_client().browser_extension_network_events(
            session_id,
            limit=limit,
            url_includes=url_includes,
            stage=stage,
            method=method,
        )

    @classmethod
    def browser_extension_clear_network_events(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_clear_network_events(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_dom_events(
        cls,
        session_id: str,
        limit: int | None = None,
        mutation_type: str | None = None,
        text_includes: str | None = None,
        timeout_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_dom_events(
            session_id,
            limit=limit,
            mutation_type=mutation_type,
            text_includes=text_includes,
            timeout_ms=timeout_ms,
        )

    @classmethod
    def browser_extension_clear_dom_events(cls, session_id: str, timeout_ms: int | None = None):
        return cls._get_client().browser_extension_clear_dom_events(session_id, timeout_ms=timeout_ms)

    @classmethod
    def browser_extension_session_events(
        cls,
        session_id: str,
        limit: int | None = None,
        event_kind: str | None = None,
        ok: bool | None = None,
    ):
        return cls._get_client().browser_extension_session_events(
            session_id,
            limit=limit,
            event_kind=event_kind,
            ok=ok,
        )

    @classmethod
    def browser_extension_clear_session_events(cls, session_id: str):
        return cls._get_client().browser_extension_clear_session_events(session_id)

    @classmethod
    def browser_extension_wait_text(
        cls,
        session_id: str,
        text: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_wait_text(
            session_id,
            text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    @classmethod
    def browser_extension_wait_url(
        cls,
        session_id: str,
        text: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_wait_url(
            session_id,
            text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    @classmethod
    def browser_extension_wait_selector(
        cls,
        session_id: str,
        selector: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_wait_selector(
            session_id,
            selector,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    @classmethod
    def browser_extension_wait_no_selector(
        cls,
        session_id: str,
        selector: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return cls._get_client().browser_extension_wait_no_selector(
            session_id,
            selector,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    @classmethod
    def opencli_doctor(cls, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None):
        """Run OpenCLI-RS doctor through Sidofun."""
        return cls._get_client().opencli_doctor(cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms)

    @classmethod
    def opencli_sites(cls):
        """List OpenCLI-RS adapter sites."""
        return cls._get_client().opencli_sites()

    @classmethod
    def opencli_commands(cls, site: str):
        """List OpenCLI-RS commands for one site."""
        return cls._get_client().opencli_commands(site)

    @classmethod
    def opencli_run(
        cls,
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
        """Run one OpenCLI-RS adapter command through Sidofun."""
        return cls._get_client().opencli_run(site, command, args=args, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    @classmethod
    def opencli_workspace_list(cls):
        return cls._get_client().opencli_workspace_list()

    @classmethod
    def opencli_workspace_get(cls, name: str):
        return cls._get_client().opencli_workspace_get(name)

    @classmethod
    def opencli_workspace_set(cls, name: str, path: str):
        return cls._get_client().opencli_workspace_set(name, path)

    @classmethod
    def opencli_workspace_clear(cls, name: str):
        return cls._get_client().opencli_workspace_clear(name)

    @classmethod
    def opencli_workspace_bind_session(cls, session_id: str, workspace: str):
        return cls._get_client().opencli_workspace_bind_session(session_id, workspace)

    @classmethod
    def opencli_workspace_unbind_session(cls, session_id: str):
        return cls._get_client().opencli_workspace_unbind_session(session_id)

    @classmethod
    def opencli_workspace_session(cls, session_id: str):
        return cls._get_client().opencli_workspace_session(session_id)

    @classmethod
    def twitter_search(cls, query: str, limit: int | None = None, mode: str | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        """Search Twitter/X through OpenCLI-RS."""
        return cls._get_client().twitter_search(query, limit=limit, mode=mode, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    @classmethod
    def twitter_timeline(cls, timeline_type: str | None = None, limit: int | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        """Fetch the Twitter/X timeline through OpenCLI-RS."""
        return cls._get_client().twitter_timeline(timeline_type=timeline_type, limit=limit, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    @classmethod
    def twitter_bookmarks(cls, limit: int | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        """Fetch Twitter/X bookmarks through OpenCLI-RS."""
        return cls._get_client().twitter_bookmarks(limit=limit, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    @classmethod
    def twitter_post(cls, text: str, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        """Create a Twitter/X post through OpenCLI-RS."""
        return cls._get_client().twitter_post(text, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    @classmethod
    def launch_application(cls, application: str, args: list[str] = None):
        """Launch an application."""
        return cls._get_client().launch_application(application, args)

    @classmethod
    def set_mouse_delay(cls, delay: int):
        """Set the mouse delay."""
        return cls._get_client().set_mouse_delay(delay)

    @classmethod
    def set_keyboard_delay(cls, delay: int):
        """Set the keyboard delay."""
        return cls._get_client().set_keyboard_delay(delay)

    @classmethod
    def type_delayed(cls, text: str, cpm: int = 600):
        """Type text with human-like speed."""
        return cls._get_client().type_delayed(text, cpm)

    @classmethod
    def highlight(
        cls,
        x: int,
        y: int,
        width: int,
        height: int,
        duration: int = 500,
        opacity: float = 0.3,
    ):
        """Highlight a region of the screen."""
        return cls._get_client().highlight(x, y, width, height, duration, opacity)

    # ==================== CMD Automation ====================

    @classmethod
    def sessions(cls):
        """Get the session manager for convenient session access."""
        return cls._get_client().sessions

    @classmethod
    def cmd_spawn(cls, title: str = None):
        """
        Spawn a new CMD window.

        Returns:
            CMDSession object for fluent interface
        """
        return cls._get_client().cmd_spawn(title)

    @classmethod
    def cmd_attach(cls, title_pattern: str) -> str:
        """Attach to an existing CMD window."""
        return cls._get_client().cmd_attach(title_pattern)

    @classmethod
    def cmd_list(cls) -> list:
        """List all active CMD sessions."""
        return cls._get_client().cmd_list()

    @classmethod
    def cmd_tabs(cls) -> dict:
        """List tracked terminal tabs/sessions for CMD automation."""
        return cls._get_client().cmd_tabs()

    @classmethod
    def cmd_find_by_title(cls, title_query: str) -> dict:
        """Find tracked CMD sessions by title or tab title substring."""
        return cls._get_client().cmd_find_by_title(title_query)

    @classmethod
    def cmd_focus(cls, session_id: str | int) -> dict:
        """Focus a tracked CMD session and return its latest status."""
        return cls._get_client().cmd_focus(session_id)

    @classmethod
    def cmd_activate_by_title(cls, title_query: str) -> dict:
        """Focus the first tracked CMD session whose title or tab title matches."""
        return cls._get_client().cmd_activate_by_title(title_query)

    @classmethod
    def cmd_info(cls, session_id: str | int) -> dict:
        """Get CMD session info."""
        return cls._get_client().cmd_info(session_id)

    @classmethod
    def cmd_status(
        cls,
        session_id: str | int,
        screenshot: bool = False,
        filename: str = None,
        return_base64: bool = False,
    ) -> dict:
        """Get richer CMD status, optionally including a screenshot."""
        return cls._get_client().cmd_status(session_id, screenshot, filename, return_base64)

    @classmethod
    def pwsh_status(
        cls,
        session_id,
        screenshot: bool = False,
        filename: str = None,
        return_base64: bool = False,
    ) -> dict:
        """Get richer PowerShell status, optionally including a screenshot."""
        return cls._get_client().pwsh_status(session_id, screenshot, filename, return_base64)

    @classmethod
    def pwsh_tabs(cls) -> dict:
        """List tracked terminal tabs/sessions for PowerShell automation."""
        return cls._get_client().pwsh_tabs()

    @classmethod
    def pwsh_focus(cls, session_id) -> dict:
        """Focus a tracked PowerShell session and return its latest status."""
        return cls._get_client().pwsh_focus(session_id)

    @classmethod
    def pwsh_activate_by_title(cls, title_query: str) -> dict:
        """Focus the first tracked PowerShell session whose title or tab title matches."""
        return cls._get_client().pwsh_activate_by_title(title_query)

    @classmethod
    def cmd_exec(
        cls,
        session_id: str | int,
        command: str,
        wait: bool = None,
        timeout: int = None,
        screenshot: bool = None,
    ) -> dict:
        """Execute a command in a CMD session."""
        return cls._get_client().cmd_exec(session_id, command, wait, timeout, screenshot)

    @classmethod
    def cmd_type(cls, session_id: str | int, text: str) -> str:
        """Type text into a CMD session with escape sequence support."""
        return cls._get_client().cmd_type(session_id, text)

    @classmethod
    def cmd_press(cls, session_id: str | int, key: str) -> str:
        """Press a key in a CMD session."""
        return cls._get_client().cmd_press(session_id, key)

    @classmethod
    def cmd_screenshot(
        cls,
        session_id: str | int,
        filename: str = None,
        return_base64: bool = None,
    ) -> dict:
        """Take a screenshot of a CMD session."""
        return cls._get_client().cmd_screenshot(session_id, filename, return_base64)

    @classmethod
    def cmd_break(cls, session_id: str | int) -> str:
        """Send Ctrl+C to a CMD session."""
        return cls._get_client().cmd_break(session_id)

    @classmethod
    def cmd_key_toggle(cls, session_id: str | int, key: str, direction: str = "down") -> str:
        """Hold or release a modifier key in a CMD session."""
        return cls._get_client().cmd_key_toggle(session_id, key, direction)

    @classmethod
    def cmd_close(cls, session_id: str | int) -> str:
        """Close a CMD session."""
        return cls._get_client().cmd_close(session_id)

    # ==================== Terminal Shortcuts ====================

    @classmethod
    def cmd_new_tab(cls, session_id: str | int) -> str:
        """Create new tab (Ctrl+Shift+T)."""
        return cls._get_client().cmd_new_tab(session_id)

    @classmethod
    def cmd_next_tab(cls, session_id: str | int) -> str:
        """Switch to next tab (Ctrl+Tab)."""
        return cls._get_client().cmd_next_tab(session_id)

    @classmethod
    def cmd_prev_tab(cls, session_id: str | int) -> str:
        """Switch to previous tab (Ctrl+Shift+Tab)."""
        return cls._get_client().cmd_prev_tab(session_id)

    @classmethod
    def cmd_split_vertical(cls, session_id: str | int) -> str:
        """Split window vertically (Shift+Alt+-)."""
        return cls._get_client().cmd_split_vertical(session_id)

    @classmethod
    def cmd_split_horizontal(cls, session_id: str | int) -> str:
        """Split window horizontally (Shift+Alt++)."""
        return cls._get_client().cmd_split_horizontal(session_id)

    @classmethod
    def cmd_pane_up(cls, session_id: str | int) -> str:
        """Navigate to upper pane (Alt+Up)."""
        return cls._get_client().cmd_pane_up(session_id)

    @classmethod
    def cmd_pane_down(cls, session_id: str | int) -> str:
        """Navigate to lower pane (Alt+Down)."""
        return cls._get_client().cmd_pane_down(session_id)

    @classmethod
    def cmd_pane_left(cls, session_id: str | int) -> str:
        """Navigate to left pane (Alt+Left)."""
        return cls._get_client().cmd_pane_left(session_id)

    @classmethod
    def cmd_pane_right(cls, session_id: str | int) -> str:
        """Navigate to right pane (Alt+Right)."""
        return cls._get_client().cmd_pane_right(session_id)

    # ==================== Context Manager Support ====================

    def __enter__(self):
        """Context manager entry - ensures the client is running."""
        self._get_client()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - stops the client."""
        self.stop()
        return False


# Create the singleton instance
DesktopWin = DesktopWinSingleton()

# Register cleanup on exit
atexit.register(DesktopWin.stop)


# Export convenience functions for direct use
def screenshot(*args, **kwargs):
    """Convenience function: Take a screenshot."""
    return DesktopWin.screenshot(*args, **kwargs)


def click(*args, **kwargs):
    """Convenience function: Click at coordinates."""
    return DesktopWin.click(*args, **kwargs)


def type(*args, **kwargs):
    """Convenience function: Type text."""
    return DesktopWin.type(*args, **kwargs)


def cmd_spawn(*args, **kwargs):
    """Convenience function: Spawn CMD window."""
    return DesktopWin.cmd_spawn(*args, **kwargs)


def cmd_type(*args, **kwargs):
    """Convenience function: Type into CMD."""
    return DesktopWin.cmd_type(*args, **kwargs)


__all__ = [
    "DesktopWin",
    "DesktopWinSingleton",
    "screenshot",
    "click",
    "type",
    "cmd_spawn",
    "cmd_type",
]
