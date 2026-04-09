# Smoke Tests

These smoke scripts are intended to validate the real Sidofun system on a Windows machine.

They are safe by default:

- no mouse clicks
- no keyboard typing
- no app launches
- no window movement

They focus on transport and capability verification first.

## Prerequisites

- Windows desktop session available
- `bun` installed
- the native `libnut-core` runtime available in this repo layout

## HTTP Smoke

Start the server in one terminal:

```powershell
bun run src/index.ts
```

Then in another terminal:

```powershell
bun run smoke:http
```

Optional screenshot check:

```powershell
$env:SIDOFUN_SMOKE_SCREENSHOT="1"
bun run smoke:http
```

## IPC Smoke

This launches the IPC backend directly and checks:

- `screen_size`
- `mouse_position`
- `browser_list`
- `browser_runtime_list`

Run:

```powershell
bun run smoke:ipc
```

## MCP Smoke

This launches the MCP server over stdio and checks:

- `initialize`
- `tools/list`
- `sidofun_desktop` with `screen_size`
- `sidofun_browser` with `browser_list`

Run:

```powershell
bun run smoke:mcp
```

## What Success Looks Like

You should see:

- health and screen info for HTTP
- JSON results for IPC requests
- MCP initialize response and tool names
- no process crash during startup or shutdown

## What These Do Not Yet Prove

These smoke scripts do not fully prove:

- real mouse click reliability
- real keyboard typing reliability
- app/window manipulation reliability
- browser runtime/page automation against a live browser session

Those are still best checked with the manual demos under [`tests/manual/`](../tests/manual).
