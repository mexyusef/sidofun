# Sidofun

Sidofun is a Windows-first local automation engine built around a shared Bun/TypeScript runtime and a Python SDK.

Repository: `https://github.com/mexyusef/sidofun`

## What It Includes

- desktop input and screenshots
- clipboard, shell, and terminal automation
- process and window management
- browser discovery, profiles, launch, and focus helpers
- debuggable browser runtimes and page automation
- a browser-extension provider and workflow layer
- HTTP, WebSocket, IPC, and MCP transports over shared runtime logic
- a daemon-backed operator CLI and TUI
- a Python SDK: `sidofun-desktop`

## Current Status

Sidofun is real and actively maintained, but it is still alpha.

Current practical boundaries:

- Windows-first in practice
- local-machine oriented, not sandbox/cloud oriented
- browser-extension support exists but should still be treated as brittle overall

## Repository Layout

- `src/`: Bun/TypeScript runtime, services, daemon, and transports
- `python/`: Python package and examples
- `examples/`: smoke scripts and browser-extension workflow samples
- `docs/`: maintained project documentation

## Quick Start

Install dependencies:

```powershell
bun install
```

Run the operator CLI:

```powershell
bun run cli -- help
```

Build the release artifacts:

```powershell
bun run build:release
```

Stage the Python backend bundle:

```powershell
bun run stage:python-backend
```

Run tests:

```powershell
bun run test
bun run test:python
```

## Python Example

```python
from sidofun_desktop import DesktopWinClient

with DesktopWinClient() as client:
    print(client.screen_size())
    print(client.computer.clipboard.read())
    print(client.computer.shell.pwsh("Get-Date"))
```

## Distribution Targets

- npm: `@mexyusef/sidofun-engine`
- PyPI: `sidofun-desktop`

The Python package prefers a bundled backend for release builds, and falls back to repo build artifacts during development.

## Key Commands

```powershell
bun run cli -- doctor
bun run cli -- browser list --json
bun run cli -- coder list --json
bun run cli -- browserext status --json
bun run tui
```

## Documentation

- [Docs Index](./docs/README.md)
- [Getting Started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [Python Package](./docs/python-package.md)
