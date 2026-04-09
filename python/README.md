# Sidofun Desktop Python Client

**Direct Python-to-Bun IPC client for Windows desktop automation.**

No HTTP/WebSocket overhead - calls server functions directly via stdin/stdout IPC (Inter-Process Communication).

Additional project docs:

- [`../docs/getting-started.md`](../docs/getting-started.md)
- [`../docs/python-package.md`](../docs/python-package.md)
- [`../docs/architecture.md`](../docs/architecture.md)

## Installation

**Prerequisites:**
1. Windows 10/11
2. [Bun](https://bun.sh/) installed
3. A local checkout of `sidofun`, or a wheel that already includes bundled
   backend assets

```bash
# From sidofun/python
pip install .
```

Or install in development mode:
```bash
pip install -e ".[dev]"
```

Run the Python test suite from the repo root:

```bash
bun run test:python
```

To include live desktop/CMD automation tests on your own machine:

```bash
$env:SIDOFUN_RUN_LIVE_AUTOMATION_TESTS = "1"
bun run test:python
```

The checked-in live Firefox smoke for your current profile setup is:

```bash
$env:SIDOFUN_RUN_LIVE_AUTOMATION_TESTS = "1"
$env:SIDOFUN_FIREFOX_PROFILE_QUERY = "yusef.ulum"
python -m pytest python/tests/test_browser_live_firefox.py
```

The checked-in live Firefox runtime smoke is:

```bash
$env:SIDOFUN_RUN_LIVE_AUTOMATION_TESTS = "1"
$env:SIDOFUN_FIREFOX_PROFILE_QUERY = "yusef.ulum"
python -m pytest python/tests/test_browser_live_runtime_firefox.py
```

There is also a direct rerunnable script:

```bash
python python/tests/manual/firefox_profile_gmail.py
```

## Quick Start

```python
from sidofun_desktop import DesktopWinClient

# Context manager for automatic cleanup
with DesktopWinClient() as client:
    # Take a screenshot
    screenshot = client.screenshot()
    print(f"Screenshot: {screenshot['width']}x{screenshot['height']}")

    # Click somewhere
    client.click(100, 200)

    # Type text
    client.type("Hello World")

    # Press Enter
    client.key_press("enter")
```

## CMD Automation

```python
from sidofun_desktop import DesktopWinClient

with DesktopWinClient() as client:
    # Spawn a new CMD window
    session_id = client.cmd_spawn("MyAutomation")
    print(f"Session ID: {session_id}")

    # Type with escape sequences
    # \M = maximize, \n = Enter, \d500 = delay 500ms, \m = minimize
    client.cmd_type(session_id, r"\Mecho Hello\n\d500")
    client.cmd_type(session_id, r"dir\n\d1000\m")

    # Execute a command
    result = client.cmd_exec(session_id, "ipconfig", wait=True, screenshot=True)

    # List all sessions
    sessions = client.cmd_list()
    print(f"Active sessions: {sessions['count']}")

    # Use index-based alias (1 = first session)
    client.cmd_type(1, r"\fecho focused\n")

    # Take screenshot of CMD window
    cmd_screenshot = client.cmd_screenshot(session_id)

    # Close session
    client.cmd_close(session_id)
```

## Escape Sequences

When using `cmd_type`, you can use escape sequences for automation:

| Sequence | Action |
|----------|--------|
| `\n` | Press Enter |
| `\t` | Press Tab |
| `\\` | Backslash |
| `\"` | Quote |
| `\dN` | Delay N milliseconds (e.g., `\d500` = 500ms) |
| `\M` | Maximize window |
| `\m` | Minimize window |
| `\r` | Restore window (normalize from maximized/minimized) |
| `\f` | Focus window (bring to front) |

**Note:** In Python strings, use raw strings `r"..."` or escape backslashes `"\\M"`.

```python
# Using raw string (recommended)
client.cmd_type(1, r"\Mecho hello\n\d1000world\n")

# Or double backslash
client.cmd_type(1, "\\Mecho hello\\n\\d1000world\\n")
```

## Desktop Actions

### Screenshot

```python
# Basic screenshot (returns base64 data)
screenshot = client.screenshot()

# Save to file
screenshot = client.screenshot(filename="output.png", return_base64=False)

# DPI-aware screenshot (full physical resolution)
screenshot = client.screenshot_win32(filename="output.png")
```

### Mouse Actions

```python
# Click
client.click(100, 200)  # x, y
client.click(100, 200, button="right")

# Move mouse
client.move_mouse(500, 300)

# Drag mouse
client.drag_mouse([
    {"x": 100, "y": 100},
    {"x": 200, "y": 200},
    {"x": 300, "y": 100}
])

# Scroll
client.scroll(direction="up", count=3)
```

### Keyboard Actions

```python
# Type text
client.type("Hello World")

# Press key
client.key_press("enter")
client.key_press("escape")
client.key_press("f1")
```

### Query Actions

```python
# Get screen size
size = client.screen_size()
print(f"Screen: {size['width']}x{size['height']}")

# Get mouse position
pos = client.mouse_position()
print(f"Mouse at: {pos['x']}, {pos['y']}")

# Get active window
window = client.active_window()
print(f"Active window: {window['title']}")
```

## Browser Actions

```python
from sidofun_desktop import DesktopWinClient

with DesktopWinClient() as client:
    browsers = client.list_browsers()
    installed = [browser for browser in browsers if browser["installed"]]

    chrome_profiles = client.browser_profiles("chrome")

    launch_plan = client.plan_browser_launch(
        "chrome",
        profile="Default",
        url="https://example.com",
        args=["--new-window"],
    )
    print(launch_plan["command"])

    result = client.launch_browser(
        "firefox",
        profile="default-release",
        url="https://example.com",
        private_mode=True,
    )
    print(result["pid"])
```

Available Python browser methods:

- `list_browsers()`
- `browser_info(browser)`
- `browser_profiles(browser)`
- `plan_browser_launch(...)`
- `launch_browser(...)`
- `browser_windows(browser)`
- `focus_browser_window(browser, handle=None, title_includes=None)`

Fluent browser helper:

```python
with DesktopWinClient() as client:
    chrome = client.browsers.chrome("Default")

    print(chrome.info())
    print(chrome.profiles()[:3])
    print(chrome.launch_plan(url="https://example.com")["command"])
    print(chrome.windows())
```

Profile lookup and workflow helpers:

```python
with DesktopWinClient() as client:
    chrome = client.browser("chrome")

    work = chrome.with_profile_name("Work")
    personal = chrome.with_profile_email("me@example.com")
    default = chrome.with_default_profile()

    print(work.launch_and_focus(
        url="https://example.com",
        title_includes="Example",
    )["window"]["handle"])
```

Singleton browser helper:

```python
from sidofun_desktop import DesktopWin

chrome = DesktopWin.browser("chrome", profile="Default")
print(chrome.launch_plan(url="https://example.com")["command"])
print(DesktopWin.browser_windows("chrome"))
```

Singleton helpers also compose with the new profile workflow methods:

```python
from sidofun_desktop import DesktopWin

window = DesktopWin.browser("chrome").with_default_profile().launch_and_focus(
    url="https://example.com",
    title_includes="Example",
)["window"]

print(window["handle"])
```

Debuggable browser runtime helper:

```python
from sidofun_desktop import DesktopWinClient

with DesktopWinClient() as client:
    runtime = client.browser("chrome").with_default_profile().automation_runtime(
        url="https://example.com",
        automation_mode="persistent-debuggable",
    )

    print(runtime.runtime_id)
    print(runtime.debug_port)
    print(runtime.remote_debugging_url)
    print(client.list_browser_runtimes())
```

Playwright-backed page helpers are implemented on top of Chromium CDP runtimes:

```python
with DesktopWinClient() as client:
    runtime = client.browser("chrome").automation_runtime(
        automation_mode="debuggable",
        debug_port=9335,
    )
    page = runtime.open_page("https://example.com")
    print(page.content()["content"][:120])
    page.close()
    runtime.close()
```

Current note:

- Chromium Playwright attachment is implemented and unit-tested, but live
  verification on this machine is still unstable under the Bun-hosted backend.
- Firefox runtime lifecycle is live-verified and working.
  The backend now falls back to raw CDP page control when Playwright attach is
  unreliable, and the checked-in Chromium live smokes pass through that path.

Extended page helpers are available:

```python
with DesktopWinClient() as client:
    runtime = client.browser("chrome").automation_runtime(
        automation_mode="debuggable",
        debug_port=9336,
    )
    page = runtime.open_page("https://example.com")
    page.wait_for("load")
    print(page.evaluate("document.title")["value"])
    print(page.network_events()[:3])
    print(page.events()["events"][:3])
    print(page.console_events()[:3])
    page.clear_events()
    page.pdf("example.pdf")
    page.download_url("https://example.com", "example.html")
    page.close()
    runtime.close()
```

## CMD Actions

### Session Management

```python
# Spawn CMD
session_id = client.cmd_spawn("MyTitle")

# List sessions
sessions = client.cmd_list()
for session in sessions['sessions']:
    print(f"{session['id']}: {session['title']}")

# Get session info
info = client.cmd_info(session_id)
print(f"Commands run: {info['commandCount']}")

# Close session
client.cmd_close(session_id)
```

### Command Execution

```python
# Simple execute
result = client.cmd_exec(session_id, "dir")

# Execute with wait and screenshot
result = client.cmd_exec(
    session_id,
    "ipconfig",
    wait=True,
    timeout=5000,
    screenshot=True
)

# Screenshot after command
if result['screenshot']:
    print(f"Screenshot: {result['screenshot']['filepath']}")
```

### Typing with Control

```python
# Type plain text
client.cmd_type(session_id, "echo Hello World")

# Type with Enter
client.cmd_type(session_id, r"echo Hello\n")

# Type with delays and window control
client.cmd_type(session_id, r"\Mecho Line 1\n\d1000echo Line 2\n\r\d500\m")
# 1. Maximize
# 2. Type "echo Line 1" and press Enter
# 3. Wait 1000ms
# 4. Type "echo Line 2" and press Enter
# 5. Restore window
# 6. Wait 500ms
# 7. Minimize window
```

### Key Press

```python
# Press Enter
client.cmd_press(session_id, "enter")

# Press Tab
client.cmd_press(session_id, "tab")
```

### Screenshot CMD Window

```python
# Screenshot CMD window
screenshot = client.cmd_screenshot(session_id)

# Save to file
screenshot = client.cmd_screenshot(
    session_id,
    filename="cmd-output.png",
    return_base64=False
)
```

### Break Signal

```python
# Send Ctrl+C
client.cmd_break(session_id)
```

## Index-Based Aliases

For convenience, use numeric indices (1-based) instead of session IDs:

```python
# First session is index 1
client.cmd_type(1, r"dir\n")

# Second session is index 2
client.cmd_close(2)
```

## Error Handling

```python
from sidofun_desktop import (
    DesktopWinClient,
    SessionNotFoundError,
    SpawnFailedError,
    ActionFailedError,
)

try:
    with DesktopWinClient() as client:
        session_id = client.cmd_spawn()
        client.cmd_type(session_id, "dir\n")

except SessionNotFoundError as e:
    print(f"Session not found: {e}")

except SpawnFailedError as e:
    print(f"Failed to spawn CMD: {e}")

except ActionFailedError as e:
    print(f"Action failed: {e}")
```

## Advanced Usage

### Manual Lifecycle Management

```python
client = DesktopWinClient()

# Start manually
client.start()

try:
    # Use client
    client.screenshot()
finally:
    # Stop manually
    client.stop()
```

### Custom Bun Path

```python
# If bun is not in PATH
client = DesktopWinClient(
    bun_path=r"C:\path\to\bun.exe",
    cli_path=r"C:\path\to\project\src\cli.ts",
    cwd=r"C:\path\to\project",
)
```

## Performance

IPC communication is significantly faster than HTTP/WebSocket:

| Operation | HTTP | IPC |
|-----------|-----|-----|
| Single call | 20-50ms | 5-15ms |
| Screenshot | 100-300ms | 90-280ms |

*IPC overhead is mainly JSON serialization + subprocess communication*

## Limitations

- **Windows only**: This client uses Windows-specific automation
- **Bun required**: Bun must be installed and available
- **Sequential processing**: Requests are processed one at a time

## Troubleshooting

### "Bun subprocess is not running"

Make sure you:
1. Installed Bun: `bun --version`
2. Use context manager: `with DesktopWinClient() as client:`
3. Or call `client.start()` before using

### "Failed to start Bun subprocess"

Check:
1. Bun is in PATH or provide `bun_path`
2. `cli.ts` file exists at the expected path
3. Working directory is correct (`cwd` parameter)

### "Session index X out of range"

Use `client.cmd_list()` to see active sessions and their indices.

## API Reference

### DesktopWinClient

```python
class DesktopWinClient:
    def __init__(
        self,
        bun_path: Optional[str] = None,
        cli_path: Optional[str] = None,
        cwd: Optional[str] = None,
        encoding: str = "utf-8",
        timeout: Optional[float] = 30.0,
    )

    # Lifecycle
    def start(self) -> None
    def stop(self) -> None
    def is_running(self) -> bool

    # Desktop actions
    def screenshot(...) -> ScreenshotResult
    def screenshot_win32(...) -> ScreenshotResult
    def click(x: int, y: int, button: str = "left") -> str
    def move_mouse(x: int, y: int) -> str
    def drag_mouse(path: list[Point], button: str = "left") -> str
    def scroll(direction: str = "up", count: int = 1) -> str
    def type(text: str) -> str
    def key_press(key: str) -> str
    def screen_size(self) -> ScreenSize
    def mouse_position(self) -> Point
    def active_window(self) -> ActiveWindowResult

    # CMD actions
    def cmd_spawn(title: Optional[str] = None) -> str
    def cmd_list(self) -> CMDSessionList
    def cmd_info(session_id: Union[str, int]) -> CMDSessionInfo
    def cmd_exec(session_id: Union[str, int], command: str, **options) -> CMDExecResult
    def cmd_type(session_id: Union[str, int], text: str) -> str
    def cmd_press(session_id: Union[str, int], key: str) -> str
    def cmd_screenshot(session_id: Union[str, int], **options) -> ScreenshotResult
    def cmd_break(session_id: Union[str, int]) -> str
    def cmd_close(session_id: Union[str, int]) -> str
```

## License

MIT

## See Also

- [Main Project Documentation](../README.md)
- [IPC Protocol](../../docs/ipc-protocol.md)
- [Getting Started](../../docs/getting-started.md)
