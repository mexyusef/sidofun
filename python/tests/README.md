# Python Tests

This directory contains tests for the `sidofun-desktop` Python package.

## Layout

- `test_*.py`: automated pytest-style tests
- `manual/`: smoke scripts, debugging helpers, and exploratory demos

Only the top-level `test_*.py` files should be treated as the automated test
suite.

Browser-specific coverage includes:

- `test_browser_client.py`: direct `DesktopWinClient` browser IPC wrappers
- `test_browser_session.py`: fluent `client.browsers.*` and `BrowserSession`
  helpers
- `test_browser_runtime.py`: debuggable browser runtime helpers
- `test_browser_singleton.py`: singleton `DesktopWin` browser helpers
- `test_browser_live_firefox.py`: opt-in live Firefox profile launch smoke
- `test_browser_live_runtime_firefox.py`: opt-in live Firefox runtime smoke
- `test_browser_live_playwright_chrome.py`: opt-in Chromium page attach smoke
- `test_browser_live_page_ops_chrome.py`: opt-in Chromium page operations smoke

Recommended runner from the repo root:

```bash
bun run test:python
```

Live desktop automation coverage is opt-in. To include intrusive GUI/CMD tests:

```bash
$env:SIDOFUN_RUN_LIVE_AUTOMATION_TESTS = "1"
bun run test:python
```

Specific Firefox live smoke:

```bash
$env:SIDOFUN_RUN_LIVE_AUTOMATION_TESTS = "1"
$env:SIDOFUN_FIREFOX_PROFILE_QUERY = "yusef.ulum"
python -m pytest python/tests/test_browser_live_firefox.py
```

Specific Firefox runtime live smoke:

```bash
$env:SIDOFUN_RUN_LIVE_AUTOMATION_TESTS = "1"
$env:SIDOFUN_FIREFOX_PROFILE_QUERY = "yusef.ulum"
python -m pytest python/tests/test_browser_live_runtime_firefox.py
```

Specific Chromium page-operation live smoke:

```bash
$env:SIDOFUN_RUN_LIVE_AUTOMATION_TESTS = "1"
python -m pytest python/tests/test_browser_live_page_ops_chrome.py
```

Manual rerunnable script:

```bash
python python/tests/manual/firefox_profile_gmail.py
```
