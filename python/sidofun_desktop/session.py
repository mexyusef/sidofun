"""
CMD Session Class

Provides a fluent interface for CMD operations where the session_id
is implicitly bound to the session object.
"""

from typing import TYPE_CHECKING, Optional, Union
from typing import Any

if TYPE_CHECKING:
    from . import DesktopWinClient


class CMDSession:
    """
    A CMD session with fluent interface for session-bound operations.

    Returned by cmd_spawn(), this class provides all CMD operations
    without needing to pass session_id repeatedly.
    """

    def __init__(self, client: "DesktopWinClient", session_id: str):
        """
        Initialize a CMD session.

        Args:
            client: The DesktopWinClient instance
            session_id: The session ID
        """
        self._client = client
        self.id = session_id

    # ==================== Session Info ====================

    def info(self) -> dict:
        """Get information about this session."""
        return self._client.cmd_info(self.id)

    def status(
        self,
        screenshot: bool = False,
        filename: Optional[str] = None,
        return_base64: bool = False,
    ) -> dict:
        """Get richer status for this session, optionally including a screenshot."""
        return self._client.cmd_status(
            self.id,
            screenshot=screenshot,
            filename=filename,
            return_base64=return_base64,
        )

    def close(self) -> str:
        """Close this session."""
        return self._client.cmd_close(self.id)

    # ==================== Command Execution ====================

    def exec(
        self,
        command: str,
        wait: bool = False,
        timeout: Optional[int] = None,
        screenshot: bool = False,
    ) -> dict:
        """
        Execute a command in this session.

        Args:
            command: Command to execute
            wait: Whether to wait after command
            timeout: Wait timeout in milliseconds
            screenshot: Whether to take screenshot after command

        Returns:
            CMDExecResult with command, duration, and optional screenshot
        """
        return self._client.cmd_exec(self.id, command, wait, timeout, screenshot)

    def run(self, command: str, timeout: int = 5000) -> dict:
        """
        Execute a command and wait for completion (convenience method).

        Args:
            command: Command to execute
            timeout: Wait timeout in milliseconds (default: 5000)

        Returns:
            CMDExecResult with command, duration, and optional screenshot
        """
        return self._client.cmd_exec(self.id, command, wait=True, timeout=timeout)

    # ==================== Input ====================

    def type(self, text: str) -> str:
        """
        Type text into this session with escape sequence support.

        Escape Sequences:
            \\n - Press Enter
            \\t - Press Tab
            \\dN - Delay N milliseconds
            \\M - Maximize window
            \\m - Minimize window
            \\r - Restore window
            \\f - Focus window

        Args:
            text: Text to type (may contain escape sequences)

        Returns:
            Success message with segment count
        """
        return self._client.cmd_type(self.id, text)

    def press(self, key: str) -> str:
        """
        Press a key in this session.

        Args:
            key: Key name (e.g., "enter", "tab", "escape")

        Returns:
            Success message
        """
        return self._client.cmd_press(self.id, key)

    def send(self, text: str) -> str:
        """
        Type text and press Enter (convenience method).

        Args:
            text: Text to type

        Returns:
            Success message
        """
        return self._client.cmd_type(self.id, text + "\n")

    # ==================== Screenshot ====================

    def screenshot(
        self, filename: Optional[str] = None, return_base64: bool = True
    ) -> dict:
        """
        Take a screenshot of this session's window.

        Args:
            filename: Optional filename to save screenshot
            return_base64: Whether to return base64 data

        Returns:
            ScreenshotResult with filepath, data, width, height
        """
        return self._client.cmd_screenshot(self.id, filename, return_base64)

    # ==================== Control ====================

    def break_signal(self) -> str:
        """Send Ctrl+C (break signal) to this session."""
        return self._client.cmd_break(self.id)

    def key_toggle(self, key: str, direction: str = "down") -> str:
        """
        Hold or release a modifier key in this session.

        Args:
            key: Key name (e.g., "control", "shift", "alt", "win")
            direction: "down" to hold, "up" to release

        Returns:
            Success message
        """
        return self._client.cmd_key_toggle(self.id, key, direction)

    def key_combo(self, modifiers: list[str], key: str) -> None:
        """
        Press a key combination with modifiers.

        Args:
            modifiers: List of modifier keys to hold
            key: The key to press

        Example:
            session.key_combo(["control", "shift"], "t")  # Ctrl+Shift+T
        """
        self._client.cmd_key_combo(self.id, modifiers, key)

    # ==================== Window Control ====================

    def maximize(self) -> str:
        """Maximize this session's window."""
        return self._client.cmd_key_toggle(self.id, "control", "down")  # Focus first
        return self.type(r"\M")

    def minimize(self) -> str:
        """Minimize this session's window."""
        return self.type(r"\m")

    def restore(self) -> str:
        """Restore this session's window."""
        return self.type(r"\r")

    def focus(self) -> str:
        """Focus this session's window."""
        return self._client.cmd_focus(self.id)

    def activate(self) -> dict:
        """Activate this tracked terminal session and return its latest status."""
        return self._client.cmd_focus(self.id)

    # ==================== Terminal Shortcuts ====================

    def new_tab(self) -> str:
        """Create new tab (Ctrl+Shift+T)."""
        return self._client.cmd_new_tab(self.id)

    def next_tab(self) -> str:
        """Switch to next tab (Ctrl+Tab)."""
        return self._client.cmd_next_tab(self.id)

    def prev_tab(self) -> str:
        """Switch to previous tab (Ctrl+Shift+Tab)."""
        return self._client.cmd_prev_tab(self.id)

    def split_vertical(self) -> str:
        """Split window vertically (Shift+Alt+-)."""
        return self._client.cmd_split_vertical(self.id)

    def split_horizontal(self) -> str:
        """Split window horizontally (Shift+Alt++)."""
        return self._client.cmd_split_horizontal(self.id)

    def pane_up(self) -> str:
        """Navigate to upper pane (Alt+Up)."""
        return self._client.cmd_pane_up(self.id)

    def pane_down(self) -> str:
        """Navigate to lower pane (Alt+Down)."""
        return self._client.cmd_pane_down(self.id)

    def pane_left(self) -> str:
        """Navigate to left pane (Alt+Left)."""
        return self._client.cmd_pane_left(self.id)

    def pane_right(self) -> str:
        """Navigate to right pane (Alt+Right)."""
        return self._client.cmd_pane_right(self.id)

    # ==================== Convenience Methods ====================

    def shell(self, command: str, wait: bool = True, timeout: int = 5000) -> dict:
        """
        Execute a shell command (convenience alias for exec).

        Args:
            command: Command to execute
            wait: Whether to wait for completion
            timeout: Wait timeout in milliseconds

        Returns:
            CMDExecResult
        """
        return self.exec(command, wait=wait, timeout=timeout)

    def __enter__(self):
        """Context manager entry - returns self for chaining."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - closes the session."""
        self.close()
        return False

    def __str__(self) -> str:
        """
        Return the session ID as a string.

        DESIGN RATIONALE:
        ------------------
        This enables backward compatibility with the old API where cmd_spawn()
        returned a string session_id. By implementing __str__, CMDSession can be
        used seamlessly in both APIs:

        Old API (still works):
            session_id = client.cmd_spawn()        # Returns CMDSession
            client.cmd_type(session_id, "echo\n")  # str(session_id) = session.id

        New API (recommended):
            session = client.cmd_spawn()           # Returns CMDSession
            session.type("echo\n")                 # Uses bound methods

        Without __str__, passing CMDSession to old API methods would fail
        because str(session) would return "CMDSession(id='cmd_xxx')" instead
        of "cmd_xxx", breaking backward compatibility.

        Returns:
            The session ID string (e.g., "cmd_1234567890_abc123")
        """
        return self.id

    def __repr__(self) -> str:
        """String representation of the session."""
        return f"CMDSession(id='{self.id}')"


