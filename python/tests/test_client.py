"""
Tests for Sidofun Desktop Python client.
"""

from pathlib import Path
import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sidofun_desktop import DesktopWinClient
from sidofun_desktop.exceptions import (
    ProcessError,
    SessionNotFoundError,
)

LIVE_AUTOMATION = os.environ.get("SIDOFUN_RUN_LIVE_AUTOMATION_TESTS") == "1"
requires_live_automation = pytest.mark.skipif(
    not LIVE_AUTOMATION,
    reason="Set SIDOFUN_RUN_LIVE_AUTOMATION_TESTS=1 to run live desktop/CMD automation tests.",
)


class TestDesktopWinClient:
    """Test DesktopWinClient basic functionality."""

    def test_default_cli_resolution(self):
        """Test that the default CLI entrypoint resolves to bundled, repo JS, or repo TS."""
        cli_path = DesktopWinClient._default_cli_path()

        assert cli_path.endswith(("cli-ipc.js", "cli-ipc.ts"))
        assert os.path.exists(cli_path)

    def test_bundled_backend_root_preferred(self, monkeypatch, tmp_path):
        """Test that packaged backend assets are preferred over repo layout."""
        bundled_root = tmp_path / "sidofun_desktop" / "_vendor" / "backend"
        dist_dir = bundled_root / "dist"
        dist_dir.mkdir(parents=True)
        (dist_dir / "cli-ipc.js").write_text("// bundled\n", encoding="utf-8")

        monkeypatch.setattr(DesktopWinClient, "_bundled_backend_root", staticmethod(lambda: bundled_root))
        monkeypatch.setattr(DesktopWinClient, "_repo_root", staticmethod(lambda: Path("C:/repo-not-used")))

        assert DesktopWinClient._default_backend_root() == bundled_root
        assert DesktopWinClient._default_cli_path() == str(dist_dir / "cli-ipc.js")

    def test_default_cwd_resolution(self):
        """Test that the default cwd resolves to the active backend root."""
        cwd = DesktopWinClient._default_cwd()

        assert os.path.isdir(cwd)
        assert os.path.exists(os.path.join(cwd, "dist")) or os.path.exists(os.path.join(cwd, "src"))

    def test_repo_libnut_resolution(self):
        """Test that libnut is resolved from the repository runtime when present."""
        cli_path = DesktopWinClient._default_cli_path()
        cwd = DesktopWinClient._default_cwd()
        libnut_path = DesktopWinClient._libnut_path_for_launch(cli_path, cwd)
        assert libnut_path is not None
        assert libnut_path.endswith(os.path.join("libnut-core-build-release", "libnut.node"))
        assert os.path.exists(libnut_path)

    def test_context_manager(self):
        """Test that context manager starts and stops the process."""
        with DesktopWinClient() as client:
            assert client.is_running()
        assert not client.is_running()

    def test_manual_lifecycle(self):
        """Test manual start/stop lifecycle."""
        client = DesktopWinClient()
        assert not client.is_running()

        client.start()
        assert client.is_running()

        client.stop()
        assert not client.is_running()

    def test_screen_size(self):
        """Test getting screen size."""
        with DesktopWinClient() as client:
            size = client.screen_size()
            assert isinstance(size, dict)
            assert "width" in size
            assert "height" in size
            assert size["width"] > 0
            assert size["height"] > 0

    def test_mouse_position(self):
        """Test getting mouse position."""
        with DesktopWinClient() as client:
            pos = client.mouse_position()
            assert isinstance(pos, dict)
            assert "x" in pos
            assert "y" in pos
            assert pos["x"] >= 0
            assert pos["y"] >= 0

    @requires_live_automation
    def test_screenshot(self):
        """Test taking a screenshot."""
        with DesktopWinClient() as client:
            screenshot = client.screenshot(return_base64=False)
            assert isinstance(screenshot, dict)
            assert "filepath" in screenshot
            assert "width" in screenshot
            assert "height" in screenshot
            assert screenshot["width"] > 0
            assert screenshot["height"] > 0
            # Check file exists
            assert os.path.exists(screenshot["filepath"])

    def test_active_window(self):
        """Test getting active window."""
        with DesktopWinClient() as client:
            window = client.active_window()
            assert isinstance(window, dict)
            assert "title" in window
            assert "handle" in window
            assert "rect" in window

    def test_process_window_methods(self, monkeypatch):
        """Test process/window management helpers route to the expected IPC actions."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.list_processes() == {"ok": True}
        assert client.list_windows() == {"ok": True}
        assert client.get_window_info(12) == {"ok": True}
        assert client.show_window(12) == {"ok": True}
        assert client.hide_window(12) == {"ok": True}
        assert client.close_window(12) == {"ok": True}
        assert client.drag_window_move(12, 100, 200) == {"ok": True}
        assert client.drag_window_resize(12, 1200, 800) == {"ok": True}

        assert calls == [
            ("list_processes", None),
            ("list_windows", None),
            ("get_window_info", {"windowHandle": 12}),
            ("show_window", {"windowHandle": 12}),
            ("hide_window", {"windowHandle": 12}),
            ("close_window", {"windowHandle": 12}),
            ("drag_window_move", {"windowHandle": 12, "x": 100, "y": 200}),
            ("drag_window_resize", {"windowHandle": 12, "width": 1200, "height": 800}),
        ]

    def test_local_coder_methods(self, monkeypatch):
        """Test local coder helpers route to the expected IPC actions."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.list_local_coders() == {"ok": True}
        assert client.local_coder_status("codex") == {"ok": True}
        assert client.open_local_coder("opencode", "make hello", "C:\\hapus\\test-opencode", 1000) == {"ok": True}
        assert client.focus_local_coder("qwen") == {"ok": True}
        assert client.close_local_coder("codex") == {"ok": True}
        assert client.maximize_local_coder("codex") == {"ok": True}
        assert client.minimize_local_coder("codex") == {"ok": True}
        assert client.restore_local_coder("codex") == {"ok": True}
        assert client.move_local_coder("codex", 10, 20) == {"ok": True}
        assert client.resize_local_coder("codex", 1000, 700) == {"ok": True}
        assert client.run_local_coder("codex", "make hello", "C:\\hapus\\test-codex", 5000) == {"ok": True}

        assert calls == [
            ("local_coder_list", None),
            ("local_coder_status", {"appId": "codex"}),
            ("local_coder_open", {"appId": "opencode", "prompt": "make hello", "workingDirectory": "C:\\hapus\\test-opencode", "inputDelayMs": 1000}),
            ("local_coder_focus", {"appId": "qwen"}),
            ("local_coder_close", {"appId": "codex"}),
            ("local_coder_maximize", {"appId": "codex"}),
            ("local_coder_minimize", {"appId": "codex"}),
            ("local_coder_restore", {"appId": "codex"}),
            ("local_coder_move", {"appId": "codex", "x": 10, "y": 20}),
            ("local_coder_resize", {"appId": "codex", "width": 1000, "height": 700}),
            ("local_coder_run", {"appId": "codex", "prompt": "make hello", "workingDirectory": "C:\\hapus\\test-codex", "timeoutMs": 5000}),
        ]

    def test_clipboard_shell_and_terminal_methods(self, monkeypatch):
        """Test clipboard/shell/generic terminal helpers route to expected IPC actions."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.clipboard_read() == {"ok": True}
        assert client.clipboard_write("hello") == {"ok": True}
        assert client.clipboard_clear() == {"ok": True}
        assert client.clipboard_status() == {"ok": True}
        assert client.shell_run("Get-Location", shell="pwsh", cwd="C:\\hapus", timeout_ms=5000) == {"ok": True}
        assert client.shell_run_cmd("dir", cwd="C:\\hapus") == {"ok": True}
        assert client.shell_run_pwsh("Get-Date", timeout_ms=2000) == {"ok": True}
        assert client.terminal_spawn("cmd", "MyTerminal") == {"ok": True}
        assert client.terminal_list("pwsh") == {"ok": True}
        assert client.terminal_status("cmd", "cmd_1") == {"ok": True}
        assert client.terminal_focus("pwsh", "pwsh_1") == {"ok": True}
        assert client.terminal_type("cmd", "cmd_1", "echo hi") == {"ok": True}
        assert client.terminal_exec("pwsh", "pwsh_1", "Get-Location", wait=True, timeout=1000) == {"ok": True}
        assert client.terminal_close("cmd", "cmd_1") == {"ok": True}

        assert calls == [
            ("clipboard_read", None),
            ("clipboard_write", {"text": "hello"}),
            ("clipboard_clear", None),
            ("clipboard_status", None),
            ("shell_run", {"command": "Get-Location", "shell": "pwsh", "cwd": "C:\\hapus", "timeoutMs": 5000}),
            ("shell_run_cmd", {"command": "dir", "cwd": "C:\\hapus"}),
            ("shell_run_pwsh", {"command": "Get-Date", "timeoutMs": 2000}),
            ("terminal_spawn", {"kind": "cmd", "title": "MyTerminal"}),
            ("terminal_list", {"kind": "pwsh"}),
            ("terminal_status", {"kind": "cmd", "sessionId": "cmd_1"}),
            ("terminal_focus", {"kind": "pwsh", "sessionId": "pwsh_1"}),
            ("terminal_type", {"kind": "cmd", "sessionId": "cmd_1", "text": "echo hi"}),
            ("terminal_exec", {"kind": "pwsh", "sessionId": "pwsh_1", "command": "Get-Location", "wait": True, "timeout": 1000}),
            ("terminal_close", {"kind": "cmd", "sessionId": "cmd_1"}),
        ]

    def test_opencli_and_twitter_methods(self, monkeypatch):
        """Test OpenCLI-RS and Twitter helpers route to expected IPC actions."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.opencli_status() == {"ok": True}
        assert client.opencli_doctor(workspace="socials") == {"ok": True}
        assert client.opencli_sites() == {"ok": True}
        assert client.opencli_commands("twitter") == {"ok": True}
        assert client.opencli_run("hackernews", "top", args=["--limit", "1"], cwd="C:\\hapus", workspace="socials", owner_session_id="client_session_1", timeout_ms=1000, keep_browser_open=True, wait_after_ms=2000, maximize_browser=True) == {"ok": True}
        assert client.opencli_workspace_list() == {"ok": True}
        assert client.opencli_workspace_get("socials") == {"ok": True}
        assert client.opencli_workspace_set("socials", "C:\\hapus") == {"ok": True}
        assert client.opencli_workspace_bind_session("client_session_1", "socials") == {"ok": True}
        assert client.opencli_workspace_session("client_session_1") == {"ok": True}
        assert client.twitter_search("rust lang", limit=3, mode="latest", workspace="socials", keep_browser_open=True, maximize_browser=True) == {"ok": True}
        assert client.twitter_timeline(timeline_type="following", limit=10, maximize_browser=True) == {"ok": True}
        assert client.twitter_bookmarks(limit=5, maximize_browser=True) == {"ok": True}
        assert client.twitter_post("hello from sidofun", timeout_ms=4000, maximize_browser=True) == {"ok": True}

        assert calls == [
            ("opencli_status", None),
            ("opencli_doctor", {"workspace": "socials"}),
            ("opencli_sites", None),
            ("opencli_commands", {"site": "twitter"}),
            ("opencli_run", {"site": "hackernews", "command": "top", "args": ["--limit", "1"], "cwd": "C:\\hapus", "workspace": "socials", "ownerSessionId": "client_session_1", "timeoutMs": 1000, "keepBrowserOpen": True, "waitAfterMs": 2000, "maximizeBrowser": True}),
            ("opencli_workspace_list", None),
            ("opencli_workspace_get", {"name": "socials"}),
            ("opencli_workspace_set", {"name": "socials", "path": "C:\\hapus"}),
            ("opencli_workspace_bind_session", {"sessionId": "client_session_1", "workspace": "socials"}),
            ("opencli_workspace_session", {"sessionId": "client_session_1"}),
            ("twitter_search", {"query": "rust lang", "limit": 3, "mode": "latest", "workspace": "socials", "keepBrowserOpen": True, "maximizeBrowser": True}),
            ("twitter_timeline", {"timelineType": "following", "limit": 10, "maximizeBrowser": True}),
            ("twitter_bookmarks", {"limit": 5, "maximizeBrowser": True}),
            ("twitter_post", {"text": "hello from sidofun", "timeoutMs": 4000, "maximizeBrowser": True}),
        ]

    def test_browser_extension_methods(self, monkeypatch):
        """Test browser-extension helpers route to expected IPC actions."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.browser_extension_status() == {"ok": True}
        assert client.browser_extension_capabilities() == {"ok": True}
        assert client.browser_extension_sites() == {"ok": True}
        assert client.browser_extension_wait_provider(timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_workspace_list() == {"ok": True}
        assert client.browser_extension_workspace_get("socials") == {"ok": True}
        assert client.browser_extension_workspace_set("socials", "C:\\hapus", sites=["x.com", "chatgpt.com"]) == {"ok": True}
        assert client.browser_extension_workspace_clear("socials") == {"ok": True}
        assert client.browser_extension_session_create(workspace="socials", site="x.com", target_url="https://x.com/home", name="social-home") == {"ok": True}
        assert client.browser_extension_session_list() == {"ok": True}
        assert client.browser_extension_session_info("browserext_1") == {"ok": True}
        assert client.browser_extension_session_refresh("browserext_1") == {"ok": True}
        assert client.browser_extension_session_reconnect("browserext_1", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_session_wait_ready("browserext_1", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_session_close("browserext_1") == {"ok": True}
        assert client.browser_extension_tabs("browserext_1") == {"ok": True}
        assert client.browser_extension_navigate("browserext_1", "https://x.com/explore", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_focus_tab("browserext_1", 12345, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_snapshot("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_screenshot("browserext_1", filename="browserext-shot.png", return_base64=False, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_inspect("browserext_1", "textarea", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_inspect_all("browserext_1", "a[href]", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_links("browserext_1", limit=20, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_evaluate("browserext_1", "document.title", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_click("browserext_1", "[data-testid='SideNav_NewTweet_Button']", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_type("browserext_1", "textarea", "hello", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_press("browserext_1", "Enter", selector="textarea", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_cookies("browserext_1", target_url="https://x.com", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_read_latest("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_info("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_sidebar_state("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_toggle_sidebar("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_models("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_select_model("browserext_1", "GPT-4o", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_list_conversations("browserext_1", limit=20, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_open_conversation("browserext_1", title_query="Project", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_conversation_actions("browserext_1", title_query="Project", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_conversation_action("browserext_1", "Archive", title_query="Project", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_rename_conversation("browserext_1", "Renamed chat", title_query="Project", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_read_thread("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_current_conversation("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_export_thread("browserext_1", format="markdown", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_stop("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_continue("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_response_controls("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_previous_response("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_next_response("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_list_response_versions("browserext_1", limit=10, max_versions=6, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_select_response_version("browserext_1", 0, limit=10, max_versions=6, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_regenerate("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_edit_message("browserext_1", "Rewrite this page", role="user", offset=0, limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_read_message("browserext_1", role="assistant", offset=1, limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_send("browserext_1", "Summarize this page", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_ask("browserext_1", "What is on this page?", timeout_ms=45000) == {"ok": True}
        assert client.browser_extension_chatgpt_ask_thread("browserext_1", "What is on this page?", limit=10, timeout_ms=45000) == {"ok": True}
        assert client.browser_extension_chatgpt_rewrite_thread("browserext_1", "Rewrite this page", role="user", offset=0, limit=10, timeout_ms=45000) == {"ok": True}
        assert client.browser_extension_chatgpt_wait_response("browserext_1", baseline_text="Existing assistant reply", timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_chatgpt_wait_message("browserext_1", text="Final answer", role="assistant", limit=10, timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_chatgpt_wait_sidebar("browserext_1", open=True, timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_chatgpt_wait_model("browserext_1", "GPT-4o", timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_chatgpt_wait_conversation("browserext_1", title_query="Project", timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_chatgpt_prepare("browserext_1", ensure_sidebar_open=True, model="GPT-4o", new_chat=True, limit=10, timeout_ms=45000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_chatgpt_delete_conversation("browserext_1", title_query="Project", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_archive_conversation("browserext_1", title_query="Project", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_read_latest("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_info("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_sidebar_state("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_toggle_sidebar("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_models("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_select_model("browserext_1", "DeepSeek R1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_list_conversations("browserext_1", limit=20, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_open_conversation("browserext_1", title_query="Research", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_conversation_actions("browserext_1", title_query="Research", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_conversation_action("browserext_1", "Archive", title_query="Research", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_rename_conversation("browserext_1", "Renamed research", title_query="Research", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_read_thread("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_current_conversation("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_export_thread("browserext_1", format="markdown", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_stop("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_continue("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_response_controls("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_previous_response("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_next_response("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_list_response_versions("browserext_1", limit=10, max_versions=6, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_select_response_version("browserext_1", 0, limit=10, max_versions=6, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_regenerate("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_edit_message("browserext_1", "Rewrite this page", role="user", offset=0, limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_read_message("browserext_1", role="assistant", offset=1, limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_send("browserext_1", "Summarize this page", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_ask("browserext_1", "What is on this page?", timeout_ms=45000) == {"ok": True}
        assert client.browser_extension_deepseek_ask_thread("browserext_1", "What is on this page?", limit=10, timeout_ms=45000) == {"ok": True}
        assert client.browser_extension_deepseek_rewrite_thread("browserext_1", "Rewrite this page", role="user", offset=0, limit=10, timeout_ms=45000) == {"ok": True}
        assert client.browser_extension_deepseek_wait_response("browserext_1", baseline_text="Existing DeepSeek reply", timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_deepseek_wait_message("browserext_1", text="Final answer", role="assistant", limit=10, timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_deepseek_wait_sidebar("browserext_1", open=True, timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_deepseek_wait_model("browserext_1", "DeepSeek R1", timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_deepseek_wait_conversation("browserext_1", title_query="Research", timeout_ms=45000, interval_ms=1000, stable_reads=2) == {"ok": True}
        assert client.browser_extension_deepseek_prepare("browserext_1", ensure_sidebar_open=True, model="DeepSeek R1", new_chat=True, limit=10, timeout_ms=45000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_deepseek_delete_conversation("browserext_1", title_query="Research", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_deepseek_archive_conversation("browserext_1", title_query="Research", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_search("browserext_1", "hiring", mode="latest", limit=5, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_timeline("browserext_1", timeline_type="following", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_bookmarks("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_notifications("browserext_1", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_messages("browserext_1", limit=20, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_open_message_thread("browserext_1", "https://x.com/messages/123", limit=20, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_send_message("browserext_1", "hello from sidofun", thread="https://x.com/messages/123", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_read_thread("browserext_1", "https://x.com/user/status/123", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_post("browserext_1", "hello from sidofun", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_open_post("browserext_1", "https://x.com/user/status/123", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_profile("browserext_1", "@openai", limit=3, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_follow("browserext_1", "@openai", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_reply("browserext_1", "hello", post_url="https://x.com/user/status/123", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_like("browserext_1", post_url="https://x.com/user/status/123", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_x_repost("browserext_1", post_url="https://x.com/user/status/123", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_new_chat("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_session_events("browserext_1", limit=20, event_kind="snapshot", ok=True) == {"ok": True}
        assert client.browser_extension_clear_session_events("browserext_1") == {"ok": True}
        assert client.browser_extension_wait_url("browserext_1", "chatgpt.com/c/", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_wait_selector("browserext_1", "textarea", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_wait_no_selector("browserext_1", "[data-testid=\"stop-button\"]", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_wait_text("browserext_1", "Hiring", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_actionables("browserext_1", selector="main", limit=10, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_page_state("browserext_1", selector="main", limit=10, max_depth=3, max_children=6, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_next_actions("browserext_1", selector="main", limit=10, max_depth=3, max_children=6, timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_chatgpt_wait_idle("browserext_1", timeout_ms=45000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_deepseek_new_chat("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_network_events("browserext_1", limit=20, url_includes="/graphql", stage="response", method="GET") == {"ok": True}
        assert client.browser_extension_dom_events("browserext_1", limit=20, mutation_type="childList", text_includes="Hiring", timeout_ms=3000) == {"ok": True}
        assert client.browser_extension_deepseek_wait_idle("browserext_1", timeout_ms=45000, interval_ms=1000) == {"ok": True}
        assert client.browser_extension_clear_network_events("browserext_1", timeout_ms=5000) == {"ok": True}
        assert client.browser_extension_clear_dom_events("browserext_1", timeout_ms=5000) == {"ok": True}

        assert calls == [
            ("browser_extension_status", None),
            ("browser_extension_capabilities", None),
            ("browser_extension_sites", None),
            ("browser_extension_wait_provider", {"timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_workspace_list", None),
            ("browser_extension_workspace_get", {"name": "socials"}),
            ("browser_extension_workspace_set", {"name": "socials", "path": "C:\\hapus", "sites": ["x.com", "chatgpt.com"]}),
            ("browser_extension_workspace_clear", {"name": "socials"}),
            ("browser_extension_session_create", {"workspace": "socials", "site": "x.com", "targetUrl": "https://x.com/home", "name": "social-home"}),
            ("browser_extension_session_list", None),
            ("browser_extension_session_info", {"sessionId": "browserext_1"}),
            ("browser_extension_session_refresh", {"sessionId": "browserext_1"}),
            ("browser_extension_session_reconnect", {"sessionId": "browserext_1", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_session_wait_ready", {"sessionId": "browserext_1", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_session_close", {"sessionId": "browserext_1"}),
            ("browser_extension_tabs", {"sessionId": "browserext_1"}),
            ("browser_extension_navigate", {"sessionId": "browserext_1", "targetUrl": "https://x.com/explore", "timeoutMs": 5000}),
            ("browser_extension_focus_tab", {"sessionId": "browserext_1", "tabId": 12345, "timeoutMs": 5000}),
            ("browser_extension_snapshot", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_screenshot", {"sessionId": "browserext_1", "filename": "browserext-shot.png", "returnBase64": False, "timeoutMs": 5000}),
            ("browser_extension_inspect", {"sessionId": "browserext_1", "selector": "textarea", "timeoutMs": 5000}),
            ("browser_extension_inspect_all", {"sessionId": "browserext_1", "selector": "a[href]", "count": 10, "timeoutMs": 5000}),
            ("browser_extension_links", {"sessionId": "browserext_1", "count": 20, "timeoutMs": 5000}),
            ("browser_extension_evaluate", {"sessionId": "browserext_1", "expression": "document.title", "timeoutMs": 5000}),
            ("browser_extension_click", {"sessionId": "browserext_1", "selector": "[data-testid='SideNav_NewTweet_Button']", "timeoutMs": 5000}),
            ("browser_extension_type", {"sessionId": "browserext_1", "selector": "textarea", "text": "hello", "timeoutMs": 5000}),
            ("browser_extension_press", {"sessionId": "browserext_1", "key": "Enter", "selector": "textarea", "timeoutMs": 5000}),
            ("browser_extension_cookies", {"sessionId": "browserext_1", "targetUrl": "https://x.com", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_read_latest", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_info", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_sidebar_state", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_toggle_sidebar", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_models", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_select_model", {"sessionId": "browserext_1", "query": "GPT-4o", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_list_conversations", {"sessionId": "browserext_1", "limit": 20, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_open_conversation", {"sessionId": "browserext_1", "targetUrl": "Project", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_conversation_actions", {"sessionId": "browserext_1", "targetUrl": "Project", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_conversation_action", {"sessionId": "browserext_1", "query": "Archive", "targetUrl": "Project", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_rename_conversation", {"sessionId": "browserext_1", "text": "Renamed chat", "targetUrl": "Project", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_read_thread", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_current_conversation", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_export_thread", {"sessionId": "browserext_1", "format": "markdown", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_stop", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_continue", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_response_controls", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_previous_response", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_next_response", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_list_response_versions", {"sessionId": "browserext_1", "limit": 10, "maxVersions": 6, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_select_response_version", {"sessionId": "browserext_1", "count": 0, "limit": 10, "maxVersions": 6, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_regenerate", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_edit_message", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_read_message", {"sessionId": "browserext_1", "role": "assistant", "offset": 1, "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_send", {"sessionId": "browserext_1", "text": "Summarize this page", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_ask", {"sessionId": "browserext_1", "text": "What is on this page?", "timeoutMs": 45000}),
            ("browser_extension_chatgpt_ask_thread", {"sessionId": "browserext_1", "text": "What is on this page?", "limit": 10, "timeoutMs": 45000}),
            ("browser_extension_chatgpt_rewrite_thread", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 10, "timeoutMs": 45000}),
            ("browser_extension_chatgpt_wait_response", {"sessionId": "browserext_1", "text": "Existing assistant reply", "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_chatgpt_wait_message", {"sessionId": "browserext_1", "text": "Final answer", "role": "assistant", "limit": 10, "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_chatgpt_wait_sidebar", {"sessionId": "browserext_1", "ok": True, "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_chatgpt_wait_model", {"sessionId": "browserext_1", "query": "GPT-4o", "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_chatgpt_wait_conversation", {"sessionId": "browserext_1", "targetUrl": "Project", "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_chatgpt_prepare", {"sessionId": "browserext_1", "open": True, "query": "GPT-4o", "ok": True, "limit": 10, "timeoutMs": 45000, "intervalMs": 1000}),
            ("browser_extension_chatgpt_delete_conversation", {"sessionId": "browserext_1", "targetUrl": "Project", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_archive_conversation", {"sessionId": "browserext_1", "targetUrl": "Project", "timeoutMs": 5000}),
            ("browser_extension_deepseek_read_latest", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_info", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_sidebar_state", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_toggle_sidebar", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_models", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_select_model", {"sessionId": "browserext_1", "query": "DeepSeek R1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_list_conversations", {"sessionId": "browserext_1", "limit": 20, "timeoutMs": 5000}),
            ("browser_extension_deepseek_open_conversation", {"sessionId": "browserext_1", "targetUrl": "Research", "timeoutMs": 5000}),
            ("browser_extension_deepseek_conversation_actions", {"sessionId": "browserext_1", "targetUrl": "Research", "timeoutMs": 5000}),
            ("browser_extension_deepseek_conversation_action", {"sessionId": "browserext_1", "query": "Archive", "targetUrl": "Research", "timeoutMs": 5000}),
            ("browser_extension_deepseek_rename_conversation", {"sessionId": "browserext_1", "text": "Renamed research", "targetUrl": "Research", "timeoutMs": 5000}),
            ("browser_extension_deepseek_read_thread", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_current_conversation", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_export_thread", {"sessionId": "browserext_1", "format": "markdown", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_stop", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_continue", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_response_controls", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_previous_response", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_next_response", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_list_response_versions", {"sessionId": "browserext_1", "limit": 10, "maxVersions": 6, "timeoutMs": 5000}),
            ("browser_extension_deepseek_select_response_version", {"sessionId": "browserext_1", "count": 0, "limit": 10, "maxVersions": 6, "timeoutMs": 5000}),
            ("browser_extension_deepseek_regenerate", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_deepseek_edit_message", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_read_message", {"sessionId": "browserext_1", "role": "assistant", "offset": 1, "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_deepseek_send", {"sessionId": "browserext_1", "text": "Summarize this page", "timeoutMs": 5000}),
            ("browser_extension_deepseek_ask", {"sessionId": "browserext_1", "text": "What is on this page?", "timeoutMs": 45000}),
            ("browser_extension_deepseek_ask_thread", {"sessionId": "browserext_1", "text": "What is on this page?", "limit": 10, "timeoutMs": 45000}),
            ("browser_extension_deepseek_rewrite_thread", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 10, "timeoutMs": 45000}),
            ("browser_extension_deepseek_wait_response", {"sessionId": "browserext_1", "text": "Existing DeepSeek reply", "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_deepseek_wait_message", {"sessionId": "browserext_1", "text": "Final answer", "role": "assistant", "limit": 10, "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_deepseek_wait_sidebar", {"sessionId": "browserext_1", "ok": True, "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_deepseek_wait_model", {"sessionId": "browserext_1", "query": "DeepSeek R1", "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_deepseek_wait_conversation", {"sessionId": "browserext_1", "targetUrl": "Research", "timeoutMs": 45000, "intervalMs": 1000, "count": 2}),
            ("browser_extension_deepseek_prepare", {"sessionId": "browserext_1", "open": True, "query": "DeepSeek R1", "ok": True, "limit": 10, "timeoutMs": 45000, "intervalMs": 1000}),
            ("browser_extension_deepseek_delete_conversation", {"sessionId": "browserext_1", "targetUrl": "Research", "timeoutMs": 5000}),
            ("browser_extension_deepseek_archive_conversation", {"sessionId": "browserext_1", "targetUrl": "Research", "timeoutMs": 5000}),
            ("browser_extension_x_search", {"sessionId": "browserext_1", "query": "hiring", "mode": "latest", "limit": 5, "timeoutMs": 5000}),
            ("browser_extension_x_timeline", {"sessionId": "browserext_1", "timelineType": "following", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_x_bookmarks", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_x_notifications", {"sessionId": "browserext_1", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_x_messages", {"sessionId": "browserext_1", "limit": 20, "timeoutMs": 5000}),
            ("browser_extension_x_open_message_thread", {"sessionId": "browserext_1", "targetUrl": "https://x.com/messages/123", "limit": 20, "timeoutMs": 5000}),
            ("browser_extension_x_send_message", {"sessionId": "browserext_1", "text": "hello from sidofun", "targetUrl": "https://x.com/messages/123", "timeoutMs": 5000}),
            ("browser_extension_x_read_thread", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_x_post", {"sessionId": "browserext_1", "text": "hello from sidofun", "timeoutMs": 5000}),
            ("browser_extension_x_open_post", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123", "timeoutMs": 5000}),
            ("browser_extension_x_profile", {"sessionId": "browserext_1", "targetUrl": "@openai", "limit": 3, "timeoutMs": 5000}),
            ("browser_extension_x_follow", {"sessionId": "browserext_1", "targetUrl": "@openai", "timeoutMs": 5000}),
            ("browser_extension_x_reply", {"sessionId": "browserext_1", "text": "hello", "targetUrl": "https://x.com/user/status/123", "timeoutMs": 5000}),
            ("browser_extension_x_like", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123", "timeoutMs": 5000}),
            ("browser_extension_x_repost", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123", "timeoutMs": 5000}),
            ("browser_extension_chatgpt_new_chat", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_session_events", {"sessionId": "browserext_1", "count": 20, "kind": "snapshot", "ok": True}),
            ("browser_extension_clear_session_events", {"sessionId": "browserext_1"}),
            ("browser_extension_wait_url", {"sessionId": "browserext_1", "text": "chatgpt.com/c/", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_wait_selector", {"sessionId": "browserext_1", "selector": "textarea", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_wait_no_selector", {"sessionId": "browserext_1", "selector": "[data-testid=\"stop-button\"]", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_wait_text", {"sessionId": "browserext_1", "text": "Hiring", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_actionables", {"sessionId": "browserext_1", "selector": "main", "limit": 10, "timeoutMs": 5000}),
            ("browser_extension_page_state", {"sessionId": "browserext_1", "selector": "main", "limit": 10, "maxDepth": 3, "maxChildren": 6, "timeoutMs": 5000}),
            ("browser_extension_next_actions", {"sessionId": "browserext_1", "selector": "main", "limit": 10, "maxDepth": 3, "maxChildren": 6, "timeoutMs": 5000}),
            ("browser_extension_chatgpt_wait_idle", {"sessionId": "browserext_1", "timeoutMs": 45000, "intervalMs": 1000}),
            ("browser_extension_deepseek_new_chat", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_network_events", {"sessionId": "browserext_1", "count": 20, "targetUrl": "/graphql", "status": "response", "text": "GET"}),
            ("browser_extension_dom_events", {"sessionId": "browserext_1", "count": 20, "mutationType": "childList", "textIncludes": "Hiring", "timeoutMs": 3000}),
            ("browser_extension_deepseek_wait_idle", {"sessionId": "browserext_1", "timeoutMs": 45000, "intervalMs": 1000}),
            ("browser_extension_clear_network_events", {"sessionId": "browserext_1", "timeoutMs": 5000}),
            ("browser_extension_clear_dom_events", {"sessionId": "browserext_1", "timeoutMs": 5000}),
        ]

    def test_desktop_scope_methods(self, monkeypatch):
        """Test desktop scope helpers route to expected IPC actions."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.session_create(client_kind="operator", name="demo") == {"ok": True}
        assert client.session_list() == {"ok": True}
        assert client.session_list_idle(1000, client_kind="mcp") == {"ok": True}
        assert client.session_info("client_session_1") == {"ok": True}
        assert client.desktop_scope_create(window_handles=[12], title_query="Explorer", name="explorer", owner_session_id="client_session_1") == {"ok": True}
        assert client.desktop_scope_list() == {"ok": True}
        assert client.desktop_scope_info("desktop_scope_1") == {"ok": True}
        assert client.desktop_scope_focus("desktop_scope_1") == {"ok": True}
        assert client.desktop_scope_screenshot("desktop_scope_1", filename="scope.png") == {"ok": True}
        assert client.desktop_scope_click("desktop_scope_1", 10, 20, "right") == {"ok": True}
        assert client.desktop_scope_type("desktop_scope_1", "hello") == {"ok": True}
        assert client.desktop_scope_close("desktop_scope_1") == {"ok": True}
        assert client.session_close("client_session_1", cleanup_owned_resources=False) == {"ok": True}
        assert client.session_reap_idle(5000, client_kind="mcp", cleanup_owned_resources=False) == {"ok": True}

        assert calls == [
            ("session_create", {"clientKind": "operator", "name": "demo"}),
            ("session_list", None),
            ("session_list_idle", {"maxIdleMs": 1000, "clientKind": "mcp"}),
            ("session_info", {"sessionId": "client_session_1"}),
            ("desktop_scope_create", {"windowHandles": [12], "titleQuery": "Explorer", "name": "explorer", "ownerSessionId": "client_session_1"}),
            ("desktop_scope_list", None),
            ("desktop_scope_info", {"scopeId": "desktop_scope_1"}),
            ("desktop_scope_focus", {"scopeId": "desktop_scope_1"}),
            ("desktop_scope_screenshot", {"scopeId": "desktop_scope_1", "returnBase64": False, "filename": "scope.png"}),
            ("desktop_scope_click", {"scopeId": "desktop_scope_1", "x": 10, "y": 20, "button": "right"}),
            ("desktop_scope_type", {"scopeId": "desktop_scope_1", "text": "hello"}),
            ("desktop_scope_close", {"scopeId": "desktop_scope_1"}),
            ("session_close", {"sessionId": "client_session_1", "cleanupOwnedResources": False}),
            ("session_reap_idle", {"maxIdleMs": 5000, "cleanupOwnedResources": False, "clientKind": "mcp"}),
        ]

    def test_trace_and_trajectory_methods(self, monkeypatch):
        """Test trace/trajectory helpers route to expected IPC actions."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.trace_start(name="desktop-debug", owner_session_id="client_session_1") == {"ok": True}
        assert client.trace_list() == {"ok": True}
        assert client.trace_info("trace_1") == {"ok": True}
        assert client.trace_export("trace_1", path="C:\\hapus\\trace.json") == {"ok": True}
        assert client.trace_stop("trace_1") == {"ok": True}
        assert client.trajectory_start(name="agent-run", owner_session_id="client_session_1") == {"ok": True}
        assert client.trajectory_list() == {"ok": True}
        assert client.trajectory_info("trajectory_1") == {"ok": True}
        assert client.trajectory_export("trajectory_1", path="C:\\hapus\\trajectory.json") == {"ok": True}
        assert client.trajectory_append_turn(
            "trajectory_1",
            "turn_1",
            role="assistant",
            prompt="hi",
            response="hello",
            metadata={"source": "pytest"},
        ) == {"ok": True}
        assert client.trajectory_stop("trajectory_1") == {"ok": True}

        assert calls == [
            ("trace_start", {"name": "desktop-debug", "ownerSessionId": "client_session_1"}),
            ("trace_list", None),
            ("trace_info", {"traceId": "trace_1"}),
            ("trace_export", {"traceId": "trace_1", "path": "C:\\hapus\\trace.json"}),
            ("trace_stop", {"traceId": "trace_1"}),
            ("trajectory_start", {"name": "agent-run", "ownerSessionId": "client_session_1"}),
            ("trajectory_list", None),
            ("trajectory_info", {"trajectoryId": "trajectory_1"}),
            ("trajectory_export", {"trajectoryId": "trajectory_1", "path": "C:\\hapus\\trajectory.json"}),
            ("trajectory_append_turn", {"trajectoryId": "trajectory_1", "turnId": "turn_1", "role": "assistant", "prompt": "hi", "response": "hello", "metadata": {"source": "pytest"}}),
            ("trajectory_stop", {"trajectoryId": "trajectory_1"}),
        ]

    def test_computer_interface_families(self, monkeypatch):
        """Test grouped computer interface families call through the same client methods."""
        calls = []

        def fake_send_request(self, action, params=None):
            calls.append((action, params))
            return {"ok": True}

        monkeypatch.setattr(DesktopWinClient, "_send_request", fake_send_request)
        client = DesktopWinClient()

        assert client.computer.clipboard.read() == {"ok": True}
        assert client.computer.shell.cmd("dir", cwd="C:\\hapus") == {"ok": True}
        assert client.computer.terminal.spawn("cmd", title="Demo", owner_session_id="client_session_1") == {"ok": True}
        assert client.computer.browser_extension.status() == {"ok": True}
        assert client.computer.browser_extension.wait_provider(timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.computer.browser_extension.session_refresh("browserext_1") == {"ok": True}
        assert client.computer.browser_extension.session_reconnect("browserext_1", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.computer.browser_extension.session_wait_ready("browserext_1", timeout_ms=30000, interval_ms=1000) == {"ok": True}
        assert client.computer.browser_extension.screenshot("browserext_1", filename="browserext-shot.png", return_base64=False) == {"ok": True}
        assert client.computer.browser_extension.inspect("browserext_1", "textarea") == {"ok": True}
        assert client.computer.browser_extension.inspect_all("browserext_1", "a[href]", limit=10) == {"ok": True}
        assert client.computer.browser_extension.links("browserext_1", limit=20) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_ask("browserext_1", "What is on this page?") == {"ok": True}
        assert client.computer.browser_extension.chatgpt_ask_thread("browserext_1", "What is on this page?", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_conversations("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_sidebar_state("browserext_1") == {"ok": True}
        assert client.computer.browser_extension.chatgpt_models("browserext_1") == {"ok": True}
        assert client.computer.browser_extension.chatgpt_select_model("browserext_1", "GPT-4o") == {"ok": True}
        assert client.computer.browser_extension.chatgpt_open_conversation("browserext_1", title_query="Project") == {"ok": True}
        assert client.computer.browser_extension.chatgpt_conversation_actions("browserext_1", title_query="Project") == {"ok": True}
        assert client.computer.browser_extension.chatgpt_prepare("browserext_1", ensure_sidebar_open=True, model="GPT-4o", new_chat=True, limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_read_thread("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_current_conversation("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_export_thread("browserext_1", format="markdown", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_continue("browserext_1") == {"ok": True}
        assert client.computer.browser_extension.chatgpt_response_controls("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_previous_response("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_next_response("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_list_response_versions("browserext_1", limit=5, max_versions=4) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_select_response_version("browserext_1", 0, limit=5, max_versions=4) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_edit_message("browserext_1", "Rewrite this page", role="user", offset=0, limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_read_message("browserext_1", role="assistant", offset=1, limit=5) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_rewrite_thread("browserext_1", "Rewrite this page", role="user", offset=0, limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_ask("browserext_1", "What is on this page?") == {"ok": True}
        assert client.computer.browser_extension.deepseek_ask_thread("browserext_1", "What is on this page?", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_conversations("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_sidebar_state("browserext_1") == {"ok": True}
        assert client.computer.browser_extension.deepseek_models("browserext_1") == {"ok": True}
        assert client.computer.browser_extension.deepseek_select_model("browserext_1", "DeepSeek R1") == {"ok": True}
        assert client.computer.browser_extension.deepseek_open_conversation("browserext_1", title_query="Research") == {"ok": True}
        assert client.computer.browser_extension.deepseek_conversation_actions("browserext_1", title_query="Research") == {"ok": True}
        assert client.computer.browser_extension.deepseek_prepare("browserext_1", ensure_sidebar_open=True, model="DeepSeek R1", new_chat=True, limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_read_thread("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_current_conversation("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_export_thread("browserext_1", format="markdown", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_continue("browserext_1") == {"ok": True}
        assert client.computer.browser_extension.deepseek_response_controls("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_previous_response("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_next_response("browserext_1", limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_list_response_versions("browserext_1", limit=5, max_versions=4) == {"ok": True}
        assert client.computer.browser_extension.deepseek_select_response_version("browserext_1", 0, limit=5, max_versions=4) == {"ok": True}
        assert client.computer.browser_extension.deepseek_edit_message("browserext_1", "Rewrite this page", role="user", offset=0, limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_read_message("browserext_1", role="assistant", offset=1, limit=5) == {"ok": True}
        assert client.computer.browser_extension.deepseek_rewrite_thread("browserext_1", "Rewrite this page", role="user", offset=0, limit=5) == {"ok": True}
        assert client.computer.browser_extension.x_search("browserext_1", "hiring", mode="latest", limit=5) == {"ok": True}
        assert client.computer.browser_extension.x_notifications("browserext_1", limit=10) == {"ok": True}
        assert client.computer.browser_extension.x_messages("browserext_1", limit=20) == {"ok": True}
        assert client.computer.browser_extension.x_open_message_thread("browserext_1", "https://x.com/messages/123", limit=20) == {"ok": True}
        assert client.computer.browser_extension.x_send_message("browserext_1", "hello from sidofun", thread="https://x.com/messages/123") == {"ok": True}
        assert client.computer.browser_extension.x_read_thread("browserext_1", "https://x.com/user/status/123", limit=10) == {"ok": True}
        assert client.computer.browser_extension.x_open_post("browserext_1", "https://x.com/user/status/123") == {"ok": True}
        assert client.computer.browser_extension.x_profile("browserext_1", "@openai", limit=3) == {"ok": True}
        assert client.computer.browser_extension.x_follow("browserext_1", "@openai") == {"ok": True}
        assert client.computer.browser_extension.x_reply("browserext_1", "hello", post_url="https://x.com/user/status/123") == {"ok": True}
        assert client.computer.browser_extension.x_like("browserext_1", post_url="https://x.com/user/status/123") == {"ok": True}
        assert client.computer.browser_extension.x_repost("browserext_1", post_url="https://x.com/user/status/123") == {"ok": True}
        assert client.computer.browser_extension.session_events("browserext_1", limit=10) == {"ok": True}
        assert client.computer.browser_extension.wait_url("browserext_1", "chatgpt.com/c/") == {"ok": True}
        assert client.computer.browser_extension.wait_selector("browserext_1", "textarea") == {"ok": True}
        assert client.computer.browser_extension.wait_no_selector("browserext_1", "[data-testid=\"stop-button\"]") == {"ok": True}
        assert client.computer.browser_extension.wait_text("browserext_1", "Hiring") == {"ok": True}
        assert client.computer.browser_extension.actionables("browserext_1", selector="main", limit=10) == {"ok": True}
        assert client.computer.browser_extension.page_state("browserext_1", selector="main", limit=10, max_depth=3, max_children=6) == {"ok": True}
        assert client.computer.browser_extension.next_actions("browserext_1", selector="main", limit=10, max_depth=3, max_children=6) == {"ok": True}
        assert client.computer.browser_extension.chatgpt_wait_message("browserext_1", text="Final answer", role="assistant", limit=5) == {"ok": True}
        assert client.computer.browser_extension.network_events("browserext_1", limit=10) == {"ok": True}
        assert client.computer.browser_extension.dom_events("browserext_1", limit=10, mutation_type="childList") == {"ok": True}
        assert client.computer.browser_extension.deepseek_wait_message("browserext_1", text="Final answer", role="assistant", limit=5) == {"ok": True}
        assert client.computer.opencli.status() == {"ok": True}
        assert client.computer.opencli.workspace_set("socials", "C:\\hapus") == {"ok": True}
        assert client.computer.twitter.search("rust lang", limit=2, mode="latest", workspace="socials", maximize_browser=True) == {"ok": True}
        assert client.computer.telemetry.trace.start(name="desktop-debug", owner_session_id="client_session_1") == {"ok": True}
        assert client.computer.window.drag_resize(12, 800, 600) == {"ok": True}

        assert calls == [
            ("clipboard_read", None),
            ("shell_run_cmd", {"command": "dir", "cwd": "C:\\hapus"}),
            ("terminal_spawn", {"kind": "cmd", "title": "Demo", "ownerSessionId": "client_session_1"}),
            ("browser_extension_status", None),
            ("browser_extension_wait_provider", {"timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_session_refresh", {"sessionId": "browserext_1"}),
            ("browser_extension_session_reconnect", {"sessionId": "browserext_1", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_session_wait_ready", {"sessionId": "browserext_1", "timeoutMs": 30000, "intervalMs": 1000}),
            ("browser_extension_screenshot", {"sessionId": "browserext_1", "filename": "browserext-shot.png", "returnBase64": False}),
            ("browser_extension_inspect", {"sessionId": "browserext_1", "selector": "textarea"}),
            ("browser_extension_inspect_all", {"sessionId": "browserext_1", "selector": "a[href]", "count": 10}),
            ("browser_extension_links", {"sessionId": "browserext_1", "count": 20}),
            ("browser_extension_chatgpt_ask", {"sessionId": "browserext_1", "text": "What is on this page?"}),
            ("browser_extension_chatgpt_ask_thread", {"sessionId": "browserext_1", "text": "What is on this page?", "limit": 5}),
            ("browser_extension_chatgpt_list_conversations", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_chatgpt_sidebar_state", {"sessionId": "browserext_1"}),
            ("browser_extension_chatgpt_models", {"sessionId": "browserext_1"}),
            ("browser_extension_chatgpt_select_model", {"sessionId": "browserext_1", "query": "GPT-4o"}),
            ("browser_extension_chatgpt_open_conversation", {"sessionId": "browserext_1", "targetUrl": "Project"}),
            ("browser_extension_chatgpt_conversation_actions", {"sessionId": "browserext_1", "targetUrl": "Project"}),
            ("browser_extension_chatgpt_prepare", {"sessionId": "browserext_1", "open": True, "query": "GPT-4o", "ok": True, "limit": 5}),
            ("browser_extension_chatgpt_read_thread", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_chatgpt_current_conversation", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_chatgpt_export_thread", {"sessionId": "browserext_1", "format": "markdown", "limit": 5}),
            ("browser_extension_chatgpt_continue", {"sessionId": "browserext_1"}),
            ("browser_extension_chatgpt_response_controls", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_chatgpt_previous_response", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_chatgpt_next_response", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_chatgpt_list_response_versions", {"sessionId": "browserext_1", "limit": 5, "maxVersions": 4}),
            ("browser_extension_chatgpt_select_response_version", {"sessionId": "browserext_1", "count": 0, "limit": 5, "maxVersions": 4}),
            ("browser_extension_chatgpt_edit_message", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 5}),
            ("browser_extension_chatgpt_read_message", {"sessionId": "browserext_1", "role": "assistant", "offset": 1, "limit": 5}),
            ("browser_extension_chatgpt_rewrite_thread", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 5}),
            ("browser_extension_deepseek_ask", {"sessionId": "browserext_1", "text": "What is on this page?"}),
            ("browser_extension_deepseek_ask_thread", {"sessionId": "browserext_1", "text": "What is on this page?", "limit": 5}),
            ("browser_extension_deepseek_list_conversations", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_deepseek_sidebar_state", {"sessionId": "browserext_1"}),
            ("browser_extension_deepseek_models", {"sessionId": "browserext_1"}),
            ("browser_extension_deepseek_select_model", {"sessionId": "browserext_1", "query": "DeepSeek R1"}),
            ("browser_extension_deepseek_open_conversation", {"sessionId": "browserext_1", "targetUrl": "Research"}),
            ("browser_extension_deepseek_conversation_actions", {"sessionId": "browserext_1", "targetUrl": "Research"}),
            ("browser_extension_deepseek_prepare", {"sessionId": "browserext_1", "open": True, "query": "DeepSeek R1", "ok": True, "limit": 5}),
            ("browser_extension_deepseek_read_thread", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_deepseek_current_conversation", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_deepseek_export_thread", {"sessionId": "browserext_1", "format": "markdown", "limit": 5}),
            ("browser_extension_deepseek_continue", {"sessionId": "browserext_1"}),
            ("browser_extension_deepseek_response_controls", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_deepseek_previous_response", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_deepseek_next_response", {"sessionId": "browserext_1", "limit": 5}),
            ("browser_extension_deepseek_list_response_versions", {"sessionId": "browserext_1", "limit": 5, "maxVersions": 4}),
            ("browser_extension_deepseek_select_response_version", {"sessionId": "browserext_1", "count": 0, "limit": 5, "maxVersions": 4}),
            ("browser_extension_deepseek_edit_message", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 5}),
            ("browser_extension_deepseek_read_message", {"sessionId": "browserext_1", "role": "assistant", "offset": 1, "limit": 5}),
            ("browser_extension_deepseek_rewrite_thread", {"sessionId": "browserext_1", "text": "Rewrite this page", "role": "user", "offset": 0, "limit": 5}),
            ("browser_extension_x_search", {"sessionId": "browserext_1", "query": "hiring", "mode": "latest", "limit": 5}),
            ("browser_extension_x_notifications", {"sessionId": "browserext_1", "limit": 10}),
            ("browser_extension_x_messages", {"sessionId": "browserext_1", "limit": 20}),
            ("browser_extension_x_open_message_thread", {"sessionId": "browserext_1", "targetUrl": "https://x.com/messages/123", "limit": 20}),
            ("browser_extension_x_send_message", {"sessionId": "browserext_1", "text": "hello from sidofun", "targetUrl": "https://x.com/messages/123"}),
            ("browser_extension_x_read_thread", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123", "limit": 10}),
            ("browser_extension_x_open_post", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123"}),
            ("browser_extension_x_profile", {"sessionId": "browserext_1", "targetUrl": "@openai", "limit": 3}),
            ("browser_extension_x_follow", {"sessionId": "browserext_1", "targetUrl": "@openai"}),
            ("browser_extension_x_reply", {"sessionId": "browserext_1", "text": "hello", "targetUrl": "https://x.com/user/status/123"}),
            ("browser_extension_x_like", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123"}),
            ("browser_extension_x_repost", {"sessionId": "browserext_1", "targetUrl": "https://x.com/user/status/123"}),
            ("browser_extension_session_events", {"sessionId": "browserext_1", "count": 10}),
            ("browser_extension_wait_url", {"sessionId": "browserext_1", "text": "chatgpt.com/c/"}),
            ("browser_extension_wait_selector", {"sessionId": "browserext_1", "selector": "textarea"}),
            ("browser_extension_wait_no_selector", {"sessionId": "browserext_1", "selector": "[data-testid=\"stop-button\"]"}),
            ("browser_extension_wait_text", {"sessionId": "browserext_1", "text": "Hiring"}),
            ("browser_extension_actionables", {"sessionId": "browserext_1", "selector": "main", "limit": 10}),
            ("browser_extension_page_state", {"sessionId": "browserext_1", "selector": "main", "limit": 10, "maxDepth": 3, "maxChildren": 6}),
            ("browser_extension_next_actions", {"sessionId": "browserext_1", "selector": "main", "limit": 10, "maxDepth": 3, "maxChildren": 6}),
            ("browser_extension_chatgpt_wait_message", {"sessionId": "browserext_1", "text": "Final answer", "role": "assistant", "limit": 5}),
            ("browser_extension_network_events", {"sessionId": "browserext_1", "count": 10}),
            ("browser_extension_dom_events", {"sessionId": "browserext_1", "count": 10, "mutationType": "childList"}),
            ("browser_extension_deepseek_wait_message", {"sessionId": "browserext_1", "text": "Final answer", "role": "assistant", "limit": 5}),
            ("opencli_status", None),
            ("opencli_workspace_set", {"name": "socials", "path": "C:\\hapus"}),
            ("twitter_search", {"query": "rust lang", "limit": 2, "mode": "latest", "workspace": "socials", "maximizeBrowser": True}),
            ("trace_start", {"name": "desktop-debug", "ownerSessionId": "client_session_1"}),
            ("drag_window_resize", {"windowHandle": 12, "width": 800, "height": 600}),
        ]

class TestCMDActions:
    """Test CMD automation functionality."""

    @requires_live_automation
    def test_cmd_spawn(self):
        """Test spawning a CMD window."""
        with DesktopWinClient() as client:
            session = client.cmd_spawn("TestSession")
            assert str(session).startswith("cmd_")

    @requires_live_automation
    def test_cmd_list(self):
        """Test listing CMD sessions."""
        with DesktopWinClient() as client:
            # Spawn a session first
            client.cmd_spawn("TestSession")

            # List sessions
            sessions = client.cmd_list()
            assert isinstance(sessions, dict)
            assert "sessions" in sessions
            assert "count" in sessions
            assert sessions["count"] >= 1

    @requires_live_automation
    def test_cmd_type_and_press(self):
        """Test typing and key press in CMD."""
        with DesktopWinClient() as client:
            session = client.cmd_spawn("TestSession")

            # Type text
            result = client.cmd_type(session, r"echo hello\n")
            assert isinstance(result, dict)
            assert "message" in result
            assert "Typed" in result["message"]

            # Press Enter
            result = client.cmd_press(session, "enter")
            assert isinstance(result, str)
            assert "Pressed key" in result

    @requires_live_automation
    def test_cmd_info(self):
        """Test getting CMD session info."""
        with DesktopWinClient() as client:
            session = client.cmd_spawn("TestSession")

            info = client.cmd_info(session)
            assert isinstance(info, dict)
            assert info["id"] == str(session)
            assert "title" in info
            assert "handle" in info

    @requires_live_automation
    def test_cmd_screenshot(self):
        """Test taking screenshot of CMD window."""
        with DesktopWinClient() as client:
            session = client.cmd_spawn("TestSession")

            screenshot = client.cmd_screenshot(session, return_base64=False)
            assert isinstance(screenshot, dict)
            assert "filepath" in screenshot
            assert "width" in screenshot
            assert "height" in screenshot

    @requires_live_automation
    def test_cmd_close(self):
        """Test closing CMD session."""
        with DesktopWinClient() as client:
            session = client.cmd_spawn("TestSession")

            # Close session
            result = client.cmd_close(session)
            assert isinstance(result, dict)
            assert result["message"] == "Session closed"

            # Session should no longer exist
            with pytest.raises(SessionNotFoundError):
                client.cmd_info(session)


class TestEscapeSequences:
    """Test escape sequence support."""

    @requires_live_automation
    def test_newline(self):
        """Test \\n escape sequence (Enter)."""
        with DesktopWinClient() as client:
            session_id = client.cmd_spawn("TestSession")
            result = client.cmd_type(session_id, r"echo test\n")
            assert "Typed" in result["message"]

    @requires_live_automation
    def test_delay(self):
        """Test \\dN escape sequence (delay)."""
        with DesktopWinClient() as client:
            session_id = client.cmd_spawn("TestSession")
            result = client.cmd_type(session_id, r"echo test\d500")
            assert "Typed" in result["message"]

    @requires_live_automation
    def test_window_control(self):
        """Test window control escape sequences (\\M, \\m, \\r, \\f)."""
        with DesktopWinClient() as client:
            session_id = client.cmd_spawn("TestSession")
            # Maximize, minimize, restore
            client.cmd_type(session_id, r"echo test\M\d1000\m\d1000\r")
            # Should not raise


class TestIndexAliases:
    """Test index-based session aliases."""

    @requires_live_automation
    def test_index_alias(self):
        """Test using numeric index instead of session ID."""
        with DesktopWinClient() as client:
            client.cmd_spawn("TestSession1")
            client.cmd_spawn("TestSession2")

            # Use index 1 (first session)
            info = client.cmd_info(1)
            assert "id" in info

            # Use index 2 (second session)
            info = client.cmd_info(2)
            assert "id" in info

    @requires_live_automation
    def test_index_out_of_range(self):
        """Test index out of range error."""
        with DesktopWinClient() as client:
            client.cmd_spawn("TestSession")

            # Index 10 should not exist
            with pytest.raises(SessionNotFoundError):
                client.cmd_info(10)


class TestErrors:
    """Test error handling."""

    def test_session_not_found(self):
        """Test SessionNotFoundError."""
        with DesktopWinClient() as client:
            with pytest.raises(SessionNotFoundError):
                client.cmd_type("nonexistent_session", "test")

    def test_invalid_params(self):
        """Test invalid parameters."""
        client = DesktopWinClient()
        with pytest.raises(ProcessError):
            client.screen_size()


class TestDesktopActions:
    """Test desktop action methods."""

    @requires_live_automation
    def test_move_mouse(self):
        """Test moving mouse."""
        with DesktopWinClient() as client:
            result = client.move_mouse(100, 100)
            assert isinstance(result, str)

    @requires_live_automation
    def test_click(self):
        """Test clicking."""
        with DesktopWinClient() as client:
            result = client.click(200, 200)
            assert isinstance(result, str)

    @requires_live_automation
    def test_type(self):
        """Test typing text."""
        with DesktopWinClient() as client:
            result = client.type("test")
            assert isinstance(result, str)


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
