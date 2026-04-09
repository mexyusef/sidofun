from __future__ import annotations

from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from . import DesktopWinClient


class ScreenInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def size(self):
        return self._client.screen_size()

    def mouse_position(self):
        return self._client.mouse_position()

    def active_window(self):
        return self._client.active_window()

    def screenshot(self, format: str = "png", filename: str | None = None, return_base64: bool = True):
        return self._client.screenshot(format=format, filename=filename, return_base64=return_base64)

    def screenshot_win32(self, filename: str | None = None, return_base64: bool = False):
        return self._client.screenshot_win32(filename=filename, return_base64=return_base64)


class MouseInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def move(self, x: int, y: int):
        return self._client.move_mouse(x, y)

    def click(self, x: int, y: int, button: str = "left"):
        return self._client.click(x, y, button)

    def drag(self, path: list[dict[str, int]], button: str = "left"):
        return self._client.drag_mouse(path, button)

    def scroll(self, direction: str = "up", count: int = 1):
        return self._client.scroll(direction, count)


class KeyboardInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def type(self, text: str):
        return self._client.type(text)

    def press(self, key: str):
        return self._client.key_press(key)

    def toggle(self, key: str, direction: str = "down"):
        return self._client.key_toggle(key, direction)

    def delayed(self, text: str, cpm: int = 600):
        return self._client.type_delayed(text, cpm)


class ClipboardInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def read(self):
        return self._client.clipboard_read()

    def write(self, text: str):
        return self._client.clipboard_write(text)

    def clear(self):
        return self._client.clipboard_clear()

    def status(self):
        return self._client.clipboard_status()


class WindowInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def list(self):
        return self._client.list_windows()

    def info(self, window_handle: int):
        return self._client.get_window_info(window_handle)

    def focus(self, window_title: str | None = None, process_name: str | None = None):
        return self._client.focus_window(window_title=window_title, process_name=process_name)

    def move(self, window_handle: int, x: int, y: int):
        return self._client.move_window(window_handle, x, y)

    def resize(self, window_handle: int, width: int, height: int):
        return self._client.resize_window(window_handle, width, height)

    def show(self, window_handle: int):
        return self._client.show_window(window_handle)

    def hide(self, window_handle: int):
        return self._client.hide_window(window_handle)

    def maximize(self, window_handle: int):
        return self._client.maximize_window(window_handle)

    def minimize(self, window_handle: int):
        return self._client.minimize_window(window_handle)

    def restore(self, window_handle: int):
        return self._client.restore_window(window_handle)

    def close(self, window_handle: int):
        return self._client.close_window(window_handle)

    def drag_move(self, window_handle: int, x: int, y: int):
        return self._client.drag_window_move(window_handle, x, y)

    def drag_resize(self, window_handle: int, width: int, height: int):
        return self._client.drag_window_resize(window_handle, width, height)


class ProcessInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def list(self):
        return self._client.list_processes()


class ShellInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def run(self, command: str, shell: str = "pwsh", cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None):
        return self._client.shell_run(command, shell=shell, cwd=cwd, timeout_ms=timeout_ms, env=env)

    def cmd(self, command: str, cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None):
        return self._client.shell_run_cmd(command, cwd=cwd, timeout_ms=timeout_ms, env=env)

    def pwsh(self, command: str, cwd: str | None = None, timeout_ms: int | None = None, env: dict[str, str] | None = None):
        return self._client.shell_run_pwsh(command, cwd=cwd, timeout_ms=timeout_ms, env=env)


class TerminalInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def spawn(self, kind: str, title: str | None = None, owner_session_id: str | None = None):
        return self._client.terminal_spawn(kind, title, owner_session_id=owner_session_id)

    def list(self, kind: str | None = None):
        return self._client.terminal_list(kind)

    def status(self, kind: str, session_id: str):
        return self._client.terminal_status(kind, session_id)

    def focus(self, kind: str, session_id: str):
        return self._client.terminal_focus(kind, session_id)

    def type(self, kind: str, session_id: str, text: str):
        return self._client.terminal_type(kind, session_id, text)

    def exec(self, kind: str, session_id: str, command: str, wait: bool = False, timeout: int | None = None):
        return self._client.terminal_exec(kind, session_id, command, wait=wait, timeout=timeout)

    def close(self, kind: str, session_id: str):
        return self._client.terminal_close(kind, session_id)


class BrowserInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def list(self):
        return self._client.list_browsers()

    def info(self, browser: str):
        return self._client.browser_info(browser)

    def profiles(self, browser: str):
        return self._client.browser_profiles(browser)

    def launch(self, browser: str, **kwargs: Any):
        return self._client.launch_browser(browser, **kwargs)

    def runtime_create(self, browser: str, **kwargs: Any):
        return self._client.create_browser_runtime(browser, **kwargs)

    def runtime_list(self):
        return self._client.list_browser_runtimes()

    def page_list(self, runtime_id: str | None = None):
        return self._client.list_browser_pages(runtime_id)


class BrowserExtensionInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def status(self):
        return self._client.browser_extension_status()

    def capabilities(self):
        return self._client.browser_extension_capabilities()

    def sites(self):
        return self._client.browser_extension_sites()

    def wait_provider(self, timeout_ms: int | None = None, interval_ms: int | None = None):
        return self._client.browser_extension_wait_provider(timeout_ms=timeout_ms, interval_ms=interval_ms)

    def workspace_list(self):
        return self._client.browser_extension_workspace_list()

    def workspace_get(self, name: str):
        return self._client.browser_extension_workspace_get(name)

    def workspace_set(self, name: str, path: str, sites: list[str] | None = None):
        return self._client.browser_extension_workspace_set(name, path, sites=sites)

    def workspace_clear(self, name: str):
        return self._client.browser_extension_workspace_clear(name)

    def session_create(self, workspace: str | None = None, site: str | None = None, target_url: str | None = None, name: str | None = None):
        return self._client.browser_extension_session_create(workspace=workspace, site=site, target_url=target_url, name=name)

    def session_list(self):
        return self._client.browser_extension_session_list()

    def session_info(self, session_id: str):
        return self._client.browser_extension_session_info(session_id)

    def session_refresh(self, session_id: str):
        return self._client.browser_extension_session_refresh(session_id)

    def session_reconnect(self, session_id: str, timeout_ms: int | None = None, interval_ms: int | None = None):
        return self._client.browser_extension_session_reconnect(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    def session_wait_ready(self, session_id: str, timeout_ms: int | None = None, interval_ms: int | None = None):
        return self._client.browser_extension_session_wait_ready(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    def session_close(self, session_id: str):
        return self._client.browser_extension_session_close(session_id)

    def tabs(self, session_id: str):
        return self._client.browser_extension_tabs(session_id)

    def navigate(self, session_id: str, target_url: str, timeout_ms: int | None = None):
        return self._client.browser_extension_navigate(session_id, target_url, timeout_ms=timeout_ms)

    def focus_tab(self, session_id: str, tab_id: int, timeout_ms: int | None = None):
        return self._client.browser_extension_focus_tab(session_id, tab_id, timeout_ms=timeout_ms)

    def snapshot(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_snapshot(session_id, timeout_ms=timeout_ms)

    def actionables(
        self,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_actionables(
            session_id,
            selector=selector,
            frame_selectors=frame_selectors,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def page_state(
        self,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        max_depth: int | None = None,
        max_children: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_page_state(
            session_id,
            selector=selector,
            frame_selectors=frame_selectors,
            limit=limit,
            max_depth=max_depth,
            max_children=max_children,
            timeout_ms=timeout_ms,
        )

    def next_actions(
        self,
        session_id: str,
        selector: str | None = None,
        frame_selectors: list[str] | None = None,
        limit: int | None = None,
        max_depth: int | None = None,
        max_children: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_next_actions(
            session_id,
            selector=selector,
            frame_selectors=frame_selectors,
            limit=limit,
            max_depth=max_depth,
            max_children=max_children,
            timeout_ms=timeout_ms,
        )

    def screenshot(
        self,
        session_id: str,
        filename: str | None = None,
        return_base64: bool | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_screenshot(
            session_id,
            filename=filename,
            return_base64=return_base64,
            timeout_ms=timeout_ms,
        )

    def inspect(self, session_id: str, selector: str, timeout_ms: int | None = None):
        return self._client.browser_extension_inspect(session_id, selector, timeout_ms=timeout_ms)

    def inspect_all(self, session_id: str, selector: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_inspect_all(session_id, selector, limit=limit, timeout_ms=timeout_ms)

    def links(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_links(session_id, limit=limit, timeout_ms=timeout_ms)

    def evaluate(self, session_id: str, expression: str, timeout_ms: int | None = None):
        return self._client.browser_extension_evaluate(session_id, expression, timeout_ms=timeout_ms)

    def click(self, session_id: str, selector: str, timeout_ms: int | None = None):
        return self._client.browser_extension_click(session_id, selector, timeout_ms=timeout_ms)

    def type(self, session_id: str, selector: str, text: str, timeout_ms: int | None = None):
        return self._client.browser_extension_type(session_id, selector, text, timeout_ms=timeout_ms)

    def press(self, session_id: str, key: str, selector: str | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_press(session_id, key, selector=selector, timeout_ms=timeout_ms)

    def cookies(self, session_id: str, target_url: str | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_cookies(session_id, target_url=target_url, timeout_ms=timeout_ms)

    def x_search(
        self,
        session_id: str,
        query: str,
        mode: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_search(
            session_id,
            query,
            mode=mode,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_timeline(
        self,
        session_id: str,
        timeline_type: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_timeline(
            session_id,
            timeline_type=timeline_type,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_bookmarks(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_bookmarks(
            session_id,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_notifications(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_notifications(
            session_id,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_messages(
        self,
        session_id: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_messages(
            session_id,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_open_message_thread(
        self,
        session_id: str,
        thread: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_open_message_thread(
            session_id,
            thread,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_send_message(
        self,
        session_id: str,
        text: str,
        thread: str | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_send_message(
            session_id,
            text,
            thread=thread,
            timeout_ms=timeout_ms,
        )

    def x_read_thread(
        self,
        session_id: str,
        post_url: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_read_thread(
            session_id,
            post_url,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_post(self, session_id: str, text: str, timeout_ms: int | None = None):
        return self._client.browser_extension_x_post(
            session_id,
            text,
            timeout_ms=timeout_ms,
        )

    def x_open_post(self, session_id: str, post_url: str, timeout_ms: int | None = None):
        return self._client.browser_extension_x_open_post(
            session_id,
            post_url,
            timeout_ms=timeout_ms,
        )

    def x_profile(
        self,
        session_id: str,
        handle_or_url: str,
        limit: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_profile(
            session_id,
            handle_or_url,
            limit=limit,
            timeout_ms=timeout_ms,
        )

    def x_follow(self, session_id: str, handle_or_url: str, timeout_ms: int | None = None):
        return self._client.browser_extension_x_follow(
            session_id,
            handle_or_url,
            timeout_ms=timeout_ms,
        )

    def x_reply(
        self,
        session_id: str,
        text: str,
        post_url: str | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_x_reply(
            session_id,
            text,
            post_url=post_url,
            timeout_ms=timeout_ms,
        )

    def x_like(self, session_id: str, post_url: str | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_x_like(
            session_id,
            post_url=post_url,
            timeout_ms=timeout_ms,
        )

    def x_repost(self, session_id: str, post_url: str | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_x_repost(
            session_id,
            post_url=post_url,
            timeout_ms=timeout_ms,
        )

    def chatgpt_read_latest(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_read_latest(session_id, timeout_ms=timeout_ms)

    def chatgpt_new_chat(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_new_chat(session_id, timeout_ms=timeout_ms)

    def chatgpt_info(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_info(session_id, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_sidebar_state(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_sidebar_state(session_id, timeout_ms=timeout_ms)

    def chatgpt_toggle_sidebar(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_toggle_sidebar(session_id, timeout_ms=timeout_ms)

    def chatgpt_models(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_models(session_id, timeout_ms=timeout_ms)

    def chatgpt_select_model(self, session_id: str, query: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_select_model(session_id, query, timeout_ms=timeout_ms)

    def chatgpt_conversations(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_list_conversations(session_id, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_open_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_open_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def chatgpt_conversation_actions(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_conversation_actions(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def chatgpt_conversation_action(
        self,
        session_id: str,
        action_query: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_conversation_action(
            session_id,
            action_query,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def chatgpt_rename_conversation(
        self,
        session_id: str,
        title: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_rename_conversation(
            session_id,
            title,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def chatgpt_stop(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_stop(session_id, timeout_ms=timeout_ms)

    def chatgpt_continue(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_continue(session_id, timeout_ms=timeout_ms)

    def chatgpt_response_controls(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_response_controls(session_id, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_previous_response(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_previous_response(session_id, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_next_response(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_next_response(session_id, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_list_response_versions(
        self,
        session_id: str,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_list_response_versions(
            session_id,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    def chatgpt_select_response_version(
        self,
        session_id: str,
        index: int,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_select_response_version(
            session_id,
            index,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    def chatgpt_regenerate(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_regenerate(session_id, timeout_ms=timeout_ms)

    def chatgpt_edit_message(self, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_edit_message(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_read_thread(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_read_thread(session_id, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_read_message(self, session_id: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_read_message(session_id, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_current_conversation(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_current_conversation(session_id, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_export_thread(self, session_id: str, format: str | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_export_thread(session_id, format=format, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_send(self, session_id: str, text: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_send(session_id, text, timeout_ms=timeout_ms)

    def chatgpt_ask(self, session_id: str, text: str, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_ask(session_id, text, timeout_ms=timeout_ms)

    def chatgpt_ask_thread(self, session_id: str, text: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_ask_thread(session_id, text, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_rewrite_thread(self, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_chatgpt_rewrite_thread(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    def chatgpt_wait_idle(
        self,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_wait_idle(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    def chatgpt_wait_response(
        self,
        session_id: str,
        baseline_text: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_wait_response(
            session_id,
            baseline_text=baseline_text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def chatgpt_wait_message(
        self,
        session_id: str,
        text: str | None = None,
        role: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_wait_message(
            session_id,
            text=text,
            role=role,
            limit=limit,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def chatgpt_wait_sidebar(
        self,
        session_id: str,
        open: bool | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_wait_sidebar(
            session_id,
            open=open,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def chatgpt_wait_model(
        self,
        session_id: str,
        query: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_wait_model(
            session_id,
            query,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def chatgpt_wait_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_wait_conversation(
            session_id,
            title_query=title_query,
            url=url,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def chatgpt_prepare(
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
        return self._client.browser_extension_chatgpt_prepare(
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

    def chatgpt_delete_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_delete_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def chatgpt_archive_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_chatgpt_archive_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def deepseek_read_latest(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_read_latest(session_id, timeout_ms=timeout_ms)

    def deepseek_new_chat(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_new_chat(session_id, timeout_ms=timeout_ms)

    def deepseek_info(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_info(session_id, limit=limit, timeout_ms=timeout_ms)

    def deepseek_sidebar_state(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_sidebar_state(session_id, timeout_ms=timeout_ms)

    def deepseek_toggle_sidebar(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_toggle_sidebar(session_id, timeout_ms=timeout_ms)

    def deepseek_models(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_models(session_id, timeout_ms=timeout_ms)

    def deepseek_select_model(self, session_id: str, query: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_select_model(session_id, query, timeout_ms=timeout_ms)

    def deepseek_conversations(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_list_conversations(session_id, limit=limit, timeout_ms=timeout_ms)

    def deepseek_open_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_open_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def deepseek_conversation_actions(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_conversation_actions(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def deepseek_conversation_action(
        self,
        session_id: str,
        action_query: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_conversation_action(
            session_id,
            action_query,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def deepseek_rename_conversation(
        self,
        session_id: str,
        title: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_rename_conversation(
            session_id,
            title,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def deepseek_stop(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_stop(session_id, timeout_ms=timeout_ms)

    def deepseek_continue(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_continue(session_id, timeout_ms=timeout_ms)

    def deepseek_response_controls(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_response_controls(session_id, limit=limit, timeout_ms=timeout_ms)

    def deepseek_previous_response(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_previous_response(session_id, limit=limit, timeout_ms=timeout_ms)

    def deepseek_next_response(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_next_response(session_id, limit=limit, timeout_ms=timeout_ms)

    def deepseek_list_response_versions(
        self,
        session_id: str,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_list_response_versions(
            session_id,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    def deepseek_select_response_version(
        self,
        session_id: str,
        index: int,
        limit: int | None = None,
        max_versions: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_select_response_version(
            session_id,
            index,
            limit=limit,
            max_versions=max_versions,
            timeout_ms=timeout_ms,
        )

    def deepseek_regenerate(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_regenerate(session_id, timeout_ms=timeout_ms)

    def deepseek_edit_message(self, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_edit_message(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    def deepseek_read_thread(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_read_thread(session_id, limit=limit, timeout_ms=timeout_ms)

    def deepseek_read_message(self, session_id: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_read_message(session_id, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    def deepseek_current_conversation(self, session_id: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_current_conversation(session_id, limit=limit, timeout_ms=timeout_ms)

    def deepseek_export_thread(self, session_id: str, format: str | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_export_thread(session_id, format=format, limit=limit, timeout_ms=timeout_ms)

    def deepseek_send(self, session_id: str, text: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_send(session_id, text, timeout_ms=timeout_ms)

    def deepseek_ask(self, session_id: str, text: str, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_ask(session_id, text, timeout_ms=timeout_ms)

    def deepseek_ask_thread(self, session_id: str, text: str, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_ask_thread(session_id, text, limit=limit, timeout_ms=timeout_ms)

    def deepseek_rewrite_thread(self, session_id: str, text: str, index: int | None = None, role: str | None = None, offset: int | None = None, limit: int | None = None, timeout_ms: int | None = None):
        return self._client.browser_extension_deepseek_rewrite_thread(session_id, text, index=index, role=role, offset=offset, limit=limit, timeout_ms=timeout_ms)

    def deepseek_wait_idle(
        self,
        session_id: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_wait_idle(session_id, timeout_ms=timeout_ms, interval_ms=interval_ms)

    def deepseek_wait_response(
        self,
        session_id: str,
        baseline_text: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_deepseek_wait_response(
            session_id,
            baseline_text=baseline_text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def deepseek_wait_message(
        self,
        session_id: str,
        text: str | None = None,
        role: str | None = None,
        limit: int | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_deepseek_wait_message(
            session_id,
            text=text,
            role=role,
            limit=limit,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def deepseek_wait_sidebar(
        self,
        session_id: str,
        open: bool | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_deepseek_wait_sidebar(
            session_id,
            open=open,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def deepseek_wait_model(
        self,
        session_id: str,
        query: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_deepseek_wait_model(
            session_id,
            query,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def deepseek_wait_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
        stable_reads: int | None = None,
    ):
        return self._client.browser_extension_deepseek_wait_conversation(
            session_id,
            title_query=title_query,
            url=url,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
            stable_reads=stable_reads,
        )

    def deepseek_prepare(
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
        return self._client.browser_extension_deepseek_prepare(
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

    def deepseek_delete_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_delete_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def deepseek_archive_conversation(
        self,
        session_id: str,
        title_query: str | None = None,
        url: str | None = None,
        index: int | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_deepseek_archive_conversation(
            session_id,
            title_query=title_query,
            url=url,
            index=index,
            timeout_ms=timeout_ms,
        )

    def network_events(
        self,
        session_id: str,
        limit: int | None = None,
        url_includes: str | None = None,
        stage: str | None = None,
        method: str | None = None,
    ):
        return self._client.browser_extension_network_events(
            session_id,
            limit=limit,
            url_includes=url_includes,
            stage=stage,
            method=method,
        )

    def clear_network_events(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_clear_network_events(session_id, timeout_ms=timeout_ms)

    def dom_events(
        self,
        session_id: str,
        limit: int | None = None,
        mutation_type: str | None = None,
        text_includes: str | None = None,
        timeout_ms: int | None = None,
    ):
        return self._client.browser_extension_dom_events(
            session_id,
            limit=limit,
            mutation_type=mutation_type,
            text_includes=text_includes,
            timeout_ms=timeout_ms,
        )

    def clear_dom_events(self, session_id: str, timeout_ms: int | None = None):
        return self._client.browser_extension_clear_dom_events(session_id, timeout_ms=timeout_ms)

    def session_events(
        self,
        session_id: str,
        limit: int | None = None,
        event_kind: str | None = None,
        ok: bool | None = None,
    ):
        return self._client.browser_extension_session_events(session_id, limit=limit, event_kind=event_kind, ok=ok)

    def clear_session_events(self, session_id: str):
        return self._client.browser_extension_clear_session_events(session_id)

    def wait_text(
        self,
        session_id: str,
        text: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return self._client.browser_extension_wait_text(
            session_id,
            text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    def wait_url(
        self,
        session_id: str,
        text: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return self._client.browser_extension_wait_url(
            session_id,
            text,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    def wait_selector(
        self,
        session_id: str,
        selector: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return self._client.browser_extension_wait_selector(
            session_id,
            selector,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )

    def wait_no_selector(
        self,
        session_id: str,
        selector: str,
        timeout_ms: int | None = None,
        interval_ms: int | None = None,
    ):
        return self._client.browser_extension_wait_no_selector(
            session_id,
            selector,
            timeout_ms=timeout_ms,
            interval_ms=interval_ms,
        )


class ScopeInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def create(self, **kwargs: Any):
        return self._client.desktop_scope_create(**kwargs)

    def list(self):
        return self._client.desktop_scope_list()

    def info(self, scope_id: str):
        return self._client.desktop_scope_info(scope_id)

    def focus(self, scope_id: str):
        return self._client.desktop_scope_focus(scope_id)

    def screenshot(self, scope_id: str, filename: str | None = None, return_base64: bool = False):
        return self._client.desktop_scope_screenshot(scope_id, filename=filename, return_base64=return_base64)

    def click(self, scope_id: str, x: int, y: int, button: str = "left"):
        return self._client.desktop_scope_click(scope_id, x, y, button)

    def type(self, scope_id: str, text: str):
        return self._client.desktop_scope_type(scope_id, text)

    def close(self, scope_id: str):
        return self._client.desktop_scope_close(scope_id)


class OpenCliInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def status(self):
        return self._client.opencli_status()

    def doctor(self, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None):
        return self._client.opencli_doctor(cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms)

    def sites(self):
        return self._client.opencli_sites()

    def commands(self, site: str):
        return self._client.opencli_commands(site)

    def run(self, site: str, command: str, args: list[str] | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        return self._client.opencli_run(site, command, args=args, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    def workspace_list(self):
        return self._client.opencli_workspace_list()

    def workspace_get(self, name: str):
        return self._client.opencli_workspace_get(name)

    def workspace_set(self, name: str, path: str):
        return self._client.opencli_workspace_set(name, path)

    def workspace_clear(self, name: str):
        return self._client.opencli_workspace_clear(name)

    def workspace_bind_session(self, session_id: str, workspace: str):
        return self._client.opencli_workspace_bind_session(session_id, workspace)

    def workspace_unbind_session(self, session_id: str):
        return self._client.opencli_workspace_unbind_session(session_id)

    def workspace_session(self, session_id: str):
        return self._client.opencli_workspace_session(session_id)


class HfPapersInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def status(self):
        return self._client.hf_papers_status()

    def doctor(self, backend: str | None = None, timeout_ms: int | None = None):
        return self._client.hf_papers_doctor(backend=backend, timeout_ms=timeout_ms)

    def search(self, query: str, limit: int | None = None, backend: str | None = None, token: str | None = None, include_raw: bool | None = None, timeout_ms: int | None = None):
        return self._client.hf_papers_search(query, limit=limit, backend=backend, token=token, include_raw=include_raw, timeout_ms=timeout_ms)

    def info(self, paper_id: str, backend: str | None = None, token: str | None = None, include_raw: bool | None = None, timeout_ms: int | None = None):
        return self._client.hf_papers_info(paper_id, backend=backend, token=token, include_raw=include_raw, timeout_ms=timeout_ms)

    def read(self, paper_id: str, backend: str | None = None, token: str | None = None, save_path: str | None = None, timeout_ms: int | None = None):
        return self._client.hf_papers_read(paper_id, backend=backend, token=token, save_path=save_path, timeout_ms=timeout_ms)

    def list_daily(
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
        return self._client.hf_papers_list_daily(date=date, week=week, month=month, submitter=submitter, sort=sort, limit=limit, backend=backend, token=token, include_raw=include_raw, timeout_ms=timeout_ms)


class TwitterInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def search(self, query: str, limit: int | None = None, mode: str | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        return self._client.twitter_search(query, limit=limit, mode=mode, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    def timeline(self, timeline_type: str | None = None, limit: int | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        return self._client.twitter_timeline(timeline_type=timeline_type, limit=limit, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    def bookmarks(self, limit: int | None = None, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        return self._client.twitter_bookmarks(limit=limit, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)

    def post(self, text: str, cwd: str | None = None, workspace: str | None = None, owner_session_id: str | None = None, timeout_ms: int | None = None, keep_browser_open: bool | None = None, wait_after_ms: int | None = None, maximize_browser: bool | None = None):
        return self._client.twitter_post(text, cwd=cwd, workspace=workspace, owner_session_id=owner_session_id, timeout_ms=timeout_ms, keep_browser_open=keep_browser_open, wait_after_ms=wait_after_ms, maximize_browser=maximize_browser)


class SessionInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def create(self, client_kind: str | None = None, name: str | None = None):
        return self._client.session_create(client_kind=client_kind, name=name)

    def list(self):
        return self._client.session_list()

    def info(self, session_id: str):
        return self._client.session_info(session_id)

    def touch(self, session_id: str):
        return self._client.session_touch(session_id)

    def close(self, session_id: str, cleanup_owned_resources: bool = True):
        return self._client.session_close(session_id, cleanup_owned_resources=cleanup_owned_resources)


class TraceInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def start(self, name: str | None = None, owner_session_id: str | None = None):
        return self._client.trace_start(name=name, owner_session_id=owner_session_id)

    def list(self):
        return self._client.trace_list()

    def info(self, trace_id: str):
        return self._client.trace_info(trace_id)

    def export(self, trace_id: str, path: str | None = None):
        return self._client.trace_export(trace_id, path=path)

    def stop(self, trace_id: str):
        return self._client.trace_stop(trace_id)


class TrajectoryInterface:
    def __init__(self, client: "DesktopWinClient"):
        self._client = client

    def start(self, name: str | None = None, owner_session_id: str | None = None):
        return self._client.trajectory_start(name=name, owner_session_id=owner_session_id)

    def list(self):
        return self._client.trajectory_list()

    def info(self, trajectory_id: str):
        return self._client.trajectory_info(trajectory_id)

    def append_turn(self, trajectory_id: str, turn_id: str, **kwargs: Any):
        return self._client.trajectory_append_turn(trajectory_id, turn_id, **kwargs)

    def export(self, trajectory_id: str, path: str | None = None):
        return self._client.trajectory_export(trajectory_id, path=path)

    def stop(self, trajectory_id: str):
        return self._client.trajectory_stop(trajectory_id)


class TelemetryInterface:
    def __init__(self, client: "DesktopWinClient"):
        self.trace = TraceInterface(client)
        self.trajectory = TrajectoryInterface(client)


class ComputerInterface:
    def __init__(self, client: "DesktopWinClient"):
        self.screen = ScreenInterface(client)
        self.mouse = MouseInterface(client)
        self.keyboard = KeyboardInterface(client)
        self.clipboard = ClipboardInterface(client)
        self.window = WindowInterface(client)
        self.process = ProcessInterface(client)
        self.shell = ShellInterface(client)
        self.terminal = TerminalInterface(client)
        self.browser = BrowserInterface(client)
        self.browser_extension = BrowserExtensionInterface(client)
        self.scope = ScopeInterface(client)
        self.hf_papers = HfPapersInterface(client)
        self.opencli = OpenCliInterface(client)
        self.twitter = TwitterInterface(client)
        self.session = SessionInterface(client)
        self.telemetry = TelemetryInterface(client)