class SessionManager:
    """
    Manages multiple CMD sessions with convenient access patterns.

    Provides index-based access and iteration over sessions.
    """

    def __init__(self, client: "DesktopWinClient"):
        """
        Initialize the session manager.

        Args:
            client: The DesktopWinClient instance
        """
        self._client = client

    def spawn(self, title: Optional[str] = None) -> CMDSession:
        """
        Spawn a new CMD session.

        Args:
            title: Optional window title

        Returns:
            CMDSession object
        """
        session_id = self._client.cmd_spawn(title)
        return CMDSession(self._client, session_id)

    def list(self) -> list[dict]:
        """List all active sessions."""
        return self._client.cmd_list()["sessions"]

    def count(self) -> int:
        """Get the number of active sessions."""
        return self._client.cmd_list()["count"]

    def get(self, index: int) -> CMDSession:
        """
        Get a session by 1-based index.

        Args:
            index: Session index (1-based)

        Returns:
            CMDSession object

        Raises:
            IndexError: If index is out of range
        """
        sessions = self.list()
        if index < 1 or index > len(sessions):
            raise IndexError(
                f"Session index {index} out of range (1-{len(sessions)})"
            )
        session_id = sessions[index - 1]["id"]
        return CMDSession(self._client, session_id)

    def __getitem__(self, index: int) -> CMDSession:
        """
        Get a session by 1-based index using bracket notation.

        Args:
            index: Session index (1-based)

        Returns:
            CMDSession object
        """
        return self.get(index)

    def __len__(self) -> int:
        """Get the number of active sessions."""
        return self.count()

    def __iter__(self):
        """Iterate over all sessions."""
        sessions = self.list()
        for session_info in sessions:
            yield CMDSession(self._client, session_info["id"])

    def __repr__(self) -> str:
        """String representation of the session manager."""
        return f"SessionManager(count={self.count()})"
