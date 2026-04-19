# Getting Started

Sidofun is a Windows-first automation engine built around a Bun runtime and a Python SDK.

## Prerequisites

- Windows
- Bun 1.x
- Python 3.9+

## Install

From the repo root:

```powershell
bun install
```

## Build

For local development:

```powershell
bun run typecheck
bun run build:ipc
```

For a full publishable build:

```powershell
bun run build:release
```

To stage the Python backend bundle:

```powershell
bun run stage:python-backend
```

## Run the CLI

```powershell
bun run cli -- help
```

If you want local linked commands:

```powershell
bun run build:release
bun link
sidofun help
```

## Run the Tests

Use the maintained repo commands:

```powershell
bun run test
bun run test:python
```

Avoid raw `bun test` at the repo root because it may pick up legacy material that is not part of the maintained suite.

## Quick Python Example

Install the SDK from the repo:

```powershell
cd python
python -m pip install -e ".[dev]"
```

Then use it:

```python
from sidofun_desktop import DesktopWinClient

with DesktopWinClient() as client:
    print(client.screen_size())
    print(client.computer.clipboard.read())
    print(client.computer.shell.pwsh("Get-Date"))
```

## Useful Commands

```powershell
bun run cli -- doctor
bun run cli -- session create --client-kind operator --name demo --json
bun run cli -- clipboard status --json
bun run cli -- shell run pwsh "Get-Date" --json
bun run cli -- browser list --json
bun run cli -- coder list --json
```

Browser-extension support is available, but it should still be treated as alpha:

```powershell
bun run cli -- browserext status --json
bun run cli -- browserext capabilities --json
bun run cli -- browserext workflow-validate --file examples/browserext-fixtures/control-workflow.json --json
```

## Next Reading

- [README.md](../README.md)
- [architecture.md](./architecture.md)
- [python-package.md](./python-package.md)
