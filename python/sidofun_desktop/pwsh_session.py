"""
PowerShell Session Class

Provides a fluent interface for PowerShell operations where the session_id
is implicitly bound to the session object.
"""

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from . import DesktopWinClient


class PowerShellSession:
    """
    A PowerShell session with fluent interface for session-bound operations.
    
    Returned by pwsh_spawn(), this class provides all PowerShell operations
    without needing to pass session_id repeatedly.
    """

    def __init__(self, client: "DesktopWinClient", session_id: str):
        """
        Initialize a PowerShell session.

        Args:
            client: The DesktopWinClient instance
            session_id: The session ID
        """
        self._client = client
        self.id = session_id

    # ==================== Session Info ====================

    def info(self) -> dict:
        """Get information about this session."""
        return self._client.pwsh_info(self.id)

    def status(
        self,
        screenshot: bool = False,
        filename: Optional[str] = None,
        return_base64: bool = False,
    ) -> dict:
        """Get richer status for this session, optionally including a screenshot."""
        return self._client.pwsh_status(
            self.id,
            screenshot=screenshot,
            filename=filename,
            return_base64=return_base64,
        )

    def close(self) -> str:
        """Close this session."""
        return self._client.pwsh_close(self.id)

    # ==================== Command Execution ====================

    def exec(
        self,
        command: str,
        wait: bool = False,
        timeout: Optional[int] = None,
        screenshot: bool = False,
        output_format: str = "text",
    ) -> dict:
        """
        Execute a command in this session.

        Args:
            command: Command to execute
            wait: Whether to wait after command
            timeout: Wait timeout in milliseconds
            screenshot: Whether to take screenshot after command
            output_format: 'text' or 'json' (for structured output)

        Returns:
            CMDExecResult with command, duration, and optional screenshot
        """
        return self._client.pwsh_exec(self.id, command, wait, timeout, screenshot, output_format)

    def run(self, command: str, timeout: int = 5000, output_format: str = "text") -> dict:
        """
        Execute a command and wait for completion (convenience method).

        Args:
            command: Command to execute
            timeout: Wait timeout in milliseconds (default: 5000)
            output_format: 'text' or 'json'

        Returns:
            CMDExecResult with command, duration, and optional screenshot
        """
        return self._client.pwsh_exec(self.id, command, wait=True, timeout=timeout, output_format=output_format)

    def run_json(self, command: str, timeout: int = 5000) -> dict:
        """
        Execute a command and return JSON output (convenience method).

        Args:
            command: Command to execute (will be piped to ConvertTo-Json if needed)
            timeout: Wait timeout in milliseconds (default: 5000)

        Returns:
            Parsed JSON result
        """
        return self._client.pwsh_exec(self.id, command, wait=True, timeout=timeout, output_format="json")

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
        return self._client.pwsh_type(self.id, text)

    def press(self, key: str) -> str:
        """
        Press a key in this session.

        Args:
            key: Key name (e.g., "enter", "tab", "escape")

        Returns:
            Success message
        """
        return self._client.pwsh_press(self.id, key)

    def send(self, text: str) -> str:
        """
        Type text and press Enter (convenience method).

        Args:
            text: Text to type

        Returns:
            Success message
        """
        return self._client.pwsh_type(self.id, text + "\n")

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
        return self._client.pwsh_screenshot(self.id, filename, return_base64)

    # ==================== Control ====================

    def break_signal(self) -> str:
        """Send Ctrl+C (break signal) to this session."""
        return self._client.pwsh_break(self.id)

    def key_toggle(self, key: str, direction: str = "down") -> str:
        """
        Hold or release a modifier key in this session.

        Args:
            key: Key name (e.g., "control", "shift", "alt", "win")
            direction: "down" to hold, "up" to release

        Returns:
            Success message
        """
        return self._client.pwsh_key_toggle(self.id, key, direction)

    def key_combo(self, modifiers: list[str], key: str) -> None:
        """
        Press a key combination with modifiers.

        Args:
            modifiers: List of modifier keys to hold
            key: The key to press

        Example:
            session.key_combo(["control", "shift"], "t")  # Ctrl+Shift+T
        """
        self._client.pwsh_key_combo(self.id, modifiers, key)

    # ==================== Window Control ====================

    def maximize(self) -> str:
        """Maximize this session's window."""
        return self.type(r"\M")

    def minimize(self) -> str:
        """Minimize this session's window."""
        return self.type(r"\m")

    def restore(self) -> str:
        """Restore this session's window."""
        return self.type(r"\r")

    def focus(self) -> str:
        """Focus this session's window."""
        return self._client.pwsh_focus(self.id)

    def activate(self) -> dict:
        """Activate this tracked PowerShell session and return its latest status."""
        return self._client.pwsh_focus(self.id)

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

    # ==================== PowerShell-Specific Methods ====================

    def run_script(self, script_path: str, parameters: Optional[dict] = None) -> dict:
        """
        Run a .ps1 script file.

        Args:
            script_path: Path to .ps1 script
            parameters: Optional parameters dict

        Returns:
            CMDExecResult
        """
        params_str = ""
        if parameters:
            params_str = " ".join(f"-{k} {v}" for k, v in parameters.items())
        return self.run(f"& '{script_path}' {params_str}")

    def pipeline(self, *commands: str, output_format: str = "text") -> dict:
        """
        Execute a pipeline of commands.

        Args:
            *commands: Variable number of commands to pipeline
            output_format: 'text' or 'json'

        Returns:
            CMDExecResult

        Example:
            session.pipeline('Get-Process', 'Where-Object CPU -gt 10', 'Select-Object Name, CPU')
        """
        pipeline = " | ".join(commands)
        return self.run(pipeline, output_format=output_format)

    def background_job(self, command: str) -> str:
        """
        Start a background job (Start-Job).

        Args:
            command: PowerShell command to run in background

        Returns:
            Success message
        """
        return self.send(f"Start-Job -ScriptBlock {{ {command} }}")

    def get_job(self, job_id: str) -> dict:
        """
        Get job information.

        Args:
            job_id: Job ID or name

        Returns:
            Job information
        """
        return self.run(f"Get-Job -Id {job_id}", output_format="json")

    def receive_job(self, job_id: str) -> dict:
        """
        Receive job output.

        Args:
            job_id: Job ID or name

        Returns:
            Job output
        """
        return self.run(f"Receive-Job -Id {job_id}", output_format="json")

    def stop_job(self, job_id: str) -> str:
        """
        Stop a background job.

        Args:
            job_id: Job ID or name

        Returns:
            Success message
        """
        return self.send(f"Stop-Job -Id {job_id}")

    # ==================== Convenience Methods ====================

    def shell(self, command: str, wait: bool = True, timeout: int = 5000, output_format: str = "text") -> dict:
        """
        Execute a shell command (convenience alias for exec).

        Args:
            command: Command to execute
            wait: Whether to wait for completion
            timeout: Wait timeout in milliseconds
            output_format: 'text' or 'json'

        Returns:
            CMDExecResult
        """
        return self.exec(command, wait=wait, timeout=timeout, output_format=output_format)

    def __enter__(self):
        """Context manager entry - returns self for chaining."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - closes the session."""
        self.close()
        return False

    def __str__(self) -> str:
        """
        Return the session ID as a string for backward compatibility.

        Returns:
            The session ID string (e.g., "pwsh_1234567890_abc123")
        """
        return self.id

    def __repr__(self) -> str:
        """String representation of the session."""
        return f"PowerShellSession(id='{self.id}')"
