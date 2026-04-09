# Architecture

Sidofun is a Windows-first local automation engine with one shared runtime and multiple transport surfaces.

## Product Shape

The maintained product surface is:

- `src/`: Bun/TypeScript engine, services, and transport entrypoints
- `python/sidofun_desktop`: Python SDK that launches the engine over IPC

Sidofun is intentionally local-first. It is not a cloud sandbox platform and it is not yet a full agent framework.

## Shared Runtime

The main runtime composition lives in `src/runtime/sidofun-runtime.ts`.

That runtime is reused by:

- `src/cli-ipc.ts`: local stdin/stdout IPC for the Python client
- `src/index.ts`: HTTP and WebSocket server
- `src/mcp-stdio.ts`: MCP stdio transport
- `src/operator-cli.tsx`: operator CLI and TUI

This is the key architectural rule in the repo: transports should expose shared behavior, not reimplement business logic.

## Service Families

Core maintained service areas include:

- desktop automation: screenshots, mouse, keyboard, clipboard
- process and window management
- shell execution for PowerShell and CMD
- daemon-backed terminal sessions
- browser discovery, profiles, and launch/focus helpers
- debuggable browser automation runtimes and page automation
- browser-extension provider and workflow execution
- telemetry, traces, and trajectories
- local coder app control for `codex`, `opencode`, and `qwen`

The grouped computer facade is exposed in both TypeScript and Python through families such as:

- `screen`
- `mouse`
- `keyboard`
- `clipboard`
- `window`
- `process`
- `shell`
- `terminal`
- `browser`
- `browser_extension`
- `scope`
- `session`
- `telemetry`

## State and Ownership

Sidofun now has a local operator daemon and persisted state under `%LOCALAPPDATA%\\Sidofun\\`.

That enables:

- separate CLI invocations to talk to one background daemon
- persisted client-session metadata
- tracked resource ownership for terminal sessions, desktop scopes, and browser runtimes
- reconnect and restore flows across daemon restarts for supported resource types

Ownership and claim semantics exist, but this is still lighter than a distributed lock system.

## Python Packaging Model

The Python SDK is a thin client, not a second implementation.

Its backend resolution order is:

1. bundled backend under `sidofun_desktop/_vendor/backend`
2. repo `dist/cli-ipc.js`
3. repo `src/cli-ipc.ts`

This keeps local development flexible while preserving a release-friendly PyPI path.

## Current Boundaries

Important current limits:

- Windows-first in practice
- alpha API surface
- browser-extension support is real but still brittle overall
- browser persistence and recovery are partial, not full reconstruction
- arbitrary existing terminal tabs are not as strong as Sidofun-created sessions

For commands and usage, see [getting-started.md](./getting-started.md) and [python-package.md](./python-package.md).
