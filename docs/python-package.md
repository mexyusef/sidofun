# Python Package

`sidofun-desktop` is the Python SDK for Sidofun's local automation engine.

It should be treated as the preferred Python-facing surface. The Bun backend remains the single execution engine.

## Package Role

The SDK handles:

- backend discovery and startup
- IPC request and response handling
- environment setup for native dependencies
- Python exceptions and helper objects

The current backend resolution order is:

1. bundled backend under `sidofun_desktop/_vendor/backend`
2. repo `dist/cli-ipc.js`
3. repo `src/cli-ipc.ts`

## Main Entry Points

- `DesktopWinClient`
- `DesktopWin`
- `BrowserSession`
- `BrowserRuntime`
- `BrowserPage`

The grouped `computer` interface is the cleaner long-term model:

- `client.computer.screen`
- `client.computer.mouse`
- `client.computer.keyboard`
- `client.computer.clipboard`
- `client.computer.window`
- `client.computer.process`
- `client.computer.shell`
- `client.computer.terminal`
- `client.computer.browser`
- `client.computer.browser_extension`
- `client.computer.scope`
- `client.computer.session`
- `client.computer.telemetry`

## Example

```python
from sidofun_desktop import DesktopWinClient

with DesktopWinClient() as client:
    print(client.screen_size())
    print(client.computer.shell.pwsh("Get-Date"))
```

## Development Install

```powershell
cd python
python -m pip install -e ".[dev]"
```

## Release Packaging

Build engine artifacts:

```powershell
bun run build:release
```

Stage the bundled backend:

```powershell
bun run stage:python-backend
```

Build Python distributions:

```powershell
cd python
python -m build
```

## Current Constraints

- Windows-only in practice
- alpha API surface
- release wheels still expect Bun to be available at runtime unless you add a separate Bun distribution strategy

For broader project context, see [architecture.md](./architecture.md).
