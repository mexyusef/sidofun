"""
Tests for terminal status helpers.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinClient
from sidofun_desktop.pwsh_session import PowerShellSession


class StubDesktopWinClient(DesktopWinClient):
    def __init__(self):
        super().__init__(cli_path="stub", cwd="stub")
        self.calls = []

    def _send_request(self, action: str, params=None):
        self.calls.append((action, params or {}))
        if action == "cmd_find":
            return {
                "sessions": [
                    {
                        "id": "cmd_1",
                        "title": "Sidofun_Tab",
                        "tabTitle": "Sidofun_Tab",
                        "handle": 101,
                        "currentDirectory": "C:\\",
                        "commandCount": 1,
                        "age": 50,
                        "lastActivity": "2026-03-28T11:00:00Z",
                        "rect": {"x": 10, "y": 20, "width": 800, "height": 600},
                        "terminalKind": "windows_terminal",
                        "hostProcessName": "WindowsTerminal",
                        "hostPid": 999,
                        "hostExecutablePath": "C:\\WindowsTerminal.exe",
                        "hostWindowTitle": "Sidofun_Tab",
                    }
                ],
                "count": 1,
            }
        if action == "cmd_tabs":
            return self._send_request("cmd_find", {"titleQuery": "sidofun"})
        if action == "cmd_focus":
            return {
                "session": {
                    "id": params["sessionId"],
                    "title": "Sidofun_Tab",
                    "tabTitle": "Sidofun_Tab",
                    "handle": 101,
                    "currentDirectory": "C:\\",
                    "commandCount": 1,
                    "age": 50,
                    "lastActivity": "2026-03-28T11:00:00Z",
                    "rect": {"x": 10, "y": 20, "width": 800, "height": 600},
                    "terminalKind": "windows_terminal",
                    "hostProcessName": "WindowsTerminal",
                    "hostPid": 999,
                    "hostExecutablePath": "C:\\WindowsTerminal.exe",
                    "hostWindowTitle": "Sidofun_Tab",
                },
                "message": f"Focused session: {params['sessionId']}",
            }
        if action == "cmd_activate_by_title":
            return {
                "session": {
                    "id": "cmd_1",
                    "title": "Sidofun_Tab",
                    "tabTitle": "Sidofun_Tab",
                    "handle": 101,
                    "currentDirectory": "C:\\",
                    "commandCount": 1,
                    "age": 50,
                    "lastActivity": "2026-03-28T11:00:00Z",
                    "rect": {"x": 10, "y": 20, "width": 800, "height": 600},
                    "terminalKind": "windows_terminal",
                    "hostProcessName": "WindowsTerminal",
                    "hostPid": 999,
                    "hostExecutablePath": "C:\\WindowsTerminal.exe",
                    "hostWindowTitle": "Sidofun_Tab",
                },
                "message": "Activated session by title: cmd_1",
            }
        if action == "cmd_status":
            return {
                "session": {
                    "id": params["sessionId"],
                    "title": "Sidofun_Tab",
                    "tabTitle": "Sidofun_Tab",
                    "handle": 101,
                    "currentDirectory": "C:\\",
                    "commandCount": 1,
                    "age": 50,
                    "lastActivity": "2026-03-28T11:00:00Z",
                    "rect": {"x": 10, "y": 20, "width": 800, "height": 600},
                    "terminalKind": "windows_terminal",
                    "hostProcessName": "WindowsTerminal",
                    "hostPid": 999,
                    "hostExecutablePath": "C:\\WindowsTerminal.exe",
                    "hostWindowTitle": "Sidofun_Tab",
                },
                "screenshot": (
                    {
                        "filepath": "terminal.png",
                        "width": 800,
                        "height": 600,
                        "format": "png",
                    }
                    if params.get("screenshot")
                    else None
                ),
            }
        if action == "pwsh_status":
            return {
                "session": {
                    "id": params["sessionId"],
                    "title": "Sidofun_PS_Tab",
                    "tabTitle": "Sidofun_PS_Tab",
                    "handle": 202,
                    "currentDirectory": "C:\\",
                    "commandCount": 0,
                    "age": 20,
                    "lastActivity": "2026-03-28T11:00:00Z",
                    "rect": {"x": 30, "y": 40, "width": 900, "height": 700},
                    "terminalKind": "windows_terminal",
                    "hostProcessName": "WindowsTerminal",
                    "hostPid": 1001,
                    "hostExecutablePath": "C:\\WindowsTerminal.exe",
                    "hostWindowTitle": "Sidofun_PS_Tab",
                },
                "screenshot": None,
            }
        if action == "pwsh_tabs":
            return self._send_request("pwsh_find", {"titleQuery": "ps_tab"})
        if action == "pwsh_find":
            return {
                "sessions": [
                    {
                        "id": "pwsh_1",
                        "title": "Sidofun_PS_Tab",
                        "tabTitle": "Sidofun_PS_Tab",
                        "handle": 202,
                        "currentDirectory": "C:\\",
                        "commandCount": 0,
                        "age": 20,
                        "lastActivity": "2026-03-28T11:00:00Z",
                        "rect": {"x": 30, "y": 40, "width": 900, "height": 700},
                        "terminalKind": "windows_terminal",
                        "hostProcessName": "WindowsTerminal",
                        "hostPid": 1001,
                        "hostExecutablePath": "C:\\WindowsTerminal.exe",
                        "hostWindowTitle": "Sidofun_PS_Tab",
                    }
                ],
                "count": 1,
            }
        if action == "pwsh_focus":
            return {
                "session": {
                    "id": params["sessionId"],
                    "title": "Sidofun_PS_Tab",
                    "tabTitle": "Sidofun_PS_Tab",
                    "handle": 202,
                    "currentDirectory": "C:\\",
                    "commandCount": 0,
                    "age": 20,
                    "lastActivity": "2026-03-28T11:00:00Z",
                    "rect": {"x": 30, "y": 40, "width": 900, "height": 700},
                    "terminalKind": "windows_terminal",
                    "hostProcessName": "WindowsTerminal",
                    "hostPid": 1001,
                    "hostExecutablePath": "C:\\WindowsTerminal.exe",
                    "hostWindowTitle": "Sidofun_PS_Tab",
                },
                "message": f"Focused session: {params['sessionId']}",
            }
        if action == "pwsh_activate_by_title":
            return {
                "session": {
                    "id": "pwsh_1",
                    "title": "Sidofun_PS_Tab",
                    "tabTitle": "Sidofun_PS_Tab",
                    "handle": 202,
                    "currentDirectory": "C:\\",
                    "commandCount": 0,
                    "age": 20,
                    "lastActivity": "2026-03-28T11:00:00Z",
                    "rect": {"x": 30, "y": 40, "width": 900, "height": 700},
                    "terminalKind": "windows_terminal",
                    "hostProcessName": "WindowsTerminal",
                    "hostPid": 1001,
                    "hostExecutablePath": "C:\\WindowsTerminal.exe",
                    "hostWindowTitle": "Sidofun_PS_Tab",
                },
                "message": "Activated session by title: pwsh_1",
            }
        raise AssertionError(f"Unexpected action: {action}")


class TestTerminalStatusHelpers:
    def test_cmd_status_from_client(self):
        client = StubDesktopWinClient()
        result = client.cmd_status("cmd_1", screenshot=True, filename="terminal.png")

        assert result["session"]["terminalKind"] == "windows_terminal"
        assert result["session"]["tabTitle"] == "Sidofun_Tab"
        assert result["screenshot"]["filepath"] == "terminal.png"
        assert client.calls[-1] == (
            "cmd_status",
            {
                "sessionId": "cmd_1",
                "screenshot": True,
                "filename": "terminal.png",
                "returnBase64": False,
            },
        )

    def test_cmd_session_status_helper(self):
        client = StubDesktopWinClient()
        from sidofun_desktop.session import CMDSession

        helper = CMDSession(client, "cmd_2")
        result = helper.status()

        assert result["session"]["id"] == "cmd_2"
        assert result["session"]["rect"]["width"] == 800

    def test_pwsh_status_from_client_and_helper(self):
        client = StubDesktopWinClient()
        result = client.pwsh_status("pwsh_1")
        helper = PowerShellSession(client, "pwsh_2")
        helper_result = helper.status()

        assert result["session"]["terminalKind"] == "windows_terminal"
        assert helper_result["session"]["id"] == "pwsh_2"

    def test_find_terminal_sessions_by_title(self):
        client = StubDesktopWinClient()
        cmd_result = client.cmd_find_by_title("sidofun")
        pwsh_result = client.pwsh_find_by_title("ps_tab")

        assert cmd_result["count"] == 1
        assert cmd_result["sessions"][0]["tabTitle"] == "Sidofun_Tab"
        assert pwsh_result["count"] == 1
        assert pwsh_result["sessions"][0]["tabTitle"] == "Sidofun_PS_Tab"

    def test_tabs_and_activation_helpers(self):
        client = StubDesktopWinClient()
        from sidofun_desktop.session import CMDSession

        cmd_tabs = client.cmd_tabs()
        cmd_focus = client.cmd_focus("cmd_9")
        cmd_activate = client.cmd_activate_by_title("sidofun")
        helper_focus = CMDSession(client, "cmd_10").activate()

        assert cmd_tabs["count"] == 1
        assert cmd_focus["session"]["id"] == "cmd_9"
        assert cmd_activate["session"]["id"] == "cmd_1"
        assert helper_focus["session"]["id"] == "cmd_10"

    def test_pwsh_tabs_and_activation_helpers(self):
        client = StubDesktopWinClient()

        pwsh_tabs = client.pwsh_tabs()
        pwsh_focus = client.pwsh_focus("pwsh_9")
        pwsh_activate = client.pwsh_activate_by_title("ps_tab")
        helper_focus = PowerShellSession(client, "pwsh_10").activate()

        assert pwsh_tabs["count"] == 1
        assert pwsh_focus["session"]["id"] == "pwsh_9"
        assert pwsh_activate["session"]["id"] == "pwsh_1"
        assert helper_focus["session"]["id"] == "pwsh_10"
